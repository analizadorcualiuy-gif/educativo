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
    assert.match(app, /invoke\('close_application'\)/);
    assert.match(rust, /fn close_application\(app: tauri::AppHandle\)/);
    assert.match(rust, /app\.exit\(0\)/);
});

test('native IPC and DOCX extraction have conservative fixed budgets', () => {
    assert.match(rust, /const MAX_EXPORT_BYTES: u64 = 64 \* MIB/);
    assert.match(rust, /per_file_bytes: 128 \* MIB/);
    assert.match(rust, /MAX_DOCX_EXPANSION_RATIO/);
    assert.doesNotMatch(rust, /clamp\([^\n]*GIB/);
    assert.match(rust, /fn native_capabilities\(\)/);
    assert.match(rust, /async fn native_save_file_base64/);
    assert.doesNotMatch(rust, /async fn native_save_file\(/);
    assert.match(rust, /if encoded_len > max_encoded/);
    assert.match(rust, /decode_export_base64_with_limit\("\*\*\* no es base64 \*\*\*", 3\)/);
});

test('native recovery is semantic and preserves the validated candidate', () => {
    assert.match(rust, /fn load_app_state_candidates/);
    assert.match(rust, /fn promote_app_state_candidate/);
    assert.match(rust, /validate_project_semantics/);
    assert.match(rust, /replace_synced\(&recovery, path, None\)/);
    assert.doesNotMatch(rust, /replace_synced\(&recovery, path, Some\(&backup\)\)/);
    assert.match(rust, /document_content_units\.insert\([\s\S]{0,120}encode_utf16\(\)\.count\(\)/);
    assert.doesNotMatch(rust, /document_contents[\s\S]{0,300}encode_utf16\(\)\.count\(\)/);
    assert.match(rust, /let mut summary_ids = HashSet/);
    assert.match(rust, /let mut summary_pairs = HashSet/);
});

test('installed state is local, migrated conservatively and single-instance', () => {
    assert.match(rust, /app_local_data_dir\(\)/);
    assert.match(rust, /migrate_legacy_storage/);
    assert.match(rust, /share_mode\(0\)/);
    assert.match(rust, /CryptProtectData/);
    assert.match(rust, /CRYPTPROTECT_LOCAL_MACHINE/);
});

test('untrusted PDF parsing runs only in a bounded child process', () => {
    assert.match(rust, /"pdf" => extract_pdf_text_isolated\(&path_buf\)/);
    assert.match(rust, /PDF_WORKER_SWITCH/);
    assert.match(rust, /validate_pdf_worker_handshake/);
    assert.match(rust, /AssignProcessToJobObject/);
    assert.match(rust, /JOB_OBJECT_LIMIT_PROCESS_MEMORY/);
    assert.match(rust, /wait_for_child_with_timeout/);
    assert.match(rust, /read_regular_file_limited\(&output/);
    assert.doesNotMatch(rust, /"pdf" => \{[\s\S]{0,500}pdf_extract::extract_text_from_mem/);
});
