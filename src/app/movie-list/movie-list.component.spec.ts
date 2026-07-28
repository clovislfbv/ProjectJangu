import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ApiCallService, DiscoverMovieResponse, Movie } from '../api-call.service';
import { MovieListComponent } from './movie-list.component';

describe('MovieListComponent', () => {
    let component: MovieListComponent;
    let fixture: ComponentFixture<MovieListComponent>;
    let apiCall: jasmine.SpyObj<ApiCallService>;

    const movie = (id: number): Movie => ({
        adult: false, backdrop_path: '', genre_ids: [], id, original_language: 'en',
        original_title: `Movie ${id}`, overview: '', popularity: id, poster_path: '',
        release_date: '2026-01-01', title: `Movie ${id}`, video: false,
        vote_average: 7, vote_count: 1,
    });

    const response = (page: number, totalPages: number, results: Movie[]): DiscoverMovieResponse => ({
        page, results, total_pages: totalPages, total_results: results.length,
    });

    beforeEach(async () => {
        apiCall = jasmine.createSpyObj<ApiCallService>('ApiCallService', [
            'DiscoverMovies',
            'SearchMovies',
            'excludeEroticMovies',
            'excludeMoviesShorterThan',
        ]);
        apiCall.DiscoverMovies.and.returnValue(of(response(1, 3, [movie(1)])));
        apiCall.excludeEroticMovies.and.callFake((movies: Movie[]) => of(movies));
        apiCall.excludeMoviesShorterThan.and.callFake((movies: Movie[]) => of(movies));

        await TestBed.configureTestingModule({
            imports: [MovieListComponent],
            providers: [{ provide: ApiCallService, useValue: apiCall }],
        }).compileComponents();

        fixture = TestBed.createComponent(MovieListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('loads and appends every requested page', () => {
        apiCall.DiscoverMovies.and.returnValues(
            of(response(2, 3, [movie(2)])),
            of(response(3, 3, [movie(3)])),
        );

        component.loadNextPage();
        component.loadNextPage();

        expect(component.movies.map(({ id }) => id)).toEqual([1, 2, 3]);
        expect(apiCall.DiscoverMovies.calls.allArgs().map(args => args[4])).toEqual([1, 2, 3]);
        expect(apiCall.excludeEroticMovies.calls.allArgs()).toEqual([
            [[movie(1)]],
            [[movie(2)]],
            [[movie(3)]],
        ]);
        expect(apiCall.excludeMoviesShorterThan.calls.allArgs()).toEqual([
            [[movie(1)], 50],
            [[movie(2)], 50],
            [[movie(3)], 50],
        ]);
    });

    it('does not request a page after the last available page', () => {
        apiCall.DiscoverMovies.and.returnValue(of(response(2, 2, [movie(2)])));

        component.loadNextPage();
        component.loadNextPage();

        expect(apiCall.DiscoverMovies).toHaveBeenCalledTimes(2);
    });

    it('resets pagination when search criteria change', () => {
        apiCall.SearchMovies.and.returnValue(of(response(1, 4, [movie(10)])));

        component.search('matrix');

        expect(component.movies.map(({ id }) => id)).toEqual([10]);
        expect(apiCall.SearchMovies).toHaveBeenCalledWith('matrix', '', '', 1);
    });

    it('does not apply the current year by default when filtering by country', () => {
        apiCall.DiscoverMovies.and.returnValue(of(response(1, 1, [movie(20)])));

        component.search('', 'popularity.desc', '', '', 'FR');

        expect(apiCall.DiscoverMovies).toHaveBeenCalledWith('popularity.desc', '', '', 'FR', 1);
    });

    it('checks TMDB keywords to exclude erotic movies', () => {
        apiCall.DiscoverMovies.and.returnValue(of(response(1, 1, [movie(30)])));

        component.search('', 'popularity.desc', '', '', 'FR');

        expect(apiCall.excludeEroticMovies).toHaveBeenCalledWith([movie(30)]);
    });

    it('filters every page when filters are active', () => {
        apiCall.DiscoverMovies.and.returnValues(
            of(response(1, 2, [movie(40)])),
            of(response(2, 2, [movie(41)])),
        );
        apiCall.excludeEroticMovies.calls.reset();

        component.search('', 'title.asc', '', '18', 'FR');
        component.loadNextPage();

        expect(apiCall.excludeEroticMovies.calls.allArgs()).toEqual([
            [[movie(40)]],
            [[movie(41)]],
        ]);
        expect(apiCall.excludeMoviesShorterThan).not.toHaveBeenCalled();
    });
});
