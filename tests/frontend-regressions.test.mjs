import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

await import('../project-integrity.js');
const integrity = globalThis.ProjectIntegrity;
const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');

function loadFrontendHarness() {
    const source = appSource.replace(
        '    // Launch App',
        `    globalThis.__frontendHooks = {
            findNormalizedMatches,
            normalizedAnalyticsThreshold,
            validateProjectObject,
            createProjectPayload,
            serializeProjectForStorage,
            flushNativeSave,
            blobToBase64,
            universalSaveFile,
            matrixCellCount,
            csvRowByteLength,
            codingsByCategoryIndex,
            summaryPairIndex,
            codingPairCountIndex,
            autoCodeCategoryInDocument,
            validateDocxArchiveSafety,
            revalidateLicense,
            countWords,
            sampleDocuments: SAMPLE_DOCUMENTS,
            sampleCodings: SAMPLE_CODINGS,
            setPending(value) { pendingNativeProject = value; },
            getPending() { return pendingNativeProject; },
            setMaxExportBytes(value) { runtimeCapabilities.maxExportBytes = value; },
            setMaxStateBytes(value) { runtimeCapabilities.maxStateBytes = value; runtimeCapabilities.maxExtractedTextBytes = value; },
            getState() { return state; }
        };

    // Launch App`
    );
    const localStorage = {
        values: new Map(),
        getItem(key) { return this.values.get(key) || null; },
        setItem(key, value) { this.values.set(key, value); },
        removeItem(key) { this.values.delete(key); }
    };
    const alerts = [];
    const elements = new Map();
    const elementFor = id => {
        if (!elements.has(id)) elements.set(id, {
            id,
            style: {},
            value: '',
            textContent: '',
            disabled: false,
            attributes: new Map(),
            setAttribute(name, value) { this.attributes.set(name, value); },
            focus() { this.focused = true; }
        });
        return elements.get(id);
    };
    const inertNodes = [{ inert: false }, { inert: false }];
    const documentStub = {
        visibilityState: 'visible',
        addEventListener() {},
        removeEventListener() {},
        getElementById(id) { return elementFor(id); },
        querySelectorAll(selector) { return selector === 'body > :not(#modal-license)' ? inertNodes : []; }
    };
    const context = {
        ProjectIntegrity: integrity,
        Blob,
        URL,
        console: { ...console, warn() {}, error() {} },
        navigator: { deviceMemory: 8 },
        localStorage,
        btoa(value) { return Buffer.from(value, 'binary').toString('base64'); },
        alert(message) { alerts.push(String(message)); },
        confirm() { return true; },
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        document: documentStub,
        window: { addEventListener() {}, removeEventListener() {}, location: { reload() {} } }
    };
    vm.runInNewContext(source, context, { filename: 'app.js' });
    return { hooks: context.__frontendHooks, context, localStorage, alerts, elements, inertNodes };
}

function docxCentralDirectoryFixture(compressedSize, uncompressedSize, entryCount = 1) {
    const centralSize = 46;
    const bytes = new Uint8Array(centralSize + 22);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(10, 8, true);
    view.setUint32(20, compressedSize, true);
    view.setUint32(24, uncompressedSize, true);
    const eocd = centralSize;
    view.setUint32(eocd, 0x06054b50, true);
    view.setUint16(eocd + 8, entryCount, true);
    view.setUint16(eocd + 10, entryCount, true);
    view.setUint32(eocd + 12, centralSize, true);
    view.setUint32(eocd + 16, 0, true);
    return bytes.buffer;
}

test('sample coding offsets and word counts match their authoritative text', () => {
    const { hooks } = loadFrontendHarness();
    const documents = new Map(hooks.sampleDocuments.map(document => [document.id, document]));
    for (const coding of hooks.sampleCodings) {
        const document = documents.get(coding.docId);
        assert.ok(document, `missing sample document ${coding.docId}`);
        assert.equal(document.content.slice(coding.startChar, coding.endChar), coding.quoteText, coding.id);
    }
    for (const document of hooks.sampleDocuments) {
        assert.equal(document.wordCount, hooks.countWords(document.content), document.id);
    }
});

test('normalized matching preserves exact source offsets and rejects empty folded queries', () => {
    const { hooks } = loadFrontendHarness();
    const text = 'Árbol y A\u0301RBOL; árbol.';
    const matches = hooks.findNormalizedMatches(text, 'arbol');
    assert.equal(matches.length, 3);
    assert.deepEqual(Array.from(matches, match => text.slice(match.start, match.end)), ['Árbol', 'A\u0301RBOL', 'árbol']);
    assert.equal(hooks.findNormalizedMatches('texto', '\u0301').length, 0);
});

test('frontend accepts every analytics unit and does not clamp count thresholds to one', () => {
    const { hooks } = loadFrontendHarness();
    for (const unit of ['paragraph', 'sentence', 'document', 'window', 'overlap']) {
        const project = integrity.createProjectEnvelope({
            documents: [], categories: [], codings: [], analyticsUnit: unit,
            analyticsMetric: 'count', analyticsThreshold: 25
        }, 'pro', '1.0.4');
        const validated = hooks.validateProjectObject(project);
        assert.equal(validated.analyticsUnit, unit);
        assert.equal(validated.analyticsThreshold, 25);
    }
    assert.equal(hooks.normalizedAnalyticsThreshold(25, 'jaccard'), 1);
    assert.equal(hooks.createProjectPayload().createdWith, '1.0.4');
});

