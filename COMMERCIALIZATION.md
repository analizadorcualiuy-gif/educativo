# Preparación para comercializar AnalizadorCualiUY Pro

## Decisiones de producto pendientes

1. Cliente inicial: profesional individual, institución educativa, consultora
   o una combinación con licencias diferenciadas.
2. Modalidad: licencia perpetua por versión, suscripción anual o compra con un
   año de actualizaciones.
3. Métrica: por usuario, dispositivo, equipo o institución/sede.
4. Canal de venta y facturación: sitio propio, distribuidor o marketplace.
5. Soporte incluido: canal, horarios, tiempo de respuesta y duración.
6. Política de actualizaciones, migración de proyectos y fin de soporte.

El EULA admite esas variantes mediante el “Documento de Compra”, pero la oferta
comercial debe elegirlas y expresarlas sin ambigüedad antes de cobrar.

## Controles antes del primer lanzamiento

- Completar la revisión de `legal/REVIEW-CHECKLIST.md` con asesoramiento local.
- Registrar y comprobar marca/nombre comercial y considerar el Registro de
  Software uruguayo.
- Archivar `SBOM.cdx.json` y `THIRD_PARTY_NOTICES.txt`; el gate comercial los
  regenera conceptualmente desde los lockfiles y rechaza versiones desactualizadas.
- Firmar el instalador y el ejecutable con un certificado de firma de código.
- Desactivar herramientas de desarrollo en producción (ya configurado).
- Probar instalación, actualización, desinstalación y convivencia con la
  edición original en una máquina limpia.
- Crear una matriz de versiones y compatibilidad de proyectos.
- Definir canal de incidencias, recuperación de compras y entrega de versiones.
- Preparar términos de venta, comprobantes, impuestos y política de reembolsos
  compatibles con el canal y las normas de consumo aplicables.

## Licenciamiento técnico

La edición Pro implementa licencias offline firmadas con Ed25519 y ligadas a un
identificador de equipo protegido con DPAPI. La clave privada sólo pertenece a
la herramienta administrativa; la aplicación distribuye únicamente la clave
pública. La operación, recuperación y rotación se documentan en
`LICENSE-OPERATIONS.md`. Antes de vender deben definirse la métrica comercial,
la recuperación de equipos y la política de privacidad aplicable.

No conviene incorporar secretos permanentes, claves privadas ni credenciales de
pago dentro del cliente de escritorio.
