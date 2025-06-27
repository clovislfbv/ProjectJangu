import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiCallService, CastMember } from '../api-call.service';
import { Genre } from '../api-call.service';

@Component({
    selector: 'app-movie-detail-overlay',
    imports: [CommonModule],
    standalone: true,
    templateUrl: './movie-detail-overlay.component.html',
    styleUrls: ['./movie-detail-overlay.component.css'],
})
export class MovieDetailOverlayComponent implements OnChanges, OnInit {
    @Input() movie!: any;
    @Output() close = new EventEmitter<void>();
    genres: Genre[] = [];

    cast: CastMember[] = [];

    constructor(private apiCall: ApiCallService) {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes['movie'] && this.movie?.id) {
            this.loadCast(this.movie.id);
        }
    }

    ngOnInit() {
        this.apiCall.getMovieGenres().subscribe((response) => {
            this.genres = response.genres;
        });
    }

    private loadCast(movieId: number) {
        this.apiCall.getMovieCredits(movieId).subscribe((response) => {
            this.cast = response.cast || [];
        });
    }

    getGenreNames(ids: number[], genres: Genre[]): string {
        if (!ids || !genres) return 'NA';
        return genres
            .filter(g => ids.includes(g.id))
            .map(g => g.name)
            .join(', ') || 'NA';
    }
}
