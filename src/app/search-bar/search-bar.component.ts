import { Component, OnInit, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiCallService, EXCLUDED_TV_GENRE_IDS, Genre } from '../api-call.service';

@Component({
    selector: 'app-search-bar',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './search-bar.component.html',
    styleUrls: ['./search-bar.component.css'],
})
export class SearchBarComponent implements OnInit, OnChanges {
    @Input() mediaType: 'movie' | 'tv' = 'movie';
    @Output() search = new EventEmitter<{
        query: string;
        alphabetic: string;
        year: string;
        genre: string;
        country: string;
    }>();

    searchText: string = '';
    isFirstClick: boolean = true;
    currentYear = new Date().getFullYear();
    years: number[] = [];
    genres: Genre[] = [];
    selectedAlphabetic: string = 'popularity.desc';
    selectedYear: string = '';
    selectedGenre: string = '';
    selectedCountry: string = '';
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
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['mediaType'] && !changes['mediaType'].firstChange) {
            this.selectedGenre = '';
            this.loadGenres();
        }
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

    onKeyPress(event: KeyboardEvent, inputElement: HTMLInputElement): void {
        if (event.key === 'Enter' || event.keyCode === 13) {
            event.preventDefault();
            this.onSearch(inputElement);
        }
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
