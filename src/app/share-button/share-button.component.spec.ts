import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ShareButtonComponent } from './share-button.component';

describe('ShareButtonComponent', () => {
    let fixture: ComponentFixture<ShareButtonComponent>;
    let component: ShareButtonComponent;
    let writeText: jasmine.Spy;

    beforeEach(async () => {
        writeText = jasmine.createSpy('writeText').and.resolveTo();
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });

        await TestBed.configureTestingModule({
            imports: [ShareButtonComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ShareButtonComponent);
        component = fixture.componentInstance;
        component.entityType = 'movie';
        component.entityId = 550;
        fixture.detectChanges();
    });

    it('copies a canonical link for the current entity', async () => {
        await component.copyLink();

        const copiedUrl = new URL(writeText.calls.mostRecent().args[0]);
        expect(copiedUrl.origin).toBe(window.location.origin);
        expect(copiedUrl.pathname).toBe(window.location.pathname);
        expect(copiedUrl.searchParams.get('movie')).toBe('550');
        expect([...copiedUrl.searchParams.keys()]).toEqual(['movie']);
        expect(copiedUrl.hash).toBe('');
    });

    it('shows a success notification temporarily', fakeAsync(() => {
        component.copyLink();
        tick();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent)
            .toContain('Lien copié dans le presse-papiers');

        tick(2500);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    }));
});