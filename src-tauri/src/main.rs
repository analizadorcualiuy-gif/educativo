// Prevents additional console window on Windows in release builds, do NOT remove!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::fs::{self, OpenOptions};
use std::io::{Read, Seek, Write};
use std::path::{Path, PathBuf};
use tauri::Manager;

const MIB: u64 = 1024 * 1024;
const MAX_FILES_PER_SELECTION: usize = 64;
const MAX_EXPORT_BYTES: u64 = 256 * MIB;
const MAX_DOCX_ENTRIES: usize = 2_048;
const MAX_DOCX_TOTAL_UNCOMPRESSED: u64 = 512 * MIB;
const MAX_DOCX_EXPANSION_RATIO: u64 = 200;

#[derive(Clone, Copy)]
struct ImportLimits {
    per_file_bytes: u64,
    total_selection_bytes: u64,
    extracted_text_bytes: u64,
    state_bytes: u64,
}

#[cfg(windows)]
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
    let executable = std::env::current_exe().map_err(|e| e.to_string())?;
    let executable_dir = executable
        .parent()
        .ok_or_else(|| "No se pudo determinar la carpeta del ejecutable.".to_string())?;

    if executable_dir.join("portable.flag").is_file() {
        Ok(executable_dir.join("data").join("state.json"))
    } else {
        app.path()
            .app_data_dir()
            .map(|path| path.join("state.json"))
            .map_err(|e| e.to_string())
    }
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

fn get_or_create_device_id(app: &tauri::AppHandle) -> Result<String, String> {
    let path = device_id_path(app)?;
    if let Ok(existing) = fs::read_to_string(&path) {
        let existing = existing.trim().to_ascii_lowercase();
        if valid_device_id(&existing) {
            return Ok(existing);
        }
        return Err("El identificador local del dispositivo está dañado; no se regeneró para evitar invalidar una licencia existente.".to_string());
    }
    let parent = path
        .parent()
        .ok_or_else(|| "Ruta de dispositivo inválida.".to_string())?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let mut random = [0_u8; 16];
    getrandom::fill(&mut random)
        .map_err(|e| format!("No se pudo crear el código de dispositivo: {e}"))?;
    let device_id = random
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();
    let temporary = temporary_sibling(&path, "new")?;
    write_synced(&temporary, format!("{device_id}\n").as_bytes())?;
    replace_synced(&temporary, &path, None)?;
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
    let public_key =
        analizador_license_core::parse_public_key(include_str!("../license-public-key.txt"))?;
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
    let public_key =
        analizador_license_core::parse_public_key(include_str!("../license-public-key.txt"))?;
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

#[tauri::command]
fn load_app_state(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = state_file_path(&app)?;
    let limit = import_limits().state_bytes;
    let candidates = [
        path.clone(),
        temporary_sibling(&path, "new")?,
        temporary_sibling(&path, "bak")?,
        path.with_extension("json.bak"),
    ];
    let mut failures = Vec::new();
    for candidate in candidates {
        if !candidate.is_file() {
            continue;
        }
        let size = fs::metadata(&candidate).map_err(|e| e.to_string())?.len();
        if size > limit {
            failures.push(format!(
                "{} supera {} MiB",
                candidate.display(),
                limit / MIB
            ));
            continue;
        }
        match fs::read_to_string(&candidate) {
            Ok(raw) if serde_json::from_str::<serde_json::Value>(&raw).is_ok() => {
                return Ok(Some(raw))
            }
            Ok(_) => failures.push(format!("{} contiene JSON inválido", candidate.display())),
            Err(error) => failures.push(format!("{} no pudo leerse: {error}", candidate.display())),
        }
    }
    if failures.is_empty() {
        Ok(None)
    } else {
        Err(format!(
            "No se pudo recuperar el estado ni sus copias: {}",
            failures.join("; ")
        ))
    }
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
    serde_json::from_str::<serde_json::Value>(&project_json)
        .map_err(|e| format!("El proyecto no es JSON válido y no se guardó: {e}"))?;

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

#[cfg(test)]
mod tests {
    use super::{extract_docx_text_from_reader, replace_synced, temporary_sibling, write_synced};
    use std::fs;
    use std::io::{Cursor, Write};
    use zip::write::SimpleFileOptions;

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

        let result = pdf_extract::extract_text_from_mem(pdf.as_bytes()).unwrap();
        assert!(result.contains("Hola desde PDF"));
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
        let directory = std::env::temp_dir().join(format!(
            "analizador-cuali-uy-atomic-test-{}",
            std::process::id()
        ));
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
                "pdf" => {
                    let bytes =
                        fs::read(&path_buf).map_err(|e| format!("No se pudo leer {name}: {e}"))?;
                    let extracted = pdf_extract::extract_text_from_mem(&bytes)
                        .map_err(|e| format!("No se pudo extraer texto de {name}: {e}"))?;
                    if extracted.len() as u64 > limits.extracted_text_bytes {
                        return Err(format!(
                            "El texto extraído de {name} supera el límite de {} MiB.",
                            limits.extracted_text_bytes / MIB
                        ));
                    }
                    if extracted.trim().is_empty() {
                        return Err(format!(
                            "{name} no contiene texto extraible. Puede ser un PDF escaneado que requiere OCR."
                        ));
                    }
                    extracted
                }
                "txt" | "json" => {
                    let bytes =
                        fs::read(&path_buf).map_err(|e| format!("No se pudo leer {name}: {e}"))?;
                    String::from_utf8_lossy(&bytes).to_string()
                }
                _ => return Err(format!("Formato no compatible: .{ext}")),
            };

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
#[tauri::command]
async fn native_save_file(
    app: tauri::AppHandle,
    default_name: String,
    bytes: Vec<u8>,
) -> Result<bool, String> {
    use tauri_plugin_dialog::DialogExt;
    if bytes.len() as u64 > MAX_EXPORT_BYTES {
        return Err(format!(
            "La exportación supera el límite seguro de {} MiB.",
            MAX_EXPORT_BYTES / MIB
        ));
    }
    let ext = default_name
        .split('.')
        .last()
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
        write_synced(&temporary, &bytes)?;
        if let Err(error) = replace_synced(&temporary, &path_buf, None) {
            let _ = fs::remove_file(&temporary);
            return Err(error);
        }
        Ok(true)
    } else {
        Ok(false)
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_app_state,
            save_app_state,
            license_status,
            install_license,
            native_open_files,
            native_save_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
