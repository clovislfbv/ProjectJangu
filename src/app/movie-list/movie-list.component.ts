import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { MovieComponent } from '../movie/movie.component';
import { MovieDetailOverlayComponent } from '../movie-detail-overlay/movie-detail-overlay.component';
import { ApiCallService, DiscoverMovieResponse, Movie } from '../api-call.service';

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
        const currentYear = new Date().getFullYear().toString();
        const effectiveYear = country && !year ? currentYear : year;
        this.isLoading = true;
        const request = country
            ? this.api_call.DiscoverMovies(alphabetic, effectiveYear, genre, country, page)
            : trimmedQuery
                ? this.api_call.SearchMovies(query, effectiveYear, '', page)
                : this.api_call.DiscoverMovies(alphabetic, effectiveYear, genre, '', page);

        request.subscribe({
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
            error: () => {
                if (generation === this.requestGeneration) this.isLoading = false;
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
