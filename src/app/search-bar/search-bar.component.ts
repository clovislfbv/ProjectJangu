import { Component, OnInit, Output, EventEmitter, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiCallService, EXCLUDED_TV_GENRE_IDS, Genre, Movie, PersonSearchResult } from '../api-call.service';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap, takeUntil } from 'rxjs/operators';

export type SearchSuggestion =
    | { type: 'movie'; movie: Movie }
    | { type: 'person'; person: PersonSearchResult };

@Component({
    selector: 'app-search-bar',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './search-bar.component.html',
    styleUrls: ['./search-bar.component.css'],
})
export class SearchBarComponent implements OnInit, OnChanges, OnDestroy {
    @Input() mediaType: 'movie' | 'tv' = 'movie';
    @Output() search = new EventEmitter<{
        query: string;
        alphabetic: string;
        year: string;
        genre: string;
        country: string;
    }>();
    @Output() selectMovie = new EventEmitter<Movie>();
    @Output() selectPerson = new EventEmitter<PersonSearchResult>();

    searchText: string = '';
    isFirstClick: boolean = true;
    currentYear = new Date().getFullYear();
    years: number[] = [];
    genres: Genre[] = [];
    selectedAlphabetic: string = 'popularity.desc';
    selectedYear: string = '';
    selectedGenre: string = '';
    selectedCountry: string = '';
    suggestions: SearchSuggestion[] = [];
    suggestionsOpen = false;
    suggestionsLoading = false;
    activeSuggestionIndex = -1;
    private readonly suggestionQueries = new Subject<string>();
    private readonly destroy$ = new Subject<void>();
    countries = [
        { code: 'US', name: 'United States' },
        { code: 'FR', name: 'France' },
        { code: 'GB', name: 'United Kingdom' },
        { code: 'CA', name: 'Canada' },
        { code: 'DE', name: 'Germany' },
        { code: 'ES', name: 'Spain' },
        { code: 'IT', name: 'Italy' },
        { code: 'JP', name: 'Japan' },
        { code: 'KR', name: 'South Korea' },
        { code: 'IN', name: 'India' },
        { code: 'CN', name: 'China' },
        { code: 'BR', name: 'Brazil' },
        { code: 'MX', name: 'Mexico' },
    ];

    constructor(private apiCall: ApiCallService) {}

