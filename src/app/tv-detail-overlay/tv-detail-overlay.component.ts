import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiCallService, CastMember, EXCLUDED_TV_GENRE_IDS, TvSeasonSummary, TvShow, TvShowDetails, WatchProvider } from '../api-call.service';
import { TvSeasonDetailOverlayComponent } from '../tv-season-detail-overlay/tv-season-detail-overlay.component';
import { hasEnhancedExperienceEnabled } from '../user-preferences';
import { ShareButtonComponent } from '../share-button/share-button.component';

@Component({
    selector: 'app-tv-detail-overlay',
    standalone: true,
    imports: [CommonModule, TvSeasonDetailOverlayComponent, ShareButtonComponent],
    templateUrl: './tv-detail-overlay.component.html',
    styleUrls: ['./tv-detail-overlay.component.css'],
})
export class TvDetailOverlayComponent implements OnChanges, OnDestroy {
    @Input() show!: TvShow;
    @Input() seasonNumber: number | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() selectActor = new EventEmitter<CastMember>();
    @Output() selectSeason = new EventEmitter<number>();
    @Output() closeSeasonDetails = new EventEmitter<void>();
    @Output() selectTvShow = new EventEmitter<TvShow>();
    details: TvShowDetails | null = null;
    cast: CastMember[] = [];
    providers: WatchProvider[] = [];
    providerLink?: string;
    trailerUrl: SafeResourceUrl | null = null;
    recommendations: TvShow[] = [];
    recommendationsLoaded = false;
    isLoading = true;
    selectedSeason: TvSeasonSummary | null = null;
    hiddenLinksUnlocked = hasEnhancedExperienceEnabled();

    constructor(private api: ApiCallService, private sanitizer: DomSanitizer) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['seasonNumber'] && !changes['show']) {
            this.openSeasonFromInput();
            return;
        }
        if (!changes['show'] || !this.show?.id) return;
        this.isLoading = true;
        document.body.classList.add('no-scroll');
        this.api.getTvShowDetails(this.show.id).subscribe({
            next: details => {
                this.details = details;
                this.openSeasonFromInput();
                this.isLoading = false;
            },
            error: () => this.isLoading = false,
        });
        this.api.getTvShowCredits(this.show.id).subscribe(response => this.cast = (response.cast ?? []).slice(0, 20));
        this.api.getTvShowVideos(this.show.id, this.show.original_language).subscribe(response => {
            const video = (response.results ?? []).find(item => item.site === 'YouTube' && item.type === 'Trailer')
                ?? (response.results ?? []).find(item => item.site === 'YouTube');
            this.trailerUrl = video
                ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${video.key}`)
                : null;
        });
        this.api.getTvWatchProviders(this.show.id).subscribe(result => {
            this.providers = result.providers;
            this.providerLink = result.link;
        });
        this.loadRecommendations(this.show.id);
    }

    private loadRecommendations(tvId: number): void {
        this.recommendations = [];
        this.recommendationsLoaded = false;
        this.api.getTvRecommendations(tvId).subscribe({
            next: response => {
                if (this.show?.id !== tvId) return;

                const seenIds = new Set<number>([tvId]);
                this.recommendations = (response.results ?? [])
                    .filter(show => {
                        const isExcludedGenre = show.genre_ids?.some(id => EXCLUDED_TV_GENRE_IDS.has(id));
                        if (!show.poster_path || isExcludedGenre || seenIds.has(show.id)) return false;
                        seenIds.add(show.id);
                        return true;
                    })
                    .slice(0, 12);
                this.recommendationsLoaded = true;
            },
            error: () => {
                if (this.show?.id !== tvId) return;
                this.recommendations = [];
                this.recommendationsLoaded = true;
            },
        });
    }

    private openSeasonFromInput(): void {
        if (this.seasonNumber == null || !this.details?.seasons) {
            this.selectedSeason = null;
            return;
        }
        this.selectedSeason = this.details.seasons.find(season => season.season_number === this.seasonNumber) ?? null;
    }

    ngOnDestroy(): void { document.body.classList.remove('no-scroll'); }
    closeOverlay(): void { document.body.classList.remove('no-scroll'); this.close.emit(); }
    openActor(actor: CastMember): void {
        document.body.classList.remove('no-scroll');
        this.selectActor.emit(actor);
    }
    openSeason(season: TvSeasonSummary): void {
        this.selectedSeason = season;
        this.selectSeason.emit(season.season_number);
    }
    closeSeason(): void {
        this.selectedSeason = null;
        this.closeSeasonDetails.emit();
    }
    openActorFromSeason(actor: CastMember): void {
        this.selectedSeason = null;
        this.openActor(actor);
    }
    genreNames(): string { return this.details?.genres?.map(genre => genre.name).join(', ') || 'Non renseigné'; }
    runtime(): string { return this.details?.episode_run_time?.[0] ? `${this.details.episode_run_time[0]} min / épisode` : 'Durée inconnue'; }
    releaseYear(firstAirDate: string | null | undefined): string { return firstAirDate?.slice(0, 4) || 'Date inconnue'; }
    get castIds(): number[] { return this.cast.map(actor => actor.id); }
}