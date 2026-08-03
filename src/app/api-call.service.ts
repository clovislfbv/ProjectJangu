import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export const EXCLUDED_TV_GENRE_IDS = new Set([16, 10763, 10764, 10766, 10767]);

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

export interface PersonDetails {
    id: number;
    name: string;
    biography: string;
    birthday: string | null;
    deathday: string | null;
    place_of_birth: string | null;
    profile_path: string | null;
    known_for_department: string;
}

export interface PersonMovieCredit {
    id: number;
    title: string;
    character: string;
    poster_path: string | null;
    release_date: string;
    vote_count: number;
}

export interface PersonMovieCreditsResponse {
    id: number;
    cast: PersonMovieCredit[];
}

export interface PersonTvCredit {
    id: number;
    name: string;
    character: string;
    poster_path: string | null;
    first_air_date: string;
    vote_count: number;
    genre_ids: number[];
    original_name: string;
    overview: string;
    backdrop_path: string | null;
    original_language: string;
    popularity: number;
    vote_average: number;
    origin_country: string[];
    episode_count?: number;
}

export interface PersonTvCreditsResponse {
    id: number;
    cast: PersonTvCredit[];
}

export interface PersonSearchResult {
    id: number;
    name: string;
    profile_path: string | null;
    known_for_department: string;
    known_for: Array<{
        id: number;
        title?: string;
        name?: string;
        media_type: string;
    }>;
}

export interface PersonSearchResponse {
    page: number;
    results: PersonSearchResult[];
    total_pages: number;
    total_results: number;
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

export interface TvShow {
    id: number;
    name: string;
    original_name: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    first_air_date: string;
    genre_ids: number[];
    original_language: string;
    popularity: number;
    vote_average: number;
    vote_count: number;
    origin_country: string[];
}

export interface PopularTvResponse {
    page: number;
    results: TvShow[];
    total_pages: number;
    total_results: number;
}

export interface TvShowDetails extends TvShow {
    genres: Genre[];
    episode_run_time: number[];
    number_of_episodes: number;
    number_of_seasons: number;
    status: string;
    tagline: string;
    last_air_date: string;
    networks: Array<{ id: number; name: string; logo_path: string | null }>;
    seasons: Array<{ id: number; name: string; episode_count: number; air_date: string | null; poster_path: string | null; season_number: number }>;
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

interface MovieKeywordsResponse {
    id: number;
    keywords: Array<{ id: number; name: string }>;
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

    private hasEroticKeywords(movieId: number): Observable<boolean> {
        const url = `${this.tmdbBaseUrl}/movie/${movieId}/keywords`;
        const eroticKeywords = new Set([
            'erotic', 'erotica', 'erotic movie', 'softcore', 'softcore porn',
            'pornography', 'pornographic film', 'sexploitation', 'adult film',
            'explicit sex', 'sexual exploration', 'sexual relationship',
            'sexual awakening', 'unsimulated sex', 'graphic sex',
        ]);

        return this.http.get<MovieKeywordsResponse>(url).pipe(
            map((response) => {
                return (response?.keywords ?? []).some(keyword =>
                    eroticKeywords.has((keyword.name ?? '').trim().toLowerCase())
                );
            }),
            // Missing keyword data must not remove the movie.
            catchError(() => of(false)),
        );
    }

    private isKnownEroticMovie(movie: Movie): boolean {
        const normalizeTitle = (title: string): string => title
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
        const releaseYear = (movie.release_date ?? '').slice(0, 4);
        const titles = [movie.title, movie.original_title].map(normalizeTitle);

        const knownEroticMovies: Record<string, string[]> = {
            '2000': ['baise-moi', 'rape me'],
            '2001': ['intimite', 'intimacy'],
            '2005': ['comme un frere'],
        };

        return (knownEroticMovies[releaseYear] ?? []).some(title => titles.includes(title));
    }

    private hasEroticTitleOrOverview(movie: Movie): boolean {
        const normalize = (value: string): string => value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
        const title = normalize(`${movie.title ?? ''} ${movie.original_title ?? ''}`);
        const overview = normalize(movie.overview ?? '');
        const text = `${title} ${overview}`;

        if (title.includes('i want your sex')) return true;

        const explicitPhrases = [
            'chroniques sexuelles', 'sexual chronicles', 'sexual chronicle',
            'film erotique', 'erotic film', 'erotic movie', 'sexual exploration',
            'exploration sexuelle', 'sexual awakening', 'eveil sexuel',
            'sexual relationship', 'relations sexuelles', 'explicit sex',
            'sexe explicite', 'unsimulated sex', 'sexe non simule',
            'graphic sex', 'scenes sexuelles explicites', 'softcore',
            'pornograph', 'sexploitation',
        ];
        if (explicitPhrases.some(phrase => text.includes(phrase))) return true;

        const centralityTerms = [
            'sexualite', 'sexuality', 'desirs sexuels', 'sexual desires',
            'vie sexuelle', 'sex life', 'experiences sexuelles', 'sexual experiences',
        ];
        const focusTerms = [
            'explore', 'explores', 'explorent', 'decouvre', 'discover',
            'initiation', 'chronique', 'chronicles', 'centré', 'centered',
        ];

        return centralityTerms.some(term => text.includes(term))
            && focusTerms.some(term => text.includes(term));
    }

