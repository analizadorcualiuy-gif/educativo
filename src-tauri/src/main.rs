// Prevents additional console window on Windows in release builds, do NOT remove!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use serde::Serialize;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Seek, Write};
use std::path::{Path, PathBuf};
use tauri::Manager;

const MIB: u64 = 1024 * 1024;
const MAX_FILES_PER_SELECTION: usize = 64;
const MAX_EXPORT_BYTES: u64 = 64 * MIB;
const MAX_DOCX_ENTRIES: usize = 2_048;
const MAX_DOCX_TOTAL_UNCOMPRESSED: u64 = 512 * MIB;
const MAX_DOCX_EXPANSION_RATIO: u64 = 200;
const MAX_PROJECT_DOCUMENTS: usize = 40_000;
const MAX_PROJECT_CATEGORIES: usize = 200_000;
const MAX_PROJECT_CODINGS: usize = 4_000_000;
const MAX_SAFE_JS_INTEGER: u64 = 9_007_199_254_740_991;
const LICENSE_REVALIDATION_SECONDS: u64 = 300;
const PDF_WORKER_SWITCH: &str = "--isolated-pdf-worker";
const PDF_WORKER_READY_BYTE: u8 = b'R';
const PDF_WORKER_TIMEOUT_SECONDS: u64 = 30;
const PDF_WORKER_MEMORY_BYTES: u64 = 384 * MIB;
const PDF_WORKER_ERROR_BYTES: u64 = 64 * 1024;
const DEVICE_ID_PREFIX: &str = "ACUY-DID-DPAPI-1:";
const DEVICE_ID_ENTROPY: &[u8] = b"uy.santiago.analizadorcuali.pro/device-id/v1";
const MANAGED_STORAGE_FILES: &[&str] = &[
    "state.json",
    ".state.json.new",
    ".state.json.bak",
    "state.json.bak",
    "license.acuy-license",
    "device-id.txt",
];

#[cfg(debug_assertions)]
const EMBEDDED_PUBLIC_KEY: &str = include_str!("../license-public-key-dev.txt");
#[cfg(not(debug_assertions))]
const EMBEDDED_PUBLIC_KEY: &str = include_str!("../license-public-key.txt");

#[derive(Clone, Copy)]
struct ImportLimits {
    per_file_bytes: u64,
    total_selection_bytes: u64,
    extracted_text_bytes: u64,
    state_bytes: u64,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeCapabilities {
    max_files_per_selection: usize,
    max_file_bytes: u64,
    max_selection_bytes: u64,
    max_extracted_text_bytes: u64,
    max_state_bytes: u64,
    max_export_bytes: u64,
    license_revalidation_seconds: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct StateCandidate {
    source: String,
    raw: String,
}

struct InstanceLock {
    _file: File,
}

fn import_limits() -> ImportLimits {
    // These are end-to-end budgets, not theoretical RAM fractions. Each import
    // can coexist as bytes, UTF-8, UTF-16 and serialized IPC/JSON data.
    ImportLimits {
        per_file_bytes: 128 * MIB,
        total_selection_bytes: 256 * MIB,
        extracted_text_bytes: 128 * MIB,
        state_bytes: 128 * MIB,
    }
}

#[tauri::command]
fn native_capabilities() -> NativeCapabilities {
    let limits = import_limits();
    NativeCapabilities {
        max_files_per_selection: MAX_FILES_PER_SELECTION,
        max_file_bytes: limits.per_file_bytes,
        max_selection_bytes: limits.total_selection_bytes,
        max_extracted_text_bytes: limits.extracted_text_bytes,
        max_state_bytes: limits.state_bytes,
        max_export_bytes: MAX_EXPORT_BYTES,
        license_revalidation_seconds: LICENSE_REVALIDATION_SECONDS,
    }
}

fn executable_directory() -> Result<PathBuf, String> {
    let executable = std::env::current_exe().map_err(|e| e.to_string())?;
    executable
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "No se pudo determinar la carpeta del ejecutable.".to_string())
}

fn portable_data_directory() -> Result<Option<PathBuf>, String> {
    let executable_dir = executable_directory()?;
    Ok(executable_dir
        .join("portable.flag")
        .is_file()
        .then(|| executable_dir.join("data")))
}

fn storage_directory(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Some(portable) = portable_data_directory()? {
        Ok(portable)
    } else {
        app.path().app_local_data_dir().map_err(|e| e.to_string())
    }
}

fn managed_file_limit(name: &str) -> u64 {
    match name {
        "license.acuy-license" | "device-id.txt" => 64 * 1024,
        _ => import_limits().state_bytes,
    }
}

fn copy_managed_file(source: &Path, target: &Path, limit: u64) -> Result<(), String> {
    let metadata = fs::symlink_metadata(source)
        .map_err(|e| format!("No se pudo inspeccionar {}: {e}", source.display()))?;
    if !metadata.file_type().is_file() {
        return Err(format!(
            "No se migró {} porque no es un archivo regular.",
            source.display()
        ));
    }
    if metadata.len() > limit {
        return Err(format!(
            "No se migró {} porque supera el límite de {} MiB.",
            source.display(),
            limit / MIB
        ));
    }
    if target.exists() {
        return Ok(());
    }

    let suffix = format!("migrate-{}", std::process::id());
    let temporary = temporary_sibling(target, &suffix)?;
    let result = (|| {
        let input = File::open(source)
            .map_err(|e| format!("No se pudo abrir {}: {e}", source.display()))?;
        let mut output = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temporary)
            .map_err(|e| format!("No se pudo crear {}: {e}", temporary.display()))?;
        let mut limited_input = input.take(limit.saturating_add(1));
        let copied = std::io::copy(&mut limited_input, &mut output)
            .map_err(|e| format!("No se pudo migrar {}: {e}", source.display()))?;
        if copied > limit {
            return Err(format!(
                "{} cambió durante la migración y superó el límite seguro.",
                source.display()
            ));
        }
        output
            .sync_all()
            .map_err(|e| format!("No se pudo sincronizar {}: {e}", temporary.display()))?;
        if target.exists() {
            return Ok(());
        }
        fs::rename(&temporary, target)
            .map_err(|e| format!("No se pudo activar {}: {e}", target.display()))
    })();
    if result.is_err() || target.exists() {
        let _ = fs::remove_file(&temporary);
    }
    result
}

fn migrate_legacy_storage(legacy: &Path, local: &Path) -> Result<(), String> {
    if legacy == local || !legacy.is_dir() {
        return Ok(());
    }
    fs::create_dir_all(local).map_err(|e| format!("No se pudo crear {}: {e}", local.display()))?;
    for name in MANAGED_STORAGE_FILES {
        let source = legacy.join(name);
        let target = local.join(name);
        if source.exists() && !target.exists() {
            copy_managed_file(&source, &target, managed_file_limit(name))?;
        }
    }
    Ok(())
}

#[cfg(windows)]
fn acquire_instance_lock(directory: &Path) -> Result<InstanceLock, String> {
    use std::os::windows::fs::OpenOptionsExt;

    let lock_path = directory.join(".instance.lock");
    let file = OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .share_mode(0)
        .open(&lock_path)
        .map_err(|e| {
            format!(
                "AnalizadorCualiUY Pro ya está abierto o no se pudo bloquear {}: {e}",
                lock_path.display()
            )
        })?;
    Ok(InstanceLock { _file: file })
}

#[cfg(not(windows))]
fn acquire_instance_lock(_directory: &Path) -> Result<InstanceLock, String> {
    Err("Esta edición y su bloqueo de instancia requieren Windows.".to_string())
}

fn initialize_storage(app: &tauri::AppHandle) -> Result<InstanceLock, String> {
    let local = storage_directory(app)?;
    fs::create_dir_all(&local).map_err(|e| format!("No se pudo crear {}: {e}", local.display()))?;
    let lock = acquire_instance_lock(&local)?;
    if portable_data_directory()?.is_none() {
        let legacy = app.path().app_data_dir().map_err(|e| e.to_string())?;
        migrate_legacy_storage(&legacy, &local)?;
    }
    Ok(lock)
}

fn temporary_sibling(path: &Path, suffix: &str) -> Result<PathBuf, String> {
    let file_name = path
        .file_name()
        .ok_or_else(|| "Ruta de archivo inválida.".to_string())?
        .to_string_lossy();
    Ok(path.with_file_name(format!(".{file_name}.{suffix}")))
}

fn write_synced(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let mut file = OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .open(path)
        .map_err(|e| format!("No se pudo crear {}: {e}", path.display()))?;
    file.write_all(bytes)
        .map_err(|e| format!("No se pudo escribir {}: {e}", path.display()))?;
    file.sync_all()
        .map_err(|e| format!("No se pudo sincronizar {}: {e}", path.display()))
}

#[cfg(windows)]
fn replace_synced(replacement: &Path, target: &Path, backup: Option<&Path>) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{ReplaceFileW, REPLACEFILE_WRITE_THROUGH};

    if !target.exists() {
        return fs::rename(replacement, target)
            .map_err(|e| format!("No se pudo activar {}: {e}", target.display()));
    }
    let wide = |path: &Path| {
        path.as_os_str()
            .encode_wide()
            .chain(Some(0))
            .collect::<Vec<u16>>()
    };
    let target_wide = wide(target);
    let replacement_wide = wide(replacement);
    let backup_wide = backup.map(wide);
    let backup_ptr = backup_wide
        .as_ref()
        .map_or(std::ptr::null(), |value| value.as_ptr());
    let result = unsafe {
        ReplaceFileW(
            target_wide.as_ptr(),
            replacement_wide.as_ptr(),
            backup_ptr,
            REPLACEFILE_WRITE_THROUGH,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        )
    };
    if result == 0 {
        Err(format!(
            "No se pudo reemplazar {} de forma atómica: {}",
            target.display(),
            std::io::Error::last_os_error()
        ))
    } else {
        Ok(())
    }
}

