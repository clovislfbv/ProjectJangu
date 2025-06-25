import { Component, OnInit } from '@angular/core';
import { MovieComponent } from '../movie/movie.component';
import { NgFor, NgIf } from '@angular/common';
import { ApiCallService } from '../api-call.service';

@Component({
  selector: 'app-movie-list',
  imports: [MovieComponent, NgFor, NgIf],
  templateUrl: './movie-list.component.html',
  styleUrl: './movie-list.component.css'
})
export class MovieListComponent implements OnInit {
  constructor(private api_call: ApiCallService) { }

  movies: any[] = [];

  ngOnInit() {
    this.api_call.DiscoverMovies().subscribe(response => {
      this.movies = response.results;
      console.log(this.movies);
    });
  }
}
