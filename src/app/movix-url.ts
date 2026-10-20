import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, of } from 'rxjs';

const STORAGE_KEY = 'projectJanguMovixBaseUrl';
const URL_CHECK_ENDPOINT = '/api/movix-url';

@Injectable({ providedIn: 'root' })
export class MovixUrlService {
    private readonly urlSubject = new BehaviorSubject(this.readStoredUrl());
    readonly baseUrl$ = this.urlSubject.asObservable();

    constructor(private http: HttpClient) {
        if (this.urlSubject.value) this.persistUrl(this.urlSubject.value);
    }

    get baseUrl(): string | null {
        return this.urlSubject.value;
    }

    checkOfficialUrl(): void {
        this.http.get(URL_CHECK_ENDPOINT, { responseType: 'text' }).pipe(
            map(response => this.extractResponseUrl(response)),
            map(url => new URL(url).origin),
            map(url => url === 'http://localhost' || url === 'https://localhost' ? null : url),
            catchError(() => of(null)),
        ).subscribe(url => {
            if (!url || url === this.baseUrl) return;
            this.urlSubject.next(url);
            this.persistUrl(url);
        });
    }

    private extractResponseUrl(response: string): string {
        try {
            const parsed: unknown = JSON.parse(response);
            if (typeof parsed === 'object' && parsed !== null && 'url' in parsed
                && typeof parsed.url === 'string') {
                return parsed.url;
            }
        } catch {
            // The local proxy returns the discovery page as HTML.
        }
        return this.extractMovixUrl(response);
    }

    private extractMovixUrl(html: string): string {
        const links = html.match(/<a\b[^>]*href\s*=\s*(['"])(.*?)\1[^>]*>/gis) ?? [];
        for (const link of links) {
            const match = link.match(/href\s*=\s*(['"])(https?:\/\/(?:www\.)?(movix\.[a-z]{2,}))(?=[/:?#'"])/i);
            if (match) return new URL(match[2]).origin;
        }

        const match = html.match(/(?:https?:\/\/)?(?:www\.)?(movix\.[a-z]{2,})(?=[:/\s?#]|$)/i);
        if (!match) throw new Error('Movix domain not found');
        return `https://${match[1].toLowerCase()}`;
    }

    private persistUrl(url: string): void {
        try {
            localStorage.setItem(STORAGE_KEY, url);
        } catch {
            // Keep the URL in memory when browser storage is unavailable.
        }
    }

    private readStoredUrl(): string | null {
        try {
            const value = localStorage.getItem(STORAGE_KEY);
            if (!value) return null;
            const origin = new URL(value).origin;
            return origin === 'http://localhost' || origin === 'https://localhost' ? null : origin;
        } catch {
            return null;
        }
    }
}