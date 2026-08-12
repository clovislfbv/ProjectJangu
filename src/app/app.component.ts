import { Component, ElementRef, HostListener } from '@angular/core';
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

    constructor(private elementRef: ElementRef<HTMLElement>) {}

    toggleMenu(): void {
        this.isMenuOpen = !this.isMenuOpen;
    }

    closeMenu(): void {
        this.isMenuOpen = false;
    }

    @HostListener('document:pointerdown', ['$event'])
    closeMenuWhenClickingOutside(event: PointerEvent): void {
        if (!this.isMenuOpen) return;
        const target = event.target;
        if (!(target instanceof Node)) return;

        const clickedBurgerButton = this.elementRef.nativeElement.querySelector('.burger-button')?.contains(target);
        const clickedMenu = this.elementRef.nativeElement.querySelector('.burger-menu')?.contains(target);
        if (!clickedBurgerButton && !clickedMenu) this.closeMenu();
    }

    @HostListener('document:keydown.escape')
    closeMenuWithEscape(): void {
        this.closeMenu();
    }

    @HostListener('window:resize')
    @HostListener('window:orientationchange')
    closeMenuWhenViewportChanges(): void {
        this.closeMenu();
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
