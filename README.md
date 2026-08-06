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
- Datos instalados: `%APPDATA%\AnalizadorCualiUY-Pro`
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

## Beta web de evaluación

La fuente separada está en `web-beta` y la carpeta publicable se genera con:

```powershell
.\build-beta.ps1
```

El resultado queda en `dist-beta`. Esta edición limita el proyecto a 2
documentos, 10.000 palabras y 4 categorías totales; conserva el análisis y el
guardado local, y exporta únicamente a PDF. El build comprueba que el paquete
público no conserve referencias a las exportaciones profesionales.

## Release comercial

```powershell
.\build-release.ps1
```

El script crea un instalador, un ZIP portable con persistencia propia, los
avisos legales y un archivo de hashes SHA-256. Un release comercial se detiene
si el instalador no tiene una firma Authenticode válida. Para compilaciones
internas sin certificado puede utilizarse `-AllowUnsigned` explícitamente.

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
- La exportación CSV neutraliza prefijos interpretables como fórmulas.

## Documentación legal incluida

- `EULA.txt`: contrato propuesto para usuario final.
- `PRIVACY.md`: funcionamiento local y responsabilidades sobre datos.
- `THIRD_PARTY_NOTICES.txt`: aviso inicial; requiere inventario transitivo antes
  del lanzamiento.
- `SECURITY.md`: modelo de seguridad, límites y proceso de publicación.
- `legal/REVIEW-CHECKLIST.md`: datos y decisiones pendientes de validación.

Copyright © 2026 Prof. Esp. Santiago Hernández. Todos los derechos reservados.
