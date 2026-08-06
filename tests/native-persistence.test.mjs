import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const rust = await readFile('src-tauri/src/main.rs', 'utf8');
const app = await readFile('app.js', 'utf8');

test('native state and exports use synced temporary-file replacement', () => {
    assert.match(rust, /file\.sync_all\(\)/);
    assert.match(rust, /ReplaceFileW/);
    assert.match(rust, /replace_synced\(&temporary, &path, Some\(&backup\)\)/);
    assert.match(rust, /replace_synced\(&temporary, &path_buf, None\)/);
    assert.doesNotMatch(rust, /fs::remove_file\(&path\)/);
});

test('native window close waits for any pending state write', () => {
    assert.match(app, /onCloseRequested/);
    assert.match(app, /event\.preventDefault\(\)/);
    assert.match(app, /await flushNativeSave\(\)/);
    assert.match(app, /await appWindow\.destroy\(\)/);
});

test('native IPC and DOCX extraction have conservative fixed budgets', () => {
    assert.match(rust, /const MAX_EXPORT_BYTES: u64 = 256 \* MIB/);
    assert.match(rust, /per_file_bytes: 128 \* MIB/);
    assert.match(rust, /MAX_DOCX_EXPANSION_RATIO/);
    assert.doesNotMatch(rust, /clamp\([^\n]*GIB/);
});