#[cfg(not(windows))]
fn replace_synced(replacement: &Path, target: &Path, backup: Option<&Path>) -> Result<(), String> {
    if let Some(backup) = backup.filter(|_| target.exists()) {
        fs::copy(target, backup)
            .map_err(|e| format!("No se pudo crear el respaldo {}: {e}", backup.display()))?;
        OpenOptions::new()
            .read(true)
            .open(backup)
            .and_then(|file| file.sync_all())
            .map_err(|e| format!("No se pudo sincronizar el respaldo: {e}"))?;
    }
    fs::rename(replacement, target)
        .map_err(|e| format!("No se pudo activar {}: {e}", target.display()))?;
    if let Some(parent) = target.parent() {
        OpenOptions::new()
            .read(true)
            .open(parent)
            .and_then(|file| file.sync_all())
            .map_err(|e| format!("No se pudo sincronizar el directorio de destino: {e}"))?;
    }
    Ok(())
}

fn state_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    storage_directory(app).map(|path| path.join("state.json"))
}

fn license_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let state = state_file_path(app)?;
    Ok(state
        .parent()
        .ok_or_else(|| "Ruta de licencia inválida.".to_string())?
        .join("license.acuy-license"))
}

fn device_id_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let state = state_file_path(app)?;
    Ok(state
        .parent()
        .ok_or_else(|| "Ruta de dispositivo inválida.".to_string())?
        .join("device-id.txt"))
}

fn valid_device_id(value: &str) -> bool {
    value.len() == 32 && value.chars().all(|character| character.is_ascii_hexdigit())
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn hex_decode(value: &str) -> Result<Vec<u8>, String> {
    if (value.len() & 1) != 0 || !value.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err("El identificador protegido tiene una codificación inválida.".to_string());
    }
    (0..value.len())
        .step_by(2)
        .map(|index| {
            u8::from_str_radix(&value[index..index + 2], 16)
                .map_err(|_| "El identificador protegido está dañado.".to_string())
        })
        .collect()
}

#[cfg(windows)]
fn protect_device_id(value: &str) -> Result<Vec<u8>, String> {
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{
        CryptProtectData, CRYPTPROTECT_LOCAL_MACHINE, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };

    let input_len = u32::try_from(value.len())
        .map_err(|_| "El identificador de dispositivo es demasiado grande.".to_string())?;
    let entropy_len = u32::try_from(DEVICE_ID_ENTROPY.len())
        .map_err(|_| "La entropía de protección es inválida.".to_string())?;
    let input = CRYPT_INTEGER_BLOB {
        cbData: input_len,
        pbData: value.as_ptr().cast_mut(),
    };
    let entropy = CRYPT_INTEGER_BLOB {
        cbData: entropy_len,
        pbData: DEVICE_ID_ENTROPY.as_ptr().cast_mut(),
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    let success = unsafe {
        CryptProtectData(
            &input,
            std::ptr::null(),
            &entropy,
            std::ptr::null(),
            std::ptr::null(),
            CRYPTPROTECT_LOCAL_MACHINE | CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };
    if success == 0 {
        return Err(format!(
            "Windows no pudo vincular el código de dispositivo a este equipo: {}",
            std::io::Error::last_os_error()
        ));
    }
    if output.pbData.is_null() || output.cbData == 0 {
        if !output.pbData.is_null() {
            unsafe {
                LocalFree(output.pbData.cast());
            }
        }
        return Err("Windows devolvió un código de dispositivo protegido vacío.".to_string());
    }
    let protected =
        unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec() };
    unsafe {
        LocalFree(output.pbData.cast());
    }
    Ok(protected)
}

#[cfg(windows)]
fn unprotect_device_id(value: &[u8]) -> Result<String, String> {
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{
        CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };

    let input_len = u32::try_from(value.len())
        .map_err(|_| "El identificador protegido es demasiado grande.".to_string())?;
    let entropy_len = u32::try_from(DEVICE_ID_ENTROPY.len())
        .map_err(|_| "La entropía de protección es inválida.".to_string())?;
    let input = CRYPT_INTEGER_BLOB {
        cbData: input_len,
        pbData: value.as_ptr().cast_mut(),
    };
    let entropy = CRYPT_INTEGER_BLOB {
        cbData: entropy_len,
        pbData: DEVICE_ID_ENTROPY.as_ptr().cast_mut(),
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    let success = unsafe {
        CryptUnprotectData(
            &input,
            std::ptr::null_mut(),
            &entropy,
            std::ptr::null(),
            std::ptr::null(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };
    if success == 0 {
        return Err(format!(
            "Windows no pudo abrir el código de dispositivo vinculado a este equipo: {}",
            std::io::Error::last_os_error()
        ));
    }
    if output.pbData.is_null() || output.cbData == 0 {
        if !output.pbData.is_null() {
            unsafe {
                LocalFree(output.pbData.cast());
            }
        }
        return Err("Windows devolvió un código de dispositivo vacío.".to_string());
    }
    let unprotected =
        unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec() };
    unsafe {
        LocalFree(output.pbData.cast());
    }
    String::from_utf8(unprotected)
        .map_err(|_| "El identificador protegido no contiene texto UTF-8 válido.".to_string())
}

#[cfg(not(windows))]
fn protect_device_id(_value: &str) -> Result<Vec<u8>, String> {
    Err("La protección del código de dispositivo requiere Windows.".to_string())
}

#[cfg(not(windows))]
fn unprotect_device_id(_value: &[u8]) -> Result<String, String> {
    Err("La protección del código de dispositivo requiere Windows.".to_string())
}

fn write_protected_device_id(path: &Path, device_id: &str) -> Result<(), String> {
    let protected = protect_device_id(device_id)?;
    let encoded = format!("{DEVICE_ID_PREFIX}{}\n", hex_encode(&protected));
    let temporary = temporary_sibling(path, "new")?;
    write_synced(&temporary, encoded.as_bytes())?;
    if let Err(error) = replace_synced(&temporary, path, None) {
        let _ = fs::remove_file(&temporary);
        return Err(error);
    }
    Ok(())
}

fn license_allows_device_regeneration(app: &tauri::AppHandle) -> Result<bool, String> {
    let path = license_file_path(app)?;
    if !path.is_file() {
        return Ok(true);
    }
    let raw = fs::read_to_string(&path)
        .map_err(|e| format!("No se pudo leer la licencia instalada: {e}"))?;
    if raw.len() > 16 * 1024 {
        return Ok(false);
    }
    Ok(
        serde_json::from_str::<analizador_license_core::LicenseEnvelope>(&raw)
            .map(|envelope| envelope.payload.device_id == "*")
            .unwrap_or(false),
    )
}

fn new_device_id() -> Result<String, String> {
    let mut random = [0_u8; 16];
    getrandom::fill(&mut random)
        .map_err(|e| format!("No se pudo crear el código de dispositivo: {e}"))?;
    Ok(hex_encode(&random))
}

fn get_or_create_device_id(app: &tauri::AppHandle) -> Result<String, String> {
    let path = device_id_path(app)?;
    match fs::read(&path) {
        Ok(bytes) => {
            if bytes.len() > 64 * 1024 {
                return Err("El archivo local del dispositivo supera el límite seguro.".to_string());
            }
            let existing = std::str::from_utf8(&bytes)
                .map_err(|_| {
                    "El identificador local del dispositivo no es UTF-8 válido.".to_string()
                })?
                .trim();
            if let Some(encoded) = existing.strip_prefix(DEVICE_ID_PREFIX) {
                let protected = hex_decode(encoded)?;
                match unprotect_device_id(&protected) {
                    Ok(device_id) => {
                        let device_id = device_id.trim().to_ascii_lowercase();
                        if valid_device_id(&device_id) {
                            return Ok(device_id);
                        }
                        return Err("El código de dispositivo protegido está dañado.".to_string());
                    }
                    Err(_error) if license_allows_device_regeneration(app)? => {
                        let device_id = new_device_id()?;
                        write_protected_device_id(&path, &device_id)?;
                        return Ok(device_id);
                    }
                    Err(error) => {
                        return Err(format!(
                            "{error} No se regeneró porque podría invalidar una licencia vinculada existente."
                        ));
                    }
                }
            }
            let device_id = existing.to_ascii_lowercase();
            if valid_device_id(&device_id) {
                // Compatibilidad con instalaciones anteriores: conserva el código
                // ya licenciado y lo vuelve no portable mediante DPAPI.
                write_protected_device_id(&path, &device_id)?;
                return Ok(device_id);
            }
            return Err("El identificador local del dispositivo está dañado; no se regeneró para evitar invalidar una licencia existente.".to_string());
        }
        Err(error) if error.kind() != std::io::ErrorKind::NotFound => {
            return Err(format!("No se pudo leer el código de dispositivo: {error}"));
        }
        Err(_) => {}
    }
    let parent = path
        .parent()
        .ok_or_else(|| "Ruta de dispositivo inválida.".to_string())?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let device_id = new_device_id()?;
    write_protected_device_id(&path, &device_id)?;
    Ok(device_id)
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LicenseStatus {
    valid: bool,
    device_code: String,
    message: String,
    holder: Option<String>,
    license_id: Option<String>,
    expires_at: Option<String>,
}

fn current_license_status(app: &tauri::AppHandle) -> Result<LicenseStatus, String> {
    let device_code = get_or_create_device_id(app)?;
    let path = license_file_path(app)?;
    if !path.is_file() {
        return Ok(LicenseStatus {
            valid: false,
            device_code,
            message: "No hay una licencia Pro instalada.".into(),
            holder: None,
            license_id: None,
            expires_at: None,
        });
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("No se pudo leer la licencia: {e}"))?;
    let public_key = analizador_license_core::parse_public_key(EMBEDDED_PUBLIC_KEY)?;
    match analizador_license_core::verify_license(
        &raw,
        &public_key,
        &device_code,
        analizador_license_core::today_utc(),
    ) {
        Ok(payload) => Ok(LicenseStatus {
            valid: true,
            device_code,
            message: "Licencia Pro válida.".into(),
            holder: Some(payload.holder),
            license_id: Some(payload.license_id),
            expires_at: payload.expires_at,
        }),
        Err(message) => Ok(LicenseStatus {
            valid: false,
            device_code,
            message,
            holder: None,
            license_id: None,
            expires_at: None,
        }),
    }
}

#[tauri::command]
fn license_status(app: tauri::AppHandle) -> Result<LicenseStatus, String> {
    current_license_status(&app)
}

#[tauri::command]
async fn install_license(app: tauri::AppHandle) -> Result<LicenseStatus, String> {
    use tauri_plugin_dialog::DialogExt;
    let selected = app
        .dialog()
        .file()
        .add_filter(
            "Licencia AnalizadorCualiUY (*.acuy-license)",
            &["acuy-license"],
        )
        .blocking_pick_file();
    let Some(selected) = selected else {
        return current_license_status(&app);
    };
    let source = selected.into_path().map_err(|e| e.to_string())?;
    let metadata = fs::metadata(&source).map_err(|e| e.to_string())?;
    if metadata.len() > 16 * 1024 {
        return Err("El archivo de licencia supera 16 KiB.".to_string());
    }
    let raw = fs::read_to_string(&source)
        .map_err(|e| format!("No se pudo leer la licencia seleccionada: {e}"))?;
    let device_code = get_or_create_device_id(&app)?;
    let public_key = analizador_license_core::parse_public_key(EMBEDDED_PUBLIC_KEY)?;
    analizador_license_core::verify_license(
        &raw,
        &public_key,
        &device_code,
        analizador_license_core::today_utc(),
    )?;
    let target = license_file_path(&app)?;
    let parent = target
        .parent()
        .ok_or_else(|| "Ruta de licencia inválida.".to_string())?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let temporary = temporary_sibling(&target, "new")?;
    write_synced(&temporary, raw.as_bytes())?;
    replace_synced(&temporary, &target, None)?;
    current_license_status(&app)
}

fn state_candidate_paths(path: &Path) -> Result<Vec<(&'static str, PathBuf)>, String> {
    Ok(vec![
        ("primary", path.to_path_buf()),
        ("new", temporary_sibling(path, "new")?),
        ("backup", temporary_sibling(path, "bak")?),
        ("legacy", path.with_extension("json.bak")),
    ])
}

fn read_state_candidate(path: &Path, limit: u64) -> Result<Option<String>, String> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => {
            return Err(format!(
                "No se pudo inspeccionar {}: {error}",
                path.display()
            ));
        }
    };
    if !metadata.file_type().is_file() {
        return Err(format!("{} no es un archivo regular", path.display()));
    }
    if metadata.len() > limit {
        return Err(format!("{} supera {} MiB", path.display(), limit / MIB));
    }
    let raw = fs::read_to_string(path)
        .map_err(|error| format!("{} no pudo leerse como UTF-8: {error}", path.display()))?;
    if raw.len() as u64 > limit {
        return Err(format!(
            "{} creció mientras se leía y supera {} MiB",
            path.display(),
            limit / MIB
        ));
    }
    Ok(Some(raw))
}

fn safe_project_id<'a>(value: &'a Value, field: &str) -> Result<&'a str, String> {
    let id = value
        .as_str()
        .ok_or_else(|| format!("{field} debe ser texto."))?;
    if id.is_empty()
        || id.len() > 160
        || !id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"._:-".contains(&byte))
    {
        return Err(format!("{field} contiene un identificador inválido."));
    }
    Ok(id)
}

