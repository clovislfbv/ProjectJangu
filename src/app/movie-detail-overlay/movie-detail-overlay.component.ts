import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-movie-detail-overlay',
  standalone: true,
  templateUrl: './movie-detail-overlay.component.html',
  styleUrls: ['./movie-detail-overlay.component.css'],
})
export class MovieDetailOverlayComponent {
  @Input() movie!: any;
  @Output() close = new EventEmitter<void>();
}
