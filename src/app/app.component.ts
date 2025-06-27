import { Component, ViewChild, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MovieListComponent } from './movie-list/movie-list.component';
import { ApiCallService, Genre } from './api-call.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, FormsModule, MovieListComponent, CommonModule],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
    @ViewChild(MovieListComponent) movieList!: MovieListComponent;
    searchText: string = '';
    isFirstClick = true;
    currentYear = new Date().getFullYear();
    years: number[] = [];
    genres: Genre[] = [];
    selectedAlphabetic: string = 'popularity.desc';
    selectedYear: string = "";
    selectedGenre: string = "";

    constructor(private api_call: ApiCallService) {}

    onSearch() {
        const filtersElement = document.getElementById('filters');
        if (filtersElement && !filtersElement.classList.contains('d-none')) {
            const alphabeticSelect = document.getElementById("alphabeticSelect") as HTMLSelectElement | null;
            if (alphabeticSelect) {
                this.selectedAlphabetic = alphabeticSelect.value;
            }

            const yearSelect = document.getElementById("yearSelect") as HTMLSelectElement | null;
            if (yearSelect) {
                this.selectedYear = yearSelect.value;
            }

            const genreSelect = document.getElementById("genre") as HTMLSelectElement | null;
            if (genreSelect) {
                this.selectedGenre = genreSelect.value;
            }   
        } else {
            this.selectedAlphabetic = 'popularity.desc';
            this.selectedYear = '';
            this.selectedGenre = '';
        }

        this.movieList.search(this.searchText, this.selectedAlphabetic, this.selectedYear, this.selectedGenre);
    }

    displayFilters() {
        const filtersElement = document.getElementById('filters');
        if (filtersElement) {
            filtersElement.classList.remove('d-none');
        }
    }

    hideFilters() {
        const filtersElement = document.getElementById('filters');
        if (filtersElement) {
            filtersElement.classList.add('d-none');
        }
    }

    ngOnInit() {
        console.log('ngOnInit running');
        this.hideFilters();
        for (let year = this.currentYear; year >= 1900; year--) {
            this.years.push(year);
        }

        this.api_call.getMovieGenres().subscribe((response) => {
            this.genres = response.genres;
        });
    }

    handleClick() {
        if (this.isFirstClick) {
            this.displayFilters();
            const filtersElement = document.getElementById('btn_filters');
            if (filtersElement) {
                filtersElement.innerText = 'Filters -';
            }
        } else {
            this.hideFilters();
            const filtersElement = document.getElementById('btn_filters');
            if (filtersElement) {
                filtersElement.innerText = 'Filters +';
            }
        }
        this.isFirstClick = !this.isFirstClick;
    }
}
