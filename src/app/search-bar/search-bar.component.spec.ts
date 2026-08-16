import { ComponentFixture, TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';

import { SearchBarComponent } from './search-bar.component';
import { ApiCallService, Movie, PersonSearchResult, TvShow } from '../api-call.service';
import { of } from 'rxjs';

describe('SearchBarComponent', () => {
  let component: SearchBarComponent;
  let fixture: ComponentFixture<SearchBarComponent>;
  let apiCall: jasmine.SpyObj<ApiCallService>;

  const movie: Movie = {
    adult: false, backdrop_path: '', genre_ids: [18], id: 1, original_language: 'en',
    original_title: 'Matrix', overview: '', popularity: 1, poster_path: '/matrix.jpg',
    release_date: '1999-03-31', title: 'Matrix', video: false, vote_average: 8.2, vote_count: 10,
  };
  const actor: PersonSearchResult = {
    id: 2, name: 'Keanu Reeves', profile_path: '/keanu.jpg', known_for_department: 'Acting',
    known_for: [{ id: 1, title: 'Matrix', media_type: 'movie' }],
  };
  const tvShow: TvShow = {
    id: 4, name: 'The Matrix Show', original_name: 'The Matrix Show', overview: '',
    poster_path: '/matrix-show.jpg', backdrop_path: null, first_air_date: '2024-01-01',
    genre_ids: [18], original_language: 'en', popularity: 1, vote_average: 8,
    vote_count: 10, origin_country: ['US'],
  };

  beforeEach(async () => {
    apiCall = jasmine.createSpyObj<ApiCallService>('ApiCallService', [
      'getMovieGenres', 'getTvGenres', 'SearchMovies', 'searchTvShows', 'SearchPersons',
    ]);
    apiCall.getMovieGenres.and.returnValue(of({ genres: [{ id: 28, name: 'Action' }] }));
    apiCall.getTvGenres.and.returnValue(of({ genres: [
      { id: 18, name: 'Drama' },
      { id: 16, name: 'Animation' },
      { id: 10764, name: 'Reality' },
      { id: 10766, name: 'Soap' },
    ] }));
    apiCall.SearchMovies.and.returnValue(of({ page: 1, results: [movie], total_pages: 1, total_results: 1 }));
    apiCall.searchTvShows.and.returnValue(of({ page: 1, results: [tvShow], total_pages: 1, total_results: 1 }));
    apiCall.SearchPersons.and.returnValue(of({
      page: 1, results: [actor, { ...actor, id: 3, name: 'Director', known_for_department: 'Directing' }],
      total_pages: 1, total_results: 2,
    }));
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

  it('suggests matching movies and actors after the debounce', fakeAsync(() => {
    component.onSearchTextChange('mat');
    expect(apiCall.SearchMovies).not.toHaveBeenCalled();

    tick(300);
    fixture.detectChanges();

    expect(apiCall.SearchMovies).toHaveBeenCalledWith('mat');
    expect(apiCall.SearchPersons).toHaveBeenCalledWith('mat');
    expect(apiCall.searchTvShows).toHaveBeenCalledWith('mat');
    expect(component.suggestions.map(item => item.type)).toEqual(['movie', 'tv', 'person']);
    expect(fixture.nativeElement.querySelectorAll('.suggestion').length).toBe(3);
  }));

  it('emits the selected movie suggestion', () => {
    const selected: Movie[] = [];
    component.selectMovie.subscribe(value => selected.push(value));

    component.chooseSuggestion({ type: 'movie', movie });

    expect(selected).toEqual([movie]);
    expect(component.searchText).toBe('Matrix');
    expect(component.suggestionsOpen).toBeFalse();
  });

  it('also suggests films, series and actors in TV mode', fakeAsync(() => {
    fixture.componentRef.setInput('mediaType', 'tv');
    fixture.detectChanges();

    component.onSearchTextChange('mat');
    tick(300);

    expect(apiCall.SearchMovies).toHaveBeenCalledWith('mat');
    expect(apiCall.searchTvShows).toHaveBeenCalledWith('mat');
    expect(apiCall.SearchPersons).toHaveBeenCalledWith('mat');
  }));
});
