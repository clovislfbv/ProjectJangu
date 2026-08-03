import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiCallService } from '../api-call.service';
import { PersonDetailOverlayComponent } from './person-detail-overlay.component';

describe('PersonDetailOverlayComponent', () => {
    let fixture: ComponentFixture<PersonDetailOverlayComponent>;
    let component: PersonDetailOverlayComponent;
    let apiCall: jasmine.SpyObj<ApiCallService>;

    beforeEach(async () => {
        apiCall = jasmine.createSpyObj('ApiCallService', ['getPersonDetails', 'getPersonMovieCredits', 'getPersonTvCredits']);
        apiCall.getPersonDetails.and.returnValue(of({
            id: 287, name: 'Brad Pitt', biography: 'Bio', birthday: '1963-12-18',
            deathday: null, place_of_birth: 'Shawnee', profile_path: null,
            known_for_department: 'Acting',
        }));
        apiCall.getPersonMovieCredits.and.returnValue(of({ id: 287, cast: [] }));
        apiCall.getPersonTvCredits.and.returnValue(of({ id: 287, cast: [{
            id: 1399, name: 'Game of Thrones', original_name: 'Game of Thrones', character: 'Guest',
            poster_path: '/poster.jpg', backdrop_path: null, first_air_date: '2011-04-17',
            genre_ids: [18], original_language: 'en', overview: '', popularity: 100,
            vote_average: 8.5, vote_count: 20000, origin_country: ['US'],
        }, {
            id: 2000, name: 'Animated show', original_name: 'Animated show', character: 'Voice',
            poster_path: '/animated.jpg', backdrop_path: null, first_air_date: '2020-01-01',
            genre_ids: [16], original_language: 'en', overview: '', popularity: 90,
            vote_average: 8, vote_count: 10000, origin_country: ['US'],
        }] }));
        await TestBed.configureTestingModule({
            imports: [PersonDetailOverlayComponent],
            providers: [{ provide: ApiCallService, useValue: apiCall }],
        }).compileComponents();
        fixture = TestBed.createComponent(PersonDetailOverlayComponent);
        component = fixture.componentInstance;
        component.personId = 287;
        fixture.detectChanges();
    });

    it('loads the actor details', () => {
        expect(apiCall.getPersonDetails).toHaveBeenCalledWith(287);
        expect(component.person?.name).toBe('Brad Pitt');
    });

    it('loads TV shows featuring the actor', () => {
        expect(apiCall.getPersonTvCredits).toHaveBeenCalledWith(287);
        expect(component.tvShows[0].name).toBe('Game of Thrones');
        expect(component.tvShows.map(show => show.name)).not.toContain('Animated show');
    });
});