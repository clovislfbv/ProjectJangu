import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiCallService } from '../api-call.service';
import { TvSeasonDetailOverlayComponent } from './tv-season-detail-overlay.component';

describe('TvSeasonDetailOverlayComponent', () => {
    let fixture: ComponentFixture<TvSeasonDetailOverlayComponent>;
    let component: TvSeasonDetailOverlayComponent;
    let api: jasmine.SpyObj<ApiCallService>;

    beforeEach(async () => {
        api = jasmine.createSpyObj('ApiCallService', ['getTvSeasonDetails']);
        api.getTvSeasonDetails.and.returnValue(of({
            id: 100, name: 'Saison 1', season_number: 1, episode_count: 1,
            air_date: '2020-01-01', poster_path: '/season.jpg', overview: 'Résumé',
            episodes: [{
                id: 101, name: 'Pilote', overview: 'Premier épisode', air_date: '2020-01-01',
                episode_number: 1, season_number: 1, runtime: 50, still_path: '/episode.jpg', vote_average: 8,
                guest_stars: [{ id: 2, name: 'Guest', character: 'Guest role', cast_id: 2, credit_id: 'g', gender: 1, order: 1, profile_path: null }],
            }],
        }));
        await TestBed.configureTestingModule({
            imports: [TvSeasonDetailOverlayComponent],
            providers: [{ provide: ApiCallService, useValue: api }],
        }).compileComponents();
        fixture = TestBed.createComponent(TvSeasonDetailOverlayComponent);
        component = fixture.componentInstance;
        component.tvId = 200;
        component.showName = 'La série';
        component.season = { id: 100, name: 'Saison 1', season_number: 1, episode_count: 1, air_date: '2020-01-01', poster_path: '/season.jpg' };
        fixture.detectChanges();
    });

    it('loads the selected season and its episodes', () => {
        expect(api.getTvSeasonDetails).toHaveBeenCalledWith(200, 1);
        expect(component.details?.episodes[0].name).toBe('Pilote');
        expect(component.episodeOnlyActors(component.details!.episodes[0]).map(actor => actor.name)).toEqual(['Guest']);
    });
});