import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiCallService, CastMember } from '../api-call.service';

@Component({
    selector: 'app-movie-detail-overlay',
    imports: [CommonModule],
    standalone: true,
    templateUrl: './movie-detail-overlay.component.html',
    styleUrls: ['./movie-detail-overlay.component.css'],
})
export class MovieDetailOverlayComponent implements OnChanges {
    @Input() movie!: any;
    @Output() close = new EventEmitter<void>();

    cast: CastMember[] = [];

    constructor(private apiCall: ApiCallService) {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes['movie'] && this.movie?.id) {
            this.loadCast(this.movie.id);
        }
    }

    private loadCast(movieId: number) {
        this.apiCall.getMovieCredits(movieId).subscribe((response) => {
            this.cast = response.cast || [];
        });
    }
}
