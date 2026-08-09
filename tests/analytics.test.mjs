import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import '../analytics.js';

const fixture = {
  documents: [
    { id: 'd1', title: 'Uno', content: 'A y B aparecen juntos.\n\nSolo A aparece aquí.', wordCount: 10 },
    { id: 'd2', title: 'Dos', content: 'Solo B aparece aquí.', wordCount: 5 }
  ],
  categories: [
    { id: 'a', name: 'A', code: 'A', description: 'A', keywords: ['a'] },
    { id: 'b', name: 'B', code: 'B', description: 'B', keywords: ['b'] }
  ],
  codings: [
    { id: 'a1', docId: 'd1', categoryId: 'a', startChar: 0, endChar: 1, quoteText: 'A', memo: 'm' },
    { id: 'b1', docId: 'd1', categoryId: 'b', startChar: 4, endChar: 5, quoteText: 'B', memo: '' },
    { id: 'a2', docId: 'd1', categoryId: 'a', startChar: 25, endChar: 31, quoteText: 'Solo A', memo: '' },
    { id: 'cod-auto-b2', docId: 'd2', categoryId: 'b', startChar: 5, endChar: 6, quoteText: 'B', memo: '' }
  ]
};

test('cooccurrence by paragraph and Jaccard are based on analytical units', () => {
  const result = globalThis.AnalyticsEngine.analyze(fixture, { unit: 'paragraph', metric: 'jaccard' });
  const edge = result.matrix.a.b;
  assert.equal(edge.count, 1);
  assert.equal(edge.jaccard, 1 / 3);
  assert.equal(edge.sharedDocs, 1);
});

test('dismissed codings remain stored but are excluded from analytical metrics', () => {
  const corpus = {
    ...fixture,
    codings: fixture.codings.map(coding => coding.id === 'b1' ? { ...coding, dismissed: true } : coding)
  };
  const result = globalThis.AnalyticsEngine.analyze(corpus, { unit: 'paragraph', metric: 'count' });
  assert.equal(result.codings.some(coding => coding.id === 'b1'), false);
  assert.equal(result.statsMap.get('b').count, 1);
  assert.equal(result.matrix.a.b.count, 0);
});

test('document groups filter the corpus and evidence weights are aggregated without changing raw counts', () => {
  const corpus = {
    ...fixture,
    documents: fixture.documents.map(doc => ({ ...doc, profile: { group: doc.id === 'd1' ? 'Grupo A' : 'Grupo B' } })),
    codings: fixture.codings.map(coding => ({ ...coding, weight: coding.id === 'a1' ? 3 : 1 }))
  };
  const filtered = globalThis.AnalyticsEngine.analyze(corpus, { documentGroup: 'Grupo A', categoryMode: 'all' });
  assert.deepEqual(filtered.documents.map(doc => doc.id), ['d1']);
  assert.equal(filtered.statsMap.get('a').count, 2);
  assert.equal(filtered.statsMap.get('a').weightedCount, 4);
  assert.equal(filtered.statsMap.get('b').count, 1);
});

test('document and window units produce distinct cooccurrence semantics', () => {
  const byDocument = globalThis.AnalyticsEngine.analyze(fixture, { unit: 'document', metric: 'count' });
  const byWindow = globalThis.AnalyticsEngine.analyze(fixture, { unit: 'window', metric: 'count', windowSize: 1 });
  assert.equal(byDocument.matrix.a.b.count, 1);
  assert.equal(byWindow.matrix.a.b.count, 0);
});

