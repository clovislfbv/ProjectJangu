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

    constructor(private api_call: ApiCallService) {}

    ngOnInit() {
        this.loadDiscover();
    }

    private loadDiscover() {
        this.api_call
            .DiscoverMovies('original_title.asc')
            .subscribe((res: DiscoverMovieResponse) => (this.movies = res.results));
    }

    /** Called by the search bar */
    search(query: string, alphabeticSelect: string = 'original_title.asc', selectedYear: string = '') {
        const obs = query.trim()
            ? this.api_call.SearchMovies(query)
            : this.api_call.DiscoverMovies(alphabeticSelect, selectedYear);

        obs.subscribe((res: DiscoverMovieResponse) => (this.movies = res.results));
    }

    onSelect(movie: Movie) {
        this.selectedMovie = movie;
    }
}
