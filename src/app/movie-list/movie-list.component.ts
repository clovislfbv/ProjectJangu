import { Component } from '@angular/core';
import { MovieComponent } from '../movie/movie.component';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-movie-list',
  imports: [MovieComponent, NgFor, NgIf],
  templateUrl: './movie-list.component.html',
  styleUrl: './movie-list.component.css'
})
export class MovieListComponent {

}
