import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ApiCallService, PersonDetails, PersonMovieCredit } from '../api-call.service';

@Component({
    selector: 'app-person-detail-overlay',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './person-detail-overlay.component.html',
    styleUrls: ['./person-detail-overlay.component.css'],
})
export class PersonDetailOverlayComponent implements OnChanges {
    @Input() personId!: number;
    @Output() close = new EventEmitter<void>();
    @Output() selectMovie = new EventEmitter<number>();
    person: PersonDetails | null = null;
    movies: PersonMovieCredit[] = [];
    isLoading = true;

    constructor(private apiCall: ApiCallService) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (!changes['personId'] || !this.personId) return;
        this.isLoading = true;
        this.apiCall.getPersonDetails(this.personId).subscribe({
            next: person => { this.person = person; this.isLoading = false; },
            error: () => { this.person = null; this.isLoading = false; },
        });
        this.apiCall.getPersonMovieCredits(this.personId).subscribe({
            next: response => this.movies = [...(response.cast ?? [])]
                .filter(movie => movie.title && movie.poster_path)
                .sort((a, b) => b.vote_count - a.vote_count)
                .slice(0, 15),
            error: () => this.movies = [],
        });
    }
}