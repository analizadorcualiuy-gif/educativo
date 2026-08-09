import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Tauri frontend has no broad filesystem capability', async () => {
    const capability = JSON.parse(await read('src-tauri/capabilities/main.json'));
    assert.deepEqual(capability.permissions, [
        'core:event:allow-listen',
        'core:event:allow-unlisten'
    ]);

    const cargo = await read('src-tauri/Cargo.toml');
    const rust = await read('src-tauri/src/main.rs');
    assert.doesNotMatch(cargo, /tauri-plugin-fs/);
    assert.doesNotMatch(rust, /tauri_plugin_fs|save_project_file|load_project_file/);
});

test('CSP blocks inline scripts and the application has no inline handlers', async () => {
    const config = JSON.parse(await read('src-tauri/tauri.conf.json'));
    const html = await read('index.html');
    const csp = config.app.security.csp;
    const scriptDirective = csp.split(';').find(value => value.trim().startsWith('script-src')) || '';
    const connectDirective = csp.split(';').find(value => value.trim().startsWith('connect-src')) || '';
    assert.doesNotMatch(scriptDirective, /unsafe-inline/);
    assert.match(connectDirective, /'self'/);
    assert.match(csp, /worker-src 'self'/);
    assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
});

test('project imports and context-sensitive values are validated', async () => {
    const app = await read('app.js');
    const integrity = await read('project-integrity.js');
    assert.match(app, /applyValidatedProject\(parseAndValidateProject\((browserRaw|raw)\)\)/);
    assert.match(app, /\^#\[0-9a-fA-F\]\{6\}\$/);
    assert.match(app, /\^\[A-Za-z0-9\._:-\]\+\$/);
    assert.match(app, /ProjectIntegrity\.canonicalQuote\(document, coding\)/);
    assert.match(app, /ProjectIntegrity\.validateHierarchy\(categories\)/);
    assert.match(app, /ProjectIntegrity\.validateProjectMetadata\(parsed\)/);
    assert.match(integrity, /Number\.isSafeInteger\(start\)/);
    assert.match(integrity, /end <= start/);
});

test('CSV output neutralizes spreadsheet formula prefixes', async () => {
    const app = await read('app.js');
    assert.match(app, /\^\[=\+\\-@\\t\\r\]/);
    assert.match(app, /value = `'\$\{value\}`/);
});

test('highlighted passages edit notes without deleting their coding and the EULA is bundled', async () => {
    const app = await read('app.js');
    const html = await read('index.html');
    const releaseScript = await read('build-release.ps1');
    assert.match(app, /function showCodingContextMenu\(_event, coding\) \{\s*openCodingMemoModal\(coding\);/);
    assert.match(app, /function openCodingMemoModal\(coding\)/);
    assert.match(html, /id="modal-eula"/);
    assert.match(html, /id="pdf-include-memos"/);
    assert.match(html, /id="docx-include-memos"/);
    assert.match(releaseScript, /"EULA\.txt"/);
});

test('commercial release refuses unsigned installers by default', async () => {
    const releaseScript = await read('build-release.ps1');
    assert.match(releaseScript, /Get-AuthenticodeSignature/);
    assert.match(releaseScript, /\$AllowUnsigned/);
    assert.match(releaseScript, /portable\.flag/);
    assert.match(releaseScript, /git status --porcelain/);
    assert.match(releaseScript, /git describe --exact-match --tags HEAD/);
    assert.match(releaseScript, /npm ci/);
    assert.match(releaseScript, /npm test/);
    assert.match(releaseScript, /npm audit --omit=dev --audit-level=high/);
    assert.match(releaseScript, /cargo test --locked/);
    assert.match(releaseScript, /cargo audit[^\r\n]+--target-os windows --target-arch x86_64/);
    assert.match(releaseScript, /npx --no-install tauri build -- --locked/);
    assert.match(releaseScript, /internal-unsigned/);
    assert.match(releaseScript, /ACUY_CERTIFICATE_THUMBPRINT/);
    assert.match(releaseScript, /ACUY_TIMESTAMP_URL/);
    assert.match(releaseScript, /TimeStamperCertificate/);
    assert.match(releaseScript, /Split-Path \$_ -Leaf/);
});