fn project_array<'a>(
    root: &'a serde_json::Map<String, Value>,
    field: &str,
) -> Result<&'a Vec<Value>, String> {
    root.get(field)
        .and_then(Value::as_array)
        .ok_or_else(|| format!("El proyecto debe contener {field} como lista."))
}

fn safe_project_index(value: &Value, field: &str) -> Result<u64, String> {
    let index = value.as_u64().or_else(|| {
        let number = value.as_f64()?;
        (number.is_finite()
            && number >= 0.0
            && number.fract() == 0.0
            && number <= MAX_SAFE_JS_INTEGER as f64)
            .then_some(number as u64)
    });
    match index {
        Some(index) if index <= MAX_SAFE_JS_INTEGER => Ok(index),
        _ => Err(format!("{field} debe ser un entero seguro no negativo.")),
    }
}

fn validate_optional_text(
    object: &serde_json::Map<String, Value>,
    field: &str,
    max_utf16_units: usize,
    context: &str,
) -> Result<(), String> {
    if let Some(value) = object.get(field) {
        if value.is_null() {
            return Ok(());
        }
        let text = value
            .as_str()
            .ok_or_else(|| format!("{context}.{field} debe ser texto."))?;
        if text.encode_utf16().count() > max_utf16_units {
            return Err(format!("{context}.{field} supera el límite permitido."));
        }
    }
    Ok(())
}

