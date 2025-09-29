import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiCallService, Genre } from '../api-call.service';

@Component({
    selector: 'app-search-bar',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './search-bar.component.html',
    styleUrls: ['./search-bar.component.css'],
})
export class SearchBarComponent implements OnInit {
    @Output() search = new EventEmitter<{
        query: string;
        alphabetic: string;
        year: string;
        genre: string;
    }>();

    searchText: string = '';
    isFirstClick: boolean = true;
    currentYear = new Date().getFullYear();
    years: number[] = [];
    genres: Genre[] = [];
    selectedAlphabetic: string = 'popularity.desc';
    selectedYear: string = '';
    selectedGenre: string = '';

    constructor(private apiCall: ApiCallService) {}

    ngOnInit(): void {
        for (let year = this.currentYear; year >= 1900; year--) {
            this.years.push(year);
        }
        this.apiCall.getMovieGenres().subscribe((response) => {
            this.genres = response.genres;
        });
    }

    onSearch(inputElement?: HTMLInputElement): void {
        if (this.isFirstClick) {
            this.selectedAlphabetic = 'popularity.desc';
            this.selectedYear = '';
            this.selectedGenre = '';
        }

        this.search.emit({
            query: this.searchText,
            alphabetic: this.selectedAlphabetic,
            year: this.selectedYear,
            genre: this.selectedGenre,
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
    }
}
