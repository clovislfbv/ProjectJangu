import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ApiCallService, Movie } from '../api-call.service';
import { MovieDetailOverlayComponent } from './movie-detail-overlay.component';

describe('MovieDetailOverlayComponent', () => {
    let component: MovieDetailOverlayComponent;
    let fixture: ComponentFixture<MovieDetailOverlayComponent>;
    let apiCall: jasmine.SpyObj<ApiCallService>;

    const movie = (id: number, overrides: Partial<Movie> = {}): Movie => ({
        adult: false, backdrop_path: '', genre_ids: [], id, original_language: 'en',
        original_title: `Movie ${id}`, overview: 'Overview', popularity: id,
        poster_path: `/movie-${id}.jpg`, release_date: '2026-01-01', title: `Movie ${id}`,
        video: false, vote_average: 7.5, vote_count: 10, ...overrides,
    });

    beforeEach(async () => {
        apiCall = jasmine.createSpyObj<ApiCallService>('ApiCallService', [
            'getMovieGenres', 'getMovieCredits', 'getMovieVideos', 'getMovieDetails',
            'getStreamingLinksForTmdbMovie', 'getMovieRecommendations', 'getYouTubeVideoStats',
            'getMovieOverview',
        ]);
        apiCall.getMovieGenres.and.returnValue(of({ genres: [] }));
        apiCall.getMovieCredits.and.returnValue(of({ id: 1, cast: [], crew: [] }));
        apiCall.getMovieVideos.and.returnValue(of({ id: 1, results: [] }));
        apiCall.getMovieDetails.and.returnValue(of({ id: 1, runtime: 120 }));
        apiCall.getStreamingLinksForTmdbMovie.and.returnValue(of([]));
        apiCall.getMovieRecommendations.and.returnValue(of({
            page: 1, total_pages: 1, total_results: 6,
            results: [movie(1), movie(2), movie(2), movie(3, { adult: true }),
                movie(4, { poster_path: '' }), movie(5)],
        }));

        await TestBed.configureTestingModule({
            imports: [MovieDetailOverlayComponent],
            providers: [{ provide: ApiCallService, useValue: apiCall }],
        }).compileComponents();

        fixture = TestBed.createComponent(MovieDetailOverlayComponent);
        component = fixture.componentInstance;
        component.movie = movie(1);
        fixture.detectChanges();
    });

    it('loads and displays unique safe recommendations with posters', () => {
        expect(apiCall.getMovieRecommendations).toHaveBeenCalledWith(1);
        expect(component.recommendations.map(({ id }) => id)).toEqual([2, 5]);
        expect(fixture.nativeElement.querySelectorAll('.recommendation-item').length).toBe(2);
    });

    it('emits the selected recommendation', () => {
        const selected: Movie[] = [];
        component.selectMovie.subscribe(value => selected.push(value));

        const button: HTMLButtonElement = fixture.nativeElement.querySelector('.recommendation-item');
        button.click();

        expect(selected.map(({ id }) => id)).toEqual([2]);
    });
});
