import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { MovieComponent } from '../movie/movie.component';
import { MovieDetailOverlayComponent } from '../movie-detail-overlay/movie-detail-overlay.component';
import { ApiCallService } from '../api-call.service';

@Component({
  selector: 'app-movie-list',
  imports: [
    CommonModule,
    NgFor,
    NgIf,
    MovieComponent,
    MovieDetailOverlayComponent,
  ],
  templateUrl: './movie-list.component.html',
  styleUrls: ['./movie-list.component.css'],
})
export class MovieListComponent implements OnInit {
  movies: any[] = [];
  selectedMovie: any = null;

  constructor(private api_call: ApiCallService) {}

  ngOnInit() {
    this.api_call
      .DiscoverMovies()
      .subscribe((response) => (this.movies = response.results));
  }

  onSelect(movie: any) {
    this.selectedMovie = movie;
  }
}
