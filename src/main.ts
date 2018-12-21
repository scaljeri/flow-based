import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import 'hammerjs';
import 'codemirror/mode/javascript/javascript';

import { GoogleCharts } from 'google-charts';

if (environment.production) {
  enableProdMode();
}

GoogleCharts.load(() => {
  platformBrowserDynamic().bootstrapModule(AppModule)
    .catch(err => console.log(err));
});
