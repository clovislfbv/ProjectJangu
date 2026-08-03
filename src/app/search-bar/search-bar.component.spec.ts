import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchBarComponent } from './search-bar.component';
import { ApiCallService } from '../api-call.service';
import { of } from 'rxjs';

describe('SearchBarComponent', () => {
  let component: SearchBarComponent;
  let fixture: ComponentFixture<SearchBarComponent>;

  beforeEach(async () => {
    const apiCall = jasmine.createSpyObj<ApiCallService>('ApiCallService', ['getMovieGenres', 'getTvGenres']);
    apiCall.getMovieGenres.and.returnValue(of({ genres: [{ id: 28, name: 'Action' }] }));
    apiCall.getTvGenres.and.returnValue(of({ genres: [
      { id: 18, name: 'Drama' },
      { id: 16, name: 'Animation' },
      { id: 10764, name: 'Reality' },
      { id: 10766, name: 'Soap' },
    ] }));
    await TestBed.configureTestingModule({
      imports: [SearchBarComponent],
      providers: [{ provide: ApiCallService, useValue: apiCall }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads scripted TV genres when the media type changes', () => {
    fixture.componentRef.setInput('mediaType', 'tv');
    fixture.detectChanges();

    expect(component.genres).toEqual([{ id: 18, name: 'Drama' }]);
  });
});
