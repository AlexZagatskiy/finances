import { inject, provideAppInitializer } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

// Bundled SVGs avoid external font requests and remain available offline.
const icons: Record<string, string> = {
  wallet:
    '<path d="M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v11H5a3 3 0 0 1-3-3V6"/><path d="M20 12h-5v5h5M17 14.5h.01"/>',
  currency: '<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1z"/>',
  bonds: '<path d="M4 20V10h4v10m2 0V4h4v16m2 0v-7h4v7M2 20h20"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
};

export function provideAppIcons() {
  return provideAppInitializer(() => {
    const registry = inject(MatIconRegistry);
    const sanitizer = inject(DomSanitizer);
    for (const [name, paths] of Object.entries(icons)) {
      registry.addSvgIconLiteral(
        name,
        sanitizer.bypassSecurityTrustHtml(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`,
        ),
      );
    }
  });
}
