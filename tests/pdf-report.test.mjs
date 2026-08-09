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

async function extractItems(bytes) {
  const loadingTask = pdfjs.getDocument({ data: bytes.slice(), disableWorker: true, verbosity: 0 });
  const pdf = await loadingTask.promise;
  const items = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    items.push(...content.items.map(item => ({ text: item.str, y: item.transform[5], pageNumber })));
  }
  await loadingTask.destroy();
  return items;
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

test('includes evidence from every document in a full corpus PDF', async () => {
  const blob = await globalThis.PdfReportExporter.createAnalyticalReport(options({
    detail: 'full',
    documents: [
      { id: 'd-1', title: 'Fuente uno' },
      { id: 'd-2', title: 'Fuente dos' }
    ],
    codings: [
      { id: 'c-1', docId: 'd-1', categoryId: 'a', quoteText: 'Evidencia de la primera fuente', memo: 'Memo uno' },
      { id: 'c-2', docId: 'd-2', categoryId: 'a', quoteText: 'Evidencia de la segunda fuente', memo: 'Memo dos' }
    ],
    analytics: { documents: [{ id: 'd-1' }, { id: 'd-2' }], totalWords: 200, options: { unit: 'paragraph', metric: 'jaccard' }, stats: [{ id: 'a', count: 2, perThousand: 10, documentShare: 1 }], edges: [] }
  }));
  const text = await extract(new Uint8Array(await blob.arrayBuffer()));
  assert.match(text, /Fuente uno/);
  assert.match(text, /Evidencia de la primera fuente/);
  assert.match(text, /Fuente dos/);
  assert.match(text, /Evidencia de la segunda fuente/);
});

test('reports exact overlap totals and bounded-detail diagnostics', async () => {
  const base = options();
  const blob = await globalThis.PdfReportExporter.createAnalyticalReport(options({
    analytics: {
      ...base.analytics,
      diagnostics: { evidenceTruncated: true, omittedEvidence: 249900 }
    },
    quality: {
      ...base.quality,
      overlaps: Array.from({ length: 1000 }, () => []),
      duplicateDiagnostics: { truncated: true, totalDetected: 2000, returned: 1000, omitted: 1000, limit: 1000 },
      overlapDiagnostics: { truncated: true, totalDetected: 499500, returned: 1000, omitted: 498500, limit: 1000 }
    }
  }));
  const text = await extract(new Uint8Array(await blob.arrayBuffer()));
  assert.match(text, /Solapamientos: 499500/);
  assert.match(text, /Duplicados: 2000/);
  assert.match(text, /se conservaron 1000 de 2000 duplicados/);
  assert.match(text, /se conservaron 1000 de 499500 pares solapados/);
  assert.match(text, /se omitieron 249900 evidencias sin alterar las métricas/);
});

