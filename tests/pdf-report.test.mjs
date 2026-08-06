import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as PDFLib from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

globalThis.PDFLib = PDFLib;
globalThis.fontkit = fontkit;
await import('../pdf-report.js');
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

const fontBytes = await readFile('node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf');
const boldFontBytes = await readFile('node_modules/pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf');

function options(overrides = {}) {
  return {
    title: 'Informe cualitativo: español, Ελληνικά, Кириллица',
    author: 'Investigación Ñandú',
    date: '2026-08-04',
    objective: 'Conservar café, niño, acción; δοκιμή; Привет.',
    categories: [{ id: 'a', name: 'Categoría Δ', code: 'CAT-A' }],
    documents: [{ id: 'd', title: 'Documento Ж' }],
    codings: [{ id: 'c', docId: 'd', categoryId: 'a', quoteText: 'Evidencia: café δοκιμή Привет', memo: 'Interpretación' }],
    analytics: { documents: [{ id: 'd' }], totalWords: 100, options: { unit: 'paragraph', metric: 'jaccard' }, stats: [{ id: 'a', count: 1, perThousand: 10, documentShare: 1 }], edges: [] },
    quality: { coverage: 0.2, manual: 1, automatic: 0, missingMemos: [], incompleteCategories: [], uncodedDocuments: [], duplicates: [], overlaps: [] },
    fontBytes,
    boldFontBytes,
    ...overrides
  };
}

async function extract(bytes) {
  const loadingTask = pdfjs.getDocument({ data: bytes.slice(), disableWorker: true, verbosity: 0 });
  const pdf = await loadingTask.promise;
  const lines = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    lines.push(content.items.map(item => item.str).join(' '));
  }
  await loadingTask.destroy();
  return lines.join('\n');
}

test('creates a readable PDF preserving supported Unicode text', async () => {
  const blob = await globalThis.PdfReportExporter.createAnalyticalReport(options());
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.ok(new TextDecoder('latin1').decode(bytes.slice(0, 8)).startsWith('%PDF-1.7'));
  const text = await extract(bytes);
  assert.match(text, /café/);
  assert.match(text, /δοκιμή/);
  assert.match(text, /Привет/);
  assert.match(text, /Categoría Δ/);
});

test('rejects unsupported glyphs and bidirectional scripts instead of corrupting them', async () => {
  await assert.rejects(
    globalThis.PdfReportExporter.createAnalyticalReport(options({ title: 'Informe 😀' })),
    /no puede representar/i
  );
  await assert.rejects(
    globalThis.PdfReportExporter.createAnalyticalReport(options({ title: 'تقرير' })),
    /bidireccional/i
  );
});
