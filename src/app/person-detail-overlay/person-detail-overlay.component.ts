import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ApiCallService, EXCLUDED_TV_GENRE_IDS, PersonDetails, PersonMovieCredit, PersonTvCredit, TvShow } from '../api-call.service';

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
    @Output() selectTvShow = new EventEmitter<TvShow>();
    person: PersonDetails | null = null;
    movies: PersonMovieCredit[] = [];
    tvShows: PersonTvCredit[] = [];
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
        this.apiCall.getPersonTvCredits(this.personId).subscribe({
            next: response => this.tvShows = [...(response.cast ?? [])]
                .filter(show => show.name && show.poster_path)
                .filter(show => !show.genre_ids?.some(genreId => EXCLUDED_TV_GENRE_IDS.has(genreId)))
                .filter((show, index, all) => all.findIndex(item => item.id === show.id) === index)
                .sort((a, b) => b.vote_count - a.vote_count)
                .slice(0, 15),
            error: () => this.tvShows = [],
        });
    }

    openTvShow(show: PersonTvCredit): void {
        this.selectTvShow.emit(show);
    }
}