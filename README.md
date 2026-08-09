# AnalizadorCualiUY Pro

Edición comercial independiente de AnalizadorCualiUY para Windows. Conserva el
procesamiento local y confidencial, pero utiliza identidad de aplicación,
almacenamiento, empaquetado y licencia propios.

## Estado

Base comercial inicial. El producto compila y mantiene las funciones de la
edición original, pero todavía no debe publicarse para venta hasta completar la
revisión legal, la auditoría de dependencias, la firma de código y la definición
del modelo de licencia indicados en `COMMERCIALIZATION.md`.

## Separación respecto de la edición original

- Producto: `AnalizadorCualiUY Pro`
- Identificador Tauri: `uy.santiago.analizadorcuali.pro`
- Paquete Node: `analizador-cuali-uy-pro`
- Binario Rust: `analizador_cuali_uy_pro`
- Datos instalados: `%LOCALAPPDATA%\uy.santiago.analizadorcuali.pro`
- Contrato: `EULA.txt`, mostrado por el instalador NSIS

La edición original no se modifica y ambas pueden coexistir sin compartir el
estado local.

## Desarrollo

Requisitos: Node.js 18 o superior, Rust stable con MSVC y las dependencias de
compilación de Tauri 2.

```powershell
npm ci
npm test
npx tauri dev
```

El servidor de desarrollo genera una raíz pública separada (`dist-dev`) y sólo
escucha en `127.0.0.1`. El build de Tauri siempre regenera `dist` mediante
`npm run build:frontend`, por lo que no reutiliza recursos web obsoletos.

## Beta web de evaluación

La fuente separada está en `web-beta` y la carpeta publicable se genera con:

```powershell
.\build-beta.ps1
```

El resultado queda en `dist-beta`. Esta edición limita el proyecto a 1
documento, 10.000 palabras y 4 categorías totales; conserva el análisis y el
guardado local, y exporta únicamente a PDF. El build comprueba que el paquete
público no conserve referencias a las exportaciones profesionales.

## Release comercial

```powershell
$env:ACUY_CERTIFICATE_THUMBPRINT = "THUMBPRINT_SHA1_DEL_CERTIFICADO"
$env:ACUY_TIMESTAMP_URL = "https://servidor-de-sello-de-tiempo.example"
.\build-release.ps1
```

El script crea un instalador, un ZIP portable con persistencia propia, los
avisos legales y un archivo de hashes SHA-256. Un release comercial se detiene
antes de compilar si no encuentra un certificado de firma de código vigente,
su clave privada o una URL de sello de tiempo. Antes de publicar, verifica la
firma, el certificado esperado y el sello temporal tanto del ejecutable como
del instalador. Para compilaciones internas sin certificado puede utilizarse
`-AllowUnsigned` explícitamente.

No contiene cobros ni cuentas. La edición Pro utiliza activación offline con un
archivo firmado Ed25519 y no consulta un servidor. La emisión, custodia de la
clave privada y recuperación se describen en `LICENSE-OPERATIONS.md`.

## Seguridad local

- Los proyectos importados se validan antes de incorporarse a la interfaz.
- Los permisos generales del sistema de archivos no están expuestos a la WebView.
- PDF, DOCX, TXT y JSON tienen presupuestos fijos conservadores y defensas de
  descompresión.
- Los proyectos se guardan fuera de `localStorage` mediante reemplazo atómico,
  sincronización y respaldo.
- Al actualizar, los archivos administrados se copian una sola vez desde la
  carpeta Roaming anterior a Local; el origen no se elimina ni se sobrescribe.
- La recuperación evalúa el estado primario y sus copias como proyectos, no
  sólo como JSON, y conserva intacto el candidato de respaldo validado.
- El código de dispositivo existente se conserva para no romper licencias y se
  protege con DPAPI de ámbito de equipo. Esto dificulta copiar la activación a
  otro equipo, aunque no sustituye un servidor de activación frente a un
  atacante con control local completo.
- Un bloqueo de archivo mantenido durante todo el proceso impide dos instancias
  simultáneas sobre el mismo estado.
- La exportación CSV neutraliza prefijos interpretables como fórmulas.

## Documentación legal incluida

- `EULA.txt`: contrato propuesto para usuario final.
- `PRIVACY.md`: funcionamiento local y responsabilidades sobre datos.
- `THIRD_PARTY_NOTICES.txt`: inventario reproducible y textos/atribuciones de
  licencias para las dependencias alcanzables del build Windows.
- `SBOM.cdx.json`: SBOM CycloneDX 1.5 generado desde los lockfiles y metadatos
  instalados; `npm run legal:check` bloquea el release si queda desactualizado.
- `SECURITY.md`: modelo de seguridad, límites y proceso de publicación.
- `legal/REVIEW-CHECKLIST.md`: datos y decisiones pendientes de validación.

Copyright © 2026 Prof. Esp. Santiago Hernández. Todos los derechos reservados.