    excludeEroticMovies(movies: Movie[]): Observable<Movie[]> {
        if (!movies.length) return of([]);

        return forkJoin(movies.map(movie =>
            (this.isKnownEroticMovie(movie) || this.hasEroticTitleOrOverview(movie)
                ? of(true)
                : this.hasEroticKeywords(movie.id)).pipe(
                map(isErotic => ({ movie, isErotic })),
            )
        )).pipe(
            map(results => results.filter(result => !result.isErotic).map(result => result.movie)),
        );
    }

    excludeMoviesShorterThan(movies: Movie[], minimumRuntime: number): Observable<Movie[]> {
        if (!movies.length) return of([]);

        return forkJoin(movies.map(movie =>
            this.http.get<MovieDetailsResponse>(`${this.tmdbBaseUrl}/movie/${movie.id}`).pipe(
                map(details => ({ movie, runtime: details?.runtime })),
                // Unknown runtime must not remove an otherwise valid movie.
                catchError(() => of({ movie, runtime: null })),
            )
        )).pipe(
            map(results => results
                .filter(({ runtime }) => runtime == null || runtime >= minimumRuntime)
                .map(({ movie }) => movie)),
        );
    }

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
        // TMDB's lower runtime bound is inclusive, so 51 keeps only movies
        // whose runtime is strictly greater than 50 minutes.
        const runtimeParam = '&with_runtime.gte=51';
        const sortParam = hasActiveFilters ? `&sort_by=${encodeURIComponent(alphabeticSelect || 'popularity.desc')}` : '';

        return this.getWithLanguageFallback<DiscoverMovieResponse>(
            (language) => this.buildMovieListUrlBase(language, page, hasActiveFilters)
                + yearParam + genreParam + countryParam + runtimeParam + sortParam,
            (response) => Array.isArray(response?.results) && response.results.length > 0,
            this.getLanguageFallbacks(),
        );
    }

    getPopularMovies(page: number = 1): Observable<DiscoverMovieResponse> {
        return this.getWithLanguageFallback<DiscoverMovieResponse>(
            (language) => `${this.tmdbBaseUrl}/movie/popular?include_adult=false&language=${language}&page=${page}`,
            (response) => Array.isArray(response?.results) && response.results.length > 0,
            this.getLanguageFallbacks(),
        );
    }

    getPopularTvShows(page: number = 1): Observable<PopularTvResponse> {
        return this.getWithLanguageFallback<PopularTvResponse>(
            (language) => `${this.tmdbBaseUrl}/tv/popular?include_adult=false&language=${language}&page=${page}`,
            (response) => Array.isArray(response?.results) && response.results.length > 0,
            this.getLanguageFallbacks(),
        );
    }

    discoverTvShows(
        sort: string = 'popularity.desc',
        selectedYear: string = '',
        selectedGenre: string = '',
        selectedCountry: string = '',
        page: number = 1,
    ): Observable<PopularTvResponse> {
        const sortMap: Record<string, string> = {
            'popularity.desc': 'popularity.desc',
            'title.asc': 'name.asc',
            'title.desc': 'name.desc',
        };
        const yearParam = selectedYear ? `&first_air_date_year=${encodeURIComponent(selectedYear)}` : '';
        const genreParam = selectedGenre ? `&with_genres=${encodeURIComponent(selectedGenre)}` : '';
        const countryParam = selectedCountry ? `&with_origin_country=${encodeURIComponent(selectedCountry)}` : '';
        const sortParam = `&sort_by=${encodeURIComponent(sortMap[sort] ?? 'popularity.desc')}`;

        return this.getWithLanguageFallback<PopularTvResponse>(
            (language) => `${this.tmdbBaseUrl}/discover/tv?include_adult=false&language=${language}&page=${page}`
                + yearParam + genreParam + countryParam + sortParam,
            (response) => Array.isArray(response?.results) && response.results.length > 0,
            this.getLanguageFallbacks(),
        );
    }

