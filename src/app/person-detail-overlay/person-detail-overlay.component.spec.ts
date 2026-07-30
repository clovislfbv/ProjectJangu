import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiCallService } from '../api-call.service';
import { PersonDetailOverlayComponent } from './person-detail-overlay.component';

describe('PersonDetailOverlayComponent', () => {
    let fixture: ComponentFixture<PersonDetailOverlayComponent>;
    let component: PersonDetailOverlayComponent;
    let apiCall: jasmine.SpyObj<ApiCallService>;

    beforeEach(async () => {
        apiCall = jasmine.createSpyObj('ApiCallService', ['getPersonDetails', 'getPersonMovieCredits']);
        apiCall.getPersonDetails.and.returnValue(of({
            id: 287, name: 'Brad Pitt', biography: 'Bio', birthday: '1963-12-18',
            deathday: null, place_of_birth: 'Shawnee', profile_path: null,
            known_for_department: 'Acting',
        }));
        apiCall.getPersonMovieCredits.and.returnValue(of({ id: 287, cast: [] }));
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
});