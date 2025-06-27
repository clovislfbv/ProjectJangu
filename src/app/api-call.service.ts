import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { api_key } from '../environments/environment';

export interface CastMember {
    cast_id: number;
    character: string;
    credit_id: string;
    gender: number;
    id: number;
    name: string;
    order: number;
    profile_path: string | null;
}

export interface MovieCreditsResponse {
    id: number;
    cast: CastMember[];
    crew: any[];
}

export interface Movie {
    adult: boolean;
    backdrop_path: string;
    genre_ids: number[];
    id: number;
    original_language: string;
    original_title: string;
    overview: string;
    popularity: number;
    poster_path: string;
    release_date: string;
    title: string;
    video: boolean;
    vote_average: number;
    vote_count: number;
}

export interface DiscoverMovieResponse {
    page: number;
    results: Movie[];
    total_pages: number;
    total_results: number;
}

export interface Genre {
    id: number;
    name: string;
}

export interface GenreResponse {
    genres: Genre[];
}

export interface MovieDetails {
    adult: boolean;
    backdrop_path: string;
    belongs_to_collection: any;
    budget: number;
    genres: Genre[];
    homepage: string;
    id: number;
    imdb_id: string;
    original_language: string;
    original_title: string;
    overview: string;
    popularity: number;
    poster_path: string;
    production_companies: any[];
    production_countries: any[];
    release_date: string;
    revenue: number;
    runtime: number;
    spoken_languages: any[];
    status: string;
    tagline: string;
    title: string;  
    video: boolean;
    vote_average: number;
    vote_count: number;
}

@Injectable({
    providedIn: 'root',
})
export class ApiCallService {
    private url =
        'https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc';
    private searchUrlBase =
        'https://api.themoviedb.org/3/search/movie?include_adult=false&language=en-US&page=1&query=';

    private headers = new HttpHeaders({
        accept: 'application/json',
        Authorization: `Bearer ${api_key}`,
    });

    constructor(private http: HttpClient) {}

    DiscoverMovies(alphabeticSelect: string = 'popularity.desc', selectedYear : string = '', selectedGenre: string = ''): Observable<DiscoverMovieResponse> {
        console.log('DiscoverMovies called with:', alphabeticSelect);
        if (selectedYear != "") {
            this.url += `&year=${selectedYear}`;
        }
        if (selectedGenre != "") {
            this.url += `&with_genres=${selectedGenre}`;
        }
        return this.http.get<DiscoverMovieResponse>(this.url + `&sort_by=${alphabeticSelect}`, {
            headers: this.headers,
        });
    }

    SearchMovies(query: string, alphabeticSelect: string = 'popularity.desc'): Observable<DiscoverMovieResponse> {
        const url = this.searchUrlBase + encodeURIComponent(query);
        return this.http.get<DiscoverMovieResponse>(url, { headers: this.headers });
    }

    getMovieGenres(): Observable<GenreResponse> {
        const genreUrl = 'https://api.themoviedb.org/3/genre/movie/list?language=en-US';
        return this.http.get<GenreResponse>(genreUrl, { headers: this.headers });
    }

    getMovieCredits(movieId: number): Observable<MovieCreditsResponse> {
        const url = `https://api.themoviedb.org/3/movie/${movieId}/credits?language=en-US`;
        return this.http.get<MovieCreditsResponse>(url, { headers: this.headers });
    }
}
