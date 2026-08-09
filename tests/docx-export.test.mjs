import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = globalThis;
await import('../project-integrity.js');
await import('../docx-export.js');

async function inspect(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return {
        bytes,
        raw: new TextDecoder().decode(bytes)
    };
}

test('creates a real DOCX package with highlighted full text', async () => {
    const blob = DocxExporter.createFullDocument({
        title: 'Entrevista de prueba',
        content: 'Inicio. Texto codificado. Final.',
        categories: [{ id: 'cat-1', name: 'Hallazgo', code: 'CAT-HAL', color: '#F59E0B' }],
        codings: [{ id: 'coding-1', categoryId: 'cat-1', startChar: 8, endChar: 24, memo: 'Memo de prueba' }],
        date: '2026-08-04'
    });
    const { bytes, raw } = await inspect(blob);

    assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    assert.deepEqual(Array.from(bytes.slice(0, 4)), [0x50, 0x4B, 0x03, 0x04]);
    assert.match(raw, /\[Content_Types\]\.xml/);
    assert.match(raw, /word\/document\.xml/);
    assert.match(raw, /Texto codificado/);
    assert.match(raw, /<w:shd/);
    assert.match(raw, /Memo de prueba/);
});

test('full DOCX preserves nested overlap evidence without duplicating source text', async () => {
    const blob = DocxExporter.createFullDocument({
        title: 'Solapamientos',
        content: '0123456789',
        categories: [
            { id: 'outer-cat', name: 'Exterior', color: '#F59E0B' },
            { id: 'inner-cat', name: 'Interior', color: '#3B82F6' }
        ],
        codings: [
            { id: 'outer', categoryId: 'outer-cat', startChar: 2, endChar: 8 },
            { id: 'inner', categoryId: 'inner-cat', startChar: 4, endChar: 6 }
        ],
        date: '2026-08-06'
    });
    const { raw } = await inspect(blob);
    assert.match(raw, /Solapamiento: Exterior \+ Interior/);
    for (const digit of '0123456789') assert.match(raw, new RegExp(digit));
});

test('creates a categorized-passages DOCX package', async () => {
    const blob = DocxExporter.createPassagesDocument({
        categories: [{ id: 'cat-1', name: 'Categoria', code: 'CAT-01', color: '#3B82F6' }],
        allCategories: [{ id: 'cat-1', name: 'Categoria', code: 'CAT-01', color: '#3B82F6' }],
        codings: [{ categoryId: 'cat-1', docId: 'doc-1', startChar: 0, endChar: 12, quoteText: 'Cita central', memo: 'Interpretacion' }],
        documents: [{ id: 'doc-1', title: 'Entrevista.txt' }],
        date: '2026-08-04'
    });
    const { raw } = await inspect(blob);

    assert.match(raw, /Pasajes clasificados por categoria/);
    assert.match(raw, /Entrevista\.txt/);
    assert.match(raw, /Cita central/);
    assert.match(raw, /Interpretacion/);
});

test('can exclude analytical memos from Word exports', async () => {
    const blob = DocxExporter.createPassagesDocument({
        categories: [{ id: 'cat-1', name: 'Categoria', code: 'CAT-01', color: '#3B82F6' }],
        codings: [{ categoryId: 'cat-1', docId: 'doc-1', startChar: 0, endChar: 12, quoteText: 'Cita central', memo: 'Nota excluida' }],
        documents: [{ id: 'doc-1', title: 'Entrevista.txt' }],
        date: '2026-08-04',
        includeMemos: false
    });
    const { raw } = await inspect(blob);
    assert.doesNotMatch(raw, /Nota excluida/);
});

test('creates an analytical DOCX with fixed-width tables and report sections', async () => {
    const blob = DocxExporter.createAnalyticalReport({
        title: 'Informe analítico', author: 'Equipo', date: '2026-08-04', objective: 'Comprender el corpus', methodology: 'Codificación temática', conclusions: 'Conclusión.',
        categories: [{ id: 'cat-1', name: 'Categoría', code: 'CAT-01', color: '#3B82F6' }],
        documents: [{ id: 'doc-1', title: 'Entrevista.txt' }],
        codings: [{ categoryId: 'cat-1', docId: 'doc-1', quoteText: 'Evidencia', memo: 'Interpretación' }],
        analytics: { documents: [{ id: 'doc-1' }], totalWords: 100, options: { unit: 'paragraph', metric: 'jaccard' }, stats: [{ id: 'cat-1', count: 1, perThousand: 10, documentShare: 1 }], edges: [] },
        quality: { coverage: 0.1, missingMemos: [], incompleteCategories: [], uncodedDocuments: [], duplicates: [], overlaps: [], manual: 1, automatic: 0 }
    });
    const { raw } = await inspect(blob);
    assert.match(raw, /Informe analítico/);
    assert.match(raw, /Distribución categorial/);
    assert.match(raw, /<w:tblW w:w="9360" w:type="dxa"\/>/);
    assert.match(raw, /<w:tblLayout w:type="fixed"\/>/);
    assert.match(raw, /Conclusión/);
});

test('analytical DOCX reports exact overlap totals and bounded relation evidence', async () => {
    const blob = DocxExporter.createAnalyticalReport({
        title: 'Informe acotado', author: 'Equipo', date: '2026-08-08',
        categories: [{ id: 'cat-1', name: 'Categoría', code: 'CAT-01', color: '#3B82F6' }],
        documents: [{ id: 'doc-1', title: 'Entrevista.txt' }],
        codings: [],
        analytics: {
            documents: [{ id: 'doc-1' }], totalWords: 100, options: { unit: 'overlap', metric: 'count' }, stats: [], edges: [],
            diagnostics: { evidenceTruncated: true, omittedEvidence: 249900 }
        },
        quality: {
            coverage: 0, missingMemos: [], incompleteCategories: [], uncodedDocuments: [], duplicates: [], overlaps: [], manual: 0, automatic: 0,
            duplicateDiagnostics: { truncated: true, totalDetected: 2000, returned: 1000, omitted: 1000, limit: 1000 },
            overlapDiagnostics: { truncated: true, totalDetected: 499500, returned: 1000, omitted: 498500, limit: 1000 }
        }
    });
    const { raw } = await inspect(blob);
    assert.match(raw, /<w:t xml:space="preserve">499500<\/w:t>/);
    assert.match(raw, /<w:t xml:space="preserve">2000<\/w:t>/);
    assert.match(raw, /se conservaron 1000 de 2000 duplicados/);
    assert.match(raw, /se conservaron 1000 de 499500 pares solapados/);
    assert.match(raw, /se omitieron 249900 evidencias sin alterar las métricas/);
});
