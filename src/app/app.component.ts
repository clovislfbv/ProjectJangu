import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MovieListComponent } from './movie-list/movie-list.component';
import { ApiCallService, Genre } from './api-call.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, FormsModule, MovieListComponent],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent {
    @ViewChild(MovieListComponent) movieList!: MovieListComponent;
    searchText: string = '';
    isFirstClick = true;
    currentYear = new Date().getFullYear();
    years: number[] = [];
    genres: Genre[] = [];

    constructor(private api_call: ApiCallService) {}

    onSearch() {
        this.movieList.search(this.searchText);
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