test('analytical PDF preserves explicit paragraph breaks visually', async () => {
  const blob = await globalThis.PdfReportExporter.createAnalyticalReport(options({
    conclusions: 'Párrafo primero\n\nPárrafo segundo'
  }));
  const items = await extractItems(new Uint8Array(await blob.arrayBuffer()));
  const first = items.find(item => item.text.includes('Párrafo primero'));
  const second = items.find(item => item.text.includes('Párrafo segundo'));
  assert.ok(first && second, 'both paragraphs must be present');
  assert.equal(first.pageNumber, second.pageNumber);
  assert.ok(first.y - second.y > 20, `expected a blank line between paragraphs, got ${first.y - second.y}`);
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

test('creates a true coded-document PDF with source text, category legend and optional memos', async () => {
  const content = 'Primer párrafo.\n\nPasaje importante para interpretar.\nÚltima línea.';
  const startChar = content.indexOf('Pasaje importante');
  const quoteText = 'Pasaje importante para interpretar.';
  const codedOptions = options({
    title: 'Documento codificado',
    mode: 'full',
    categories: [{ id: 'a', name: 'Tema central', code: 'TEMA', color: '#ef4444' }],
    documents: [{ id: 'd', title: 'Entrevista uno', content }],
    codings: [{
      id: 'c',
      docId: 'd',
      categoryId: 'a',
      startChar,
      endChar: startChar + quoteText.length,
      quoteText,
      memo: 'Memo que debe aparecer'
    }],
    analytics: { documents: [{ id: 'd' }], totalWords: 8, stats: [{ id: 'a', count: 1, perThousand: 125, documentShare: 1 }], edges: [] },
    includeMemos: true
  });
  const blob = await globalThis.PdfReportExporter.createCodedDocument(codedOptions);
  const text = await extract(new Uint8Array(await blob.arrayBuffer()));
  assert.match(text, /Entrevista uno/);
  assert.match(text, /Primer párrafo/);
  assert.match(text, /Pasaje importante para interpretar/);
  assert.match(text, /Última línea/);
  assert.match(text, /Tema central/);
  assert.match(text, /Memo que debe aparecer/);
  assert.doesNotMatch(text, /7\. Conclusiones/);
});

test('passages PDF keeps evidence when memos are excluded', async () => {
  const blob = await globalThis.PdfReportExporter.createCodedDocument(options({
    title: 'Pasajes clasificados',
    mode: 'passages',
    categories: [{ id: 'a', name: 'Tema central', code: 'TEMA', color: '#3b82f6' }],
    documents: [{ id: 'd', title: 'Fuente uno', content: 'Evidencia principal' }],
    codings: [{ id: 'c', docId: 'd', categoryId: 'a', startChar: 0, endChar: 18, quoteText: 'Evidencia principal', memo: 'Memo excluido' }],
    includeMemos: false,
    analytics: null
  }));
  const text = await extract(new Uint8Array(await blob.arrayBuffer()));
  assert.match(text, /Evidencia principal/);
  assert.match(text, /Fuente uno/);
  assert.doesNotMatch(text, /Memo excluido/);
});

test('keeps a document heading with the first body line after a long legend', async () => {
  const categories = Array.from({ length: 48 }, (_, index) => ({
    id: `cat-${index}`,
    name: `Categoría de comprobación ${index + 1}`,
    code: `C${index + 1}`,
    color: '#3b82f6'
  }));
  const blob = await globalThis.PdfReportExporter.createCodedDocument(options({
    title: 'Exportación con leyenda extensa',
    mode: 'full',
    categories,
    documents: [{ id: 'd', title: 'ENCABEZADO_DOCUMENTO', content: 'BODY_MARKER contenido inicial.' }],
    codings: [],
    analytics: null
  }));
  const items = await extractItems(new Uint8Array(await blob.arrayBuffer()));
  const heading = items.find(item => item.text.includes('ENCABEZADO_DOCUMENTO'));
  const firstBodyLine = items.find(item => item.text.includes('BODY_MARKER'));
  assert.ok(heading && firstBodyLine, 'the heading and body marker must be rendered');
  assert.equal(heading.pageNumber, firstBodyLine.pageNumber, 'a document heading must not be orphaned at a page break');
  assert.ok(heading.y > firstBodyLine.y, 'the first body line must appear below its heading');
});

test('preserves Unicode spacing and normalizes non-printing whitespace in coded text', async () => {
  const blob = await globalThis.PdfReportExporter.createCodedDocument(options({
    title: 'Espaciado',
    mode: 'full',
    categories: [{ id: 'a', name: 'Tema', code: 'T', color: '#3b82f6' }],
    documents: [{ id: 'd', title: 'Fuente', content: 'A\u00a0B\fC\vD\u2003E\u2028F' }],
    codings: [],
    analytics: null
  }));
  const text = await extract(new Uint8Array(await blob.arrayBuffer()));
  assert.match(text, /A B C D E F/);
});

test('renders subcategories with glyphs supported by the bundled fonts', async () => {
  const blob = await globalThis.PdfReportExporter.createCodedDocument(options({
    title: 'Jerarquía',
    mode: 'full',
    categories: [
      { id: 'parent', name: 'Categoría principal', code: 'P', color: '#3b82f6' },
      { id: 'child', parentId: 'parent', name: 'Subcategoría', code: 'S', color: '#ffffff' }
    ],
    documents: [{ id: 'd', title: 'Fuente', content: 'Texto codificado' }],
    codings: [{ id: 'c', docId: 'd', categoryId: 'child', startChar: 0, endChar: 5, quoteText: 'Texto', memo: '' }],
    analytics: null
  }));
  const text = await extract(new Uint8Array(await blob.arrayBuffer()));
  assert.match(text, /- Subcategoría \[S\]/);
});
