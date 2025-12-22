import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { api_key, youtube_key } from '../environments/environment';

export interface CastMember {
    cast_id: number;
    character: string;
    credit_id: string;
    gender: number;
    id: number;
    name: string;
    order: number;
    profile_path: string | null;
}

export interface MovieCreditsResponse {
    id: number;
    cast: CastMember[];
    crew: any[];
}

export interface Movie {
    adult: boolean;
    backdrop_path: string;
    genre_ids: number[];
    id: number;
    original_language: string;
    original_title: string;
    overview: string;
    popularity: number;
    poster_path: string;
    release_date: string;
    title: string;
    video: boolean;
    vote_average: number;
    vote_count: number;
}

export interface DiscoverMovieResponse {
    page: number;
    results: Movie[];
    total_pages: number;
    total_results: number;
}

export interface Genre {
    id: number;
    name: string;
}

export interface GenreResponse {
    genres: Genre[];
}

export interface MovieVideosResponse {
    id: number;
    results: Array<{
        id: string;
        iso_639_1: string;
        iso_3166_1: string;
        key: string;
        name: string;
        site: string;
        size: number;
        type: string;
    }>;
}

export interface MovieDetailsResponse {
    id: number;
    runtime: number | null;
}

@Injectable({
    providedIn: 'root',
})
export class ApiCallService {
    private readonly tmdbBaseUrl = 'https://api.themoviedb.org/3';

    private headers = new HttpHeaders({
        accept: 'application/json',
        Authorization: `Bearer ${api_key}`,
    });

    private date = "";
    private genre = "";

    constructor(private http: HttpClient) {}

    private normalizeLanguageTag(tag: string): string {
        // Normalise loosely to BCP47-ish casing:
        // - language: lowercase (en)
        // - region: uppercase (US)
        // - script (if present): Title Case (Latn)
        const raw = (tag || '').trim().replace('_', '-');
        if (!raw) return 'en-US';

        const parts = raw.split('-').filter(Boolean);
        if (parts.length === 0) return 'en-US';

        const language = parts[0].toLowerCase();
        if (parts.length === 1) return language;

        const rest = parts.slice(1).map((p) => {
            if (p.length === 2) return p.toUpperCase();
            if (p.length === 4) return p[0].toUpperCase() + p.slice(1).toLowerCase();
            return p;
        });

        return [language, ...rest].join('-');
    }

    private getUserLanguageTag(): string {
        const navLanguages = (typeof navigator !== 'undefined' && Array.isArray((navigator as any).languages))
            ? (navigator as any).languages as string[]
            : [];
        const navLang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : '';
        const candidate = navLanguages[0] || navLang || 'en-US';
        return this.normalizeLanguageTag(candidate);
    }

    private getUserRegion(): string | undefined {
        const fromTag = (tag: string): string | undefined => {
            const parts = this.normalizeLanguageTag(tag).split('-');
            const region = parts.find((p) => p.length === 2 && /^[A-Z]{2}$/.test(p));
            return region;
        };

        const navLang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : '';
        const regionFromNavigator = fromTag(navLang);
        if (regionFromNavigator) return regionFromNavigator;

        const localeFromIntl = (typeof Intl !== 'undefined' && Intl.DateTimeFormat)
            ? Intl.DateTimeFormat().resolvedOptions().locale
            : '';
        const regionFromIntl = fromTag(localeFromIntl);
        if (regionFromIntl) return regionFromIntl;

        // Very small best-effort fallback (kept minimal):
        const timeZone = (typeof Intl !== 'undefined' && Intl.DateTimeFormat)
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : '';
        if (timeZone === 'Europe/Paris') return 'FR';

        return undefined;
    }

    private getLanguageFallbacks(originalLanguage?: string): string[] {
        // Requirement:
        // 1) Try to display in the user's language (locale)
        // 2) If not available, try the movie's original language but with user's region (e.g. en-FR)
        // 3) Otherwise fallback to en-US
        const userLang = this.getUserLanguageTag();
        const userRegion = this.getUserRegion();

        const candidates: string[] = [];
        if (userLang) candidates.push(userLang);

        const orig = (originalLanguage || '').trim();
        if (orig) {
            const normalizedOrig = this.normalizeLanguageTag(orig);
            const origBaseLang = normalizedOrig.split('-')[0];
            const localizedOrig = userRegion ? this.normalizeLanguageTag(`${origBaseLang}-${userRegion}`) : origBaseLang;
            if (localizedOrig && !candidates.includes(localizedOrig)) candidates.push(localizedOrig);
        }

        if (!candidates.includes('en-US')) candidates.push('en-US');
        return candidates;
    }

    private buildDiscoverUrlBase(language: string): string {
        const region = this.getUserRegion();
        const regionParam = region ? `&region=${region}` : '';
        return `${this.tmdbBaseUrl}/discover/movie?include_adult=false&include_video=false&language=${language}&page=1${regionParam}`;
    }

