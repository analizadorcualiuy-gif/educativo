# Aviso de privacidad — AnalizadorCualiUY Pro

Versión 1.0 — 5 de agosto de 2026

## Resumen

AnalizadorCualiUY Pro 1.0 funciona de manera local. No requiere una cuenta, no
incluye telemetría y no envía al licenciante los documentos, proyectos,
categorías, pasajes codificados ni estadísticas del usuario.

## Qué información trata la aplicación

La aplicación procesa los archivos que el usuario selecciona y el contenido que
incorpora a sus proyectos. El procesamiento y las exportaciones se realizan en
el dispositivo. La edición instalada guarda `state.json` y una copia de respaldo
`state.json.bak` en la carpeta privada de datos de la aplicación. La edición
portable, identificada por `portable.flag`, utiliza `data/state.json` junto al
ejecutable. Una instalación previa puede conservar temporalmente una copia en el
almacenamiento WebView hasta que la migración al archivo nativo se complete.

El licenciante no recibe esos datos mediante la aplicación. El sistema
operativo, el canal de compra, el medio de soporte o servicios externos que el
usuario utilice por separado pueden tener sus propias prácticas de privacidad.

## Responsabilidad del usuario

El usuario decide qué información incorpora y, por tanto, debe contar con las
autorizaciones o bases jurídicas aplicables, limitar el acceso al dispositivo,
proteger sus copias de respaldo y eliminar los archivos cuando corresponda.
Esto es especialmente importante para entrevistas, historias clínicas,
expedientes, datos de menores y otras categorías sensibles o confidenciales.

## Seguridad y conservación

Los proyectos no se cifran por sí mismos. La aplicación no sustituye BitLocker,
el cifrado del dispositivo ni una política de respaldo. La conservación depende
de los archivos y copias que administre el usuario. Desinstalar la aplicación
puede no eliminar el estado, sus respaldos ni exportaciones guardadas fuera de
la carpeta de instalación.

## Límites de recursos

Para reducir bloqueos ante archivos manipulados, la aplicación aplica límites
amplios calculados con la RAM física disponible. Admite hasta 128 archivos por
selección; el máximo por archivo se sitúa entre 256 MiB y 2 GiB, y el máximo del
lote entre 512 MiB y 4 GiB. La expansión de texto y el estado persistente tienen
topes dinámicos independientes. Alcanzar esos máximos no garantiza que otras
aplicaciones puedan coexistir sin presión de memoria.

## Cambios futuros

Si una versión futura incorpora activación en línea, cuentas, telemetría,
sincronización o soporte dentro de la aplicación, deberá publicarse un aviso
actualizado antes de tratar datos por esos medios.

Consultas: utilice el canal indicado en el Documento de Compra o sitio oficial.