test('window Jaccard remains bounded while pair count stays separate', () => {
    const corpus = {
        documents: [{ id: 'd', content: 'x'.repeat(1000), wordCount: 1 }],
        categories: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
        codings: [
            { id: 'a1', docId: 'd', categoryId: 'a', startChar: 10, endChar: 20 },
            { id: 'a2', docId: 'd', categoryId: 'a', startChar: 30, endChar: 40 },
            { id: 'b1', docId: 'd', categoryId: 'b', startChar: 15, endChar: 25 },
            { id: 'b2', docId: 'd', categoryId: 'b', startChar: 35, endChar: 45 }
        ]
    };
    const narrow = globalThis.AnalyticsEngine.analyze(corpus, { unit: 'window', windowSize: 5, metric: 'jaccard', categoryMode: 'all' }).matrix.a.b;
    const wide = globalThis.AnalyticsEngine.analyze(corpus, { unit: 'window', windowSize: 100, metric: 'jaccard', categoryMode: 'all' }).matrix.a.b;
    assert.equal(narrow.count, 3);
    assert.equal(wide.count, 4);
    assert.ok(narrow.jaccard >= 0 && narrow.jaccard <= 1);
    assert.ok(wide.jaccard >= 0 && wide.jaccard <= 1);
});

test('overlap requires positive intersection and does not count adjacent ranges', () => {
  const base = {
    documents: [{ id: 'd', content: 'abcdefghij', wordCount: 1 }],
    categories: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]
  };
  const adjacent = globalThis.AnalyticsEngine.analyze({
    ...base,
    codings: [
      { id: 'a1', docId: 'd', categoryId: 'a', startChar: 0, endChar: 5, quoteText: 'abcde' },
      { id: 'b1', docId: 'd', categoryId: 'b', startChar: 5, endChar: 10, quoteText: 'fghij' }
    ]
  }, { unit: 'overlap', metric: 'count', categoryMode: 'all' });
  assert.equal(adjacent.matrix.a.b.count, 0);
  assert.equal(adjacent.matrix.a.b.jaccard, 0);
  assert.equal(adjacent.matrix.a.b.evidence.length, 0);
  assert.equal(adjacent.diagnostics.evaluatedPairs, 0);

  const overlapping = globalThis.AnalyticsEngine.analyze({
    ...base,
    codings: [
      { id: 'a1', docId: 'd', categoryId: 'a', startChar: 0, endChar: 5, quoteText: 'abcde' },
      { id: 'b1', docId: 'd', categoryId: 'b', startChar: 4, endChar: 10, quoteText: 'efghij' }
    ]
  }, { unit: 'overlap', metric: 'count', categoryMode: 'all' });
  assert.equal(overlapping.matrix.a.b.count, 1);
  assert.equal(overlapping.matrix.a.b.jaccard, 0.1);
  assert.equal(overlapping.matrix.a.b.evidence.length, 1);
});

test('blank-line-separated paragraphs do not create false cooccurrence', () => {
    const content = 'Primer párrafo\n\nSegundo párrafo';
    const corpus = {
        documents: [{ id: 'd', content, wordCount: 4 }],
        categories: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
        codings: [
            { id: 'a1', docId: 'd', categoryId: 'a', startChar: 0, endChar: 6 },
            { id: 'b1', docId: 'd', categoryId: 'b', startChar: 16, endChar: 23 }
        ]
    };
    const result = globalThis.AnalyticsEngine.analyze(corpus, { unit: 'paragraph', metric: 'count', categoryMode: 'all' });
    assert.equal(result.matrix.a.b.count, 0);
});

test('paragraph spans skip leading empty lines while preserving exact source offsets', () => {
  const content = '\r\n   \r\nPrimer renglón\ncontinúa\r\n \r\nSegundo párrafo';
  const firstStart = content.indexOf('Primer');
  const separatorStart = content.indexOf('\r\n \r\n', firstStart);
  const secondStart = content.indexOf('Segundo');
  const spans = globalThis.AnalyticsEngine.spansFor(content, 'paragraph');
  assert.deepEqual(spans, [
    { start: firstStart, end: separatorStart, index: 0 },
    { start: secondStart, end: content.length, index: 1 }
  ]);
  assert.equal(content.slice(spans[0].start, spans[0].end), 'Primer renglón\ncontinúa');
});

test('word counting does not materialize a token array for large documents', () => {
  const started = performance.now();
  const count = globalThis.AnalyticsEngine.countWords('x '.repeat(1000000));
  const elapsed = performance.now() - started;
  assert.equal(count, 1000000);
  assert.ok(elapsed < 3000, `El conteo iterativo tardó ${elapsed.toFixed(1)} ms`);
});

