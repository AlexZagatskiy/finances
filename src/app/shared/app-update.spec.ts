import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AppUpdate } from './app-update';

describe('AppUpdate', () => {
  let stable: Subject<boolean>;
  let versions: Subject<VersionEvent>;
  let unrecoverable: Subject<UnrecoverableStateEvent>;
  let updates: { isEnabled: boolean; checkForUpdate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    stable = new Subject<boolean>();
    versions = new Subject<VersionEvent>();
    unrecoverable = new Subject<UnrecoverableStateEvent>();
    updates = { isEnabled: true, checkForUpdate: vi.fn().mockResolvedValue(false) };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SwUpdate,
          useValue: {
            ...updates,
            versionUpdates: versions,
            unrecoverable,
            checkForUpdate: updates.checkForUpdate,
          },
        },
      ],
    });
    Object.defineProperty(TestBed.inject(ApplicationRef), 'isStable', { value: stable });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('waits for stability, then checks on startup, resume, and reconnect', async () => {
    TestBed.createComponent(AppUpdate);
    stable.next(false);
    expect(updates.checkForUpdate).not.toHaveBeenCalled();
    stable.next(true);
    expect(updates.checkForUpdate).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(updates.checkForUpdate).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    window.dispatchEvent(new Event('online'));
    expect(updates.checkForUpdate).toHaveBeenCalledTimes(3);
  });

  it('offers reload only after an update is ready', () => {
    const fixture = TestBed.createComponent(AppUpdate);
    versions.next({ type: 'VERSION_DETECTED', version: { hash: 'new' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    versions.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old' },
      latestVersion: { hash: 'new' },
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'A new version is ready.',
    );
    expect(fixture.nativeElement.querySelector('button').textContent).toContain('Reload to update');
  });

  it('retries after a failed check without disrupting offline use', async () => {
    updates.checkForUpdate.mockRejectedValueOnce(new Error('Offline'));
    const fixture = TestBed.createComponent(AppUpdate);
    stable.next(true);
    await Promise.resolve();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    window.dispatchEvent(new Event('online'));
    expect(updates.checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('polls only while visible and cleans up when destroyed', async () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(AppUpdate);
    stable.next(true);
    await Promise.resolve();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    expect(updates.checkForUpdate).toHaveBeenCalledTimes(1);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    expect(updates.checkForUpdate).toHaveBeenCalledTimes(2);
    fixture.destroy();
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    expect(updates.checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('ignores overlapping checks until the active download finishes', async () => {
    let finish!: (ready: boolean) => void;
    updates.checkForUpdate.mockReturnValueOnce(
      new Promise<boolean>((resolve) => (finish = resolve)),
    );
    const fixture = TestBed.createComponent(AppUpdate);
    stable.next(true);
    window.dispatchEvent(new Event('online'));
    expect(updates.checkForUpdate).toHaveBeenCalledTimes(1);
    finish(true);
    await Promise.resolve();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('A new version is ready.');
  });

  it('does nothing when the service worker is disabled', () => {
    Object.defineProperty(TestBed.inject(SwUpdate), 'isEnabled', { value: false });
    const fixture = TestBed.createComponent(AppUpdate);
    stable.next(true);
    versions.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old' },
      latestVersion: { hash: 'new' },
    });
    fixture.detectChanges();
    expect(updates.checkForUpdate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('offers a refresh when cached app files are unrecoverable', () => {
    const fixture = TestBed.createComponent(AppUpdate);
    unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'Missing cached chunk' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('This version needs to be refreshed.');
  });
});