    ngOnInit(): void {
        for (let year = this.currentYear; year >= 1900; year--) {
            this.years.push(year);
        }
        this.loadGenres();
        this.suggestionQueries.pipe(
            map(query => query.trim()),
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(query => {
                if (this.mediaType !== 'movie' || query.length < 2) {
                    return of([] as SearchSuggestion[]);
                }
                this.suggestionsLoading = true;
                return forkJoin({
                    movies: this.apiCall.SearchMovies(query).pipe(catchError(() => of({ results: [] } as any))),
                    people: this.apiCall.SearchPersons(query).pipe(catchError(() => of({ results: [] } as any))),
                }).pipe(
                    map(({ movies, people }) => [
                        ...(movies.results ?? [])
                            .filter((movie: Movie) => !movie.adult)
                            .slice(0, 5)
                            .map((movie: Movie): SearchSuggestion => ({ type: 'movie', movie })),
                        ...(people.results ?? [])
                            .filter((person: PersonSearchResult) => person.known_for_department === 'Acting')
                            .slice(0, 5)
                            .map((person: PersonSearchResult): SearchSuggestion => ({ type: 'person', person })),
                    ]),
                    catchError(() => of([] as SearchSuggestion[])),
                );
            }),
            takeUntil(this.destroy$),
        ).subscribe(suggestions => {
            this.suggestions = suggestions;
            this.suggestionsLoading = false;
            this.suggestionsOpen = this.mediaType === 'movie'
                && this.searchText.trim().length >= 2
                && suggestions.length > 0;
            this.activeSuggestionIndex = -1;
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['mediaType'] && !changes['mediaType'].firstChange) {
            this.selectedGenre = '';
            this.closeSuggestions();
            this.loadGenres();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadGenres(): void {
        const request = this.mediaType === 'tv'
            ? this.apiCall.getTvGenres()
            : this.apiCall.getMovieGenres();
        request.subscribe(response => {
            this.genres = this.mediaType === 'tv'
                ? response.genres.filter(genre => !EXCLUDED_TV_GENRE_IDS.has(genre.id))
                : response.genres;
        });
    }

    onSearch(inputElement?: HTMLInputElement): void {
        this.closeSuggestions();
        this.search.emit({
            query: this.searchText,
            alphabetic: this.selectedAlphabetic,
            year: this.selectedYear,
            genre: this.selectedGenre,
            country: this.selectedCountry,
        });

        // Hide keyboard on mobile after search
        if (inputElement) {
            inputElement.blur();
        }
    }

    onSearchTextChange(value: string): void {
        this.searchText = value;
        this.activeSuggestionIndex = -1;
        if (this.mediaType !== 'movie' || value.trim().length < 2) {
            this.closeSuggestions();
            return;
        }
        this.suggestionsLoading = true;
        this.suggestionsOpen = true;
        this.suggestionQueries.next(value);
    }

    onInputFocus(): void {
        if (this.mediaType === 'movie' && this.searchText.trim().length >= 2 && this.suggestions.length) {
            this.suggestionsOpen = true;
        }
    }

    onInputBlur(): void {
        window.setTimeout(() => this.closeSuggestions(), 150);
    }

    onKeyDown(event: KeyboardEvent, inputElement: HTMLInputElement): void {
        if (this.suggestionsOpen && this.suggestions.length) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                this.activeSuggestionIndex = (this.activeSuggestionIndex + 1) % this.suggestions.length;
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                this.activeSuggestionIndex = this.activeSuggestionIndex <= 0
                    ? this.suggestions.length - 1
                    : this.activeSuggestionIndex - 1;
                return;
            }
            if (event.key === 'Enter' && this.activeSuggestionIndex >= 0) {
                event.preventDefault();
                this.chooseSuggestion(this.suggestions[this.activeSuggestionIndex], inputElement);
                return;
            }
        }
        if (event.key === 'Escape') {
            this.closeSuggestions();
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            this.onSearch(inputElement);
        }
    }

    chooseSuggestion(suggestion: SearchSuggestion, inputElement?: HTMLInputElement): void {
        this.searchText = suggestion.type === 'movie' ? suggestion.movie.title : suggestion.person.name;
        this.closeSuggestions();
        if (suggestion.type === 'movie') this.selectMovie.emit(suggestion.movie);
        else this.selectPerson.emit(suggestion.person);
        inputElement?.blur();
    }

    suggestionTitle(suggestion: SearchSuggestion): string {
        return suggestion.type === 'movie' ? suggestion.movie.title : suggestion.person.name;
    }

    suggestionSubtitle(suggestion: SearchSuggestion): string {
        if (suggestion.type === 'movie') return suggestion.movie.release_date?.slice(0, 4) || 'Film';
        const knownFor = suggestion.person.known_for
            ?.map(item => item.title || item.name)
            .filter(Boolean)
            .slice(0, 2)
            .join(' · ');
        return knownFor || 'Acteur / Actrice';
    }

    suggestionImage(suggestion: SearchSuggestion): string {
        if (suggestion.type === 'movie') {
            return suggestion.movie.poster_path
                ? `https://image.tmdb.org/t/p/w92${suggestion.movie.poster_path}`
                : '/assets/placeholder-poster.png';
        }
        return suggestion.person.profile_path
            ? `https://image.tmdb.org/t/p/w92${suggestion.person.profile_path}`
            : '/assets/placeholder-profile.png';
    }

    closeSuggestions(): void {
        this.suggestionsOpen = false;
        this.suggestionsLoading = false;
        this.activeSuggestionIndex = -1;
    }

    toggleFilters(): void {
        this.isFirstClick = !this.isFirstClick;

        if (this.isFirstClick) {
            this.selectedAlphabetic = 'popularity.desc';
            this.selectedYear = '';
            this.selectedGenre = '';
            this.selectedCountry = '';
            this.emitSearch();
        }
    }

    onFilterChange(): void {
        this.emitSearch();
    }

    private emitSearch(): void {
        this.search.emit({
            query: this.searchText,
            alphabetic: this.selectedAlphabetic,
            year: this.selectedYear,
            genre: this.selectedGenre,
            country: this.selectedCountry,
        });
    }
}