fn validate_project_semantics(raw: &str) -> Result<(), String> {
    let parsed: Value =
        serde_json::from_str(raw).map_err(|e| format!("El proyecto no es JSON válido: {e}"))?;
    let root = parsed
        .as_object()
        .ok_or_else(|| "El proyecto debe ser un objeto JSON.".to_string())?;

    let has_metadata = root.contains_key("format") || root.contains_key("schemaVersion");
    if has_metadata {
        if root.get("format").and_then(Value::as_str) != Some("AnalizadorCualiUY.Project") {
            return Err(
                "El archivo no pertenece al formato de proyecto AnalizadorCualiUY.".to_string(),
            );
        }
        let schema = root
            .get("schemaVersion")
            .and_then(Value::as_u64)
            .ok_or_else(|| "La versión del esquema de proyecto es inválida.".to_string())?;
        if schema != 1 {
            return Err(format!("La versión de esquema {schema} no es compatible."));
        }
        if !matches!(
            root.get("edition").and_then(Value::as_str),
            Some("beta" | "pro")
        ) {
            return Err("La edición creadora del proyecto es inválida.".to_string());
        }
    }

    let documents = project_array(root, "documents")?;
    let categories = project_array(root, "categories")?;
    let codings = project_array(root, "codings")?;
    if documents.len() > MAX_PROJECT_DOCUMENTS
        || categories.len() > MAX_PROJECT_CATEGORIES
        || codings.len() > MAX_PROJECT_CODINGS
    {
        return Err("El proyecto supera los límites máximos de objetos.".to_string());
    }

    let mut document_ids = HashSet::with_capacity(documents.len());
    let mut document_content_units = HashMap::with_capacity(documents.len());
    for (index, document) in documents.iter().enumerate() {
        let object = document
            .as_object()
            .ok_or_else(|| format!("documents[{index}] no es un objeto."))?;
        let id = safe_project_id(
            object
                .get("id")
                .ok_or_else(|| format!("documents[{index}].id falta."))?,
            &format!("documents[{index}].id"),
        )?;
        if !document_ids.insert(id.to_string()) {
            return Err(format!("ID de documento duplicado: {id}"));
        }
        let title = object.get("title").and_then(Value::as_str);
        let content = object.get("content").and_then(Value::as_str);
        if title.is_none() || content.is_none() {
            return Err(format!(
                "documents[{index}] debe contener title y content como texto."
            ));
        }
        if title.unwrap().encode_utf16().count() > 4_096 {
            return Err(format!(
                "documents[{index}].title supera el límite permitido."
            ));
        }
        document_content_units.insert(
            id.to_string(),
            content.unwrap().encode_utf16().count() as u64,
        );
    }

    let mut category_ids = HashSet::with_capacity(categories.len());
    let mut category_parents = HashMap::with_capacity(categories.len());
    for (index, category) in categories.iter().enumerate() {
        let object = category
            .as_object()
            .ok_or_else(|| format!("categories[{index}] no es un objeto."))?;
        let id = safe_project_id(
            object
                .get("id")
                .ok_or_else(|| format!("categories[{index}].id falta."))?,
            &format!("categories[{index}].id"),
        )?;
        if !category_ids.insert(id.to_string()) {
            return Err(format!("ID de categoría duplicado: {id}"));
        }
        if object.get("name").and_then(Value::as_str).is_none() {
            return Err(format!("categories[{index}].name debe ser texto."));
        }
        if object["name"].as_str().unwrap().encode_utf16().count() > 4_096 {
            return Err(format!(
                "categories[{index}].name supera el límite permitido."
            ));
        }
        validate_optional_text(object, "code", 512, &format!("categories[{index}]"))?;
        validate_optional_text(
            object,
            "description",
            1024 * 1024,
            &format!("categories[{index}]"),
        )?;
        validate_optional_text(
            object,
            "criteria",
            1024 * 1024,
            &format!("categories[{index}]"),
        )?;
        if let Some(keywords) = object.get("keywords").filter(|value| !value.is_null()) {
            let keywords = keywords
                .as_array()
                .ok_or_else(|| format!("categories[{index}].keywords debe ser una lista."))?;
            if keywords.len() > 10_000 {
                return Err(format!(
                    "categories[{index}].keywords contiene demasiados valores."
                ));
            }
            for (keyword_index, keyword) in keywords.iter().enumerate() {
                let keyword = keyword.as_str().ok_or_else(|| {
                    format!("categories[{index}].keywords[{keyword_index}] debe ser texto.")
                })?;
                if keyword.encode_utf16().count() > 16_384 {
                    return Err(format!(
                        "categories[{index}].keywords[{keyword_index}] supera el límite permitido."
                    ));
                }
            }
        }
        let parent = match object.get("parentId") {
            None | Some(Value::Null) => None,
            Some(value) => {
                Some(safe_project_id(value, &format!("categories[{index}].parentId"))?.to_string())
            }
        };
        category_parents.insert(id.to_string(), parent);
    }
    for id in &category_ids {
        let mut current = id.as_str();
        let mut visited = HashSet::new();
        let mut depth = 1_u8;
        loop {
            if !visited.insert(current.to_string()) {
                return Err(format!("La jerarquía contiene un ciclo que incluye {id}."));
            }
            let Some(parent) = category_parents
                .get(current)
                .ok_or_else(|| format!("La categoría {current} no existe."))?
                .as_deref()
            else {
                break;
            };
            if !category_ids.contains(parent) {
                return Err(format!(
                    "La categoría {current} referencia un padre inexistente."
                ));
            }
            depth += 1;
            if depth > 2 {
                return Err(format!(
                    "La categoría {id} supera la profundidad máxima de 2 niveles."
                ));
            }
            current = parent;
        }
    }

    let mut coding_ids = HashSet::with_capacity(codings.len());
    for (index, coding) in codings.iter().enumerate() {
        let object = coding
            .as_object()
            .ok_or_else(|| format!("codings[{index}] no es un objeto."))?;
        let id = safe_project_id(
            object
                .get("id")
                .ok_or_else(|| format!("codings[{index}].id falta."))?,
            &format!("codings[{index}].id"),
        )?;
        if !coding_ids.insert(id.to_string()) {
            return Err(format!("ID de codificación duplicado: {id}"));
        }
        let document_id = safe_project_id(
            object
                .get("docId")
                .ok_or_else(|| format!("codings[{index}].docId falta."))?,
            &format!("codings[{index}].docId"),
        )?;
        let category_id = safe_project_id(
            object
                .get("categoryId")
                .ok_or_else(|| format!("codings[{index}].categoryId falta."))?,
            &format!("codings[{index}].categoryId"),
        )?;
        if !document_ids.contains(document_id) || !category_ids.contains(category_id) {
            return Err(format!(
                "La codificación {id} contiene referencias inexistentes."
            ));
        }
        let start = safe_project_index(
            object
                .get("startChar")
                .ok_or_else(|| format!("codings[{index}].startChar falta."))?,
            &format!("codings[{index}].startChar"),
        )?;
        let end = safe_project_index(
            object
                .get("endChar")
                .ok_or_else(|| format!("codings[{index}].endChar falta."))?,
            &format!("codings[{index}].endChar"),
        )?;
        let content_units = *document_content_units
            .get(document_id)
            .expect("la referencia al documento ya fue validada");
        if end <= start || end > content_units {
            return Err(format!(
                "La codificación {id} contiene posiciones de texto inválidas."
            ));
        }
        validate_optional_text(
            object,
            "quoteText",
            import_limits().extracted_text_bytes as usize,
            &format!("codings[{index}]"),
        )?;
        validate_optional_text(object, "memo", 1024 * 1024, &format!("codings[{index}]"))?;
    }

    if let Some(summaries) = root.get("summaries") {
        let summaries = summaries
            .as_array()
            .ok_or_else(|| "summaries debe ser una lista.".to_string())?;
        if summaries.len() > 100_000 {
            return Err("summaries supera el límite de 100.000 entradas.".to_string());
        }
        let mut summary_ids = HashSet::with_capacity(summaries.len());
        let mut summary_pairs = HashSet::with_capacity(summaries.len());
        for (index, summary) in summaries.iter().enumerate() {
            let object = summary
                .as_object()
                .ok_or_else(|| format!("summaries[{index}] no es un objeto."))?;
            let summary_id = safe_project_id(
                object
                    .get("id")
                    .ok_or_else(|| format!("summaries[{index}].id falta."))?,
                &format!("summaries[{index}].id"),
            )?;
            if !summary_ids.insert(summary_id.to_string()) {
                return Err(format!("ID de síntesis duplicado: {summary_id}"));
            }
            let document_id = safe_project_id(
                object
                    .get("docId")
                    .ok_or_else(|| format!("summaries[{index}].docId falta."))?,
                &format!("summaries[{index}].docId"),
            )?;
            let category_id = safe_project_id(
                object
                    .get("categoryId")
                    .ok_or_else(|| format!("summaries[{index}].categoryId falta."))?,
                &format!("summaries[{index}].categoryId"),
            )?;
            if !document_ids.contains(document_id) || !category_ids.contains(category_id) {
                return Err(format!(
                    "La síntesis {} contiene referencias inexistentes.",
                    index + 1
                ));
            }
            if !summary_pairs.insert((document_id.to_string(), category_id.to_string())) {
                return Err(format!(
                    "Existe más de una síntesis para el documento {document_id} y la categoría {category_id}."
                ));
            }
            validate_optional_text(object, "text", 1024 * 1024, &format!("summaries[{index}]"))?;
        }
    }

    if let Some(audit_log) = root.get("auditLog") {
        let audit_log = audit_log
            .as_array()
            .ok_or_else(|| "auditLog debe ser una lista.".to_string())?;
        if audit_log.len() > 10_000 {
            return Err("auditLog supera el límite de 10.000 entradas.".to_string());
        }
        for (index, entry) in audit_log.iter().enumerate() {
            let object = entry
                .as_object()
                .ok_or_else(|| format!("auditLog[{index}] no es un objeto."))?;
            safe_project_id(
                object
                    .get("id")
                    .ok_or_else(|| format!("auditLog[{index}].id falta."))?,
                &format!("auditLog[{index}].id"),
            )?;
            validate_optional_text(object, "action", 512, &format!("auditLog[{index}]"))?;
            validate_optional_text(object, "detail", 4_096, &format!("auditLog[{index}]"))?;
        }
    }
    Ok(())
}

fn load_state_candidates_from_path(path: &Path) -> Result<Vec<StateCandidate>, String> {
    let limit = import_limits().state_bytes;
    let mut candidates = Vec::new();
    let mut failures = Vec::new();
    for (source, candidate_path) in state_candidate_paths(path)? {
        match read_state_candidate(&candidate_path, limit) {
            Ok(Some(raw)) => candidates.push(StateCandidate {
                source: source.to_string(),
                raw,
            }),
            Ok(None) => {}
            Err(error) => failures.push(error),
        }
    }
    if candidates.is_empty() && !failures.is_empty() {
        Err(format!(
            "No se pudo leer el estado ni sus copias: {}",
            failures.join("; ")
        ))
    } else {
        Ok(candidates)
    }
}

#[tauri::command]
fn load_app_state_candidates(app: tauri::AppHandle) -> Result<Vec<StateCandidate>, String> {
    let path = state_file_path(&app)?;
    load_state_candidates_from_path(&path)
}

#[tauri::command]
fn load_app_state(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = state_file_path(&app)?;
    let candidates = load_state_candidates_from_path(&path)?;
    if candidates.is_empty() {
        return Ok(None);
    }
    let mut failures = Vec::new();
    for candidate in candidates {
        match validate_project_semantics(&candidate.raw) {
            Ok(()) => {
                if candidate.source != "primary" {
                    promote_state_candidate_at(&path, &candidate.source, &candidate.raw)?;
                }
                return Ok(Some(candidate.raw));
            }
            Err(error) => failures.push(format!("{}: {error}", candidate.source)),
        }
    }
    Err(format!(
        "Ninguna copia del estado contiene un proyecto válido: {}",
        failures.join("; ")
    ))
}

fn candidate_path_for_source(path: &Path, source: &str) -> Result<PathBuf, String> {
    state_candidate_paths(path)?
        .into_iter()
        .find_map(|(name, candidate)| (name == source).then_some(candidate))
        .ok_or_else(|| "Origen de recuperación desconocido.".to_string())
}

fn promote_state_candidate_at(path: &Path, source: &str, project_json: &str) -> Result<(), String> {
    let limit = import_limits().state_bytes;
    if project_json.len() as u64 > limit {
        return Err(format!(
            "El candidato supera el límite seguro de {} MiB.",
            limit / MIB
        ));
    }
    validate_project_semantics(project_json)?;
    let source_path = candidate_path_for_source(path, source)?;
    let current = read_state_candidate(&source_path, limit)?
        .ok_or_else(|| "El candidato de recuperación ya no existe.".to_string())?;
    if current != project_json {
        return Err(
            "El candidato cambió después de ser validado; vuelva a cargar el estado.".to_string(),
        );
    }
    if source == "primary" {
        return Ok(());
    }
    let parent = path
        .parent()
        .ok_or_else(|| "Ruta de almacenamiento inválida.".to_string())?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let recovery = temporary_sibling(path, "recovery")?;
    write_synced(&recovery, project_json.as_bytes())?;
    // No se pide backup aquí: el candidato validado (incluido .bak) se
    // conserva intacto y nunca se reemplaza por el primary inválido.
    if let Err(error) = replace_synced(&recovery, path, None) {
        let _ = fs::remove_file(&recovery);
        return Err(error);
    }
    Ok(())
}

