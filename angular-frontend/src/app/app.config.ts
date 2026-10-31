import { ApplicationConfig, DEFAULT_CURRENCY_CODE, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeEnIn from '@angular/common/locales/en-IN';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

// Prices are charged in INR: format dates, numbers and currency for en-IN everywhere.
registerLocaleData(localeEnIn);

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }),
     provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
     provideHttpClient(),
     { provide: LOCALE_ID, useValue: 'en-IN' },
     { provide: DEFAULT_CURRENCY_CODE, useValue: 'INR' }]
};
