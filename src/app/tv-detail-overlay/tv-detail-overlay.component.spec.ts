import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ApiCallService, TvShow, TvShowDetails } from '../api-call.service';
import { TvDetailOverlayComponent } from './tv-detail-overlay.component';

describe('TvDetailOverlayComponent', () => {
    let component: TvDetailOverlayComponent;
    let fixture: ComponentFixture<TvDetailOverlayComponent>;
    let api: jasmine.SpyObj<ApiCallService>;

    const show = (id: number, overrides: Partial<TvShow> = {}): TvShow => ({
        id, name: `Show ${id}`, original_name: `Show ${id}`, overview: '',
        poster_path: `/show-${id}.jpg`, backdrop_path: null, first_air_date: '2020-01-01',
        genre_ids: [18], original_language: 'en', popularity: id, vote_average: 8,
        vote_count: 10, origin_country: ['US'], ...overrides,
    });

    beforeEach(async () => {
        api = jasmine.createSpyObj<ApiCallService>('ApiCallService', [
            'getTvShowDetails', 'getTvShowCredits', 'getTvShowVideos',
            'getTvWatchProviders', 'getTvRecommendations',
        ]);
        api.getTvShowDetails.and.returnValue(of({
            ...show(1), genres: [], episode_run_time: [], number_of_episodes: 0,
            number_of_seasons: 0, status: '', tagline: '', last_air_date: '',
            networks: [], seasons: [],
        } as TvShowDetails));
        api.getTvShowCredits.and.returnValue(of({ id: 1, cast: [], crew: [] }));
        api.getTvShowVideos.and.returnValue(of({ id: 1, results: [] }));
        api.getTvWatchProviders.and.returnValue(of({ providers: [], region: 'FR' }));
        api.getTvRecommendations.and.returnValue(of({
            page: 1, total_pages: 1, total_results: 6,
            results: [show(1), show(2), show(2), show(3, { genre_ids: [10764] }),
                show(4, { poster_path: null }), show(5)],
        }));

        await TestBed.configureTestingModule({
            imports: [TvDetailOverlayComponent],
            providers: [{ provide: ApiCallService, useValue: api }],
        }).compileComponents();

        fixture = TestBed.createComponent(TvDetailOverlayComponent);
        component = fixture.componentInstance;
        component.show = show(1);
        fixture.detectChanges();
    });

    it('displays unique recommendations allowed by the TV catalogue', () => {
        expect(api.getTvRecommendations).toHaveBeenCalledWith(1);
        expect(component.recommendations.map(({ id }) => id)).toEqual([2, 5]);
        expect(fixture.nativeElement.querySelectorAll('.recommendation').length).toBe(2);
    });

    it('emits the selected recommended TV show', () => {
        const selected: TvShow[] = [];
        component.selectTvShow.subscribe(value => selected.push(value));

        const button: HTMLButtonElement = fixture.nativeElement.querySelector('.recommendation');
        button.click();

        expect(selected.map(({ id }) => id)).toEqual([2]);
    });
});