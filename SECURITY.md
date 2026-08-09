# Seguridad de AnalizadorCualiUY Pro

## Modelo de seguridad

La aplicación procesa contenido local potencialmente no confiable. Los archivos
JSON, PDF, DOCX y TXT deben considerarse entradas externas incluso cuando los
abre voluntariamente el usuario.

La versión 1.0.4 aplica estas defensas:

- validación estructural y referencial de proyectos antes de mostrarlos;
- codificación contextual de texto y validación estricta de colores e IDs;
- CSP sin scripts inline y sin contenido remoto;
- WebView sin permisos generales de lectura o escritura del sistema de archivos;
- comandos nativos limitados a diálogos elegidos por el usuario y al archivo de
  estado interno de la aplicación;
- límites nativos fijos publicados al frontend mediante IPC;
- extracción PDF en un proceso hijo con timeout, límite de memoria de Windows y
  salida temporal acotada;
- respaldo local del estado anterior y neutralización de fórmulas CSV;
- recuperación semántica que no reemplaza el backup validado con un primary
  corrupto;
- bloqueo de instancia y protección DPAPI de ámbito de equipo para el código
  de dispositivo;
- rechazo temprano de releases comerciales sin certificado, sello temporal y
  firma Authenticode válida.

## Límites nativos

El backend admite como máximo 64 archivos por selección, 128 MiB por archivo,
256 MiB por lote, 128 MiB de texto extraído o estado y 64 MiB por exportación.
Son presupuestos de extremo a extremo, no una garantía de rendimiento. El
frontend consulta estos valores con `native_capabilities` para evitar límites
contradictorios.

## Protección de datos

Los proyectos instalados se guardan en
`%LOCALAPPDATA%\uy.santiago.analizadorcuali.pro` sin cifrado propio. Los archivos
administrados de instalaciones anteriores se copian desde Roaming sin borrar el
origen. Para corpus sensibles se recomienda
usar BitLocker o cifrado equivalente, cuentas de sistema separadas y respaldos
cifrados. La copia `.bak` contiene el estado anterior y debe protegerse igual
que el proyecto principal.

## Publicación y actualizaciones

Antes de cada publicación deben ejecutarse `npm test`, `npm audit`, `cargo test`
y un análisis RustSec mediante `cargo audit`. El instalador y el ejecutable deben
firmarse y publicarse junto con sus hashes SHA-256 desde el canal oficial.

Los reportes de seguridad deben enviarse de forma privada por el canal indicado
en el Documento de Compra. No deben incluir corpus reales ni datos personales.
