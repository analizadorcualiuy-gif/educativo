/* Loads the pinned local Mozilla PDF.js ESM build without contacting a CDN. */
(function (global) {
    'use strict';

    global.pdfjsReady = import('./public/vendor/pdf.mjs')
        .then(pdfjs => {
            pdfjs.GlobalWorkerOptions.workerSrc = new URL('./public/vendor/pdf.worker.mjs', global.location.href).href;
            global.pdfjsLib = pdfjs;
            return pdfjs;
        })
        .catch(error => {
            global.pdfjsLoadError = error;
            console.error('No se pudo cargar el lector PDF local:', error);
            return null;
        });
})(window);
