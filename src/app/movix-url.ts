import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, of } from 'rxjs';

const STORAGE_KEY = 'projectJanguMovixBaseUrl';
const DEFAULT_URL = 'https://movix.men';
const URL_CHECK_ENDPOINT = '/api/movix-url';

@Injectable({ providedIn: 'root' })
export class MovixUrlService {
    private readonly urlSubject = new BehaviorSubject(this.readStoredUrl());
    readonly baseUrl$ = this.urlSubject.asObservable();

    constructor(private http: HttpClient) {
        this.persistUrl(this.urlSubject.value);
    }

    get baseUrl(): string {
        return this.urlSubject.value;
    }

    checkOfficialUrl(): void {
        this.http.get<{ url: string }>(URL_CHECK_ENDPOINT).pipe(
            map(response => response.url),
            map(url => new URL(url).origin),
            map(url => url === 'http://localhost' || url === 'https://localhost'
                ? DEFAULT_URL
                : url),
            catchError(() => of(null)),
        ).subscribe(url => {
            if (!url || url === this.baseUrl) return;
            this.urlSubject.next(url);
            this.persistUrl(url);
        });
    }

    private persistUrl(url: string): void {
        try {
            localStorage.setItem(STORAGE_KEY, url);
        } catch {
            // Keep the URL in memory when browser storage is unavailable.
        }
    }

    private readStoredUrl(): string {
        try {
            const value = localStorage.getItem(STORAGE_KEY);
            if (!value) return DEFAULT_URL;
            const origin = new URL(value).origin;
            return origin === 'http://localhost' || origin === 'https://localhost'
                ? DEFAULT_URL
                : origin;
        } catch {
            return DEFAULT_URL;
        }
    }
}