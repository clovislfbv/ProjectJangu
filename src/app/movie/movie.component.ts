import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-movie',
  standalone: true,
  templateUrl: './movie.component.html',
  styleUrl: './movie.component.css',
})
export class MovieComponent {
  @Input() title!: string;
  @Input() posterPath!: string;
  @Output() select = new EventEmitter<void>();
}
