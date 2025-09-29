import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiCallService, CastMember } from '../api-call.service';
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

    constructor(private apiCall: ApiCallService, private sanitizer: DomSanitizer) {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes['movie'] && this.movie?.id) {
            this.loadCast(this.movie.id);
            this.loadVideos(this.movie.id);
            this.preventBodyScrollOnIOS();
        } else if (!this.movie) {
            this.restoreBodyScrollOnIOS();
        }
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
        var language = "en-US";
        console.log(this.movie.original_language);
        if (this.movie.original_language == "fr") {
            language = "fr-FR";
        }

        console.log(language);

        this.apiCall.getMovieVideos(movieId, language).subscribe(async (response) => {
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
