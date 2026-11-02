import { DOCUMENT } from '@angular/common';
import { ApplicationRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { SwUpdate } from '@angular/service-worker';
import { filter, first, fromEvent, interval, merge, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'app-update',
  imports: [MatButtonModule],
  template: `
    @if (message()) {
      <div class="update-notice" role="status">
        <span>{{ message() }} Reloading clears current calculator inputs.</span>
        <button mat-flat-button (click)="reload()">Reload to update</button>
      </div>
    }
  `,
  styles: `
    .update-notice {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--app-border);
      background: var(--app-surface);
      color: var(--app-ink);
      font-size: 14px;
    }
    button {
      flex-shrink: 0;
    }
  `,
})
export class AppUpdate {
  private readonly document = inject(DOCUMENT);
  private readonly updates = inject(SwUpdate);
  private readonly appRef = inject(ApplicationRef);
  private readonly destroyRef = inject(DestroyRef);
  private checking = false;
  protected readonly message = signal('');

  constructor() {
    const window = this.document.defaultView;
    if (!this.updates.isEnabled || !window) return;

    this.updates.versionUpdates.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.message.set('A new version is ready.');
      }
    });
    this.updates.unrecoverable.pipe(takeUntilDestroyed()).subscribe(() => {
      this.message.set('This version needs to be refreshed.');
    });

    // Starting timers before stability can delay service worker registration.
    this.appRef.isStable
      .pipe(
        first(Boolean),
        switchMap(() =>
          merge(
            fromEvent(this.document, 'visibilitychange'),
            fromEvent(window, 'pageshow'),
            fromEvent(window, 'online'),
            interval(15 * 60 * 1000),
          ).pipe(startWith(null)),
        ),
        filter(() => this.document.visibilityState === 'visible'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => void this.checkForUpdate());
  }

  protected reload(): void {
    // A full reload keeps the shell and lazy chunks on the same version.
    this.document.defaultView?.location.reload();
  }

  private async checkForUpdate(): Promise<void> {
    if (this.checking) return;
    this.checking = true;
    try {
      if (await this.updates.checkForUpdate()) {
        this.message.set('A new version is ready.');
      }
    } catch {
      // Offline or temporarily unavailable: retry on resume, reconnect, or the next interval.
    } finally {
      this.checking = false;
    }
  }
}
