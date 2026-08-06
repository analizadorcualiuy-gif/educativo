import test from 'node:test';
import assert from 'node:assert/strict';

await import('../project-integrity.js');
const integrity = globalThis.ProjectIntegrity;

test('project envelope versions new files and safely accepts legacy shape', () => {
    assert.deepEqual(integrity.validateProjectMetadata({ documents: [], categories: [], codings: [] }), {
        schemaVersion: 0,
        legacy: true,
        edition: null,
        createdWith: null
    });
    const envelope = integrity.createProjectEnvelope({ documents: [], categories: [], codings: [] }, 'pro', '1.0.0');
    assert.equal(envelope.format, 'AnalizadorCualiUY.Project');
    assert.equal(envelope.schemaVersion, 1);
    assert.equal(envelope.edition, 'pro');
    assert.equal(integrity.validateProjectMetadata(envelope).legacy, false);
    assert.throws(() => integrity.validateProjectMetadata({ ...envelope, schemaVersion: 2 }), /posterior/);
    assert.throws(() => integrity.validateProjectMetadata({ ...envelope, format: 'Otro.Formato' }), /no pertenece/);
});

test('hierarchy rejects self-parenting, cycles and unsupported depth', () => {
    assert.throws(() => integrity.validateHierarchy([{ id: 'a', parentId: 'a' }]), /propio padre|ciclo/);
    assert.throws(() => integrity.validateHierarchy([
        { id: 'a', parentId: 'b' },
        { id: 'b', parentId: 'a' }
    ]), /ciclo/);
    assert.throws(() => integrity.validateHierarchy([
        { id: 'a', parentId: null },
        { id: 'b', parentId: 'a' },
        { id: 'c', parentId: 'b' }
    ]), /profundidad máxima/);
    assert.doesNotThrow(() => integrity.validateHierarchy([
        { id: 'a', parentId: null },
        { id: 'b', parentId: 'a' }
    ]));
});

test('recursive category deletion scope includes every descendant', () => {
    const ids = integrity.descendantCategoryIds([
        { id: 'a', parentId: null },
        { id: 'b', parentId: 'a' },
        { id: 'c', parentId: 'b' },
        { id: 'other', parentId: null }
    ], 'a');
    assert.deepEqual([...ids].sort(), ['a', 'b', 'c']);
});

test('coding quote is always derived from its authoritative offsets', () => {
    const document = { content: 'inicio evidencia final' };
    const coding = { id: 'c', startChar: 7, endChar: 16, quoteText: 'texto falso' };
    assert.equal(integrity.canonicalQuote(document, coding), 'evidencia');
    assert.throws(() => integrity.canonicalQuote(document, { id: 'empty', startChar: 2, endChar: 2 }), /posiciones/);
});

test('overlap segmentation reconstructs source once and preserves every coding', () => {
    const content = '0123456789';
    const segments = integrity.buildTextSegments(content, [
        { id: 'outer', startChar: 2, endChar: 8 },
        { id: 'inner', startChar: 4, endChar: 6 }
    ]);
    assert.equal(segments.map(segment => segment.text).join(''), content);
    assert.deepEqual(segments.find(segment => segment.start === 4 && segment.end === 6).codingIds, ['outer', 'inner']);
    assert.ok(segments.some(segment => segment.codingIds.includes('inner')));
});

test('DOM range offsets identify the selected repeated occurrence', () => {
    const content = 'igual xx igual';
    const root = { nodeType: 1, children: [] };
    const segment = { nodeType: 1, dataset: { textStart: '0', textEnd: String(content.length) }, parentElement: root };
    const textNode = { nodeType: 3, parentElement: segment };
    root.children.push(segment);
    const offsets = integrity.rangeToOffsets(root, {
        startContainer: textNode,
        startOffset: 9,
        endContainer: textNode,
        endOffset: 14
    }, content);
    assert.deepEqual(offsets, { start: 9, end: 14, text: 'igual' });
});

test('DOM range offsets survive nested F3 search highlighting', () => {
    const content = 'igual xx igual';
    const root = { nodeType: 1, children: [], childNodes: [] };
    const segment = { nodeType: 1, dataset: { textStart: '0', textEnd: String(content.length) }, parentElement: root, childNodes: [] };
    const before = { nodeType: 3, textContent: 'igual xx ', parentElement: segment };
    const hit = { nodeType: 1, parentElement: segment, childNodes: [] };
    const hitText = { nodeType: 3, textContent: 'igual', parentElement: hit };
    hit.childNodes.push(hitText);
    segment.childNodes.push(before, hit);
    root.children.push(segment);
    root.childNodes.push(segment);
    const offsets = integrity.rangeToOffsets(root, {
        startContainer: hitText,
        startOffset: 0,
        endContainer: hitText,
        endOffset: 5
    }, content);
    assert.deepEqual(offsets, { start: 9, end: 14, text: 'igual' });
});