#[tauri::command]
fn promote_app_state_candidate(
    app: tauri::AppHandle,
    source: String,
    project_json: String,
) -> Result<(), String> {
    let path = state_file_path(&app)?;
    promote_state_candidate_at(&path, &source, &project_json)
}

#[tauri::command]
fn save_app_state(app: tauri::AppHandle, project_json: String) -> Result<(), String> {
    let limit = import_limits().state_bytes;
    if project_json.len() as u64 > limit {
        return Err(format!(
            "El proyecto ocupa más de {} MiB y no puede guardarse de forma segura.",
            limit / MIB
        ));
    }
    validate_project_semantics(&project_json)
        .map_err(|e| format!("El proyecto no pasó la validación y no se guardó: {e}"))?;

    let path = state_file_path(&app)?;
    let parent = path
        .parent()
        .ok_or_else(|| "Ruta de almacenamiento inválida.".to_string())?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;

    let temporary = temporary_sibling(&path, "new")?;
    let backup = temporary_sibling(&path, "bak")?;
    write_synced(&temporary, project_json.as_bytes())?;
    if let Err(error) = replace_synced(&temporary, &path, Some(&backup)) {
        let _ = fs::remove_file(&temporary);
        return Err(error);
    }
    Ok(())
}

#[derive(Serialize)]
pub struct SelectedFile {
    pub name: String,
    pub path: String,
    pub extension: String,
    pub content: String,
}

fn extract_docx_text(path: &std::path::Path, max_output_bytes: u64) -> Result<String, String> {
    let file = fs::File::open(path).map_err(|e| format!("No se pudo abrir el DOCX: {e}"))?;
    extract_docx_text_from_reader(file, max_output_bytes)
}

fn extract_docx_text_from_reader<R: Read + Seek>(
    source: R,
    max_output_bytes: u64,
) -> Result<String, String> {
    use quick_xml::events::Event;

    let mut archive = zip::ZipArchive::new(source)
        .map_err(|e| format!("El archivo no es un DOCX valido: {e}"))?;
    if archive.len() > MAX_DOCX_ENTRIES {
        return Err(format!(
            "El DOCX contiene demasiadas entradas ZIP (máximo {MAX_DOCX_ENTRIES})."
        ));
    }
    let mut total_uncompressed = 0_u64;
    for index in 0..archive.len() {
        let entry = archive
            .by_index(index)
            .map_err(|e| format!("No se pudo inspeccionar la entrada ZIP {index}: {e}"))?;
        total_uncompressed = total_uncompressed
            .checked_add(entry.size())
            .ok_or_else(|| "El tamaño descomprimido del DOCX es inválido.".to_string())?;
        if total_uncompressed > MAX_DOCX_TOTAL_UNCOMPRESSED {
            return Err(format!(
                "El DOCX supera {} MiB descomprimidos.",
                MAX_DOCX_TOTAL_UNCOMPRESSED / MIB
            ));
        }
        if entry.size() > MIB
            && entry.compressed_size() > 0
            && entry.size() / entry.compressed_size() > MAX_DOCX_EXPANSION_RATIO
        {
            return Err(format!(
                "El DOCX contiene una entrada con ratio de expansión inseguro: {}.",
                entry.name()
            ));
        }
    }
    let document = archive
        .by_name("word/document.xml")
        .map_err(|e| format!("El DOCX no contiene word/document.xml: {e}"))?;
    if document.size() > max_output_bytes {
        return Err(format!(
            "El texto descomprimido del DOCX supera el límite de {} MiB.",
            max_output_bytes / MIB
        ));
    }
    let mut xml = String::new();
    document
        .take(max_output_bytes.saturating_add(1))
        .read_to_string(&mut xml)
        .map_err(|e| format!("No se pudo leer el contenido del DOCX: {e}"))?;
    if xml.len() as u64 > max_output_bytes {
        return Err(format!(
            "El texto descomprimido del DOCX supera el límite de {} MiB.",
            max_output_bytes / MIB
        ));
    }

    let mut reader = quick_xml::Reader::from_str(&xml);
    reader.config_mut().trim_text(false);
    let mut buffer = Vec::new();
    let mut text = String::new();
    let mut inside_text = false;

    loop {
        match reader.read_event_into(&mut buffer) {
            Ok(Event::Start(event)) if event.local_name().as_ref() == b"t" => inside_text = true,
            Ok(Event::End(event)) if event.local_name().as_ref() == b"t" => inside_text = false,
            Ok(Event::End(event)) if event.local_name().as_ref() == b"p" => {
                if !text.ends_with('\n') {
                    text.push('\n');
                }
                if !text.ends_with("\n\n") {
                    text.push('\n');
                }
            }
            Ok(Event::Empty(event)) if event.local_name().as_ref() == b"tab" => text.push('\t'),
            Ok(Event::Empty(event))
                if event.local_name().as_ref() == b"br" || event.local_name().as_ref() == b"cr" =>
            {
                text.push('\n');
            }
            Ok(Event::Text(event)) if inside_text => {
                let decoded = event
                    .decode()
                    .map_err(|e| format!("Codificacion XML invalida dentro del DOCX: {e}"))?;
                let value = quick_xml::escape::unescape(&decoded)
                    .map_err(|e| format!("Texto XML invalido dentro del DOCX: {e}"))?;
                text.push_str(&value);
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("XML invalido dentro del DOCX: {e}")),
            _ => {}
        }
        buffer.clear();
    }

    let normalized = text
        .lines()
        .map(str::trim_end)
        .collect::<Vec<_>>()
        .join("\n");
    let normalized = normalized.trim().to_string();
    if normalized.is_empty() {
        Err("El DOCX no contiene texto legible en el cuerpo del documento.".to_string())
    } else {
        Ok(normalized)
    }
}

fn read_regular_file_limited(path: &Path, limit: u64) -> Result<Vec<u8>, String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|e| format!("No se pudo inspeccionar {}: {e}", path.display()))?;
    if !metadata.file_type().is_file() {
        return Err(format!("{} no es un archivo regular.", path.display()));
    }
    if metadata.len() > limit {
        return Err(format!(
            "{} supera el límite seguro de {} MiB.",
            path.display(),
            limit / MIB
        ));
    }
    let file = File::open(path).map_err(|e| format!("No se pudo abrir {}: {e}", path.display()))?;
    let mut bytes = Vec::with_capacity(usize::try_from(metadata.len()).unwrap_or(0));
    file.take(limit.saturating_add(1))
        .read_to_end(&mut bytes)
        .map_err(|e| format!("No se pudo leer {}: {e}", path.display()))?;
    if bytes.len() as u64 > limit {
        return Err(format!(
            "{} creció durante la lectura y superó el límite seguro.",
            path.display()
        ));
    }
    Ok(bytes)
}

fn write_new_synced(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(path)
        .map_err(|e| format!("No se pudo crear {}: {e}", path.display()))?;
    file.write_all(bytes)
        .map_err(|e| format!("No se pudo escribir {}: {e}", path.display()))?;
    file.sync_all()
        .map_err(|e| format!("No se pudo sincronizar {}: {e}", path.display()))
}

fn extract_pdf_worker_with_limits(
    input: &Path,
    output: &Path,
    max_input_bytes: u64,
    max_output_bytes: u64,
) -> Result<(), String> {
    let bytes = read_regular_file_limited(input, max_input_bytes)?;
    let extracted = pdf_extract::extract_text_from_mem(&bytes)
        .map_err(|e| format!("No se pudo extraer texto del PDF: {e}"))?;
    if extracted.len() as u64 > max_output_bytes {
        return Err(format!(
            "El texto extraído del PDF supera el límite de {} MiB.",
            max_output_bytes / MIB
        ));
    }
    if extracted.trim().is_empty() {
        return Err(
            "El PDF no contiene texto extraíble. Puede ser un PDF escaneado que requiere OCR."
                .to_string(),
        );
    }
    write_new_synced(output, extracted.as_bytes())
}

fn validate_pdf_worker_handshake<R: Read>(reader: &mut R) -> Result<(), String> {
    let mut byte = [0_u8; 1];
    reader.read_exact(&mut byte).map_err(|_| {
        "El trabajador PDF no recibió autorización del proceso principal.".to_string()
    })?;
    if byte[0] != PDF_WORKER_READY_BYTE {
        return Err("La autorización del trabajador PDF es inválida.".to_string());
    }
    Ok(())
}

fn run_pdf_worker_if_requested() -> Option<i32> {
    let mut arguments = std::env::args_os();
    let _executable = arguments.next();
    if arguments.next().as_deref() != Some(std::ffi::OsStr::new(PDF_WORKER_SWITCH)) {
        return None;
    }
    let result = (|| {
        let input = arguments
            .next()
            .map(PathBuf::from)
            .ok_or_else(|| "Falta la ruta de entrada del trabajador PDF.".to_string())?;
        let output = arguments
            .next()
            .map(PathBuf::from)
            .ok_or_else(|| "Falta la ruta de salida del trabajador PDF.".to_string())?;
        if arguments.next().is_some() {
            return Err("El trabajador PDF recibió argumentos inesperados.".to_string());
        }
        validate_pdf_worker_handshake(&mut std::io::stdin().lock())?;
        let limits = import_limits();
        extract_pdf_worker_with_limits(
            &input,
            &output,
            limits.per_file_bytes,
            limits.extracted_text_bytes,
        )
    })();
    match result {
        Ok(()) => Some(0),
        Err(error) => {
            eprintln!("{error}");
            Some(1)
        }
    }
}