test('quality dashboard detects missing memos, automation and coverage', () => {
  const result = globalThis.AnalyticsEngine.quality(fixture, { longFragmentChars: 4 });
  assert.equal(result.missingMemos.length, 3);
  assert.equal(result.automatic, 1);
  assert.equal(result.manual, 3);
  assert.equal(result.uncodedDocuments.length, 0);
  assert.ok(result.coverage > 0 && result.coverage < 1);
  assert.equal(result.longFragments.length, 1);
});

test('manual and automatic counts are mutually exclusive and agree across reports', () => {
  const corpus = {
    documents: [{ id: 'd', content: 'abcdefghijklmnop', wordCount: 1 }],
    categories: [{ id: 'a', name: 'A', code: 'A', description: 'Criterio', keywords: ['a'] }],
    codings: [
      { id: 'cod-auto-manual-flag', source: 'manual', docId: 'd', categoryId: 'a', startChar: 0, endChar: 1 },
      { id: 'explicit-auto', source: 'automatic', docId: 'd', categoryId: 'a', startChar: 2, endChar: 3 },
      { id: 'cod-auto-legacy', docId: 'd', categoryId: 'a', startChar: 4, endChar: 5 },
      { id: 'explicit-manual', source: 'manual', docId: 'd', categoryId: 'a', startChar: 6, endChar: 7 }
    ]
  };
  const stats = globalThis.AnalyticsEngine.analyze(corpus, { categoryMode: 'all' }).statsMap.get('a');
  const report = globalThis.AnalyticsEngine.quality(corpus);
  assert.equal(stats.automaticCount, 3);
  assert.equal(stats.manualCount, 1);
  assert.equal(stats.manualCount + stats.automaticCount, stats.count);
  assert.equal(report.automatic, 3);
  assert.equal(report.manual, 1);
  assert.equal(report.manual + report.automatic, report.totalCodings);
});

test('category completeness matches the UI criterion definition', () => {
  const categories = [
    { id: 'description', code: 'D', description: 'Inclusión', criteria: '', keywords: ['tema'] },
    { id: 'criteria', code: 'C', description: '', criteria: 'Exclusión', keywords: ['tema'] },
    { id: 'missing-criterion', code: 'MC', description: '', criteria: '', keywords: ['tema'] },
    { id: 'missing-keyword', code: 'MK', description: 'Inclusión', criteria: '', keywords: [' '] },
    { id: 'missing-code', code: ' ', description: '', criteria: 'Exclusión', keywords: ['tema'] }
  ];
  const report = globalThis.AnalyticsEngine.quality({ documents: [], categories, codings: [] });
  assert.deepEqual(report.incompleteCategories.map(category => category.id), [
    'missing-criterion',
    'missing-keyword',
    'missing-code'
  ]);
});

test('main-category mode rolls subcategory evidence into its parent', () => {
  const hierarchical = {
    documents: [{ id: 'd', content: 'Uno dos tres.', wordCount: 3 }],
    categories: [{ id: 'p', name: 'Principal' }, { id: 's', name: 'Sub', parentId: 'p' }],
    codings: [{ id: 'c', docId: 'd', categoryId: 's', startChar: 0, endChar: 3 }]
  };
  const main = globalThis.AnalyticsEngine.analyze(hierarchical, { categoryMode: 'main' });
  const direct = globalThis.AnalyticsEngine.analyze(hierarchical, { categoryMode: 'all' });
  assert.deepEqual(main.categories.map(category => category.id), ['p']);
  assert.equal(main.statsMap.get('p').count, 1);
  assert.equal(direct.statsMap.get('p').count, 0);
  assert.equal(direct.statsMap.get('s').count, 1);
});

