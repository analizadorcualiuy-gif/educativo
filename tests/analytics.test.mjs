import test from 'node:test';
import assert from 'node:assert/strict';
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

test('quality dashboard detects missing memos, automation and coverage', () => {
  const result = globalThis.AnalyticsEngine.quality(fixture, { longFragmentChars: 4 });
  assert.equal(result.missingMemos.length, 3);
  assert.equal(result.automatic, 1);
  assert.equal(result.manual, 3);
  assert.equal(result.uncodedDocuments.length, 0);
  assert.ok(result.coverage > 0 && result.coverage < 1);
  assert.equal(result.longFragments.length, 1);
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
