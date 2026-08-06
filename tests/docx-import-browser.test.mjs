import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = globalThis;
await import('../project-integrity.js');
await import('../docx-export.js');
await import('../public/vendor/mammoth.browser.min.js');

test('browser importer extracts readable text from a real DOCX package', async () => {
    const blob = DocxExporter.createFullDocument({
        title: 'Entrevista',
        content: 'La tecnologia mejora la comunicacion.\nSegundo parrafo con liderazgo.',
        categories: [],
        codings: [],
        date: '2026-08-04'
    });
    const result = await mammoth.extractRawText({ arrayBuffer: await blob.arrayBuffer() });

    assert.match(result.value, /La tecnologia mejora la comunicacion/);
    assert.match(result.value, /Segundo parrafo con liderazgo/);
    assert.doesNotMatch(result.value, /PK\x03\x04/);
});
