import { Component, Input, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';

export type ShareEntityType = 'movie' | 'tv' | 'actor';

@Component({
    selector: 'app-share-button',
    standalone: true,
    imports: [NgIf],
    templateUrl: './share-button.component.html',
    styleUrls: ['./share-button.component.css'],
})
export class ShareButtonComponent implements OnDestroy {
    @Input({ required: true }) entityType!: ShareEntityType;
    @Input({ required: true }) entityId!: number;

    notificationVisible = false;
    private notificationTimer?: ReturnType<typeof setTimeout>;

    async copyLink(): Promise<void> {
        const link = this.buildShareLink();

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(link);
            } else {
                this.copyWithFallback(link);
            }
            this.showNotification();
        } catch {
            try {
                this.copyWithFallback(link);
                this.showNotification();
            } catch {
                // Do not show a success notification when the browser blocks copying.
            }
        }
    }

    ngOnDestroy(): void {
        if (this.notificationTimer) clearTimeout(this.notificationTimer);
    }

    private buildShareLink(): string {
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = '';
        url.searchParams.set(this.entityType, String(this.entityId));
        return url.toString();
    }

    private copyWithFallback(value: string): void {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('Copy failed');
    }

    private showNotification(): void {
        if (this.notificationTimer) clearTimeout(this.notificationTimer);
        this.notificationVisible = true;
        this.notificationTimer = setTimeout(() => this.notificationVisible = false, 2500);
    }
}