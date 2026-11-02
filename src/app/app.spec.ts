import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { provideAppIcons } from './shared/icons';

describe('Feature navigation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideAppIcons(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
  });

  it.each([
    ['/currency', 'Currency converter'],
    ['/mortgage', 'Mortgage calculator'],
    ['/bonds', 'Polish Treasury Bonds Calculator'],
  ])('opens the lazy route %s with its own title and placeholder', async (path, title) => {
    const harness = await RouterTestingHarness.create(path);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(title);
    if (path === '/mortgage')
      expect(harness.routeNativeElement?.textContent).toContain('Coming soon');
    expect(TestBed.inject(Title).getTitle()).toBe(
      `${path === '/bonds' ? 'Bonds calculator' : title} | Finances`,
    );
  });

  it.each(['/', '/unknown-page'])('redirects %s to the currency page', async (path) => {
    const harness = await RouterTestingHarness.create(path);
    expect(TestBed.inject(Router).url).toBe('/currency');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Currency converter');
  });
});