test('overlap analysis aggregates dense pairs and caps evidence without changing the exact count', () => {
  const codingCount = 1000;
  const corpus = {
    documents: [{ id: 'd', content: 'x'.repeat(100), wordCount: 1 }],
    categories: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
    codings: Array.from({ length: codingCount }, (_, index) => ({
      id: `coding-${String(index).padStart(4, '0')}`,
      docId: 'd',
      categoryId: index % 2 ? 'b' : 'a',
      startChar: 10,
      endChar: 20,
      quoteText: 'xxxxxxxxxx'
    }))
  };
  const started = performance.now();
  const result = globalThis.AnalyticsEngine.analyze(corpus, { unit: 'overlap', metric: 'count', categoryMode: 'all' });
  const elapsed = performance.now() - started;
  const edge = result.matrix.a.b;

  assert.equal(edge.count, 250000);
  assert.equal(edge.evidence.length, result.diagnostics.evidenceLimitPerPair);
  assert.equal(edge.evidenceLimit, result.diagnostics.evidenceLimitPerPair);
  assert.equal(edge.evidenceTruncated, true);
  assert.equal(edge.omittedEvidence, 249900);
  assert.equal(result.diagnostics.resultsTruncated, false);
  assert.equal(result.diagnostics.evidenceTruncated, true);
  assert.equal(result.diagnostics.matchedPairCount, 250000);
  assert.equal(result.diagnostics.pairEvaluations, 999);
  assert.ok(elapsed < 3000, `El barrido denso tardó ${elapsed.toFixed(1)} ms`);
});

test('overlap analysis marks unmaterialized category pairs as unavailable at the record cap', () => {
  const categoryCount = 150;
  const categories = Array.from({ length: categoryCount }, (_, index) => ({ id: `cat-${String(index).padStart(3, '0')}`, name: `C${index}` }));
  const result = globalThis.AnalyticsEngine.analyze({
    documents: [{ id: 'd', content: 'xxxxxxxxxx' }],
    categories,
    codings: categories.map((category, index) => ({
      id: `coding-${String(index).padStart(3, '0')}`,
      docId: 'd',
      categoryId: category.id,
      startChar: 0,
      endChar: 1
    }))
  }, { unit: 'overlap', metric: 'count', categoryMode: 'all' });

  assert.equal(result.diagnostics.pairRecordLimitReached, true);
  assert.equal(result.diagnostics.resultsTruncated, true);
  assert.equal(result.diagnostics.matchedPairCount, categoryCount * (categoryCount - 1) / 2);
  assert.equal(result.diagnostics.returnedPairMatches, result.diagnostics.pairRecordLimit);
  assert.equal(result.diagnostics.omittedPairMatches, 1175);
  assert.equal(result.edges.length, result.diagnostics.pairRecordLimit);
  assert.equal(result.matrix['cat-148']['cat-149'].unavailable, true);
});

test('quality counts 1000 identical spans exactly without materializing 499500 pairs', () => {
  const codingCount = 1000;
  const corpus = {
    documents: [{ id: 'd', content: 'x'.repeat(100), wordCount: 1 }],
    categories: [{ id: 'a', name: 'A', code: 'A', description: 'Criterio', keywords: ['x'] }],
    codings: Array.from({ length: codingCount }, (_, index) => ({
      id: `coding-${index}`,
      docId: 'd',
      categoryId: 'a',
      startChar: 10,
      endChar: 20,
      memo: 'm'
    }))
  };
  const started = performance.now();
  const result = globalThis.AnalyticsEngine.quality(corpus);
  const elapsed = performance.now() - started;

  assert.equal(result.overlapDiagnostics.totalDetected, 499500);
  assert.equal(result.overlaps.length, 1000);
  assert.equal(result.overlapDiagnostics.returned, 1000);
  assert.equal(result.overlapDiagnostics.omitted, 498500);
  assert.equal(result.overlapDiagnostics.truncated, true);
  assert.ok(elapsed < 3000, `El control de calidad denso tardó ${elapsed.toFixed(1)} ms`);
});

