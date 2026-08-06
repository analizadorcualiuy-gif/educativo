use base64::{engine::general_purpose::STANDARD, Engine};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use time::{format_description::well_known::Iso8601, Date, OffsetDateTime};

pub const LICENSE_FORMAT: &str = "AnalizadorCualiUY.License";
pub const LICENSE_SCHEMA_VERSION: u16 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct LicensePayload {
    pub license_id: String,
    pub holder: String,
    pub edition: String,
    pub issued_at: String,
    pub expires_at: Option<String>,
    pub device_id: String,
    pub seats: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct LicenseEnvelope {
    pub format: String,
    pub schema_version: u16,
    pub payload: LicensePayload,
    pub signature: String,
}

fn parse_date(value: &str, field: &str) -> Result<Date, String> {
    Date::parse(value, &Iso8601::DATE)
        .map_err(|_| format!("{field} debe tener formato AAAA-MM-DD y ser una fecha válida."))
}

pub fn validate_payload(payload: &LicensePayload, today: Date) -> Result<(), String> {
    if payload.license_id.is_empty()
        || payload.license_id.len() > 80
        || !payload
            .license_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c))
    {
        return Err("Identificador de licencia inválido.".to_string());
    }
    let holder = payload.holder.trim();
    if holder.is_empty() || holder.chars().count() > 160 || holder.chars().any(char::is_control) {
        return Err("Titular de licencia inválido.".to_string());
    }
    if payload.edition != "pro" {
        return Err("La licencia no corresponde a la edición Pro.".to_string());
    }
    if payload.seats == 0 || payload.seats > 1000 {
        return Err("Cantidad de puestos inválida.".to_string());
    }
    if payload.device_id != "*"
        && (payload.device_id.len() != 32
            || !payload.device_id.chars().all(|c| c.is_ascii_hexdigit()))
    {
        return Err("Código de dispositivo inválido.".to_string());
    }
    let issued = parse_date(&payload.issued_at, "issued_at")?;
    if issued > today {
        return Err("La licencia tiene una fecha de emisión futura.".to_string());
    }
    if let Some(expires) = &payload.expires_at {
        let expiry = parse_date(expires, "expires_at")?;
        if expiry < issued {
            return Err("La expiración es anterior a la emisión.".to_string());
        }
        if expiry < today {
            return Err(format!("La licencia venció el {expires}."));
        }
    }
    Ok(())
}

pub fn today_utc() -> Date {
    OffsetDateTime::now_utc().date()
}

pub fn public_key_base64(signing_key: &SigningKey) -> String {
    STANDARD.encode(signing_key.verifying_key().to_bytes())
}

pub fn parse_public_key(value: &str) -> Result<VerifyingKey, String> {
    let bytes = STANDARD
        .decode(value.trim())
        .map_err(|_| "Clave pública Base64 inválida.".to_string())?;
    let bytes: [u8; 32] = bytes
        .try_into()
        .map_err(|_| "La clave pública debe tener 32 bytes.".to_string())?;
    VerifyingKey::from_bytes(&bytes).map_err(|_| "Clave pública Ed25519 inválida.".to_string())
}

pub fn sign_license(
    payload: LicensePayload,
    signing_key: &SigningKey,
) -> Result<LicenseEnvelope, String> {
    validate_payload(&payload, today_utc())?;
    let canonical = serde_json::to_vec(&payload).map_err(|e| e.to_string())?;
    let signature = signing_key.sign(&canonical);
    Ok(LicenseEnvelope {
        format: LICENSE_FORMAT.to_string(),
        schema_version: LICENSE_SCHEMA_VERSION,
        payload,
        signature: STANDARD.encode(signature.to_bytes()),
    })
}

pub fn verify_license(
    raw: &str,
    public_key: &VerifyingKey,
    device_id: &str,
    today: Date,
) -> Result<LicensePayload, String> {
    if raw.len() > 16 * 1024 {
        return Err("El archivo de licencia es demasiado grande.".to_string());
    }
    let envelope: LicenseEnvelope =
        serde_json::from_str(raw).map_err(|e| format!("Archivo de licencia inválido: {e}"))?;
    if envelope.format != LICENSE_FORMAT || envelope.schema_version != LICENSE_SCHEMA_VERSION {
        return Err("Formato o versión de licencia incompatible.".to_string());
    }
    validate_payload(&envelope.payload, today)?;
    let signature_bytes = STANDARD
        .decode(&envelope.signature)
        .map_err(|_| "Firma Base64 inválida.".to_string())?;
    let signature = Signature::from_slice(&signature_bytes)
        .map_err(|_| "Firma Ed25519 inválida.".to_string())?;
    let canonical = serde_json::to_vec(&envelope.payload).map_err(|e| e.to_string())?;
    public_key.verify(&canonical, &signature).map_err(|_| {
        "La firma de la licencia no es válida; el archivo pudo ser alterado.".to_string()
    })?;
    if envelope.payload.device_id != "*"
        && !envelope.payload.device_id.eq_ignore_ascii_case(device_id)
    {
        return Err("La licencia pertenece a otro dispositivo.".to_string());
    }
    Ok(envelope.payload)
}

#[cfg(test)]
mod tests {
    use super::*;
    use time::Month;

    fn date(year: i32, month: Month, day: u8) -> Date {
        Date::from_calendar_date(year, month, day).unwrap()
    }
    fn payload() -> LicensePayload {
        LicensePayload {
            license_id: "ACUY-0001".into(),
            holder: "Persona de prueba".into(),
            edition: "pro".into(),
            issued_at: "2026-08-06".into(),
            expires_at: None,
            device_id: "0123456789abcdef0123456789abcdef".into(),
            seats: 1,
        }
    }

    #[test]
    fn signed_license_verifies_only_for_its_device() {
        let signing = SigningKey::from_bytes(&[7_u8; 32]);
        let envelope = sign_license(payload(), &signing).unwrap();
        let raw = serde_json::to_string(&envelope).unwrap();
        let verified = verify_license(
            &raw,
            &signing.verifying_key(),
            &payload().device_id,
            date(2026, Month::August, 6),
        )
        .unwrap();
        assert_eq!(verified.holder, "Persona de prueba");
        assert!(verify_license(
            &raw,
            &signing.verifying_key(),
            "ffffffffffffffffffffffffffffffff",
            date(2026, Month::August, 6)
        )
        .is_err());
    }

    #[test]
    fn tampering_wrong_key_and_expiry_are_rejected() {
        let signing = SigningKey::from_bytes(&[8_u8; 32]);
        let mut envelope = sign_license(payload(), &signing).unwrap();
        envelope.payload.holder = "Titular alterado".into();
        let raw = serde_json::to_string(&envelope).unwrap();
        assert!(verify_license(
            &raw,
            &signing.verifying_key(),
            &payload().device_id,
            date(2026, Month::August, 6)
        )
        .is_err());

        let valid = serde_json::to_string(&sign_license(payload(), &signing).unwrap()).unwrap();
        let wrong = SigningKey::from_bytes(&[9_u8; 32]);
        assert!(verify_license(
            &valid,
            &wrong.verifying_key(),
            &payload().device_id,
            date(2026, Month::August, 6)
        )
        .is_err());

        let mut expired = payload();
        expired.expires_at = Some("2026-08-06".into());
        let raw = serde_json::to_string(&sign_license(expired, &signing).unwrap()).unwrap();
        assert!(verify_license(
            &raw,
            &signing.verifying_key(),
            &payload().device_id,
            date(2026, Month::August, 7)
        )
        .unwrap_err()
        .contains("venció"));
    }
}