test('failed older native save commits the newer pending project in the same queue', async () => {
    const { hooks, context } = loadFrontendHarness();
    const writes = [];
    context.window.__TAURI__ = { core: { invoke(command, args) {
        assert.equal(command, 'save_app_state');
        return new Promise((resolve, reject) => writes.push({ args, resolve, reject }));
    } } };

    hooks.setPending('older');
    const first = hooks.flushNativeSave();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(writes[0].args.projectJson, 'older');

    hooks.setPending('newer');
    const second = hooks.flushNativeSave();
    writes[0].reject(new Error('falló'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(writes[1].args.projectJson, 'newer');
    writes[1].resolve();
    await Promise.all([first, second]);
    assert.equal(hooks.getPending(), null);
});

test('native exports use base64 IPC, preserve bytes and reject oversized blobs before invoking', async () => {
    const { hooks, context, alerts } = loadFrontendHarness();
    const calls = [];
    context.window.__TAURI__ = { core: { async invoke(command, args) {
        calls.push({ command, args });
        return true;
    } } };

    const bytes = Uint8Array.from([0, 1, 2, 127, 128, 250, 255]);
    const saved = await hooks.universalSaveFile(new Blob([bytes]), 'evidencia.pdf');
    assert.equal(saved, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, 'native_save_file_base64');
    assert.equal(calls[0].args.defaultName, 'evidencia.pdf');
    assert.equal('bytes' in calls[0].args, false);
    assert.deepEqual(Buffer.from(calls[0].args.base64Data, 'base64'), Buffer.from(bytes));

    hooks.setMaxExportBytes(2);
    const rejected = await hooks.universalSaveFile(new Blob([bytes]), 'demasiado.pdf');
    assert.equal(rejected, false);
    assert.equal(calls.length, 1);
    assert.match(alerts.at(-1), /supera el máximo/);
});

test('browser DOCX preflight rejects expansion bombs before Mammoth can decompress them', () => {
    const { hooks } = loadFrontendHarness();
    assert.equal(hooks.validateDocxArchiveSafety(docxCentralDirectoryFixture(1, 200)).entryCount, 1);
    assert.throws(
        () => hooks.validateDocxArchiveSafety(docxCentralDirectoryFixture(1, 201)),
        /ratio de expansión inseguro/
    );
    assert.throws(
        () => hooks.validateDocxArchiveSafety(docxCentralDirectoryFixture(1, 1, 2049)),
        /máximo 2048/
    );
});

test('periodic license revalidation fails closed when license_status errors', async () => {
    const { hooks, context, elements, inertNodes } = loadFrontendHarness();
    context.window.__TAURI__ = { core: { async invoke(command) {
        assert.equal(command, 'license_status');
        throw new Error('canal interrumpido');
    } } };

    await hooks.revalidateLicense(true);
    assert.equal(elements.get('modal-license').style.display, 'flex');
    assert.match(elements.get('license-message').textContent, /No se pudo revalidar.*canal interrumpido/);
    assert.equal(elements.get('modal-license').attributes.get('aria-hidden'), 'false');
    assert.ok(inertNodes.every(node => node.inert === true));
});

test('matrix indexes provide linear lookup and cell products fail closed', () => {
    const { hooks } = loadFrontendHarness();
    assert.equal(hooks.matrixCellCount(20, 30), 600);
    assert.equal(hooks.matrixCellCount(Number.MAX_SAFE_INTEGER, 2), Infinity);

    const codings = [
        { id: 'a', docId: 'd1', categoryId: 'c1', dismissed: false },
        { id: 'b', docId: 'd1', categoryId: 'c1', dismissed: true },
        { id: 'c', docId: 'd2', categoryId: 'c1', dismissed: false }
    ];
    assert.equal(hooks.codingsByCategoryIndex(codings).get('c1').length, 3);
    const counts = hooks.codingPairCountIndex(codings);
    assert.equal(counts.get('d1\u0000c1'), 1);
    assert.equal(counts.get('d2\u0000c1'), 1);
    const summary = { id: 's', docId: 'd1', categoryId: 'c1', text: 'síntesis' };
    assert.equal(hooks.summaryPairIndex([summary]).get('d1\u0000c1').id, 's');

    const fields = ['=SUM(A1)', 'texto "citado"', 'Educación'];
    const escaped = fields.map(value => {
        const neutralized = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
        return `"${neutralized.replace(/"/g, '""')}"`;
    }).join(',') + '\n';
    assert.equal(hooks.csvRowByteLength(fields), new Blob([escaped]).size);
});

test('autocoding is atomic when the proposed project would exceed the state budget', () => {
    const { hooks, alerts } = loadFrontendHarness();
    const state = hooks.getState();
    state.documents = [{ id: 'doc', title: 'Caso', content: 'Primera clave. Segunda clave!', wordCount: 4, profile: {} }];
    state.categories = [{ id: 'cat', parentId: null, code: 'ZZ', name: 'Categoría', color: '#336699', keywords: ['clave'], description: '', criteria: '' }];
    state.codings = [];
    state.summaries = [];
    state.auditLog = [];
    const baselineBytes = new Blob([JSON.stringify(hooks.createProjectPayload())]).size;
    hooks.setMaxStateBytes(baselineBytes + 8);

    assert.equal(hooks.autoCodeCategoryInDocument('doc', 'cat'), 0);
    assert.equal(state.codings.length, 0);
    assert.equal(state.auditLog.length, 0);
    assert.match(alerts.at(-1), /No se aplicó la autocodificación/);
});

test('autocoding commits distinct sentence ranges once and records one audit event', () => {
    const { hooks } = loadFrontendHarness();
    const state = hooks.getState();
    state.documents = [{ id: 'doc', title: 'Caso', content: 'Primera clave. Segunda clave!', wordCount: 4, profile: {} }];
    state.categories = [{ id: 'cat', parentId: null, code: 'ZZ', name: 'Categoría', color: '#336699', keywords: ['clave'], description: '', criteria: '' }];
    state.codings = [];
    state.summaries = [];
    state.auditLog = [];

    assert.equal(hooks.autoCodeCategoryInDocument('doc', 'cat'), 2);
    assert.equal(state.codings.length, 2);
    assert.deepEqual(Array.from(state.codings, coding => coding.quoteText), ['Primera clave.', 'Segunda clave!']);
    assert.equal(state.auditLog.length, 1);
    assert.equal(hooks.autoCodeCategoryInDocument('doc', 'cat'), 0);
    assert.equal(state.codings.length, 2);
    assert.equal(state.auditLog.length, 1);
});

test('frontend recovery and destructive-load guards remain wired', () => {
    assert.match(appSource, /load_app_state_candidates/);
    assert.match(appSource, /promote_app_state_candidate/);
    assert.match(appSource, /loadSampleData\(\{ persist: false \}\)/);
    assert.match(appSource, /btn-load-sample'[\s\S]{0,120}= \(\) => \{\s*if \(!confirm\(/);
    assert.match(appSource, /projectFiles\.length && selected\.length !== 1/);
    assert.doesNotMatch(appSource, /existing\.length === 0[\s\S]{0,100}autoCodeCategoryInDocument/);
    assert.match(appSource, /const filterText = normalizeText\(document\.getElementById\('filter-codes'\)/);
    assert.match(appSource, /const before = val\.slice\(cursor, (matchRange|slice)\.start\)/);
    assert.match(appSource, /performInTextSearch\(query, hit\.charPos\)/);
    assert.doesNotMatch(appSource, /const before = val\.slice\(0, pos\)/);
    assert.match(appSource, /if \(nativeCloseInProgress\) return;/);
    assert.match(appSource, /loadingTask\.destroy\(\)/);
    assert.match(appSource, /setupLicenseRevalidation\(\)/);
    assert.match(appSource, /MAX_VISUAL_CATEGORIES = 100/);
    assert.match(appSource, /native_save_file_base64/);
    assert.doesNotMatch(appSource, /native_save_file'|Array\.from\(new Uint8Array/);
    assert.match(appSource, /PdfReportExporter\.createCodedDocument\(\{/);
    assert.match(appSource, /mode: exportMode,[\s\S]{0,80}includeMemos/);
    assert.match(appSource, /delete analyticsOptions\.documentId;[\s\S]{0,80}delete analyticsOptions\.documentGroup/);
    assert.doesNotMatch(appSource, /const pdfHtml/);
    assert.match(appSource, /MAX_MATRIX_UI_CELLS = 10000/);
    assert.match(appSource, /MAX_MATRIX_EXPORT_ROWS = 100000/);
    assert.match(appSource, /const codingsByCategory = codingsByCategoryIndex\(activeCodings\)/);
    assert.doesNotMatch(appSource, /activeCodings\.filter\(c => c\.categoryId === cat\.id\)/);
    assert.match(appSource, /state\.categories\.some\(category => category\.id === currentSel\) \? currentSel : 'ALL'/);
    assert.match(appSource, /function safeFilenameSegment\(value, maxLength = 80\)/);
    assert.match(appSource, /safeFilenameSegment\(activeDoc\.title\)/);
    assert.match(appSource, /safeFilenameSegment\(doc\.title\)/);
    assert.match(appSource, /invoke\('native_open_files', \{ filterType: 'documents' \}\)/);
    assert.match(appSource, /native_open_files', \{ filterType: 'json' \}/);
    assert.match(appSource, /validateDocxArchiveSafety\(arrayBuffer\);\s*const result = await window\.mammoth\.extractRawText/);
    assert.match(appSource, /MAX_DOCX_ENTRIES = 2048/);
    assert.match(appSource, /failClosedLicenseRevalidation\(\{ message: `No se pudo revalidar la licencia:/);
    assert.match(appSource, /initOperationalGuideWizard/);
});
