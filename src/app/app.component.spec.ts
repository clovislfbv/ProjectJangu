import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'ProjectJangu' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('ProjectJangu');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Movie browser');
  });

  it('should open the burger menu', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.burger-button') as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isMenuOpen).toBeTrue();
    expect(fixture.nativeElement.querySelector('.burger-menu')?.classList).toContain('open');
  });

  it('should close the burger menu when clicking outside the header', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.burger-button') as HTMLButtonElement).click();

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.isMenuOpen).toBeFalse();
  });

  it('should keep the burger menu open when interacting inside the menu', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.burger-button') as HTMLButtonElement).click();

    (fixture.nativeElement.querySelector('.burger-menu') as HTMLElement)
      .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(fixture.componentInstance.isMenuOpen).toBeTrue();
  });

  it('should close the burger menu when interacting elsewhere in the header', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.burger-button') as HTMLButtonElement).click();

    (fixture.nativeElement.querySelector('h1') as HTMLElement)
      .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(fixture.componentInstance.isMenuOpen).toBeFalse();
  });

  it('should close the burger menu on Escape or viewport change', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    app.isMenuOpen = true;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(app.isMenuOpen).toBeFalse();

    app.isMenuOpen = true;
    window.dispatchEvent(new Event('resize'));
    expect(app.isMenuOpen).toBeFalse();

    app.isMenuOpen = true;
    window.dispatchEvent(new Event('orientationchange'));
    expect(app.isMenuOpen).toBeFalse();
  });

  it('should place upcoming movies before popular TV shows in the burger menu', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const menuButtons = fixture.nativeElement.querySelectorAll('.burger-menu button') as NodeListOf<HTMLButtonElement>;
    const labels = Array.from(menuButtons).map(button => button.textContent?.trim());

    expect(labels.indexOf('🍿 Films à venir')).toBeGreaterThan(-1);
    expect(labels.indexOf('🍿 Films à venir')).toBeLessThan(labels.indexOf('📺 Séries populaires'));
  });

  it('should keep the feedback view open and unlock hidden links for the special feedback', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    spyOn(localStorage, 'setItem');
    app.showFeedback();

    app.handleFeedbackSubmission(true);

    expect(localStorage.setItem).toHaveBeenCalledWith('projectJanguHiddenLinksUnlocked', 'true');
    expect(app.areHiddenLinksUnlocked).toBeTrue();
    expect(app.activeView).toBe('feedback');
  });
});
