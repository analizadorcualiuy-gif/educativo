# Prueba local de licencias Pro

La aplicación usa dos claves públicas distintas según el tipo de compilación:

- `debug` (`npx tauri dev`): usa `src-tauri/license-public-key-dev.txt`.
- `release` (`tauri build`): usa `src-tauri/license-public-key.txt`, que es la clave comercial.

La clave privada de desarrollo se creó localmente en `dev-secrets/` y está
excluida de Git. No debe enviarse al cliente ni incorporarse a un instalador.

## Emitir una licencia de prueba

1. Abrir la aplicación con `npx tauri dev`.
2. Copiar el código de dispositivo mostrado en el panel de licencia.
3. Desde otra consola, ubicada en la raíz de `AnalizadorCualiUY-Pro`, ejecutar:

```powershell
cargo run --manifest-path license-admin\Cargo.toml -- issue `
  ".\dev-secrets\issuer-dev.license-key" `
  ".\dev-secrets\prueba.acuy-license" `
  "DEV-2026-0001" `
  "Prueba local AnalizadorCualiUY" `
  "PEGAR-AQUI-EL-CODIGO-DE-32-CARACTERES" `
  never
```

4. Volver a la aplicación y pulsar **Instalar archivo de licencia**.
5. Seleccionar `dev-secrets\prueba.acuy-license`.

La licencia debe mostrar el titular y habilitar la edición Pro. Para probar el
rechazo por equipo, se puede emitir otra licencia usando un código diferente.

## Flujo que usará un comprador

El comprador no recibe `dev-secrets`, la clave privada ni herramientas Rust.

1. Instala la versión Pro.
2. Copia el código de dispositivo desde **Activar AnalizadorCualiUY Pro**.
3. Envía únicamente ese código al vendedor.
4. El vendedor emite un archivo `.acuy-license` con la clave comercial.
5. El comprador selecciona **Instalar archivo de licencia** y carga ese archivo.

No se envían documentos del usuario. La activación es offline y la licencia
queda asociada al dispositivo indicado, salvo que el vendedor emita una
licencia portable con `*`.