struct PdfWorkerTemporaryDirectory {
    path: PathBuf,
}

impl Drop for PdfWorkerTemporaryDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}

fn create_pdf_worker_temporary_directory() -> Result<PdfWorkerTemporaryDirectory, String> {
    for _ in 0..8 {
        let mut random = [0_u8; 16];
        getrandom::fill(&mut random)
            .map_err(|e| format!("No se pudo crear aleatoriedad para el trabajador PDF: {e}"))?;
        let token = random
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>();
        let path = std::env::temp_dir().join(format!("analizador-cuali-pdf-{token}"));
        match fs::create_dir(&path) {
            Ok(()) => return Ok(PdfWorkerTemporaryDirectory { path }),
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => {
                return Err(format!(
                    "No se pudo crear la carpeta temporal del trabajador PDF: {error}"
                ));
            }
        }
    }
    Err("No se pudo reservar una carpeta temporal única para el trabajador PDF.".to_string())
}

fn wait_for_child_with_timeout(
    child: &mut std::process::Child,
    timeout: std::time::Duration,
) -> Result<std::process::ExitStatus, String> {
    let started = std::time::Instant::now();
    loop {
        if let Some(status) = child
            .try_wait()
            .map_err(|e| format!("No se pudo consultar el trabajador PDF: {e}"))?
        {
            return Ok(status);
        }
        if started.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err(format!(
                "La extracción del PDF excedió el tiempo máximo de {} segundos.",
                timeout.as_secs()
            ));
        }
        std::thread::sleep(std::time::Duration::from_millis(20));
    }
}

#[cfg(windows)]
struct PdfWorkerJob(windows_sys::Win32::Foundation::HANDLE);

#[cfg(windows)]
impl Drop for PdfWorkerJob {
    fn drop(&mut self) {
        unsafe {
            windows_sys::Win32::Foundation::CloseHandle(self.0);
        }
    }
}

#[cfg(windows)]
fn assign_pdf_worker_job(
    child: &std::process::Child,
    memory_limit: u64,
) -> Result<PdfWorkerJob, String> {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::System::JobObjects::{
        AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
        SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE, JOB_OBJECT_LIMIT_PROCESS_MEMORY,
    };

    let handle = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
    if handle.is_null() {
        return Err(format!(
            "No se pudo crear el límite de memoria del trabajador PDF: {}",
            std::io::Error::last_os_error()
        ));
    }
    let job = PdfWorkerJob(handle);
    let mut information = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
    information.BasicLimitInformation.LimitFlags =
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_PROCESS_MEMORY;
    information.ProcessMemoryLimit = usize::try_from(memory_limit)
        .map_err(|_| "El límite de memoria del trabajador PDF no es representable.".to_string())?;
    let configured = unsafe {
        SetInformationJobObject(
            job.0,
            JobObjectExtendedLimitInformation,
            &information as *const _ as *const std::ffi::c_void,
            std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        )
    };
    if configured == 0 {
        return Err(format!(
            "No se pudo configurar el límite de memoria del trabajador PDF: {}",
            std::io::Error::last_os_error()
        ));
    }
    let assigned = unsafe {
        AssignProcessToJobObject(
            job.0,
            child.as_raw_handle() as windows_sys::Win32::Foundation::HANDLE,
        )
    };
    if assigned == 0 {
        return Err(format!(
            "No se pudo aislar el trabajador PDF: {}",
            std::io::Error::last_os_error()
        ));
    }
    Ok(job)
}

#[cfg(windows)]
fn extract_pdf_text_isolated(path: &Path) -> Result<String, String> {
    use std::os::windows::process::CommandExt;
    use std::process::{Command, Stdio};
    use windows_sys::Win32::System::Threading::CREATE_NO_WINDOW;

    let temporary = create_pdf_worker_temporary_directory()?;
    let output = temporary.path.join("extracted.txt");
    let executable = std::env::current_exe()
        .map_err(|e| format!("No se pudo localizar el trabajador PDF: {e}"))?;
    let mut command = Command::new(executable);
    command
        .arg(PDF_WORKER_SWITCH)
        .arg(path)
        .arg(&output)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .creation_flags(CREATE_NO_WINDOW);
    let mut child = command
        .spawn()
        .map_err(|e| format!("No se pudo iniciar el trabajador PDF: {e}"))?;
    let job = match assign_pdf_worker_job(&child, PDF_WORKER_MEMORY_BYTES) {
        Ok(job) => job,
        Err(error) => {
            let _ = child.kill();
            let _ = child.wait();
            return Err(error);
        }
    };
    let handshake = child
        .stdin
        .take()
        .ok_or_else(|| "No se pudo autorizar el trabajador PDF.".to_string())?
        .write_all(&[PDF_WORKER_READY_BYTE]);
    if let Err(error) = handshake {
        let _ = child.kill();
        let _ = child.wait();
        return Err(format!("No se pudo autorizar el trabajador PDF: {error}"));
    }
    let status = wait_for_child_with_timeout(
        &mut child,
        std::time::Duration::from_secs(PDF_WORKER_TIMEOUT_SECONDS),
    )?;
    drop(job);
    if !status.success() {
        let mut error = String::new();
        if let Some(stderr) = child.stderr.take() {
            let _ = stderr
                .take(PDF_WORKER_ERROR_BYTES)
                .read_to_string(&mut error);
        }
        let message = error.trim();
        return Err(if message.is_empty() {
            "El trabajador PDF terminó por un límite de seguridad o un error de formato."
                .to_string()
        } else {
            format!("El trabajador PDF rechazó el archivo: {message}")
        });
    }
    let bytes = read_regular_file_limited(&output, import_limits().extracted_text_bytes)?;
    String::from_utf8(bytes)
        .map_err(|_| "El trabajador PDF devolvió texto con codificación inválida.".to_string())
}

#[cfg(not(windows))]
fn extract_pdf_text_isolated(_path: &Path) -> Result<String, String> {
    Err("La importación PDF aislada requiere Windows.".to_string())
}

#[cfg(test)]
mod tests {
    use super::{
        acquire_instance_lock, decode_export_base64, decode_export_base64_with_limit,
        extract_docx_text_from_reader, extract_pdf_worker_with_limits,
        load_state_candidates_from_path, migrate_legacy_storage, promote_state_candidate_at,
        protect_device_id, read_regular_file_limited, replace_synced, temporary_sibling,
        unprotect_device_id, validate_pdf_worker_handshake, validate_project_semantics,
        wait_for_child_with_timeout, write_protected_device_id, write_synced,
    };
    use std::fmt::Write as FmtWrite;
    use std::fs;
    use std::io::{Cursor, Write};
    use std::path::PathBuf;
    use std::time::{Instant, SystemTime, UNIX_EPOCH};
    use zip::write::SimpleFileOptions;

