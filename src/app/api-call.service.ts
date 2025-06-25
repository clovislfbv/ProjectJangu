import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { api_key } from '../environments/environment';

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

    DiscoverMovies(): Observable<DiscoverMovieResponse> {
        return this.http.get<DiscoverMovieResponse>(this.url, {
            headers: this.headers,
        });
    }
    SearchMovies(query: string): Observable<DiscoverMovieResponse> {
        const url = this.searchUrlBase + encodeURIComponent(query);
        return this.http.get<DiscoverMovieResponse>(url, { headers: this.headers });
    }

    getMovieGenres(): Observable<GenreResponse> {
      const genreUrl = 'https://api.themoviedb.org/3/genre/movie/list?language=en-US';
      return this.http.get<GenreResponse>(genreUrl, { headers: this.headers });
    }
}