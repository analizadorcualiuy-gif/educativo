# Operación de licencias offline

La aplicación no consulta ningún servidor. La clave pública viaja dentro de
AnalizadorCualiUY Pro; la clave privada emisora permanece fuera del repositorio
y fuera de los paquetes entregados.

## Ubicación actual de la clave emisora

La clave privada está cifrada por Windows DPAPI para el usuario actual en:

`%LOCALAPPDATA%\AnalizadorCualiUY-LicenseAdmin\issuer.license-key`

No debe copiarse al repositorio, correo, nube sin cifrar ni instalador. DPAPI no
es por sí solo una copia de recuperación: perder el perfil o el equipo puede
impedir descifrarla.

## Crear la copia de recuperación obligatoria

Desde una consola privada, ejecutar:

```powershell
cargo run --manifest-path license-admin\Cargo.toml -- export-recovery `
  "$env:LOCALAPPDATA\AnalizadorCualiUY-LicenseAdmin\issuer.license-key" `
  "E:\RespaldoSeguro\AnalizadorCualiUY.issuer-recovery"
```

La herramienta pide dos veces una contraseña de al menos 14 caracteres y cifra
la semilla con Argon2id y AES-256-GCM. Guardar archivo y contraseña en lugares
separados. Probar una restauración en una cuenta/equipo controlado antes de
emitir licencias comerciales.

## Emitir una licencia

El comprador copia el código de dispositivo mostrado por la aplicación y lo
envía por el canal comercial. No debe enviar documentos. Para una licencia sin
vencimiento, ligada a ese código:

```powershell
cargo run --manifest-path license-admin\Cargo.toml -- issue `
  "$env:LOCALAPPDATA\AnalizadorCualiUY-LicenseAdmin\issuer.license-key" `
  ".\ACUY-2026-0001.acuy-license" `
  "ACUY-2026-0001" `
  "Nombre del titular" `
  "codigo-de-32-hexadecimal" `
  never
```

Para vencimiento se usa `AAAA-MM-DD`. Usar `*` en vez del código sólo cuando la
modalidad comercial autorice una licencia portable no ligada a instalación.
Los archivos `.acuy-license` están excluidos de Git.

Desde la versión 1.0.4, el código se conserva pero `device-id.txt` se protege
con DPAPI de ámbito de equipo. Una instalación anterior migra el código en texto
sin cambiarlo, de modo que las licencias emitidas siguen funcionando. Copiar la
carpeta a otro equipo ya no basta para clonar una activación; no obstante, al ser
un esquema totalmente offline, esto no reemplaza una activación de servidor
frente a un atacante con control local completo.

## Verificar antes de enviar

```powershell
cargo run --manifest-path license-admin\Cargo.toml -- verify `
  ".\ACUY-2026-0001.acuy-license" `
  ".\src-tauri\license-public-key.txt" `
  "codigo-de-32-hexadecimal"
```

Enviar únicamente el archivo `.acuy-license`. Mantener un registro separado de
ID, titular, modalidad, fecha y dispositivo para soporte y reemisiones.

## Restaurar la clave emisora

```powershell
cargo run --manifest-path license-admin\Cargo.toml -- restore-key `
  "E:\RespaldoSeguro\AnalizadorCualiUY.issuer-recovery" `
  "$env:LOCALAPPDATA\AnalizadorCualiUY-LicenseAdmin\issuer-restored.license-key" `
  ".\issuer-restored-public.txt"
```

Comparar la clave pública restaurada byte por byte con
`src-tauri/license-public-key.txt`. Una clave pública distinta no puede emitir
licencias aceptadas por las aplicaciones ya distribuidas.

## Limitaciones honestas

- Es control comercial para usuarios normales, no protección imposible de
  modificar por ingeniería inversa.
- Sin servidor no hay revocación inmediata ni recuperación automática.
- La fecha de vencimiento depende del reloj local y no resiste por completo un
  retroceso deliberado del sistema.
- La reasignación a otro dispositivo requiere emitir un archivo nuevo y
  documentar la anulación administrativa del anterior.
