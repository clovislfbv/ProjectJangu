import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MovieDetailOverlayComponent } from './movie-detail-overlay.component';

describe('MovieDetailOverlayComponent', () => {
  let component: MovieDetailOverlayComponent;
  let fixture: ComponentFixture<MovieDetailOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovieDetailOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MovieDetailOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