test('quality caps duplicate detail while preserving the exact duplicate total', () => {
  const codingCount = 2001;
  const corpus = {
    documents: [{ id: 'd', content: 'xxxxxxxxxx' }],
    categories: [{ id: 'a', name: 'A' }],
    codings: Array.from({ length: codingCount }, (_, index) => ({
      id: `coding-${index}`,
      docId: 'd',
      categoryId: 'a',
      startChar: 0,
      endChar: 1
    }))
  };
  const result = globalThis.AnalyticsEngine.quality(corpus);
  assert.equal(result.duplicateDiagnostics.totalDetected, 2000);
  assert.equal(result.duplicates.length, 1000);
  assert.equal(result.duplicateDiagnostics.returned, 1000);
  assert.equal(result.duplicateDiagnostics.omitted, 1000);
  assert.equal(result.duplicateDiagnostics.truncated, true);
});

test('paragraph lookup remains subquadratic with 100000 spans and codings', () => {
  const paragraphCount = 100000;
  const corpus = {
    documents: [{ id: 'd', content: Array(paragraphCount).fill('x').join('\n\n'), wordCount: paragraphCount }],
    categories: [{ id: 'a', name: 'A' }],
    codings: Array.from({ length: paragraphCount }, (_, index) => ({
      id: `coding-${index}`,
      docId: 'd',
      categoryId: 'a',
      startChar: index * 3,
      endChar: index * 3 + 1
    }))
  };
  const started = performance.now();
  const result = globalThis.AnalyticsEngine.analyze(corpus, { unit: 'paragraph', metric: 'count', categoryMode: 'all' });
  const elapsed = performance.now() - started;

  assert.equal(result.statsMap.get('a').count, paragraphCount);
  assert.equal(result.diagnostics.pairEvaluations, 0);
  assert.ok(elapsed < 8000, `La búsqueda binaria de párrafos tardó ${elapsed.toFixed(1)} ms`);
});

test('sparse analysis keeps the matrix API without materializing quadratic zero pairs', () => {
  const categoryCount = 5000;
  const categories = Array.from({ length: categoryCount }, (_, index) => ({ id: `cat-${index}`, name: `Categoría ${index}` }));
  const corpus = {
    documents: [{ id: 'd', content: 'A B', wordCount: 2 }],
    categories,
    codings: [
      { id: 'a', docId: 'd', categoryId: 'cat-0', startChar: 0, endChar: 1, quoteText: 'A' },
      { id: 'b', docId: 'd', categoryId: 'cat-1', startChar: 2, endChar: 3, quoteText: 'B' }
    ]
  };
  const started = performance.now();
  const result = globalThis.AnalyticsEngine.analyze(corpus, { unit: 'paragraph', metric: 'count', categoryMode: 'all' });
  const elapsed = performance.now() - started;

  assert.equal(result.diagnostics.pairStrategy, 'sparse-lazy-bounded');
  assert.equal(result.diagnostics.theoreticalPairs, categoryCount * (categoryCount - 1) / 2);
  assert.equal(result.diagnostics.evaluatedPairs, 1);
  assert.equal(result.edges.length, 1);
  assert.equal(Object.keys(result.matrix).length, categoryCount);
  assert.equal(result.matrix['cat-0']['cat-1'].count, 1);
  assert.deepEqual(result.matrix['cat-0']['cat-4999'].evidence, []);
  assert.strictEqual(result.matrix['cat-0']['cat-4999'], result.matrix['cat-4999']['cat-0']);
  assert.equal(result.matrix['cat-4999']['cat-0'].count, 0);
  assert.ok(elapsed < 3000, `El análisis disperso tardó ${elapsed.toFixed(1)} ms`);
});

test('lazy matrix preserves object-key access for numeric category identifiers', () => {
  const result = globalThis.AnalyticsEngine.analyze({
    documents: [{ id: 'd', content: 'A B', wordCount: 2 }],
    categories: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }],
    codings: [
      { id: 'a', docId: 'd', categoryId: 1, startChar: 0, endChar: 1 },
      { id: 'b', docId: 'd', categoryId: 2, startChar: 2, endChar: 3 }
    ]
  }, { unit: 'paragraph', metric: 'count', categoryMode: 'all' });

  assert.equal(result.matrix[1][2].count, 1);
  assert.equal(result.matrix[1][3].count, 0);
  assert.equal(result.matrix[1][1], 1);
});
