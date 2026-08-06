# Seguridad de AnalizadorCualiUY Pro

## Modelo de seguridad

La aplicación procesa contenido local potencialmente no confiable. Los archivos
JSON, PDF, DOCX y TXT deben considerarse entradas externas incluso cuando los
abre voluntariamente el usuario.

La versión 1.0 aplica estas defensas:

- validación estructural y referencial de proyectos antes de mostrarlos;
- codificación contextual de texto y validación estricta de colores e IDs;
- CSP sin scripts inline y sin contenido remoto;
- WebView sin permisos generales de lectura o escritura del sistema de archivos;
- comandos nativos limitados a diálogos elegidos por el usuario y al archivo de
  estado interno de la aplicación;
- límites de importación y expansión adaptados a la RAM física disponible;
- respaldo local del estado anterior y neutralización de fórmulas CSV;
- rechazo de releases comerciales sin firma Authenticode válida.

## Límites dinámicos

El backend admite como máximo 128 archivos por selección. Según la memoria
física disponible, el máximo por archivo varía entre 256 MiB y 2 GiB, el máximo
del lote entre 512 MiB y 4 GiB, y el texto extraído/estado entre 256 MiB y 2 GiB.
Estos son límites de seguridad, no una garantía de rendimiento.

## Protección de datos

Los proyectos se guardan sin cifrado propio. Para corpus sensibles se recomienda
usar BitLocker o cifrado equivalente, cuentas de sistema separadas y respaldos
cifrados. La copia `.bak` contiene el estado anterior y debe protegerse igual
que el proyecto principal.

## Publicación y actualizaciones

Antes de cada publicación deben ejecutarse `npm test`, `npm audit`, `cargo test`
y un análisis RustSec mediante `cargo audit`. El instalador y el ejecutable deben
firmarse y publicarse junto con sus hashes SHA-256 desde el canal oficial.

Los reportes de seguridad deben enviarse de forma privada por el canal indicado
en el Documento de Compra. No deben incluir corpus reales ni datos personales.
