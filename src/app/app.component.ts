import { Component } from '@angular/core';
import { MovieListComponent } from './movie-list/movie-list.component';
import { SearchBarComponent } from './search-bar/search-bar.component';
import { ENHANCED_EXPERIENCE_STORAGE_KEY, hasEnhancedExperienceEnabled } from './user-preferences';
import { FeedbackComponent } from './feedback/feedback.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [MovieListComponent, SearchBarComponent, FeedbackComponent],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent {
    title = 'ProjectJangu';
    isMenuOpen = false;
    activeMediaType: 'movie' | 'tv' = 'movie';
    areHiddenLinksUnlocked = hasEnhancedExperienceEnabled();
    activeView: 'catalog' | 'feedback' = 'catalog';

    toggleMenu(): void {
        this.isMenuOpen = !this.isMenuOpen;
    }

    closeMenu(): void {
        this.isMenuOpen = false;
    }

    selectMediaType(type: 'movie' | 'tv'): void {
        this.activeMediaType = type;
        this.activeView = 'catalog';
    }

    showFeedback(): void {
        this.activeView = 'feedback';
        this.closeMenu();
    }

    handleFeedbackSubmission(unlockHiddenLinks: boolean): void {
        if (!unlockHiddenLinks) return;

        localStorage.setItem(ENHANCED_EXPERIENCE_STORAGE_KEY, 'true');
        this.areHiddenLinksUnlocked = true;
    }
}
