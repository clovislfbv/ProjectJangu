import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ApiCallService, CastMember, TvEpisode, TvSeasonDetails, TvSeasonSummary } from '../api-call.service';

@Component({
    selector: 'app-tv-season-detail-overlay',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './tv-season-detail-overlay.component.html',
    styleUrls: ['./tv-season-detail-overlay.component.css'],
})
export class TvSeasonDetailOverlayComponent implements OnChanges {
    @Input() tvId!: number;
    @Input() showName = '';
    @Input() season!: TvSeasonSummary;
    @Input() seriesCastIds: number[] = [];
    @Output() close = new EventEmitter<void>();
    @Output() selectActor = new EventEmitter<CastMember>();

    details: TvSeasonDetails | null = null;
    isLoading = true;
    loadError = false;

    constructor(private api: ApiCallService) {}

    ngOnChanges(changes: SimpleChanges): void {
        if ((!changes['season'] && !changes['tvId']) || !this.tvId || this.season?.season_number == null) return;
        this.details = null;
        this.isLoading = true;
        this.loadError = false;
        this.api.getTvSeasonDetails(this.tvId, this.season.season_number).subscribe({
            next: details => { this.details = details; this.isLoading = false; },
            error: () => { this.loadError = true; this.isLoading = false; },
        });
    }

    episodeOnlyActors(episode: TvEpisode): CastMember[] {
        const regularCast = new Set(this.seriesCastIds);
        return (episode.guest_stars ?? [])
            .filter(actor => !regularCast.has(actor.id))
            .filter((actor, index, all) => all.findIndex(item => item.id === actor.id) === index);
    }
}