import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiCallService, CastMember, MovieDetailsResponse, StreamingLink } from '../api-call.service';
import { Genre } from '../api-call.service';

@Component({
    selector: 'app-movie-detail-overlay',
    imports: [CommonModule],
    standalone: true,
    templateUrl: './movie-detail-overlay.component.html',
    styleUrls: ['./movie-detail-overlay.component.css'],
})
export class MovieDetailOverlayComponent implements OnChanges, OnInit {
    @Input() movie!: any;
    @Output() close = new EventEmitter<void>();
    genres: Genre[] = [];

    cast: CastMember[] = [];
    videos: any[] = [];
    runtimeMinutes: number | null = null;
    streamingLinks: StreamingLink[] = [];
    streamingLinksLoaded = false;

    displayedOverview: string | null = null;
    overviewResolved = false;

    constructor(private apiCall: ApiCallService, private sanitizer: DomSanitizer) {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes['movie'] && this.movie?.id) {
            this.resolveOverview();
            this.loadCast(this.movie.id);
            this.loadVideos(this.movie.id);
            this.loadRuntime(this.movie.id);
            this.loadStreamingLinks(this.movie.id);
            this.preventBodyScrollOnIOS();
        } else if (!this.movie) {
            this.restoreBodyScrollOnIOS();
            this.runtimeMinutes = null;
            this.streamingLinks = [];
            this.streamingLinksLoaded = false;

            this.displayedOverview = null;
            this.overviewResolved = false;
        }
    }

    private resolveOverview() {
        this.overviewResolved = false;
        const fromList = (this.movie?.overview ?? '').trim();
        if (fromList.length > 0) {
            this.displayedOverview = fromList;
            this.overviewResolved = true;
            return;
        }

        this.displayedOverview = null;
        this.apiCall.getMovieOverview(this.movie.id).subscribe((overview) => {
            this.displayedOverview = overview;
            this.overviewResolved = true;
        });
    }

    ngOnInit() {
        this.apiCall.getMovieGenres().subscribe((response) => {
            this.genres = response.genres;
        });
    }

    closeOverlay() {
        this.restoreBodyScrollOnIOS();
        this.close.emit();
    }

    private isIOSPhone(): boolean {
        const userAgent = navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(userAgent);
        const isPhone = window.innerWidth <= 768; // Phone screen size
        return isIOS && isPhone;
    }

    private preventBodyScrollOnIOS() {
        if (this.isIOSPhone()) {
            // Prevent body scrolling on iOS phones using touch events
            document.body.style.position = 'fixed';
        }
        // Always add the CSS class for general styling
        document.body.classList.add('no-scroll');
    }

    private restoreBodyScrollOnIOS() {
        if (this.isIOSPhone()) {
            // Restore body scrolling on iOS phones
            document.body.style.position = '';
        }
        // Always remove the CSS class
        document.body.classList.remove('no-scroll');
    }

    private loadCast(movieId: number) {
        this.apiCall.getMovieCredits(movieId).subscribe((response) => {
            this.cast = response.cast || [];
        });
    }

    private loadVideos(movieId: number) {
        this.apiCall.getMovieVideos(movieId, { originalLanguage: this.movie?.original_language }).subscribe(async (response) => {
            const videos = response.results || [];

            const trailerVideos = videos.filter((video: any) => video.type === 'Trailer');
            
            // Get view counts for YouTube videos
            const videosWithViews = await Promise.all(trailerVideos.map(async (video: any) => {
                let viewCount = 0;
                
                if (video.site === 'YouTube') {
                    try {
                        const stats = await this.apiCall.getYouTubeVideoStats(video.key).toPromise();
                        if (stats && stats.items && stats.items.length > 0) {
                            viewCount = parseInt(stats.items[0].statistics.viewCount) || 0;
                        }
                    } catch (error) {
                        console.error('Error fetching YouTube stats:', error);
                        viewCount = 0;
                    }
                }
                
                return {
                    ...video,
                    viewCount
                };
            }));
            
            // Sort by view count (highest first), then by size
            this.videos = videosWithViews.sort((a, b) => {
                // Prioritize videos with view counts
                if (a.viewCount !== b.viewCount) {
                    return b.viewCount - a.viewCount; // Highest views first
                }
                // If view counts are equal (or both 0), sort by size
                return (b.size || 0) - (a.size || 0);
            });
        });
    }

    private loadRuntime(movieId: number) {
        this.apiCall.getMovieDetails(movieId, { originalLanguage: this.movie?.original_language }).subscribe((response: MovieDetailsResponse) => {
            this.runtimeMinutes = response?.runtime ?? null;
        });
    }

    private loadStreamingLinks(movieId: number) {
        this.streamingLinksLoaded = false;
        this.apiCall.getStreamingLinksForTmdbMovie(movieId).subscribe((links) => {
            this.streamingLinks = links || [];
            this.streamingLinksLoaded = true;
        });
    }

    getNoStreamingFoundMessage(): string {
        const lang = (typeof navigator !== 'undefined' && navigator.language)
            ? navigator.language.split('-')[0].toLowerCase()
            : 'en';

        const messages: Record<string, string> = {
            fr: 'Aucun service de streaming trouvé pour ce film',
            en: 'No streaming service found for this title',
            es: 'No se encontró ningún servicio de streaming para este título',
            de: 'Kein Streaming-Dienst für diesen Titel gefunden',
            it: 'Nessun servizio di streaming trovato per questo titolo',
            pt: 'Nenhum serviço de streaming encontrado para este título',
            nl: 'Geen streamingdienst gevonden voor deze titel',
        };

        return messages[lang] ?? messages['en'];
    }

    getOverviewLabel(): string {
        const lang = (typeof navigator !== 'undefined' && navigator.language)
            ? navigator.language.split('-')[0].toLowerCase()
            : 'en';

        const labels: Record<string, string> = {
            fr: 'Résumé',
            en: 'Overview',
            es: 'Resumen',
            de: 'Übersicht',
            it: 'Trama',
            pt: 'Sinopse',
            nl: 'Overzicht',
        };

        return labels[lang] ?? labels['en'];
    }

    getNoOverviewMessage(): string {
        const lang = (typeof navigator !== 'undefined' && navigator.language)
            ? navigator.language.split('-')[0].toLowerCase()
            : 'en';

        const messages: Record<string, string> = {
            fr: 'Aucun résumé disponible',
            en: 'No overview available',
            es: 'No hay resumen disponible',
            de: 'Keine Übersicht verfügbar',
            it: 'Nessuna trama disponibile',
            pt: 'Nenhuma sinopse disponível',
            nl: 'Geen overzicht beschikbaar',
        };

        return messages[lang] ?? messages['en'];
    }

    formatRuntime(minutes: number | null | undefined): string {
        if (!minutes || minutes <= 0) return 'NA';
        const hours = Math.floor(minutes / 60);
        const remaining = minutes % 60;
        if (hours <= 0) return `${minutes} min`;
        const paddedMinutes = remaining.toString().padStart(2, '0');
        return `${hours}h ${paddedMinutes}min`;
    }

    getGenreNames(ids: number[], genres: Genre[]): string {
        if (!ids || !genres) return 'NA';
        return genres
            .filter(g => ids.includes(g.id))
            .map(g => g.name)
            .join(', ') || 'NA';
    }

    getVideoUrl(video: any): SafeResourceUrl {
        if (!video) return '';
        let url = '';
        if (video.site === 'YouTube') {
            url = `https://www.youtube.com/embed/${video.key}`;
        } else if (video.site === 'Vimeo') {
            url = `https://player.vimeo.com/video/${video.key}`;
        }
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
}
