import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { MovieComponent } from '../movie/movie.component';
import { MovieDetailOverlayComponent } from '../movie-detail-overlay/movie-detail-overlay.component';
import { ApiCallService, DiscoverMovieResponse, Movie } from '../api-call.service';

@Component({
    selector: 'app-movie-list',
    standalone: true,
    imports: [CommonModule, NgFor, NgIf, MovieComponent, MovieDetailOverlayComponent],
    templateUrl: './movie-list.component.html',
    styleUrls: ['./movie-list.component.css'],
})
export class MovieListComponent implements OnInit {
    movies: Movie[] = [];
    selectedMovie: Movie | null = null;
    isLoading: boolean = true;

    constructor(private api_call: ApiCallService) {}

    ngOnInit() {
        this.loadDiscover();
    }

    private loadDiscover() {
        this.isLoading = true;
        this.api_call
            .DiscoverMovies('popularity.desc', '')
            .subscribe((res: DiscoverMovieResponse) => {
                this.movies = res.results;
                this.isLoading = false;
            });
    }

    /** Called by the search bar */
    search(query: string, alphabeticSelect: string = 'popularity.desc', selectedYear: string = '', selectedGenre: string = '') {
        this.isLoading = true;
        const obs = query.trim()
            ? this.api_call.SearchMovies(query, selectedYear)
            : this.api_call.DiscoverMovies(alphabeticSelect, selectedYear, selectedGenre);

        console.log(this.movies);

        obs.subscribe((res: DiscoverMovieResponse) => {
            this.movies = res.results;

            if (query.trim()) {
                if (alphabeticSelect !== 'popularity.desc') {
                    if (alphabeticSelect === 'title.asc') {
                        this.movies.sort((a, b) => a.title.localeCompare(b.title));
                    } else if (alphabeticSelect === 'title.desc') {
                        this.movies.sort((a, b) => b.title.localeCompare(a.title));
                    }
                }

                if (selectedGenre) {
                    this.movies = this.movies.filter(movie => movie.genre_ids.includes(parseInt(selectedGenre)));
                }
            }
            
            this.isLoading = false;
        });
    }

    onSelect(movie: Movie) {
        this.selectedMovie = movie;
    }
}