    private buildSearchUrlBase(language: string): string {
        return `${this.tmdbBaseUrl}/search/movie?include_adult=false&language=${language}&page=1&query=`;
    }

    private getWithLanguageFallback<T>(
        urlForLanguage: (language: string) => string,
        hasResults: (response: T) => boolean,
        languages: string[],
    ): Observable<T> {
        const tryAt = (index: number): Observable<T> => {
            const language = languages[index];
            return this.http.get<T>(urlForLanguage(language), { headers: this.headers }).pipe(
                switchMap((response) => {
                    const ok = hasResults(response);
                    if (ok || index >= languages.length - 1) {
                        return of(response);
                    }
                    return tryAt(index + 1);
                }),
                catchError((error) => {
                    if (index < languages.length - 1) {
                        return tryAt(index + 1);
                    }
                    return throwError(() => error);
                }),
            );
        };

        return tryAt(0);
    }

    DiscoverMovies(alphabeticSelect: string = 'popularity.desc', selectedYear : string = '', selectedGenre: string = ''): Observable<DiscoverMovieResponse> {
        if (selectedYear != "") {
            this.date = `&primary_release_year=${selectedYear}`;
        } else {
            this.date = "";
        }

        if (selectedGenre != "") {
            this.genre = `&with_genres=${selectedGenre}`;
        } else {
            this.genre = "";
        }

        return this.getWithLanguageFallback<DiscoverMovieResponse>(
            (language) => this.buildDiscoverUrlBase(language) + this.date + this.genre + `&sort_by=${alphabeticSelect}`,
            (response) => Array.isArray(response?.results) && response.results.length > 0,
            this.getLanguageFallbacks(),
        );
    }

    SearchMovies(query: string, selectedYear: string = ''): Observable<DiscoverMovieResponse> {
        return this.getWithLanguageFallback<DiscoverMovieResponse>(
            (language) => {
                let url = this.buildSearchUrlBase(language) + encodeURIComponent(query);
                if (selectedYear != "") {
                    url += `&primary_release_year=${selectedYear}`;
                }
                return url;
            },
            (response) => Array.isArray(response?.results) && response.results.length > 0,
            this.getLanguageFallbacks(),
        );
    }

    getMovieGenres(): Observable<GenreResponse> {
        return this.getWithLanguageFallback<GenreResponse>(
            (language) => `${this.tmdbBaseUrl}/genre/movie/list?language=${language}`,
            (response) => Array.isArray(response?.genres) && response.genres.length > 0,
            this.getLanguageFallbacks(),
        );
    }

    getMovieCredits(movieId: number): Observable<MovieCreditsResponse> {
        return this.getWithLanguageFallback<MovieCreditsResponse>(
            (language) => `${this.tmdbBaseUrl}/movie/${movieId}/credits?language=${language}`,
            (response) => Array.isArray(response?.cast) && response.cast.length > 0,
            this.getLanguageFallbacks(),
        );
    }

    getMovieVideos(movieId: number): Observable<MovieVideosResponse>;
    getMovieVideos(movieId: number, language: string): Observable<MovieVideosResponse>;
    getMovieVideos(movieId: number, options: { originalLanguage?: string }): Observable<MovieVideosResponse>;
    getMovieVideos(movieId: number, languageOrOptions?: string | { originalLanguage?: string }): Observable<MovieVideosResponse> {
        if (typeof languageOrOptions === 'string' && languageOrOptions.trim()) {
            const language = this.normalizeLanguageTag(languageOrOptions);
            const url = `${this.tmdbBaseUrl}/movie/${movieId}/videos?language=${language}`;
            return this.http.get<MovieVideosResponse>(url, { headers: this.headers });
        }

        const originalLanguage = (languageOrOptions && typeof languageOrOptions === 'object')
            ? languageOrOptions.originalLanguage
            : undefined;

        return this.getWithLanguageFallback<MovieVideosResponse>(
            (lang) => `${this.tmdbBaseUrl}/movie/${movieId}/videos?language=${lang}`,
            (response) => Array.isArray(response?.results) && response.results.length > 0,
            this.getLanguageFallbacks(originalLanguage),
        );
    }

    getMovieDetails(movieId: number): Observable<MovieDetailsResponse>;
    getMovieDetails(movieId: number, options: { originalLanguage?: string }): Observable<MovieDetailsResponse>;
    getMovieDetails(movieId: number, options?: { originalLanguage?: string }): Observable<MovieDetailsResponse> {
        return this.getWithLanguageFallback<MovieDetailsResponse>(
            (language) => `${this.tmdbBaseUrl}/movie/${movieId}?language=${language}`,
            (response) => response != null && response.runtime != null,
            this.getLanguageFallbacks(options?.originalLanguage),
        );
    }

    getYouTubeVideoStats(videoId: string): Observable<any> {
        const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtube_key}&part=statistics`;
        return this.http.get(url);
    }
}
