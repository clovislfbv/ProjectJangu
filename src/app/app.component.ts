import { Component } from '@angular/core';
import { MovieListComponent } from './movie-list/movie-list.component';
import { SearchBarComponent } from './search-bar/search-bar.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [MovieListComponent, SearchBarComponent],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent {
    title = 'ProjectJangu';
    isMenuOpen = false;
    activeMediaType: 'movie' | 'tv' = 'movie';

    toggleMenu(): void {
        this.isMenuOpen = !this.isMenuOpen;
    }

    closeMenu(): void {
        this.isMenuOpen = false;
    }

    selectMediaType(type: 'movie' | 'tv'): void {
        this.activeMediaType = type;
    }
}
