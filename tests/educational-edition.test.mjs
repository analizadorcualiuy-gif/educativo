import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('educational edition has a guided qualitative-analysis path and a Pro contact route', async () => {
    const guide = await readFile(new URL('web-beta/educational.js', root), 'utf8');
    assert.match(guide, /Guía educativa/);
    assert.match(guide, /Categoría:/);
    assert.match(guide, /Codificar evidencia/);
    assert.match(guide, /Memo:/);
    assert.match(guide, /Matriz:/);
    assert.match(guide, /Obtener versión Pro/);
    assert.match(guide, /analizadorcualiuy@gmail\.com/);
    assert.match(guide, /Adaptación a una nueva trayectoria/);
    assert.match(guide, /Devoluciones docentes/);
    assert.match(guide, /Participación en clase/);
    assert.match(guide, /codings: \[\]/);
    assert.match(guide, /sub-autonomia/);
    assert.match(guide, /sub-criterios/);
    assert.match(guide, /sub-temor/);
    assert.match(guide, /educational-sector-popover/);
    assert.match(guide, /Función Operativa/);
    assert.match(guide, /Sustento Teórico/);
    assert.match(guide, /Corpus Empírico/);
    assert.match(guide, /Codificación Abierta y Axial/);
});

test('educational build produces isolated guidance assets and a formative PDF watermark', async () => {
    const build = await readFile(new URL('build-educational.ps1', root), 'utf8');
    assert.match(build, /dist-educativa/);
    assert.match(build, /educational\.js/);
    assert.match(build, /educational\.css/);
    assert.match(build, /EDICIÓN EDUCATIVA — MATERIAL FORMATIVO/);
    assert.match(build, /EDUCATIONAL-LICENSE\.txt/);
    assert.doesNotMatch(build, /src-tauri/);
});
