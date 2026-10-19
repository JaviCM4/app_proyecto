import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeEsGt from '@angular/common/locales/es-GT';
import { ApplicationConfig, DEFAULT_CURRENCY_CODE, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';

registerLocaleData(localeEsGt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    { provide: LOCALE_ID, useValue: 'es-GT' },
    // Todo se maneja en quetzales: `| currency` muestra Q45.00 (no USD45.00)
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'GTQ' },
  ],
};
