import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MovixUrlService } from './movix-url';

describe('MovixUrlService', () => {
    let service: MovixUrlService;
    let http: HttpTestingController;

    beforeEach(() => {
        localStorage.removeItem('projectJanguMovixBaseUrl');
        TestBed.configureTestingModule({
            providers: [
                MovixUrlService,
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(MovixUrlService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
        localStorage.removeItem('projectJanguMovixBaseUrl');
    });

    it('extracts the active domain from a discovery page instead of its own domain', () => {
        service.checkOfficialUrl();

        const request = http.expectOne('/api/movix-url');
        request.flush('<a href="https://movix.example/movie/1">Films</a>');

        expect(service.baseUrl).toBe('https://movix.example');
    });

    it('accepts the JSON response returned by the deployed discovery endpoint', () => {
        service.checkOfficialUrl();

        const request = http.expectOne('/api/movix-url');
        request.flush(JSON.stringify({ url: 'https://movix.example/' }));

        expect(service.baseUrl).toBe('https://movix.example');
        expect(localStorage.getItem('projectJanguMovixBaseUrl')).toBe('https://movix.example');
    });
});
