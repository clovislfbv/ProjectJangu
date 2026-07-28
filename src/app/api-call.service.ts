import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
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
    origin_country?: string[];
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
    production_countries?: Array<{
        iso_3166_1: string;
        name: string;
    }>;
}

export interface MovieOverviewResponse {
    id: number;
    overview?: string | null;
}

export interface WatchProvider {
    provider_id: number;
    provider_name: string;
    logo_path: string | null;
    display_priority?: number;
}

export interface MovieWatchProvidersResponse {
    id: number;
    results: Record<
        string,
        {
            link?: string;
            flatrate?: WatchProvider[];
            rent?: WatchProvider[];
            buy?: WatchProvider[];
        }
    >;
}

export interface WatchmodeSearchResponse {
    title_results: Array<{
        id: number;
        name?: string;
        type?: string;
        year?: number;
    }>;
    people_results: any[];
}

export interface WatchmodeTitleSource {
    source_id: number;
    name: string;
    type: 'sub' | 'rent' | 'buy' | 'free' | 'tve';
    region: string;
    web_url: string | null;
    ios_url?: string | null;
    android_url?: string | null;
    format?: string | null;
    price?: number | null;
}

export interface WatchmodeSourceMeta {
    id: number;
    name: string;
    type: 'sub' | 'purchase' | 'free' | 'tve' | string;
    logo_100px?: string;
    ios_appstore_url?: string | null;
    android_playstore_url?: string | null;
    regions?: string[];
}

export interface StreamingLink {
    sourceId: number;
    name: string;
    type: string;
    logoUrl?: string;
    webUrl: string;
    region?: string;
}

@Injectable({
    providedIn: 'root',
})
export class ApiCallService {
    private readonly tmdbBaseUrl = '/api/tmdb/3';
    private readonly watchmodeBaseUrl = '/api/watchmode/v1';
    private readonly youtubeBaseUrl = '/api/youtube/v3';

    constructor(private http: HttpClient) {}

    private watchmodeSourceMetaCache?: Record<number, WatchmodeSourceMeta>;

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

