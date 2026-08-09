#![cfg_attr(not(windows), allow(dead_code))]

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use analizador_license_core::{
    parse_public_key, public_key_base64, sign_license, verify_license, LicensePayload,
};
use argon2::Argon2;
use base64::{engine::general_purpose::STANDARD, Engine};
use ed25519_dalek::SigningKey;
use serde::{Deserialize, Serialize};
use std::{env, fs, path::Path};
use zeroize::Zeroize;

const RECOVERY_FORMAT: &str = "AnalizadorCualiUY.IssuerRecovery";

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct RecoveryEnvelope {
    format: String,
    version: u16,
    salt: String,
    nonce: String,
    ciphertext: String,
}

fn derive_recovery_key(password: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let mut key = [0_u8; 32];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| format!("No se pudo derivar la clave de recuperación: {e}"))?;
    Ok(key)
}

fn encrypt_recovery(secret: &[u8; 32], password: &str) -> Result<Vec<u8>, String> {
    if password.chars().count() < 14 {
        return Err("La contraseña de recuperación debe tener al menos 14 caracteres.".into());
    }
    let mut salt = [0_u8; 16];
    let mut nonce = [0_u8; 12];
    getrandom::fill(&mut salt).map_err(|e| e.to_string())?;
    getrandom::fill(&mut nonce).map_err(|e| e.to_string())?;
    let mut key = derive_recovery_key(password, &salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let nonce_value =
        Nonce::try_from(nonce.as_slice()).map_err(|_| "Nonce inválido.".to_string())?;
    let ciphertext = cipher
        .encrypt(&nonce_value, secret.as_ref())
        .map_err(|_| "No se pudo cifrar la recuperación.".to_string())?;
    key.zeroize();
    serde_json::to_vec_pretty(&RecoveryEnvelope {
        format: RECOVERY_FORMAT.into(),
        version: 1,
        salt: STANDARD.encode(salt),
        nonce: STANDARD.encode(nonce),
        ciphertext: STANDARD.encode(ciphertext),
    })
    .map_err(|e| e.to_string())
}

fn decrypt_recovery(raw: &[u8], password: &str) -> Result<[u8; 32], String> {
    let envelope: RecoveryEnvelope =
        serde_json::from_slice(raw).map_err(|e| format!("Recuperación inválida: {e}"))?;
    if envelope.format != RECOVERY_FORMAT || envelope.version != 1 {
        return Err("Formato de recuperación incompatible.".into());
    }
    let salt = STANDARD
        .decode(envelope.salt)
        .map_err(|_| "Salt Base64 inválido.".to_string())?;
    let nonce = STANDARD
        .decode(envelope.nonce)
        .map_err(|_| "Nonce Base64 inválido.".to_string())?;
    if salt.len() != 16 || nonce.len() != 12 {
        return Err("Parámetros de recuperación inválidos.".into());
    }
    let ciphertext = STANDARD
        .decode(envelope.ciphertext)
        .map_err(|_| "Cifrado Base64 inválido.".to_string())?;
    let mut key = derive_recovery_key(password, &salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let nonce_value =
        Nonce::try_from(nonce.as_slice()).map_err(|_| "Nonce inválido.".to_string())?;
    let plaintext = cipher
        .decrypt(&nonce_value, ciphertext.as_ref())
        .map_err(|_| "Contraseña incorrecta o recuperación alterada.".to_string())?;
    key.zeroize();
    plaintext
        .try_into()
        .map_err(|_| "La recuperación no contiene una clave Ed25519 válida.".into())
}

#[cfg(windows)]
fn protect(secret: &[u8]) -> Result<Vec<u8>, String> {
    use windows_sys::Win32::{
        Foundation::LocalFree,
        Security::Cryptography::{CryptProtectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB},
    };
    let input = CRYPT_INTEGER_BLOB {
        cbData: secret.len() as u32,
        pbData: secret.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };
    let ok = unsafe {
        CryptProtectData(
            &input,
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };
    if ok == 0 {
        return Err(format!(
            "DPAPI no pudo proteger la clave: {}",
            std::io::Error::last_os_error()
        ));
    }
    let result =
        unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec() };
    unsafe {
        LocalFree(output.pbData as *mut std::ffi::c_void);
    }
    Ok(result)
}

#[cfg(windows)]
fn unprotect(encrypted: &[u8]) -> Result<Vec<u8>, String> {
    use windows_sys::Win32::{
        Foundation::LocalFree,
        Security::Cryptography::{
            CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
        },
    };
    let input = CRYPT_INTEGER_BLOB {
        cbData: encrypted.len() as u32,
        pbData: encrypted.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };
    let ok = unsafe {
        CryptUnprotectData(
            &input,
            std::ptr::null_mut(),
            std::ptr::null(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };
    if ok == 0 {
        return Err(format!(
            "DPAPI no pudo abrir la clave: {}",
            std::io::Error::last_os_error()
        ));
    }
    let result =
        unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec() };
    unsafe {
        LocalFree(output.pbData as *mut std::ffi::c_void);
    }
    Ok(result)
}

#[cfg(not(windows))]
fn protect(_: &[u8]) -> Result<Vec<u8>, String> {
    Err("La herramienta administrativa sólo admite Windows.".into())
}
#[cfg(not(windows))]
fn unprotect(_: &[u8]) -> Result<Vec<u8>, String> {
    Err("La herramienta administrativa sólo admite Windows.".into())
}

fn write_new(path: &Path, bytes: &[u8]) -> Result<(), String> {
    if path.exists() {
        return Err(format!("{} ya existe; no se sobrescribió.", path.display()));
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    use std::io::Write;
    let mut file = fs::OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(path)
        .map_err(|e| e.to_string())?;
    file.write_all(bytes).map_err(|e| e.to_string())?;
    file.sync_all().map_err(|e| e.to_string())
}

fn load_signing_key(path: &Path) -> Result<SigningKey, String> {
    let encrypted =
        fs::read(path).map_err(|e| format!("No se pudo leer la clave protegida: {e}"))?;
    let secret = unprotect(&encrypted)?;
    let secret: [u8; 32] = secret
        .try_into()
        .map_err(|_| "La clave privada protegida tiene tamaño inválido.".to_string())?;
    Ok(SigningKey::from_bytes(&secret))
}

fn usage() -> String {
    "Uso:\n  analizador-license-admin init <clave-protegida> <clave-publica-salida>\n  analizador-license-admin issue <clave-protegida> <licencia-salida> <id> <titular> <device-id|*> <expira|never>\n  analizador-license-admin verify <licencia> <clave-publica> <device-id>\n  analizador-license-admin export-recovery <clave-protegida> <recuperacion-salida>\n  analizador-license-admin restore-key <recuperacion> <clave-protegida-salida> <clave-publica-salida>".into()
}

fn run() -> Result<(), String> {
    let args: Vec<String> = env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("init") if args.len() == 4 => {
            let mut seed = [0_u8; 32];
            getrandom::fill(&mut seed)
                .map_err(|e| format!("No se pudo obtener aleatoriedad segura: {e}"))?;
            let signing = SigningKey::from_bytes(&seed);
            write_new(Path::new(&args[2]), &protect(&seed)?)?;
            write_new(
                Path::new(&args[3]),
                format!("{}\n", public_key_base64(&signing)).as_bytes(),
            )?;
            seed.fill(0);
            println!("Clave creada. La clave privada quedó protegida por DPAPI y no se imprimió.");
            Ok(())
        }
        Some("issue") if args.len() == 8 => {
            let signing = load_signing_key(Path::new(&args[2]))?;
            let expiry = if args[7].eq_ignore_ascii_case("never") {
                None
            } else {
                Some(args[7].clone())
            };
            let payload = LicensePayload {
                license_id: args[4].clone(),
                holder: args[5].clone(),
                edition: "pro".into(),
                issued_at: analizador_license_core::today_utc().to_string(),
                expires_at: expiry,
                device_id: args[6].to_ascii_lowercase(),
                seats: 1,
            };
            let envelope = sign_license(payload, &signing)?;
            let json = serde_json::to_vec_pretty(&envelope).map_err(|e| e.to_string())?;
            write_new(Path::new(&args[3]), &json)?;
            println!("Licencia emitida en {}.", args[3]);
            Ok(())
        }
        Some("verify") if args.len() == 5 => {
            let raw = fs::read_to_string(&args[2]).map_err(|e| e.to_string())?;
            let public = fs::read_to_string(&args[3]).map_err(|e| e.to_string())?;
            let payload = verify_license(
                &raw,
                &parse_public_key(&public)?,
                &args[4],
                analizador_license_core::today_utc(),
            )?;
            println!(
                "Licencia válida: {} — {}",
                payload.license_id, payload.holder
            );
            Ok(())
        }
        Some("export-recovery") if args.len() == 4 => {
            let signing = load_signing_key(Path::new(&args[2]))?;
            let mut first =
                rpassword::prompt_password("Contraseña de recuperación (mínimo 14 caracteres): ")
                    .map_err(|e| e.to_string())?;
            let mut second =
                rpassword::prompt_password("Repita la contraseña: ").map_err(|e| e.to_string())?;
            if first != second {
                first.zeroize();
                second.zeroize();
                return Err("Las contraseñas no coinciden.".into());
            }
            let encrypted = encrypt_recovery(&signing.to_bytes(), &first)?;
            first.zeroize();
            second.zeroize();
            write_new(Path::new(&args[3]), &encrypted)?;
            println!(
                "Recuperación cifrada creada. Guárdela separada del equipo y de la contraseña."
            );
            Ok(())
        }
        Some("restore-key") if args.len() == 5 => {
            let raw = fs::read(&args[2]).map_err(|e| e.to_string())?;
            let mut password = rpassword::prompt_password("Contraseña de recuperación: ")
                .map_err(|e| e.to_string())?;
            let mut seed = decrypt_recovery(&raw, &password)?;
            password.zeroize();
            let signing = SigningKey::from_bytes(&seed);
            write_new(Path::new(&args[3]), &protect(&seed)?)?;
            write_new(
                Path::new(&args[4]),
                format!("{}\n", public_key_base64(&signing)).as_bytes(),
            )?;
            seed.zeroize();
            println!("Clave restaurada y protegida por DPAPI.");
            Ok(())
        }
        _ => Err(usage()),
    }
}

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recovery_round_trip_and_wrong_password_rejection() {
        let secret = [42_u8; 32];
        let encrypted = encrypt_recovery(&secret, "contraseña de prueba muy segura").unwrap();
        assert_eq!(
            decrypt_recovery(&encrypted, "contraseña de prueba muy segura").unwrap(),
            secret
        );
        assert!(decrypt_recovery(&encrypted, "contraseña totalmente incorrecta").is_err());
    }
}
