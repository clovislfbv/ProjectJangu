import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { MovieComponent } from '../movie/movie.component';
import { MovieDetailOverlayComponent } from '../movie-detail-overlay/movie-detail-overlay.component';
import { ApiCallService, DiscoverMovieResponse, Movie } from '../api-call.service';
import { map, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';

interface MovieListCriteria {
    query: string;
    alphabetic: string;
    year: string;
    genre: string;
    country: string;
}

@Component({
    selector: 'app-movie-list',
    standalone: true,
    imports: [CommonModule, NgFor, NgIf, MovieComponent, MovieDetailOverlayComponent],
    templateUrl: './movie-list.component.html',
    styleUrls: ['./movie-list.component.css'],
})
export class MovieListComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('scrollSentinel') scrollSentinel?: ElementRef<HTMLElement>;
    movies: Movie[] = [];
    selectedMovie: Movie | null = null;
    isLoading: boolean = true;
    loadError: string | null = null;
    private currentPage = 0;
    private totalPages = 1;
    private requestGeneration = 0;
    private observer?: IntersectionObserver;
    private criteria: MovieListCriteria = {
        query: '', alphabetic: 'popularity.desc', year: '', genre: '', country: '',
    };

    constructor(private api_call: ApiCallService) {}

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
    }

    private resetAndLoad(): void {
        this.requestGeneration++;
        this.movies = [];
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
        const request = country
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
        this.criteria = {
            query,
            alphabetic: alphabeticSelect,
            year: selectedYear,
            genre: selectedGenre,
            country: selectedCountry,
        };
        this.resetAndLoad();
    }

    onSelect(movie: Movie) {
        this.selectedMovie = movie;
    }
}
