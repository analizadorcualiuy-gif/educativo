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
- Generar el inventario completo de dependencias y licencias transitivas.
- Firmar el instalador y el ejecutable con un certificado de firma de código.
- Desactivar herramientas de desarrollo en producción (ya configurado).
- Probar instalación, actualización, desinstalación y convivencia con la
  edición original en una máquina limpia.
- Crear una matriz de versiones y compatibilidad de proyectos.
- Definir canal de incidencias, recuperación de compras y entrega de versiones.
- Preparar términos de venta, comprobantes, impuestos y política de reembolsos
  compatibles con el canal y las normas de consumo aplicables.

## Licenciamiento técnico

Esta base no implementa claves ni activación. Para una primera venta manual de
bajo volumen puede emitirse un Documento de Compra nominativo y entregar el
instalador firmado. Si se agrega activación, conviene diseñar primero el modelo
de amenazas, el funcionamiento sin conexión, la recuperación de equipos y la
privacidad; la política deberá actualizarse antes de recopilar identificadores.

No conviene incorporar secretos permanentes, claves privadas ni credenciales de
pago dentro del cliente de escritorio.
