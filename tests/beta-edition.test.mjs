import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const betaRoot = new URL('../web-beta/', import.meta.url);

test('beta has explicit product limits on every project entry path', async () => {
    const source = await readFile(new URL('app.js', betaRoot), 'utf8');
    assert.match(source, /maxDocuments:\s*2/);
    assert.match(source, /maxCategories:\s*4/);
    assert.match(source, /maxTotalWords:\s*10000/);
    assert.match(source, /function validateProjectObject/);
    assert.match(source, /currentWords \+ incomingWords > BETA_LIMITS\.maxTotalWords/);
    assert.match(source, /state\.categories\.length >= BETA_LIMITS\.maxCategories/);
    assert.match(source, /ANALIZADOR_CUALI_UY_BETA_PROJECT_V1/);
});

test('beta interface exposes PDF but not professional export controls', async () => {
    const html = await readFile(new URL('index.html', betaRoot), 'utf8');
    assert.match(html, /id="btn-export-report-pdf"/);
    assert.match(html, /id="btn-export-doc-pdf"/);
    assert.match(html, /id="btn-contact-pro"/);
    assert.doesNotMatch(html, /docx-export\.js/);
    assert.doesNotMatch(html, /id="btn-export-(?:csv|docx|matrix-csv|report-docx|png|svg)"/);
});

test('beta PDFs carry an evaluation mark', async () => {
    const source = await readFile(new URL('pdf-report.js', betaRoot), 'utf8');
    assert.match(source, /VERSIÓN BETA — INFORME DE EVALUACIÓN/);
    assert.match(source, /AnalizadorCualiUY Beta \| Uso de evaluación/);
});

