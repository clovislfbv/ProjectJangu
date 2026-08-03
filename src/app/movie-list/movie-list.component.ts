import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { MovieComponent } from '../movie/movie.component';
import { MovieDetailOverlayComponent } from '../movie-detail-overlay/movie-detail-overlay.component';
import { ApiCallService, DiscoverMovieResponse, EXCLUDED_TV_GENRE_IDS, Movie, PersonSearchResult, PopularTvResponse, TvShow } from '../api-call.service';
import { map, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { PersonDetailOverlayComponent } from '../person-detail-overlay/person-detail-overlay.component';
import { CastMember } from '../api-call.service';
import { TvDetailOverlayComponent } from '../tv-detail-overlay/tv-detail-overlay.component';

interface MovieListCriteria {
    query: string;
    alphabetic: string;
    year: string;
    genre: string;
    country: string;
}

type MovieListView = 'now-playing' | 'popular' | 'popular-tv';

@Component({
    selector: 'app-movie-list',
    standalone: true,
    imports: [CommonModule, NgFor, NgIf, MovieComponent, MovieDetailOverlayComponent, PersonDetailOverlayComponent, TvDetailOverlayComponent],
    templateUrl: './movie-list.component.html',
    styleUrls: ['./movie-list.component.css'],
})
export class MovieListComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('scrollSentinel') scrollSentinel?: ElementRef<HTMLElement>;
    movies: Movie[] = [];
    selectedMovie: Movie | null = null;
    selectedPersonId: number | null = null;
    people: PersonSearchResult[] = [];
    tvShows: TvShow[] = [];
    selectedTvShow: TvShow | null = null;
    selectedSeasonNumber: number | null = null;
    isLoading: boolean = true;
    loadError: string | null = null;
    private currentPage = 0;
    private totalPages = 1;
    private requestGeneration = 0;
    private observer?: IntersectionObserver;
    private movieLinkSubscription?: Subscription;
    private openingMovieFromActorId: number | null = null;
    private currentView: MovieListView = 'now-playing';
    private activeMediaType: 'movie' | 'tv' = 'movie';
    private criteria: MovieListCriteria = {
        query: '', alphabetic: 'popularity.desc', year: '', genre: '', country: '',
    };

    constructor(
        private api_call: ApiCallService,
        private route: ActivatedRoute,
        private router: Router,
    ) {}

    private excludeAdultMovies(movies: Movie[]): Movie[] {
        return (movies || []).filter(movie => !movie.adult);
    }

    private removeDuplicateMovies(movies: Movie[]): Movie[] {
        const seenMovieIds = new Set<number>();
        return (movies || []).filter((movie) => {
            if (seenMovieIds.has(movie.id)) return false;
            seenMovieIds.add(movie.id);
            return true;
        });
    }

    private prepareMoviesForDisplay(movies: Movie[]): Movie[] {
        return this.removeDuplicateMovies(this.excludeAdultMovies(movies));
    }

    private filterResponsePage(res: DiscoverMovieResponse, isDefaultView: boolean): Observable<DiscoverMovieResponse> {
        return this.api_call.excludeEroticMovies(res.results ?? []).pipe(
            switchMap(results => isDefaultView
                ? this.api_call.excludeMoviesShorterThan(results, 50)
                : [results]),
            map(results => ({ ...res, results })),
        );
    }

    ngOnInit() {
        this.movieLinkSubscription = this.route.queryParamMap.subscribe((params) => {
            const rawMovieId = params.get('movie');
            const rawTvId = params.get('tv');
            const rawSeasonNumber = params.get('season');
            const rawActorId = params.get('actor');
            const actorId = Number(rawActorId);
            this.selectedPersonId = rawActorId && Number.isInteger(actorId) && actorId > 0 ? actorId : null;
            const seasonNumber = Number(rawSeasonNumber);
            this.selectedSeasonNumber = rawTvId && rawSeasonNumber !== null
                && Number.isInteger(seasonNumber) && seasonNumber >= 0
                ? seasonNumber
                : null;

            if (!rawTvId) {
                this.selectedTvShow = null;
                this.selectedSeasonNumber = null;
            } else {
                const tvId = Number(rawTvId);
                if (!Number.isInteger(tvId) || tvId <= 0) {
                    this.closeTvShow();
                } else if (this.selectedTvShow?.id !== tvId) {
                    const loadedShow = this.tvShows.find(show => show.id === tvId);
                    if (loadedShow) {
                        this.selectedTvShow = loadedShow;
                    } else {
                        this.api_call.getTvShowById(tvId).subscribe({
                            next: show => this.selectedTvShow = show,
                            error: () => this.closeTvShow(),
                        });
                    }
                }
            }
            if (!rawMovieId) {
                // The URL is the source of truth. In particular, browser Back
                // from a movie to its actor must clear the hidden movie state
                // so the same film can be selected again afterwards.
                this.selectedMovie = null;
                return;
            }

            const movieId = Number(rawMovieId);
            if (!Number.isInteger(movieId) || movieId <= 0) {
                this.closeMovie();
                return;
            }

            // onSelect() sets the movie before updating the URL. For movies
            // opened from an actor profile, the movie is not necessarily in
            // the main list; do not fetch and assign it a second time when the
            // query-param navigation is observed, otherwise the detail iframe
            // and streaming content are recreated.
            if (this.selectedMovie?.id === movieId) return;

            const loadedMovie = this.movies.find(movie => movie.id === movieId);
            if (loadedMovie) {
                this.selectedMovie = loadedMovie;
                return;
            }

            this.api_call.getMovieById(movieId).subscribe({
                next: movie => this.selectedMovie = movie,
                error: () => this.closeMovie(),
            });
        });
        this.resetAndLoad();
    }

    ngAfterViewInit(): void {
        if (typeof IntersectionObserver === 'undefined' || !this.scrollSentinel) return;
        this.observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) this.loadNextPage();
        }, { rootMargin: '400px 0px' });
        this.observer.observe(this.scrollSentinel.nativeElement);
    }

    ngOnDestroy(): void {
        this.observer?.disconnect();
        this.movieLinkSubscription?.unsubscribe();
    }

    private resetAndLoad(): void {
        this.requestGeneration++;
        this.movies = [];
        this.tvShows = [];
        this.loadError = null;
        this.currentPage = 0;
        this.totalPages = 1;
        this.isLoading = false;
        this.loadNextPage();
    }

    loadNextPage(): void {
        if (this.isLoading || this.currentPage >= this.totalPages) return;

        const generation = this.requestGeneration;
        const page = this.currentPage + 1;
        const { query, alphabetic, year, genre, country } = this.criteria;
        const trimmedQuery = query.trim().toLowerCase();
        const isDefaultView = !trimmedQuery
            && !year
            && !genre
            && !country
            && alphabetic === 'popularity.desc';
        this.isLoading = true;
        this.loadError = null;
        if (this.currentView === 'popular-tv') {
            this.isLoading = true;
            const hasTvFilters = Boolean(trimmedQuery || year || genre || country || alphabetic !== 'popularity.desc');
            const tvRequest = trimmedQuery
                ? this.api_call.searchTvShows(query, year, page)
                : hasTvFilters
                    ? this.api_call.discoverTvShows(alphabetic, year, genre, country, page)
                    : this.api_call.getPopularTvShows(page);
            tvRequest.subscribe({
                next: (res: PopularTvResponse) => {
                    if (generation !== this.requestGeneration) return;
                    // Genre exclusions apply only while browsing/discovering series.
                    // An explicit title search must be able to find any requested show.
                    let scriptedShows = trimmedQuery
                        ? (res.results ?? [])
                        : (res.results ?? []).filter(show =>
                            !show.genre_ids?.some(genreId => EXCLUDED_TV_GENRE_IDS.has(genreId))
                        );
                    if (trimmedQuery && genre) {
                        scriptedShows = scriptedShows.filter(show => show.genre_ids.includes(Number(genre)));
                    }
                    if (trimmedQuery && country) {
                        scriptedShows = scriptedShows.filter(show => show.origin_country?.includes(country));
                    }
                    if (trimmedQuery && alphabetic !== 'popularity.desc') {
                        scriptedShows.sort((a, b) => alphabetic === 'title.asc'
                            ? a.name.localeCompare(b.name)
                            : b.name.localeCompare(a.name));
                    }
                    this.tvShows = [...this.tvShows, ...scriptedShows]
                        .filter((show, index, all) => all.findIndex(item => item.id === show.id) === index);
                    this.currentPage = res.page || page;
                    this.totalPages = Math.max(this.currentPage, res.total_pages || 1);
                    this.isLoading = false;
                },
                error: () => {
                    this.isLoading = false;
                    this.loadError = 'Impossible de charger les séries populaires.';
                },
            });
            return;
        }
        const request = this.currentView === 'popular' && isDefaultView
            ? this.api_call.getPopularMovies(page)
            : country
            ? this.api_call.DiscoverMovies(alphabetic, year, genre, country, page)
            : trimmedQuery
                ? this.api_call.SearchMovies(query, year, '', page)
                : this.api_call.DiscoverMovies(alphabetic, year, genre, '', page);

        request.pipe(
            // Every API page goes through the same content filter before it is appended,
            // whether it comes from the default view, filters, or text search.
            switchMap((res: DiscoverMovieResponse) => this.filterResponsePage(res, isDefaultView)),
        ).subscribe({
            next: (res: DiscoverMovieResponse) => {
                if (generation !== this.requestGeneration) return;
                let pageMovies = this.prepareMoviesForDisplay(res.results);
                if (trimmedQuery && country) {
                    pageMovies = pageMovies.filter(movie =>
                        movie.title.toLowerCase().includes(trimmedQuery) ||
                        movie.original_title.toLowerCase().includes(trimmedQuery)
                    );
                }
                if (trimmedQuery && genre) {
                    pageMovies = pageMovies.filter(movie => movie.genre_ids.includes(parseInt(genre, 10)));
                }
                if (trimmedQuery && alphabetic !== 'popularity.desc') {
                    pageMovies.sort((a, b) => alphabetic === 'title.asc'
                        ? a.title.localeCompare(b.title)
                        : b.title.localeCompare(a.title));
                }

                this.movies = this.prepareMoviesForDisplay([...this.movies, ...pageMovies]);
                this.currentPage = res.page || page;
                this.totalPages = Math.max(this.currentPage, res.total_pages || 1);
                this.isLoading = false;
            },
            error: (error) => {
                if (generation === this.requestGeneration) {
                    this.isLoading = false;
                    const apiMessage = typeof error?.error?.error === 'string'
                        ? error.error.error
                        : null;
                    this.loadError = apiMessage
                        ?? `Impossible de charger les films (erreur HTTP ${error?.status || 'inconnue'}).`;
                    console.error('Movie API request failed', error);
                }
            },
        });
    }

    /** Called by the search bar */
    search(query: string, alphabeticSelect: string = 'popularity.desc', selectedYear: string = '', selectedGenre: string = '', selectedCountry: string = '') {
        this.currentView = this.activeMediaType === 'tv' ? 'popular-tv' : 'now-playing';
        this.criteria = {
            query,
            alphabetic: alphabeticSelect,
            year: selectedYear,
            genre: selectedGenre,
            country: selectedCountry,
        };
        this.people = [];
        const trimmedQuery = query.trim();
        if (trimmedQuery && this.activeMediaType === 'movie') {
            this.api_call.SearchPersons(trimmedQuery).subscribe({
                next: response => this.people = (response.results ?? [])
                    .filter(person => person.known_for_department === 'Acting')
                    .slice(0, 10),
                error: () => this.people = [],
            });
        }
        this.resetAndLoad();
    }

    showPopularMovies(): void {
        this.activeMediaType = 'movie';
        this.currentView = 'popular';
        this.criteria = { query: '', alphabetic: 'popularity.desc', year: '', genre: '', country: '' };
        this.people = [];
        this.resetAndLoad();
    }

    showNowPlayingMovies(): void {
        this.activeMediaType = 'movie';
        this.currentView = 'now-playing';
        this.criteria = { query: '', alphabetic: 'popularity.desc', year: '', genre: '', country: '' };
        this.people = [];
        this.resetAndLoad();
    }

    showPopularTvShows(): void {
        this.activeMediaType = 'tv';
        this.currentView = 'popular-tv';
        this.people = [];
        this.resetAndLoad();
    }

    selectTvShow(show: TvShow): void {
        this.selectedTvShow = show;
        this.selectedMovie = null;
        this.selectedPersonId = null;
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tv: show.id, season: null, movie: null, actor: null },
            queryParamsHandling: 'merge',
        });
    }

    closeTvShow(): void {
        this.selectedTvShow = null;
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tv: null, season: null },
            queryParamsHandling: 'merge',
        });
    }

    openActorFromTv(actor: CastMember): void {
        this.selectedTvShow = null;
        this.openActor(actor);
    }

    openTvSeason(seasonNumber: number): void {
        this.selectedSeasonNumber = seasonNumber;
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { season: seasonNumber },
            queryParamsHandling: 'merge',
        });
    }

    closeTvSeason(): void {
        this.selectedSeasonNumber = null;
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { season: null },
            queryParamsHandling: 'merge',
        });
    }

    onSelect(movie: Movie) {
        if (this.selectedMovie?.id === movie.id && !this.selectedPersonId) return;

        this.selectedMovie = movie;
        this.selectedPersonId = null;
        this.selectedTvShow = null;
        this.selectedSeasonNumber = null;
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { movie: movie.id, actor: null, tv: null, season: null },
            queryParamsHandling: 'merge',
        });
    }

    closeMovie(): void {
        this.selectedMovie = null;
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { movie: null },
            queryParamsHandling: 'merge',
        });
    }

    openActor(actor: CastMember): void {
        this.selectedPersonId = actor.id;
        this.selectedMovie = null;
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { actor: actor.id, movie: null, tv: null, season: null },
            queryParamsHandling: 'merge',
        });
    }

    openPerson(person: PersonSearchResult): void {
        this.selectedPersonId = person.id;
        this.selectedMovie = null;
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { actor: person.id, movie: null, tv: null, season: null },
            queryParamsHandling: 'merge',
        });
    }

    closeActor(): void {
        this.selectedPersonId = null;
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { actor: null },
            queryParamsHandling: 'merge',
        });
    }

    openMovieFromActor(movieId: number): void {
        if (this.openingMovieFromActorId === movieId || this.selectedMovie?.id === movieId) return;

        // Update the two overlays locally, then perform one atomic URL change.
        // Calling closeActor() here would add a redundant history entry.
        this.selectedPersonId = null;
        const loadedMovie = this.movies.find(movie => movie.id === movieId);
        if (loadedMovie) {
            this.onSelect(loadedMovie);
            return;
        }

        this.openingMovieFromActorId = movieId;
        this.api_call.getMovieById(movieId).subscribe({
            next: movie => {
                this.openingMovieFromActorId = null;
                this.onSelect(movie);
            },
            error: () => {
                this.openingMovieFromActorId = null;
            },
        });
    }

    openTvShowFromActor(show: TvShow): void {
        this.selectTvShow(show);
    }
}