    searchTvShows(query: string, selectedYear: string = '', page: number = 1): Observable<PopularTvResponse> {
        return this.getWithLanguageFallback<PopularTvResponse>(
            (language) => {
                const yearParam = selectedYear ? `&first_air_date_year=${encodeURIComponent(selectedYear)}` : '';
                return `${this.tmdbBaseUrl}/search/tv?include_adult=false&language=${language}&page=${page}&query=${encodeURIComponent(query)}${yearParam}`;
            },
            (response) => Array.isArray(response?.results) && response.results.length > 0,
            this.getLanguageFallbacks(),
        );
    }

    getTvShowDetails(tvId: number): Observable<TvShowDetails> {
        return this.getWithLanguageFallback<TvShowDetails>(
            (language) => `${this.tmdbBaseUrl}/tv/${tvId}?language=${language}`,
            (show) => show?.id === tvId && Boolean(show.name),
            this.getLanguageFallbacks(),
        );
    }

    getTvShowById(tvId: number): Observable<TvShow> {
        return this.getWithLanguageFallback<TvShow>(
            (language) => `${this.tmdbBaseUrl}/tv/${tvId}?language=${language}`,
            (show) => show?.id === tvId && Boolean(show.name),
            this.getLanguageFallbacks(),
        );
    }

    getTvShowCredits(tvId: number): Observable<MovieCreditsResponse> {
        return this.getWithLanguageFallback<MovieCreditsResponse>(
            (language) => `${this.tmdbBaseUrl}/tv/${tvId}/credits?language=${language}`,
            (response) => Array.isArray(response?.cast),
            this.getLanguageFallbacks(),
        );
    }

    getTvShowVideos(tvId: number, originalLanguage?: string): Observable<MovieVideosResponse> {
        return this.getWithLanguageFallback<MovieVideosResponse>(
            (language) => `${this.tmdbBaseUrl}/tv/${tvId}/videos?language=${language}`,
            (response) => Array.isArray(response?.results) && response.results.length > 0,
            this.getLanguageFallbacks(originalLanguage),
        );
    }

    getTvWatchProviders(tvId: number): Observable<{ providers: WatchProvider[]; link?: string; region: string }> {
        const preferredRegion = this.getUserRegion() ?? 'US';
        return this.http.get<MovieWatchProvidersResponse>(`${this.tmdbBaseUrl}/tv/${tvId}/watch/providers`).pipe(
            map(response => {
                const entry = response?.results?.[preferredRegion] ?? response?.results?.['US'];
                return { providers: entry?.flatrate ?? [], link: entry?.link, region: preferredRegion };
            }),
            catchError(() => of({ providers: [], region: preferredRegion })),
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

    SearchPersons(query: string): Observable<PersonSearchResponse> {
        return this.getWithLanguageFallback<PersonSearchResponse>(
            (language) => `${this.tmdbBaseUrl}/search/person?include_adult=false&language=${language}&page=1&query=${encodeURIComponent(query)}`,
            (response) => Array.isArray(response?.results) && response.results.length > 0,
            this.getLanguageFallbacks(),
        );
    }

    getMovieById(movieId: number): Observable<Movie> {
        return this.getWithLanguageFallback<Movie>(
            (language) => `${this.tmdbBaseUrl}/movie/${movieId}?language=${language}`,
            (movie) => movie != null && movie.id === movieId && Boolean(movie.title),
            this.getLanguageFallbacks(),
        );
    }

    getPersonDetails(personId: number): Observable<PersonDetails> {
        return this.getWithLanguageFallback<PersonDetails>(
            (language) => `${this.tmdbBaseUrl}/person/${personId}?language=${language}`,
            (person) => person != null && person.id === personId && Boolean(person.name),
            this.getLanguageFallbacks(),
        );
    }

    getPersonMovieCredits(personId: number): Observable<PersonMovieCreditsResponse> {
        return this.getWithLanguageFallback<PersonMovieCreditsResponse>(
            (language) => `${this.tmdbBaseUrl}/person/${personId}/movie_credits?language=${language}`,
            (response) => Array.isArray(response?.cast) && response.cast.length > 0,
            this.getLanguageFallbacks(),
        );
    }

    getPersonTvCredits(personId: number): Observable<PersonTvCreditsResponse> {
        return this.getWithLanguageFallback<PersonTvCreditsResponse>(
            (language) => `${this.tmdbBaseUrl}/person/${personId}/tv_credits?language=${language}`,
            (response) => Array.isArray(response?.cast) && response.cast.length > 0,
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

    getTvGenres(): Observable<GenreResponse> {
        return this.getWithLanguageFallback<GenreResponse>(
            (language) => `${this.tmdbBaseUrl}/genre/tv/list?language=${language}`,
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
