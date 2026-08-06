import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const core = await readFile('license-core/src/lib.rs', 'utf8');
const admin = await readFile('license-admin/src/main.rs', 'utf8');
const native = await readFile('src-tauri/src/main.rs', 'utf8');
const app = await readFile('app.js', 'utf8');
const publicKey = (await readFile('src-tauri/license-public-key.txt', 'utf8')).trim();

test('embedded issuer public key is a real 32-byte Ed25519 key', () => {
    const bytes = Buffer.from(publicKey, 'base64');
    assert.equal(bytes.length, 32);
    assert.notDeepEqual(bytes, Buffer.alloc(32));
});

test('license verification is native, signed, device-aware and fail-closed', () => {
    assert.match(core, /public_key\.verify/);
    assert.match(core, /La licencia pertenece a otro dispositivo/);
    assert.match(core, /La licencia venció/);
    assert.match(native, /include_str!\("\.\.\/license-public-key\.txt"\)/);
    assert.match(native, /analizador_license_core::verify_license/);
    assert.match(app, /if \(!await initLicenseGate\(\)\) return;/);
    assert.ok(app.indexOf('initLicenseGate()') < app.indexOf('await loadFromStorage()'));
});

test('issuer key stays outside packages and has encrypted recovery tooling', () => {
    assert.match(admin, /CryptProtectData/);
    assert.match(admin, /Argon2::default/);
    assert.match(admin, /Aes256Gcm/);
    assert.match(admin, /create_new\(true\)/);
    assert.doesNotMatch(publicKey, /PRIVATE/);
});