    fn test_directory(name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!(
            "analizador-cuali-uy-{name}-{}-{nonce}",
            std::process::id()
        ))
    }

    fn valid_project() -> &'static str {
        r#"{"format":"AnalizadorCualiUY.Project","schemaVersion":1,"edition":"pro","documents":[{"id":"doc-1","title":"Caso","content":"Texto de prueba"}],"categories":[{"id":"cat-1","parentId":null,"name":"Tema"}],"codings":[{"id":"cod-1","docId":"doc-1","categoryId":"cat-1","startChar":0,"endChar":5,"quoteText":"Texto"}]}"#
    }

    fn sample_pdf() -> Vec<u8> {
        let stream = "BT\n/F1 12 Tf\n72 720 Td\n(Hola desde PDF) Tj\nET";
        let objects = [
            "<< /Type /Catalog /Pages 2 0 R >>".to_string(),
            "<< /Type /Pages /Kids [3 0 R] /Count 1 >>".to_string(),
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>".to_string(),
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>".to_string(),
            format!("<< /Length {} >>\nstream\n{}\nendstream", stream.len(), stream),
        ];
        let mut pdf = String::from("%PDF-1.4\n");
        let mut offsets = Vec::new();
        for (index, object) in objects.iter().enumerate() {
            offsets.push(pdf.len());
            pdf.push_str(&format!("{} 0 obj\n{}\nendobj\n", index + 1, object));
        }
        let xref_offset = pdf.len();
        pdf.push_str("xref\n0 6\n0000000000 65535 f \n");
        for offset in offsets {
            pdf.push_str(&format!("{offset:010} 00000 n \n"));
        }
        pdf.push_str(&format!(
            "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n"
        ));
        pdf.into_bytes()
    }

    #[test]
    fn extracts_paragraphs_tabs_and_breaks_from_docx() {
        let cursor = Cursor::new(Vec::new());
        let mut writer = zip::ZipWriter::new(cursor);
        writer
            .start_file("word/document.xml", SimpleFileOptions::default())
            .unwrap();
        writer
            .write_all(br#"<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Primer parrafo</w:t><w:tab/><w:r><w:t>con tabulador</w:t></w:r></w:r></w:p><w:p><w:r><w:t>Segunda linea</w:t><w:br/><w:t>tras salto</w:t></w:r></w:p></w:body></w:document>"#)
            .unwrap();
        let archive = writer.finish().unwrap();

        let result = extract_docx_text_from_reader(archive, 8 * super::MIB).unwrap();
        assert_eq!(
            result,
            "Primer parrafo\tcon tabulador\n\nSegunda linea\ntras salto"
        );
    }

    #[test]
    fn extracts_text_from_pdf_memory() {
        let result = pdf_extract::extract_text_from_mem(&sample_pdf()).unwrap();
        assert!(result.contains("Hola desde PDF"));
    }

    #[test]
    fn pdf_worker_requires_parent_handshake_and_enforces_io_limits() {
        assert!(
            validate_pdf_worker_handshake(&mut Cursor::new([super::PDF_WORKER_READY_BYTE])).is_ok()
        );
        assert!(validate_pdf_worker_handshake(&mut Cursor::new([b'X'])).is_err());

        let directory = test_directory("pdf-worker-limits");
        fs::create_dir_all(&directory).unwrap();
        let input = directory.join("input.pdf");
        let output = directory.join("output.txt");
        fs::write(&input, sample_pdf()).unwrap();

        assert!(read_regular_file_limited(&input, 4).is_err());
        let error = extract_pdf_worker_with_limits(&input, &output, super::MIB, 4).unwrap_err();
        assert!(error.contains("texto extraído"));
        assert!(!output.exists());

        extract_pdf_worker_with_limits(&input, &output, super::MIB, super::MIB).unwrap();
        assert!(fs::read_to_string(&output)
            .unwrap()
            .contains("Hola desde PDF"));
        fs::remove_dir_all(directory).unwrap();
    }

    #[cfg(windows)]
    #[test]
    fn pdf_worker_timeout_terminates_the_child() {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        use std::time::Duration;
        use windows_sys::Win32::System::Threading::CREATE_NO_WINDOW;

        let mut command = Command::new("powershell.exe");
        command
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Start-Sleep -Seconds 5",
            ])
            .creation_flags(CREATE_NO_WINDOW);
        let mut child = command.spawn().unwrap();
        let error =
            wait_for_child_with_timeout(&mut child, Duration::from_millis(100)).unwrap_err();
        assert!(error.contains("tiempo máximo"));
        assert!(child.try_wait().unwrap().is_some());
    }

    #[test]
    fn rejects_docx_entries_with_extreme_expansion_ratio() {
        let cursor = Cursor::new(Vec::new());
        let mut writer = zip::ZipWriter::new(cursor);
        let options =
            SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
        writer.start_file("word/document.xml", options).unwrap();
        writer
            .write_all(&vec![b'A'; 2 * super::MIB as usize])
            .unwrap();
        let archive = writer.finish().unwrap();

        let error = extract_docx_text_from_reader(archive, 8 * super::MIB).unwrap_err();
        assert!(error.contains("ratio de expansión inseguro"));
    }

    #[test]
    fn atomic_replacement_preserves_a_synced_backup() {
        let directory = test_directory("atomic-test");
        fs::create_dir_all(&directory).unwrap();
        let target = directory.join("state.json");
        let replacement = temporary_sibling(&target, "new").unwrap();
        let backup = temporary_sibling(&target, "bak").unwrap();
        write_synced(&target, br#"{"version":1}"#).unwrap();
        write_synced(&replacement, br#"{"version":2}"#).unwrap();

        replace_synced(&replacement, &target, Some(&backup)).unwrap();
        assert_eq!(fs::read(&target).unwrap(), br#"{"version":2}"#);
        assert_eq!(fs::read(&backup).unwrap(), br#"{"version":1}"#);
        assert!(!replacement.exists());

        fs::remove_file(&target).unwrap();
        fs::remove_file(&backup).unwrap();
        fs::remove_dir(&directory).unwrap();
    }

    #[test]
    fn semantic_state_validation_rejects_syntactic_but_empty_json() {
        assert!(validate_project_semantics(valid_project()).is_ok());
        let error = validate_project_semantics("{}").unwrap_err();
        assert!(error.contains("documents"));

        let invalid_offsets = valid_project().replace("\"endChar\":5", "\"endChar\":500");
        let error = validate_project_semantics(&invalid_offsets).unwrap_err();
        assert!(error.contains("posiciones de texto inválidas"));

        let utf16_offsets = r#"{"documents":[{"id":"doc","title":"Emoji","content":"a😀b"}],"categories":[{"id":"cat","name":"Tema"}],"codings":[{"id":"cod","docId":"doc","categoryId":"cat","startChar":1,"endChar":3}]}"#;
        assert!(validate_project_semantics(utf16_offsets).is_ok());
    }

    #[test]
    fn semantic_validation_caches_document_utf16_lengths() {
        let coding_count = 100_000;
        let content = "x".repeat(100_000);
        let mut project = String::with_capacity(content.len() + coding_count * 85);
        project.push_str(r#"{"documents":[{"id":"doc","title":"Escala","content":""#);
        project.push_str(&content);
        project.push_str(r#""}],"categories":[{"id":"cat","name":"Tema"}],"codings":["#);
        for index in 0..coding_count {
            if index > 0 {
                project.push(',');
            }
            write!(
                project,
                r#"{{"id":"cod-{index}","docId":"doc","categoryId":"cat","startChar":0,"endChar":1}}"#
            )
            .unwrap();
        }
        project.push_str("]}");

        let started = Instant::now();
        validate_project_semantics(&project).unwrap();
        assert!(
            started.elapsed().as_secs_f64() < 8.0,
            "la validación UTF-16 cacheada tardó {:?}",
            started.elapsed()
        );
    }

    #[test]
    fn semantic_validation_rejects_duplicate_summary_ids_and_pairs() {
        let duplicate_id = r#"{"documents":[{"id":"doc","title":"Caso","content":"Texto"}],"categories":[{"id":"cat","name":"Tema"}],"codings":[],"summaries":[{"id":"sum","docId":"doc","categoryId":"cat","text":"Uno"},{"id":"sum","docId":"doc","categoryId":"cat","text":"Dos"}]}"#;
        assert!(validate_project_semantics(duplicate_id)
            .unwrap_err()
            .contains("ID de síntesis duplicado"));

        let duplicate_pair = r#"{"documents":[{"id":"doc","title":"Caso","content":"Texto"}],"categories":[{"id":"cat","name":"Tema"}],"codings":[],"summaries":[{"id":"sum-1","docId":"doc","categoryId":"cat","text":"Uno"},{"id":"sum-2","docId":"doc","categoryId":"cat","text":"Dos"}]}"#;
        assert!(validate_project_semantics(duplicate_pair)
            .unwrap_err()
            .contains("más de una síntesis"));
    }

    #[test]
    fn export_base64_is_validated_before_native_save() {
        assert_eq!(decode_export_base64("SG9sYQ==").unwrap(), b"Hola");
        assert!(decode_export_base64("*** no es base64 ***").is_err());

        // With a deliberately tiny decoded budget, this invalid Base64 must be
        // rejected by encoded length before the decoder is ever reached.
        let error = decode_export_base64_with_limit("*** no es base64 ***", 3).unwrap_err();
        assert!(error.contains("antes de decodificarse"));
    }

    #[test]
    fn recovery_promotes_valid_backup_without_overwriting_it() {
        let directory = test_directory("recovery-test");
        fs::create_dir_all(&directory).unwrap();
        let primary = directory.join("state.json");
        let backup = temporary_sibling(&primary, "bak").unwrap();
        write_synced(&primary, b"{}").unwrap();
        write_synced(&backup, valid_project().as_bytes()).unwrap();

        let candidates = load_state_candidates_from_path(&primary).unwrap();
        assert_eq!(
            candidates
                .iter()
                .map(|candidate| candidate.source.as_str())
                .collect::<Vec<_>>(),
            vec!["primary", "backup"]
        );
        assert!(validate_project_semantics(&candidates[0].raw).is_err());
        promote_state_candidate_at(&primary, "backup", valid_project()).unwrap();

        assert_eq!(fs::read_to_string(&primary).unwrap(), valid_project());
        assert_eq!(fs::read_to_string(&backup).unwrap(), valid_project());
        fs::remove_dir_all(&directory).unwrap();
    }

    #[test]
    fn migration_copies_only_missing_managed_files_and_keeps_legacy_data() {
        let directory = test_directory("migration-test");
        let legacy = directory.join("roaming");
        let local = directory.join("local");
        fs::create_dir_all(&legacy).unwrap();
        fs::create_dir_all(&local).unwrap();
        write_synced(&legacy.join("state.json"), b"legacy-state").unwrap();
        write_synced(&legacy.join("license.acuy-license"), b"legacy-license").unwrap();
        write_synced(&legacy.join("unmanaged.txt"), b"do-not-copy").unwrap();
        write_synced(&local.join("license.acuy-license"), b"local-license").unwrap();

        migrate_legacy_storage(&legacy, &local).unwrap();

        assert_eq!(fs::read(local.join("state.json")).unwrap(), b"legacy-state");
        assert_eq!(
            fs::read(local.join("license.acuy-license")).unwrap(),
            b"local-license"
        );
        assert!(!local.join("unmanaged.txt").exists());
        assert!(legacy.join("state.json").exists());
        fs::remove_dir_all(&directory).unwrap();
    }

    #[cfg(windows)]
    #[test]
    fn instance_lock_excludes_a_second_process_handle() {
        let directory = test_directory("instance-lock-test");
        fs::create_dir_all(&directory).unwrap();
        let first = acquire_instance_lock(&directory).unwrap();
        assert!(acquire_instance_lock(&directory).is_err());
        drop(first);
        drop(acquire_instance_lock(&directory).unwrap());
        fs::remove_dir_all(&directory).unwrap();
    }

    #[cfg(windows)]
    #[test]
    fn device_id_round_trips_through_windows_machine_protection() {
        let device_id = "0123456789abcdef0123456789abcdef";
        let protected = protect_device_id(device_id).unwrap();
        assert!(!protected
            .windows(device_id.len())
            .any(|part| part == device_id.as_bytes()));
        assert_eq!(unprotect_device_id(&protected).unwrap(), device_id);

        let directory = test_directory("device-id-test");
        fs::create_dir_all(&directory).unwrap();
        let path = directory.join("device-id.txt");
        write_synced(&path, device_id.as_bytes()).unwrap();
        write_protected_device_id(&path, device_id).unwrap();
        let stored = fs::read_to_string(&path).unwrap();
        assert!(stored.starts_with(super::DEVICE_ID_PREFIX));
        assert!(!stored.contains(device_id));
        fs::remove_dir_all(directory).unwrap();
    }
}

// 8. Diálogo nativo para abrir archivos (TXT, DOCX, PDF, JSON) sin restricciones de navegador
#[tauri::command]
async fn native_open_files(
    app: tauri::AppHandle,
    filter_type: String,
) -> Result<Vec<SelectedFile>, String> {
    use tauri_plugin_dialog::DialogExt;
    let mut builder = app.dialog().file();

    if filter_type == "json" {
        builder = builder.add_filter("Proyecto AnalizadorCualiUY Pro (*.json)", &["json"]);
    } else {
        builder = builder.add_filter(
            "Documentos Cualitativos (*.txt, *.docx, *.pdf, *.json)",
            &["txt", "docx", "pdf", "json"],
        );
    }

    let paths = builder.blocking_pick_files();
    let mut results = Vec::new();

    if let Some(file_list) = paths {
        if file_list.len() > MAX_FILES_PER_SELECTION {
            return Err(format!(
                "Se seleccionaron {} archivos. El máximo por lote es {}.",
                file_list.len(),
                MAX_FILES_PER_SELECTION
            ));
        }

        let limits = import_limits();
        let mut selected_paths = Vec::with_capacity(file_list.len());
        let mut total_bytes = 0_u64;
        for file_path in file_list {
            let path_buf = file_path.into_path().map_err(|e| e.to_string())?;
            let size = fs::metadata(&path_buf)
                .map_err(|e| format!("No se pudo comprobar el tamaño del archivo: {e}"))?
                .len();
            if size > limits.per_file_bytes {
                return Err(format!(
                    "{} ocupa {} MiB y supera el límite dinámico por archivo de {} MiB.",
                    path_buf.file_name().unwrap_or_default().to_string_lossy(),
                    size / MIB,
                    limits.per_file_bytes / MIB
                ));
            }
            total_bytes = total_bytes
                .checked_add(size)
                .ok_or_else(|| "El tamaño total de la selección es inválido.".to_string())?;
            if total_bytes > limits.total_selection_bytes {
                return Err(format!(
                    "La selección supera el límite dinámico total de {} MiB.",
                    limits.total_selection_bytes / MIB
                ));
            }
            selected_paths.push(path_buf);
        }

        let mut total_extracted_bytes = 0_u64;
        for path_buf in selected_paths {
            let name = path_buf
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let ext = path_buf
                .extension()
                .unwrap_or_default()
                .to_string_lossy()
                .to_lowercase();
            let path_str = path_buf.to_string_lossy().to_string();

            let content = match ext.as_str() {
                "docx" => extract_docx_text(&path_buf, limits.extracted_text_bytes)?,
                "pdf" => extract_pdf_text_isolated(&path_buf)
                    .map_err(|error| format!("No se pudo importar {name}: {error}"))?,
                "txt" => {
                    let bytes =
                        fs::read(&path_buf).map_err(|e| format!("No se pudo leer {name}: {e}"))?;
                    String::from_utf8_lossy(&bytes).to_string()
                }
                "json" => {
                    let bytes =
                        fs::read(&path_buf).map_err(|e| format!("No se pudo leer {name}: {e}"))?;
                    String::from_utf8(bytes)
                        .map_err(|_| format!("{name} no contiene JSON codificado como UTF-8."))?
                }
                _ => return Err(format!("Formato no compatible: .{ext}")),
            };
            if content.len() as u64 > limits.extracted_text_bytes {
                return Err(format!(
                    "El texto extraído de {name} supera el límite de {} MiB.",
                    limits.extracted_text_bytes / MIB
                ));
            }
            total_extracted_bytes = total_extracted_bytes
                .checked_add(content.len() as u64)
                .ok_or_else(|| "El tamaño total del texto extraído es inválido.".to_string())?;
            if total_extracted_bytes > limits.total_selection_bytes {
                return Err(format!(
                    "El texto extraído del lote supera el límite total de {} MiB.",
                    limits.total_selection_bytes / MIB
                ));
            }

            results.push(SelectedFile {
                name,
                path: path_str,
                extension: ext,
                content,
            });
        }
    }

    Ok(results)
}

// 9. Diálogo nativo para guardar archivos de exportación sin restricciones de navegador
fn save_file_bytes(
    app: tauri::AppHandle,
    default_name: String,
    bytes: &[u8],
) -> Result<bool, String> {
    use tauri_plugin_dialog::DialogExt;
    if bytes.len() as u64 > MAX_EXPORT_BYTES {
        return Err(format!(
            "La exportación supera el límite seguro de {} MiB.",
            MAX_EXPORT_BYTES / MIB
        ));
    }
    if default_name.is_empty()
        || default_name.chars().count() > 240
        || default_name.chars().any(char::is_control)
        || Path::new(&default_name)
            .file_name()
            .and_then(|name| name.to_str())
            != Some(default_name.as_str())
    {
        return Err("El nombre sugerido para la exportación es inválido.".to_string());
    }
    let ext = Path::new(&default_name)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("txt")
        .to_lowercase();

    let mut builder = app.dialog().file().set_file_name(&default_name);
    if ext == "docx" {
        builder = builder.add_filter("Documento de Microsoft Word (*.docx)", &["docx"]);
    } else if ext == "doc" {
        builder = builder.add_filter("Documento de Microsoft Word (*.doc)", &["doc"]);
    } else if ext == "json" {
        builder = builder.add_filter("Proyecto JSON (*.json)", &["json"]);
    } else if ext == "csv" {
        builder = builder.add_filter("Archivo CSV (*.csv)", &["csv"]);
    } else if ext == "html" {
        builder = builder.add_filter("Documento HTML / Reporte (*.html)", &["html", "htm"]);
    } else if ext == "pdf" {
        builder = builder.add_filter("Documento PDF (*.pdf)", &["pdf"]);
    } else if ext == "png" {
        builder = builder.add_filter("Imagen PNG (*.png)", &["png"]);
    } else if ext == "svg" {
        builder = builder.add_filter("Imagen SVG (*.svg)", &["svg"]);
    }

    let path_opt = builder.blocking_save_file();
    if let Some(file_path) = path_opt {
        let path_buf = file_path.into_path().map_err(|e| e.to_string())?;
        let parent = path_buf
            .parent()
            .ok_or_else(|| "Ruta de exportación inválida.".to_string())?;
        if !parent.is_dir() {
            return Err("La carpeta de exportación no existe.".to_string());
        }
        let temporary = temporary_sibling(&path_buf, "partial")?;
        write_synced(&temporary, bytes)?;
        if let Err(error) = replace_synced(&temporary, &path_buf, None) {
            let _ = fs::remove_file(&temporary);
            return Err(error);
        }
        Ok(true)
    } else {
        Ok(false)
    }
}

fn decode_export_base64(base64_data: &str) -> Result<Vec<u8>, String> {
    decode_export_base64_with_limit(base64_data, MAX_EXPORT_BYTES)
}

fn decode_export_base64_with_limit(
    base64_data: &str,
    max_export_bytes: u64,
) -> Result<Vec<u8>, String> {
    let max_encoded = max_export_bytes
        .checked_add(2)
        .and_then(|value| value.checked_div(3))
        .and_then(|value| value.checked_mul(4))
        .ok_or_else(|| "El límite de exportación no es representable.".to_string())?;
    let encoded_len = u64::try_from(base64_data.len())
        .map_err(|_| "La longitud Base64 no es representable.".to_string())?;
    if encoded_len > max_encoded {
        return Err(format!(
            "La exportación Base64 supera el límite seguro de {} MiB antes de decodificarse.",
            max_export_bytes / MIB
        ));
    }
    let bytes = BASE64_STANDARD
        .decode(base64_data.as_bytes())
        .map_err(|_| "La exportación no contiene Base64 válido.".to_string())?;
    if bytes.len() as u64 > max_export_bytes {
        return Err(format!(
            "La exportación supera el límite seguro de {} MiB.",
            max_export_bytes / MIB
        ));
    }
    Ok(bytes)
}

#[tauri::command]
async fn native_save_file_base64(
    app: tauri::AppHandle,
    default_name: String,
    base64_data: String,
) -> Result<bool, String> {
    let bytes = decode_export_base64(&base64_data)?;
    save_file_bytes(app, default_name, &bytes)
}

fn main() {
    if let Some(exit_code) = run_pdf_worker_if_requested() {
        std::process::exit(exit_code);
    }
    tauri::Builder::default()
        .setup(|app| {
            let lock = initialize_storage(app.handle()).map_err(std::io::Error::other)?;
            app.manage(lock);
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            native_capabilities,
            load_app_state,
            load_app_state_candidates,
            promote_app_state_candidate,
            save_app_state,
            license_status,
            install_license,
            native_open_files,
            native_save_file_base64,
            close_application
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn close_application(app: tauri::AppHandle) {
    app.exit(0);
}
