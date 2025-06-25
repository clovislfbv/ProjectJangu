import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MovieListComponent } from './movie-list/movie-list.component';

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

    onSearch() {
        this.movieList.search(this.searchText);
    }
}
