import { TestBed } from '@angular/core/testing';
import { FeedbackComponent } from './feedback.component';

describe('FeedbackComponent', () => {
    it('should thank the user and clear the feedback without exposing its content', async () => {
        await TestBed.configureTestingModule({ imports: [FeedbackComponent] }).compileComponents();
        const fixture = TestBed.createComponent(FeedbackComponent);
        const component = fixture.componentInstance;
        let shouldUnlock = true;
        component.submitted.subscribe(value => shouldUnlock = value);
        component.feedback = 'Application très pratique';

        component.submitFeedback();

        expect(component.feedback).toBe('');
        expect(component.hasSubmitted).toBeTrue();
        expect(shouldUnlock).toBeFalse();
    });

    it('should signal an unlock only for the exact feedback "bon"', async () => {
        await TestBed.configureTestingModule({ imports: [FeedbackComponent] }).compileComponents();
        const component = TestBed.createComponent(FeedbackComponent).componentInstance;
        let shouldUnlock = false;
        component.submitted.subscribe(value => shouldUnlock = value);
        component.feedback = 'bon';

        component.submitFeedback();

        expect(shouldUnlock).toBeTrue();
    });
});