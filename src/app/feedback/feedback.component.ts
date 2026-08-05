import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-feedback',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './feedback.component.html',
    styleUrl: './feedback.component.css',
})
export class FeedbackComponent {
    @Output() submitted = new EventEmitter<boolean>();

    feedback = '';
    hasSubmitted = false;

    submitFeedback(): void {
        if (!this.feedback.trim()) return;

        const unlockHiddenLinks = this.feedback === 'bon';
        this.feedback = '';
        this.hasSubmitted = true;
        this.submitted.emit(unlockHiddenLinks);
    }
}