    private toWatchmodeLocale(tag: string): string {
        // Watchmode uses locale like en_US
        const normalized = this.normalizeLanguageTag(tag);
        const [lang, region] = normalized.split('-');
        if (lang && region) return `${lang.toLowerCase()}_${region.toUpperCase()}`;
        // Default if no region is available
        return `${(lang || 'en').toLowerCase()}_US`;
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

    private getWatchmodeSourceMetaMap(): Observable<Record<number, WatchmodeSourceMeta>> {
        if (this.watchmodeSourceMetaCache) {
            return of(this.watchmodeSourceMetaCache);
        }

        const url = `${this.watchmodeBaseUrl}/sources`;
        return this.http.get<WatchmodeSourceMeta[]>(url).pipe(
            switchMap((sources) => {
                const map: Record<number, WatchmodeSourceMeta> = {};
                for (const s of sources || []) {
                    if (typeof s?.id === 'number') map[s.id] = s;
                }
                this.watchmodeSourceMetaCache = map;
                return of(map);
            }),
            catchError(() => {
                // If Watchmode is unavailable, keep the app functioning.
                return of({} as Record<number, WatchmodeSourceMeta>);
            }),
        );
    }

    private getWatchmodeTitleIdFromTmdbMovieId(tmdbMovieId: number): Observable<number | null> {
        const url = `${this.watchmodeBaseUrl}/search`
            + `?search_field=tmdb_movie_id&search_value=${encodeURIComponent(String(tmdbMovieId))}&types=movie`;
        return this.http.get<WatchmodeSearchResponse>(url).pipe(
            switchMap((res) => {
                const first = res?.title_results?.[0];
                return of(typeof first?.id === 'number' ? first.id : null);
            }),
            catchError(() => of(null)),
        );
    }

    private getWatchmodeTitleSources(watchmodeTitleId: number, region?: string): Observable<WatchmodeTitleSource[]> {
        const regionsParam = region ? `?regions=${encodeURIComponent(region)}` : '';
        const url = `${this.watchmodeBaseUrl}/title/${encodeURIComponent(String(watchmodeTitleId))}/sources${regionsParam}`;
        return this.http.get<WatchmodeTitleSource[]>(url).pipe(
            catchError(() => of([])),
        );
    }

    getStreamingLinksForTmdbMovie(tmdbMovieId: number): Observable<StreamingLink[]> {
        const region = this.getUserRegion();
        const regionFallbacks = region ? [region, 'US'] : ['US'];

        return this.getWatchmodeTitleIdFromTmdbMovieId(tmdbMovieId).pipe(
            switchMap((watchmodeId) => {
                if (!watchmodeId) return of([]);

                const tryRegionAt = (idx: number): Observable<WatchmodeTitleSource[]> => {
                    const r = regionFallbacks[idx];
                    return this.getWatchmodeTitleSources(watchmodeId, r).pipe(
                        switchMap((sources) => {
                            const withWeb = (sources || []).filter((s) => !!s?.web_url);
                            if (withWeb.length > 0 || idx >= regionFallbacks.length - 1) {
                                return of(withWeb);
                            }
                            return tryRegionAt(idx + 1);
                        }),
                    );
                };

                return tryRegionAt(0);
            }),
            switchMap((sources) =>
                this.getWatchmodeSourceMetaMap().pipe(
                    switchMap((metaMap) => {
                        // Prefer subscription offers; keep others after.
                        const order: Record<string, number> = { sub: 0, free: 1, rent: 2, buy: 3, tve: 4 };
                        const uniqueBySource: Record<number, WatchmodeTitleSource> = {};
                        for (const s of sources || []) {
                            if (!s?.source_id || !s?.web_url) continue;
                            // Prefer subscription if multiple entries exist for same source.
                            const prev = uniqueBySource[s.source_id];
                            if (!prev) {
                                uniqueBySource[s.source_id] = s;
                            } else {
                                const prevRank = order[prev.type] ?? 99;
                                const nextRank = order[s.type] ?? 99;
                                if (nextRank < prevRank) uniqueBySource[s.source_id] = s;
                            }
                        }

                        const links: StreamingLink[] = Object.values(uniqueBySource).map((s) => {
                            const meta = metaMap?.[s.source_id];
                            return {
                                sourceId: s.source_id,
                                name: s.name,
                                type: s.type,
                                logoUrl: meta?.logo_100px,
                                webUrl: s.web_url as string,
                                region: s.region,
                            };
                        });

                        links.sort((a, b) => (order[a.type] ?? 99) - (order[b.type] ?? 99));
                        return of(links);
                    }),
                )
            ),
        );
    }

    private buildMovieListUrlBase(language: string, page: number = 1, hasActiveFilters: boolean = false): string {
        const region = this.getUserRegion();
        const regionParam = region ? `&region=${region}` : '';
        const endpoint = hasActiveFilters ? 'discover/movie' : 'movie/now_playing';
        return `${this.tmdbBaseUrl}/${endpoint}?include_adult=false&include_video=false&language=${language}&page=${page}${regionParam}`;
    }

    private buildSearchUrlBase(language: string, page: number = 1): string {
        return `${this.tmdbBaseUrl}/search/movie?include_adult=false&language=${language}&page=${page}&query=`;
    }

    private getWithLanguageFallback<T>(
        urlForLanguage: (language: string) => string,
        hasResults: (response: T) => boolean,
        languages: string[],
    ): Observable<T> {
        const tryAt = (index: number): Observable<T> => {
            const language = languages[index];
            return this.http.get<T>(urlForLanguage(language)).pipe(
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

    private getWithLanguageFallbackAndLanguage<T>(
        urlForLanguage: (language: string) => string,
        hasResults: (response: T) => boolean,
        languages: string[],
    ): Observable<{ language: string; response: T }> {
        const tryAt = (index: number): Observable<{ language: string; response: T }> => {
            const language = languages[index];
            return this.http.get<T>(urlForLanguage(language)).pipe(
                switchMap((response) => {
                    const ok = hasResults(response);
                    if (ok || index >= languages.length - 1) {
                        return of({ language, response });
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

    DiscoverMovies(alphabeticSelect: string = 'popularity.desc', selectedYear: string = '', selectedGenre: string = '', selectedCountry: string = '', page: number = 1): Observable<DiscoverMovieResponse> {
        const hasActiveFilters = Boolean(
            selectedYear ||
            selectedGenre ||
            selectedCountry ||
            (alphabeticSelect && alphabeticSelect !== 'popularity.desc')
        );
        const yearParam = selectedYear ? `&primary_release_year=${encodeURIComponent(selectedYear)}` : '';
        const genreParam = selectedGenre ? `&with_genres=${encodeURIComponent(selectedGenre)}` : '';
        const countryParam = selectedCountry ? `&with_origin_country=${encodeURIComponent(selectedCountry)}` : '';
        const voteAverageParam = '&vote_average.gte=1&vote_average.lte=9';
        const sortParam = hasActiveFilters ? `&sort_by=${encodeURIComponent(alphabeticSelect || 'popularity.desc')}` : '';

        return this.getWithLanguageFallback<DiscoverMovieResponse>(
            (language) => this.buildMovieListUrlBase(language, page, hasActiveFilters)
                + yearParam + genreParam + countryParam + voteAverageParam + sortParam,
            (response) => Array.isArray(response?.results) && response.results.length > 0,
            this.getLanguageFallbacks(),
        );
    }

    SearchMovies(query: string, selectedYear: string = '', selectedCountry: string = '', page: number = 1): Observable<DiscoverMovieResponse> {
        return this.getWithLanguageFallback<DiscoverMovieResponse>(
            (language) => {
                let url = this.buildSearchUrlBase(language, page) + encodeURIComponent(query);
                if (selectedYear != "") {
                    url += `&primary_release_year=${selectedYear}`;
                }
                if (selectedCountry) {
                    url += `&region=${encodeURIComponent(selectedCountry)}`;
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
            return this.http.get<MovieVideosResponse>(url);
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

    getMovieOverview(movieId: number): Observable<string | null> {
        const preferredLanguage = this.getUserLanguageTag();
        const fallbackLanguage = 'en-US';

        const fetchOverview = (language: string): Observable<string | null> => {
            const url = `${this.tmdbBaseUrl}/movie/${movieId}?language=${encodeURIComponent(language)}`;
            return this.http.get<MovieOverviewResponse>(url).pipe(
                switchMap((res) => {
                    const overview = (res?.overview ?? '').trim();
                    return of(overview.length > 0 ? overview : null);
                }),
            );
        };

        // Prefer user's language; if overview is missing, fallback to en-US.
        // If the preferred request fails, also fallback to en-US.
        return fetchOverview(preferredLanguage).pipe(
            catchError(() => of(null)),
            switchMap((overview) => {
                if (overview) return of(overview);
                return fetchOverview(fallbackLanguage).pipe(
                    catchError(() => of(null)),
                );
            }),
        );
    }

    getMovieWatchProviders(movieId: number): Observable<{ providers: WatchProvider[]; link?: string; region: string }> {
        const url = `${this.tmdbBaseUrl}/movie/${movieId}/watch/providers`;
        const preferredRegion = this.getUserRegion() ?? 'US';
        const regionFallbacks = preferredRegion === 'US' ? ['US'] : [preferredRegion, 'US'];

        return this.http.get<MovieWatchProvidersResponse>(url).pipe(
            switchMap((response) => {
                const results = response?.results ?? {};
                for (const region of regionFallbacks) {
                    const entry = results[region];
                    const providers = entry?.flatrate ?? [];
                    if (providers.length > 0) {
                        return of({ providers, link: entry?.link, region });
                    }
                }
                return of({ providers: [], link: results[preferredRegion]?.link, region: preferredRegion });
            }),
        );
    }

    getYouTubeVideoStats(videoId: string): Observable<any> {
        const url = `${this.youtubeBaseUrl}/videos?id=${encodeURIComponent(videoId)}&part=statistics`;
        return this.http.get(url).pipe(
            catchError(() => of(null)),
        );
    }
}
