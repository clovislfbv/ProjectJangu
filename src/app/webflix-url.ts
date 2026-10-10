import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, of } from 'rxjs';

const STORAGE_KEY = 'projectJanguWebflixBaseUrl';
const DEFAULT_URL = 'https://webflix.art';
const URL_CHECK_ENDPOINT = '/api/webflix-url';

@Injectable({ providedIn: 'root' })
export class WebflixUrlService {
    private readonly urlSubject = new BehaviorSubject(this.readStoredUrl());
    readonly baseUrl$ = this.urlSubject.asObservable();

    constructor(private http: HttpClient) {
        this.persistUrl(this.urlSubject.value);
    }

    get baseUrl(): string {
        return this.urlSubject.value;
    }

    checkOfficialUrl(): void {
        this.http.get<{ url: string } | string>(URL_CHECK_ENDPOINT).pipe(
            map(response => typeof response === 'string'
                ? this.extractWebflixUrl(response)
                : response.url),
            map(url => new URL(url).origin),
            catchError(() => of(null)),
        ).subscribe(url => {
            if (!url || url === this.baseUrl) return;
            this.urlSubject.next(url);
            this.persistUrl(url);
        });
    }

    private extractWebflixUrl(html: string): string {
        const match = html.match(/<[^>]*id=["']url-domain["'][^>]*>([^<]+)</i);
        const domain = match?.[1].trim();
        if (!domain) throw new Error('Webflix domain not found');
        return `https://${domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '')}`;
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
            return value ? new URL(value).origin : DEFAULT_URL;
        } catch {
            return DEFAULT_URL;
        }
    }
}
