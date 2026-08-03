import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ApiCallService, DiscoverMovieResponse, Movie } from '../api-call.service';
import { MovieListComponent } from './movie-list.component';
import { provideRouter, Router } from '@angular/router';

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
            'getPopularMovies',
            'getPopularTvShows',
            'discoverTvShows',
            'searchTvShows',
            'SearchMovies',
            'excludeEroticMovies',
            'excludeMoviesShorterThan',
            'getMovieById',
            'getTvShowById',
            'SearchPersons',
        ]);
        apiCall.DiscoverMovies.and.returnValue(of(response(1, 3, [movie(1)])));
        apiCall.getPopularMovies.and.returnValue(of(response(1, 1, [movie(100)])));
        apiCall.getPopularTvShows.and.returnValue(of({ page: 1, total_pages: 1, total_results: 2, results: [{
            id: 200, name: 'Popular show', original_name: 'Popular show', overview: '', poster_path: null,
            backdrop_path: null, first_air_date: '2026-01-01', genre_ids: [], original_language: 'en',
            popularity: 100, vote_average: 8, vote_count: 10, origin_country: ['US'],
        }, {
            id: 201, name: 'Reality show', original_name: 'Reality show', overview: '', poster_path: null,
            backdrop_path: null, first_air_date: '2026-01-01', genre_ids: [10764], original_language: 'en',
            popularity: 90, vote_average: 7, vote_count: 5, origin_country: ['US'],
        }, {
            id: 202, name: 'Animated show', original_name: 'Animated show', overview: '', poster_path: null,
            backdrop_path: null, first_air_date: '2026-01-01', genre_ids: [16], original_language: 'en',
            popularity: 80, vote_average: 8, vote_count: 5, origin_country: ['JP'],
        }, {
            id: 204, name: 'Soap show', original_name: 'Soap show', overview: '', poster_path: null,
            backdrop_path: null, first_air_date: '2026-01-01', genre_ids: [10766], original_language: 'es',
            popularity: 75, vote_average: 7, vote_count: 5, origin_country: ['MX'],
        }] }));
        apiCall.discoverTvShows.and.returnValue(of({ page: 1, total_pages: 1, total_results: 1, results: [{
            id: 203, name: 'French drama', original_name: 'French drama', overview: '', poster_path: null,
            backdrop_path: null, first_air_date: '2025-01-01', genre_ids: [18], original_language: 'fr',
            popularity: 70, vote_average: 8, vote_count: 5, origin_country: ['FR'],
        }] }));
        apiCall.searchTvShows.and.returnValue(of({ page: 1, total_pages: 1, total_results: 1, results: [{
            id: 205, name: 'Searched animated show', original_name: 'Searched animated show', overview: '', poster_path: null,
            backdrop_path: null, first_air_date: '2024-01-01', genre_ids: [16], original_language: 'ja',
            popularity: 60, vote_average: 8, vote_count: 5, origin_country: ['JP'],
        }] }));
        apiCall.excludeEroticMovies.and.callFake((movies: Movie[]) => of(movies));
        apiCall.excludeMoviesShorterThan.and.callFake((movies: Movie[]) => of(movies));
        apiCall.SearchPersons.and.returnValue(of({ page: 1, results: [], total_pages: 1, total_results: 0 }));

        await TestBed.configureTestingModule({
            imports: [MovieListComponent],
            providers: [{ provide: ApiCallService, useValue: apiCall }, provideRouter([])],
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

    it('loads popular movies from the dedicated endpoint', () => {
        component.showPopularMovies();

        expect(apiCall.getPopularMovies).toHaveBeenCalledWith(1);
        expect(component.movies.map(({ id }) => id)).toEqual([100]);
    });

    it('loads popular TV shows from the dedicated endpoint', () => {
        component.showPopularTvShows();

        expect(apiCall.getPopularTvShows).toHaveBeenCalledWith(1);
        expect(component.tvShows[0].name).toBe('Popular show');
        expect(component.tvShows.map(show => show.name)).not.toContain('Reality show');
        expect(component.tvShows.map(show => show.name)).not.toContain('Animated show');
        expect(component.tvShows.map(show => show.name)).not.toContain('Soap show');
        expect(component.movies).toEqual([]);
    });

    it('keeps TV context and uses discover TV when filters are applied', () => {
        component.showPopularTvShows();

        component.search('', 'title.asc', '2025', '18', 'FR');

        expect(apiCall.discoverTvShows).toHaveBeenCalledWith('title.asc', '2025', '18', 'FR', 1);
        expect(apiCall.DiscoverMovies).not.toHaveBeenCalledWith('title.asc', '2025', '18', 'FR', 1);
        expect(component.tvShows.map(show => show.name)).toEqual(['French drama']);
    });

    it('does not exclude TV genres when searching for a specific series', () => {
        component.showPopularTvShows();

        component.search('Searched animated show');

        expect(apiCall.searchTvShows).toHaveBeenCalledWith('Searched animated show', '', 1);
        expect(component.tvShows.map(show => show.name)).toContain('Searched animated show');
    });

    it('opens a person profile from a TV cast member', async () => {
        component.selectTvShow({
            id: 200, name: 'Show', original_name: 'Show', overview: '', poster_path: null,
            backdrop_path: null, first_air_date: '2026-01-01', genre_ids: [], original_language: 'en',
            popularity: 1, vote_average: 8, vote_count: 1, origin_country: ['US'],
        });

        component.openActorFromTv({
            id: 287, name: 'Actor', character: 'Character', cast_id: 1,
            credit_id: 'credit', gender: 2, order: 0, profile_path: null,
        });
        await fixture.whenStable();

        expect(component.selectedTvShow).toBeNull();
        expect(component.selectedPersonId).toBe(287);
        expect(TestBed.inject(Router).url).toContain('actor=287');
    });

    it('opens a TV show selected from a person profile', async () => {
        component.openPerson({ id: 287, name: 'Actor', profile_path: null, known_for_department: 'Acting', known_for: [] });
        const show = {
            id: 1399, name: 'Game of Thrones', original_name: 'Game of Thrones', overview: '', poster_path: null,
            backdrop_path: null, first_air_date: '2011-04-17', genre_ids: [18], original_language: 'en',
            popularity: 100, vote_average: 8.5, vote_count: 20000, origin_country: ['US'],
        };

        component.openTvShowFromActor(show);
        await fixture.whenStable();

        expect(component.selectedPersonId).toBeNull();
        expect(component.selectedTvShow?.id).toBe(1399);
        expect(TestBed.inject(Router).url).toContain('tv=1399');
        expect(TestBed.inject(Router).url).not.toContain('actor=');
    });

    it('adds the selected TV show id to the shareable URL', async () => {
        component.selectTvShow({
            id: 1399, name: 'Game of Thrones', original_name: 'Game of Thrones', overview: '', poster_path: null,
            backdrop_path: null, first_air_date: '2011-04-17', genre_ids: [18], original_language: 'en',
            popularity: 100, vote_average: 8.5, vote_count: 20000, origin_country: ['US'],
        });
        await fixture.whenStable();

        expect(TestBed.inject(Router).url).toContain('tv=1399');
        expect(component.selectedTvShow?.id).toBe(1399);
    });

    it('loads a TV show opened directly from a URL parameter', async () => {
        apiCall.getTvShowById.and.returnValue(of({
            id: 1399, name: 'Game of Thrones', original_name: 'Game of Thrones', overview: '', poster_path: null,
            backdrop_path: null, first_air_date: '2011-04-17', genre_ids: [18], original_language: 'en',
            popularity: 100, vote_average: 8.5, vote_count: 20000, origin_country: ['US'],
        }));

        await TestBed.inject(Router).navigate([], { queryParams: { tv: 1399 } });
        fixture.detectChanges();

        expect(apiCall.getTvShowById).toHaveBeenCalledWith(1399);
        expect(component.selectedTvShow?.id).toBe(1399);
    });

    it('removes the TV parameter when closing the overlay', async () => {
        component.selectTvShow({
            id: 1399, name: 'Game of Thrones', original_name: 'Game of Thrones', overview: '', poster_path: null,
            backdrop_path: null, first_air_date: '2011-04-17', genre_ids: [18], original_language: 'en',
            popularity: 100, vote_average: 8.5, vote_count: 20000, origin_country: ['US'],
        });
        await fixture.whenStable();

        component.closeTvShow();
        await fixture.whenStable();

        expect(TestBed.inject(Router).url).not.toContain('tv=');
        expect(component.selectedTvShow).toBeNull();
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

    it('adds the selected movie id to the shareable URL', async () => {
        component.onSelect(movie(42));
        await fixture.whenStable();

        expect(TestBed.inject(Router).url).toContain('movie=42');
        expect(component.selectedMovie?.id).toBe(42);
    });

    it('loads a movie opened directly from a URL parameter', async () => {
        apiCall.getMovieById.and.returnValue(of(movie(99)));

        await TestBed.inject(Router).navigate([], { queryParams: { movie: 99 } });
        fixture.detectChanges();

        expect(apiCall.getMovieById).toHaveBeenCalledWith(99);
        expect(component.selectedMovie?.id).toBe(99);
    });

    it('removes the movie parameter when closing the overlay', async () => {
        component.onSelect(movie(42));
        await fixture.whenStable();

        component.closeMovie();
        await fixture.whenStable();

        expect(TestBed.inject(Router).url).not.toContain('movie=');
        expect(component.selectedMovie).toBeNull();
    });

    it('adds an actor id to the URL when an actor is selected', async () => {
        component.onSelect(movie(42));
        await fixture.whenStable();

        component.openActor({
            id: 287, name: 'Brad Pitt', character: '', cast_id: 1,
            credit_id: 'credit', gender: 2, order: 0, profile_path: null,
        });
        await fixture.whenStable();

        expect(TestBed.inject(Router).url).toContain('actor=287');
        expect(TestBed.inject(Router).url).not.toContain('movie=');
        expect(component.selectedPersonId).toBe(287);
        expect(component.selectedMovie).toBeNull();
    });

    it('replaces the actor parameter with the movie parameter', async () => {
        component.openPerson({
            id: 287, name: 'Brad Pitt', profile_path: null,
            known_for_department: 'Acting', known_for: [],
        });
        await fixture.whenStable();

        component.onSelect(movie(550));
        await fixture.whenStable();

        expect(TestBed.inject(Router).url).toContain('movie=550');
        expect(TestBed.inject(Router).url).not.toContain('actor=');
        expect(component.selectedPersonId).toBeNull();
    });

    it('opens a loaded movie from an actor with a single navigation', async () => {
        const router = TestBed.inject(Router);
        component.movies = [movie(550)];
        component.selectedPersonId = 287;
        const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

        component.openMovieFromActor(550);

        expect(navigateSpy).toHaveBeenCalledTimes(1);
        expect(navigateSpy).toHaveBeenCalledWith([], jasmine.objectContaining({
            queryParams: { movie: 550, actor: null },
        }));
        expect(component.selectedPersonId).toBeNull();
        expect(component.selectedMovie?.id).toBe(550);
    });

    it('does not request or open the same actor movie multiple times', () => {
        apiCall.getMovieById.and.returnValue(of(movie(550)));
        const navigateSpy = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        component.selectedPersonId = 287;

        component.openMovieFromActor(550);
        component.openMovieFromActor(550);

        expect(apiCall.getMovieById).toHaveBeenCalledTimes(1);
        expect(navigateSpy).toHaveBeenCalledTimes(1);
        expect(component.selectedMovie?.id).toBe(550);
    });

    it('does not reload an actor movie when its URL navigation is observed', async () => {
        apiCall.getMovieById.and.returnValue(of(movie(550)));
        component.selectedPersonId = 287;

        component.openMovieFromActor(550);
        await fixture.whenStable();

        expect(apiCall.getMovieById).toHaveBeenCalledTimes(1);
        expect(TestBed.inject(Router).url).toContain('movie=550');
        expect(TestBed.inject(Router).url).not.toContain('actor=');
        expect(component.selectedMovie?.id).toBe(550);
    });

    it('allows reopening the same movie after returning to the actor', async () => {
        const router = TestBed.inject(Router);
        apiCall.getMovieById.and.returnValue(of(movie(550)));

        await router.navigate([], { queryParams: { actor: 287 } });
        component.openMovieFromActor(550);
        await fixture.whenStable();
        expect(component.selectedMovie?.id).toBe(550);

        await router.navigate([], { queryParams: { actor: 287, movie: null } });
        expect(component.selectedMovie).toBeNull();
        expect(component.selectedPersonId).toBe(287);

        component.openMovieFromActor(550);
        await fixture.whenStable();

        expect(apiCall.getMovieById).toHaveBeenCalledTimes(2);
        expect(component.selectedMovie?.id).toBe(550);
        expect(router.url).toContain('movie=550');
    });

    it('searches actors and displays acting profiles with movie links', () => {
        apiCall.SearchMovies.and.returnValue(of(response(1, 1, [])));
        apiCall.SearchPersons.and.returnValue(of({
            page: 1, total_pages: 1, total_results: 1,
            results: [{
                id: 287, name: 'Brad Pitt', profile_path: null,
                known_for_department: 'Acting',
                known_for: [{ id: 550, title: 'Fight Club', media_type: 'movie' }],
            }],
        }));

        component.search('Brad Pitt');

        expect(apiCall.SearchPersons).toHaveBeenCalledWith('Brad Pitt');
        expect(component.people[0].name).toBe('Brad Pitt');
    });
});
