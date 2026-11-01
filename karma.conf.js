// Configuracion de Karma para las pruebas del frontend.
//
// Hay dos perfiles, igual que en el backend (jacoco unitarias / jacoco-it integracion):
//   - unitarias:   COBERTURA=unitarias   (umbral 85 %)
//   - integracion: COBERTURA=integracion (umbral 60 %)
//
// El perfil se elige con la variable de entorno COBERTURA; los scripts de package.json
// ya la fijan. La cobertura se escribe en coverage/unitarias o coverage/integracion.
const path = require('path');

const PERFIL = process.env.COBERTURA === 'integracion' ? 'integracion' : 'unitarias';
const ES_UNITARIA = PERFIL === 'unitarias';

// Umbrales: las unitarias exigen 85 % de lineas; integracion, 60 % de lineas y ramas.
const UMBRALES = ES_UNITARIA ? { lines: 85 } : { lines: 60, branches: 60 };

// Chrome no esta instalado: se usa Microsoft Edge (Chromium) en modo headless.
// Se puede sobreescribir con la variable CHROME_BIN.
process.env.CHROME_BIN =
  process.env.CHROME_BIN ||
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {
        random: false,
      },
      clearContext: false,
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: path.join(__dirname, 'coverage', PERFIL),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly', file: 'lcov.info' },
      ],
      check: {
        global: UMBRALES,
        each: { statements: 0, branches: 0, functions: 0, lines: 0 },
      },
    },
    reporters: ['progress', 'kjhtml', 'coverage'],
    browsers: ['EdgeHeadless'],
    customLaunchers: {
      EdgeHeadless: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
    restartOnFileChange: false,
    singleRun: true,
  });
};
