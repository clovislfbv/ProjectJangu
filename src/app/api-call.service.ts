import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { api_key, youtube_key } from '../environments/environment';

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

export interface MovieVideosResponse {
    id: number;
    results: Array<{
        id: string;
        iso_639_1: string;
        iso_3166_1: string;
        key: string;
        name: string;
        site: string;
        size: number;
        type: string;
    }>;
}

@Injectable({
    providedIn: 'root',
})
export class ApiCallService {
    private url =
        'https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=us-US&page=1&region=fr';
    private searchUrlBase =
        'https://api.themoviedb.org/3/search/movie?include_adult=false&language=en-US&page=1&query=';

    private headers = new HttpHeaders({
        accept: 'application/json',
        Authorization: `Bearer ${api_key}`,
    });

    private date = "";
    private genre = "";

    constructor(private http: HttpClient) {}

    DiscoverMovies(alphabeticSelect: string = 'popularity.desc', selectedYear : string = '', selectedGenre: string = ''): Observable<DiscoverMovieResponse> {
        if (selectedYear != "") {
            this.date = `&primary_release_year=${selectedYear}`;
        } else {
            this.date = "";
        }

        if (selectedGenre != "") {
            this.genre = `&with_genres=${selectedGenre}`;
        } else {
            this.genre = "";
        }

        return this.http.get<DiscoverMovieResponse>(this.url + this.date + this.genre + `&sort_by=${alphabeticSelect}`, {
            headers: this.headers,
        });
    }

    SearchMovies(query: string, selectedYear: string = ''): Observable<DiscoverMovieResponse> {
        let url = this.searchUrlBase + encodeURIComponent(query);
        if (selectedYear != "") {
            url += `&primary_release_year=${selectedYear}`;
        }
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

    getMovieVideos(movieId: number, language : string = "en-US"): Observable<MovieVideosResponse> {
        const url = `https://api.themoviedb.org/3/movie/${movieId}/videos?language=${language}`;
        return this.http.get<MovieVideosResponse>(url, { headers: this.headers });
    }

    getYouTubeVideoStats(videoId: string): Observable<any> {
        const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtube_key}&part=statistics`;
        return this.http.get(url);
    }
}
