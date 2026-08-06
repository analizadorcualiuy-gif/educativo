# Auditoría de preparación para publicación

**Producto:** AnalizadorCualiUY Beta y Pro  
**Fecha de corte:** 2026-08-06  
**Estado:** **NO PUBLICABLE / NO VENDIBLE**  
**Alcance:** funcionalidad, integridad de proyectos, seguridad, dependencias,
licencias de terceros, privacidad, distribución y obligaciones comerciales.

Este documento registra hallazgos técnicos verificables. No sustituye una
revisión jurídica, contable ni tributaria profesional.

## Resumen de evidencia positiva

- `npm test`: 36/36 pruebas aprobadas después de la remediación actual.
- `cargo test --locked`: 4/4 pruebas aprobadas.
- `npm audit`: 0 vulnerabilidades conocidas en el árbol npm.
- El build de la beta fue reproducible en dos ejecuciones: los 10 archivos de
  salida conservaron exactamente los mismos SHA-256.
- `dist-beta` no contiene las exportaciones profesionales conocidas.
- El ZIP portable Pro contiene únicamente seis archivos esperados y todos
  coinciden byte por byte con la carpeta portable.
- Los SHA-256 del instalador y del ZIP coinciden con `CHECKSUMS.txt`.
- No se localizaron telemetría, `fetch`, XHR, WebSocket, `eval` ni secretos
  incrustados en el código revisado.
- La aplicación Tauri tiene `devtools: false`, CSP local y una superficie de
  comandos nativos acotada.

Estas comprobaciones son necesarias, pero no compensan los bloqueadores que se
detallan a continuación.

## Bloqueadores de lanzamiento

### AUD-001 — Codificaciones huérfanas al eliminar una categoría padre

- **Estado de remediación:** **CORREGIDO Y PROBADO (2026-08-06).** La eliminación
  calcula el cierre transitivo de descendientes, elimina todas sus
  codificaciones y limpia el filtro activo. Regresión en
  `tests/project-integrity.test.mjs`.

- **Severidad:** crítica.
- **Afecta:** Beta y Pro.
- **Evidencia:** `app.js:876-878` y `web-beta/app.js:859-861` eliminan el padre
  y sus hijos inmediatos, pero filtran codificaciones solamente por el ID del
  padre.
- **Impacto:** una codificación de una subcategoría eliminada permanece en el
  proyecto. El siguiente proceso de validación puede rechazar el proyecto por
  referencia a una categoría inexistente.
- **Cierre exigido:** eliminación transitiva segura o estrategia explícita de
  reasignación; prueba automática con padre, hijo, nieto y codificaciones en
  todos los niveles; guardar y volver a cargar el resultado.

### AUD-002 — El editor permite una categoría como su propio padre

- **Estado de remediación:** **CORREGIDO Y PROBADO (2026-08-06).** El selector
  excluye la categoría editada, sólo permite padres principales y la operación
  completa se valida antes de mutar el estado. Hay pruebas de autorreferencia,
  ciclos y profundidad máxima.

- **Severidad:** crítica.
- **Afecta:** Beta y Pro.
- **Evidencia:** `app.js:2609` y `web-beta/app.js:2583` asignan el valor del
  selector sin impedir que coincida con la categoría editada. El validador de
  carga sí rechaza posteriormente ese estado.
- **Impacto:** la interfaz puede producir un proyecto que luego no puede abrir.
- **Cierre exigido:** excluir descendientes y la propia categoría del selector,
  validar antes de mutar, detectar ciclos completos y probar guardar/recargar.

### AUD-003 — Importador PDF engañoso o no funcional en la beta

- **Estado de remediación:** **CORREGIDO EN EL NÚCLEO Y PROBADO
  (2026-08-06).** La Beta usa la distribución oficial fijada de PDF.js
  6.2.108, worker y recursos locales; los hashes se comparan con npm. Se probó
  extracción comprimida, multipágina y Unicode. Continúa pendiente QA de PDF
  protegido, escaneado y corpus real en navegadores publicados.

- **Severidad:** crítica.
- **Afecta:** Beta.
- **Evidencia:** `web-beta/public/vendor/pdf.min.js` es un extractor artesanal
  de aproximadamente 2 KB que busca operadores de texto simples; no es PDF.js.
  La interfaz anuncia PDF como formato soportado.
- **Impacto:** PDF comprimidos, con fuentes embebidas o estructuras normales
  pueden producir texto incompleto o ilegible. Existe además una inconsistencia
  de procedencia/atribución si el componente se presenta como PDF.js.
- **Cierre exigido:** integrar una distribución auténtica y fijada de PDF.js,
  con worker, hashes y licencia, o retirar PDF de la beta. Probar PDF simple,
  comprimido, multipágina, Unicode, protegido y escaneado.

El mismo archivo de 2 KB también se copia a `dist/public/vendor/pdf.min.js` y
queda dentro del binario Pro. En la ejecución Tauri el texto PDF se extrae en
Rust, pero JavaScript exige que `window.pdfjsLib` exista incluso para entrar en
esa rama. Debe desacoplarse el importador nativo del fallback web y excluirse del
paquete Pro cualquier parser que no sea necesario.

### AUD-004 — Auditoría RustSec fallida

- **Estado de remediación:** **CORREGIDO Y PROBADO (2026-08-06).** Se eliminó
  `calamine` no utilizado, se actualizó el extractor a `quick-xml 0.41`, el
  lockfile ya no contiene 0.31 y RustSec actualizado devuelve cero
  vulnerabilidades; las pruebas Rust aprueban 4/4.

- **Severidad:** crítica para lanzamiento.
- **Afecta:** Pro.
- **Evidencia:** `cargo audit --json` identifica en `quick-xml 0.31.0`:
  RUSTSEC-2026-0194 y RUSTSEC-2026-0195, ambas de denegación de servicio. La
  versión corregida indicada es `>= 0.41`.
- **Impacto:** aunque las rutas vulnerables no aparecen directamente en el
  código propio inspeccionado, el gate de dependencias no es aprobable.
- **Cierre exigido:** actualizar o eliminar la dependencia, ejecutar pruebas de
  importación y obtener `cargo audit` sin vulnerabilidades aplicables al target
  Windows.

### AUD-005 — Artefactos comerciales sin firma

- **Severidad:** crítica para distribución comercial.
- **Afecta:** Pro.
- **Evidencia:** Authenticode devuelve `NotSigned` para instalador y portable;
  `certificateThumbprint` es nulo y `timestampUrl` está vacío.
- **Impacto:** no se acredita editor ni integridad, y Windows puede advertir al
  usuario. Un checksum publicado junto al binario no reemplaza una firma.
- **Cierre exigido:** certificado de firma de código, sello de tiempo confiable,
  firma del instalador y ejecutable, y verificación Authenticode válida en una
  máquina limpia.

### AUD-006 — Sin línea base de control de versiones

- **Severidad:** crítica de proceso e integridad.
- **Afecta:** todo el producto.
- **Evidencia:** el repositorio Git no tiene `HEAD`; todos los archivos aparecen
  sin seguimiento.
- **Impacto:** no existe procedencia histórica, rollback, comparación fiable ni
  vínculo entre fuente y versión distribuida.
- **Cierre exigido:** revisar exclusiones, crear commit base limpio, etiquetar
  versiones y generar cada artefacto desde un commit identificable.

### AUD-007 — Avisos de terceros incompletos

- **Severidad:** alta y bloqueante para venta.
- **Afecta:** Beta y Pro.
- **Evidencia:** 41 paquetes npm únicos y 294 dependencias Rust para Windows;
  `THIRD_PARTY_NOTICES.txt` reconoce que su inventario inicial no está completo.
- **Impacto:** posible incumplimiento de avisos, reproducción de licencias y
  obligaciones de componentes incorporados.
- **Cierre exigido:** SBOM reproducible, inventario por nombre/versión/licencia,
  textos requeridos, resolución de licencias compuestas y revisión del paquete
  final, no sólo de los manifiestos.

### AUD-008 — No existe control técnico de licencia Pro

- **Severidad:** alta comercial.
- **Afecta:** Pro.
- **Evidencia:** existe EULA, pero no activación, archivo de licencia, firma
  criptográfica ni comprobador nativo.
- **Impacto:** el ejecutable completo puede copiarse y utilizarse informalmente.
- **Cierre exigido:** licencia firmada asimétricamente y verificable sin conexión;
  clave privada fuera de la aplicación y del repositorio; pruebas de alteración,
  expiración si aplica, cambio de dispositivo y recuperación legítima.

## Riesgos altos que requieren corrección

### AUD-009 — Complejidad cuadrática y proyectos manipulados

**Estado de remediación:** **PARCIAL.** Los presupuestos nativos se redujeron a
valores conservadores y la exportación tiene tope, pero todavía deben indexarse
los recorridos O(n²), ejecutarse fuera del hilo UI y medirse con corpus límite.

Los cálculos de relaciones y solapamientos contienen recorridos anidados. Los
límites de hasta 100.000 codificaciones en beta y 1.000.000 en Pro no protegen
frente al coste O(n²). Un JSON válido pero hostil puede congelar la interfaz y
provocar pérdida de trabajo no guardado.

**Cierre:** límites basados en coste, algoritmos por barrido/índices, ejecución
cancelable y pruebas de rendimiento con umbrales de tiempo y memoria.

### AUD-010 — Riesgo de descompresión DOCX

**Estado de remediación:** **CORREGIDO Y PROBADO (2026-08-06).** El extractor
limita entradas, suma descomprimida, salida y ratio de expansión; una prueba
adversarial segura verifica el rechazo previo.

El tamaño comprimido se comprueba antes de usar Mammoth, pero el límite de
palabras se aplica después de la expansión. Un DOCX pequeño puede expandirse a
un volumen muy grande.

**Cierre:** límites de entradas ZIP, tamaño descomprimido, cantidad de entradas,
ratio de expansión y tiempo; pruebas con archivos adversariales seguros.

### AUD-011 — Jerarquías y citas sin integridad semántica completa

- **Estado de remediación:** **CORREGIDO Y PROBADO (2026-08-06).** El núcleo
  compartido valida ciclos/profundidad, rechaza rangos vacíos y deriva siempre
  `quoteText` del documento y sus offsets. Los solapamientos usan segmentación
  por límites; la inspección visual final sigue cubierta por AUD-021/AUD-023.

- Sólo se impide padre inexistente o autorreferencia directa; no ciclos de varios
  nodos ni profundidad excesiva.
- `quoteText` importado no se compara con
  `document.content.slice(startChar, endChar)`.
- Las codificaciones superpuestas parecen repetir el intervalo compartido al
  renderizarse de forma secuencial.

**Cierre:** invariantes transitivas, normalización/verificación de citas y casos
de prueba para solapamientos parciales, anidados e idénticos.

### AUD-012 — Encabezados de seguridad web ausentes

**Estado de remediación:** **CONFIGURADO; DESPLIEGUE PENDIENTE.** La Beta lleva
CSP en HTML y `_headers` con CSP, `nosniff`, referrer, permissions y denegación
de framing. Debe comprobarse la respuesta de la URL HTTPS real porque el
servidor puede ignorar esa configuración.

La CSP de Tauri no se traslada automáticamente al sitio beta. No se encontró
configuración publicable de CSP, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy` ni `frame-ancestors`.

**Cierre:** configuración específica del proveedor de hosting y comprobación
sobre la URL HTTPS realmente desplegada.

### AUD-013 — Privacidad incompleta para la beta y el canal comercial

**Estado de remediación:** **PARCIAL.** Se añadió aviso Beta enlazado con
almacenamiento local sin cifrado, logs de hosting, correo comercial, derechos y
contacto. Faltan identificar proveedor de alojamiento, plazos internos reales
y formalizar el procedimiento operativo de solicitudes.

La beta conserva el corpus completo en `localStorage`, sin cifrado ni advertencia
destacada sobre equipos compartidos, limpieza del navegador o recuperación. El
aviso Pro no cubre por sí solo el sitio, logs del alojamiento, correos de
interesados ni registros de clientes.

**Cierre:** aviso web propio, responsable y contacto, finalidades, conservación,
derechos, proveedores y transferencias pertinentes; mecanismo para ejercer los
derechos y política operativa para el correo comercial.

### AUD-014 — Artefactos ambiguos en el directorio de entrega

En la raíz conviven `AnalizadorCualiUY-Setup.exe` y
`AnalizadorCualiUY-Portable.zip` antiguos con los artefactos Pro versionados.

**Cierre:** directorio de release vacío y generado desde cero, manifiesto de
archivos permitido y publicación automática que rechace extras.

### AUD-015 — Guardado automático no transaccional

**Estado de remediación:** **CORREGIDO EN CÓDIGO Y PROBADO.** Windows usa
`ReplaceFileW` con `WRITE_THROUGH` y respaldo obligatorio; temporales se
sincronizan, la carga intenta principal, `.new` y respaldos JSON válidos, y el
cierre espera la cola de autoguardado. Hay prueba del reemplazo/respaldo;
continúa pendiente QA de fallos físicos y cierre real de WebView2.

- `save_app_state` intenta copiar `state.json` a `state.json.bak`, pero ignora
  cualquier error de esa copia y después elimina el estado anterior.
- El reemplazo no incluye `flush`/`sync_all`; un corte de energía puede dejar
  estado y metadatos sin persistir aunque la llamada haya regresado.
- Si el renombrado de `.new` falla después de borrar el original, la aplicación
  devuelve un error, pero el archivo principal ya no existe y el respaldo puede
  no haberse creado.
- En JavaScript, el autoguardado se difiere 150 ms y no existe un manejador de
  cierre que fuerce o espere la última escritura. Una edición seguida de cierre
  inmediato puede perderse.

**Cierre:** protocolo de reemplazo atómico por plataforma, error obligatorio si
falla el respaldo, sincronización de archivo/directorio, recuperación de `.new`
y `.bak`, flush al cerrar y pruebas de fallos inyectados en cada paso.

### AUD-016 — Exportación nativa sin límites ni reemplazo seguro

**Estado de remediación:** **PARCIAL.** Se añadió tope de 256 MiB y escritura
sincronizada a hermano temporal con reemplazo atómico. La copia múltiple
Blob→IPC→Rust permanece y exige rediseño streaming si se admiten exportaciones
mayores.

`native_save_file` recibe `Vec<u8>` sin límite. El contenido ya existe como
`Blob`, se convierte a `Array`, cruza IPC y vuelve a materializarse en Rust. Una
exportación grande puede multiplicar el consumo de RAM. Además, `fs::write`
trunca directamente un archivo existente: disco lleno, cierre o error de E/S
pueden dejar una exportación parcial.

**Cierre:** límite explícito de exportación, transferencia binaria o temporal
eficiente, escritura en archivo hermano temporal y reemplazo atómico; probar
cancelación, poco espacio y reemplazo de un archivo existente.

### AUD-017 — Límites “según RAM” demasiado amplios para IPC y UI

**Estado de remediación:** **CORREGIDO EN CONFIGURACIÓN; ESTRÉS PENDIENTE.** Se
eliminaron límites dinámicos de GiB: 128 MiB por archivo/texto/estado, 256 MiB
por lote/exportación y 64 archivos. Falta validar tiempos y picos en el mínimo
de RAM soportado.

Los límites Pro admiten hasta 2 GiB por archivo, 4 GiB por selección y 2 GiB de
texto/estado. Esos valores no consideran copias simultáneas durante lectura,
UTF-8/UTF-16, serialización JSON ni transporte IPC. Pueden agotar memoria mucho
antes de alcanzar el supuesto límite seguro.

**Cierre:** presupuestos conservadores medidos de extremo a extremo, streaming
cuando sea viable, límites por formato y pruebas de estrés en el mínimo de RAM
oficialmente soportado.

### AUD-018 — El proceso de release no aplica los gates de calidad

**Estado de remediación:** **PARCIAL.** El script exige commit limpio, etiqueta
comercial exacta, `npm ci`, pruebas, auditorías npm/RustSec para Windows, Cargo
bloqueado, firma y directorio de salida con lista permitida. El canal sin firma
queda rotulado `internal-unsigned`. Siguen faltando SBOM/licencias completos y
un commit/tag base existente.

`build-release.ps1` no ejecuta `npm test`, `cargo test`, `npm audit` ni
`cargo audit`; tampoco comprueba un commit/tag limpio, SBOM, avisos legales o
QA del paquete. Sólo ejecuta `npm ci` cuando `node_modules` no existe, de modo
que una carpeta instalada previamente puede no representar exactamente el
lockfile. `tauri build` tampoco usa explícitamente `--locked`.

Las pruebas de seguridad actuales son en gran parte aserciones sobre patrones
de texto. Pueden aprobar aunque el flujo ejecutado sea incorrecto, como ocurre
con eliminación de categorías, jerarquías y el falso lector PDF.

**Cierre:** pipeline fail-closed desde un checkout limpio, instalación bloqueada,
pruebas de comportamiento, auditorías, inventario de licencias, build, firma y
verificación del contenido final. `-AllowUnsigned` debe quedar reservado a un
canal interno inequívoco que no produzca artefactos confundibles con releases.

### AUD-019 — Presentación y aceptación de términos no demostrable

- Tauri configura `EULA.txt` como `licenseFile`, pero la pantalla del instalador
  no pudo verificarse visualmente en este entorno.
- En el portable, el botón “Ver EULA” sólo muestra una alerta que remite al
  archivo; no abre ni presenta su contenido.
- La beta distribuye `BETA-LICENSE.txt`, pero la interfaz no lo enlaza ni registra
  una aceptación. El aviso visible resume evaluación y privacidad, no todos los
  términos.
- El EULA remite al canal de compra para contacto y modalidad, pero el producto
  por sí solo no identifica el correo real ni un documento de compra concreto.

**Cierre:** términos accesibles antes de descargar/comprar y desde la app,
versionados con hash; aceptación verificable cuando corresponda; comprobación
visual del instalador; identidad, correo, modalidad, precio, soporte, devolución
y retracto informados sin depender de documentos hipotéticos.

### AUD-020 — Una selección repetida se asigna a la primera coincidencia

- **Estado de remediación:** **CORREGIDO Y PROBADO (2026-08-06).** La selección
  se convierte desde el `Range` DOM y los offsets `data-text-start/end`; no se
  vuelve a buscar por contenido. La regresión cubre la segunda aparición y el
  resaltado anidado de búsqueda F3.

- **Severidad:** crítica de integridad metodológica.
- **Afecta:** Beta y Pro.
- **Evidencia:** al crear una codificación manual se usa
  `fullText.indexOf(selectedText)` (`app.js:1815` y
  `web-beta/app.js:1793`). Si el fragmento seleccionado
  aparece varias veces, `indexOf` devuelve siempre la primera posición.
- **Impacto:** el usuario puede seleccionar la segunda o tercera aparición, pero
  la evidencia queda vinculada a otra zona del documento. Relaciones por
  ventana, solapamientos, navegación y exportación parten entonces de una
  ubicación falsa.
- **Cierre exigido:** transformar el `Range` DOM en offsets documentales reales,
  sin buscar por contenido; probar texto repetido, Unicode, saltos de párrafo y
  selecciones que atraviesen marcas existentes.

### AUD-021 — Solapamientos representados de forma contradictoria

- **Estado de remediación:** **CORREGIDO EN CÓDIGO; QA VISUAL PENDIENTE
  (2026-08-06).** Pantalla y fallback HTML segmentan el texto una sola vez y
  conservan todas las categorías mediante bandas. DOCX conserva cada fragmento
  una vez y agrega una anotación explícita de solapamiento. Las pruebas cubren
  intervalos parciales y anidados; falta inspección en aplicaciones reales.

- **Severidad:** alta de exactitud.
- **Afecta:** Beta y Pro.
- **Evidencia:** la vista y el fallback HTML/PDF agregan cada intervalo completo
  aunque empiece antes del cursor actual, repitiendo el tramo compartido. El
  exportador DOCX usa `start = max(cursor, coding.startChar)`, por lo que una
  codificación completamente anidada puede desaparecer visualmente.
- **Impacto:** el documento mostrado/exportado puede no conservar el texto
  original una sola vez ni mostrar todas las categorías aplicadas.
- **Cierre exigido:** segmentación por todos los límites de intervalos y
  representación explícita de múltiples categorías por segmento; pruebas de
  igualdad del texto reconstruido y de conservación de todas las etiquetas.

### AUD-022 — La exportación PDF pierde texto fuera de WinAnsi

- **Estado de remediación:** **CORREGIDO Y PROBADO (2026-08-06).** PDF-lib y
  fontkit incrustan Liberation Sans y la extracción de regresión conserva
  español, griego y cirílico. Árabe/hebreo (bidi), CJK y emoji no se corrompen
  silenciosamente: se rechazan con indicación de usar DOCX o retirar esos
  glifos. Las licencias y hashes de librería/fuentes se verifican.

- **Severidad:** alta de integridad documental.
- **Afecta:** Beta y Pro, en informes generados por `pdf-report.js`.
- **Evidencia:** el generador usa Helvetica con `/WinAnsiEncoding` y `pdfString`
  convierte caracteres superiores a 255 que no estén en su tabla CP-1252 a
  `?`. Una prueba con `中文 Ελληνικά العربية 😀` produjo 19 signos de
  interrogación en el stream PDF.
- **Impacto:** corpus, citas, categorías o memos multilingües se alteran
  silenciosamente en el resultado exportado.
- **Cierre exigido:** fuente Unicode embebida con mapeo CID/ToUnicode o una
  biblioteca PDF que lo implemente; pruebas de extracción y renderizado con
  español, portugués, cirílico, griego, árabe, CJK y emoji, definiendo de forma
  explícita qué scripts se soportan.

### AUD-023 — Diálogos y flujos principales no son accesibles

- **Estado de remediación:** **PARCIAL.** Los diálogos reciben rol, nombre,
  modalidad, foco inicial, trampa Tab, Escape y restauración de foco. Faltan
  alternativa navegable completa del canvas, contraste, lector de pantalla y
  auditoría WCAG 2.2 AA real.

- **Severidad:** media-alta de usabilidad y publicación.
- **Afecta:** Beta y Pro.
- **Evidencia estática:** los documentos contienen numerosos modales y entre 50
  y 59 botones, pero sólo una función ARIA sustantiva, correspondiente al
  `canvas`; no hay `role="dialog"`, `aria-modal`, `aria-labelledby`, `tabindex`
  de gestión ni manejador general de `Escape`.
- **Impacto:** el foco puede permanecer detrás del modal, un lector de pantalla
  no recibe su contexto y el usuario de teclado no tiene cierre/restauración de
  foco predecibles. El grafo en canvas tiene etiqueta general, pero no una
  alternativa navegable con sus nodos y relaciones.
- **Cierre exigido:** patrón de diálogo accesible completo, nombres accesibles en
  botones iconográficos, foco inicial/atrapado/restaurado, `Escape`, navegación
  de resultados y alternativa tabular al canvas; auditoría WCAG 2.2 AA con
  teclado, lector de pantalla y contraste sobre las dos temáticas.

### AUD-024 — Promesas de confidencialidad y límites requieren precisión

- **Estado de remediación:** **PARCIAL.** Se sustituyó “100% Local &
  Confidencial” por la afirmación comprobable de procesamiento local y no
  transmisión; el aviso explica almacenamiento sin cifrado. Los límites siguen
  siendo segmentación comercial cliente, no DRM, y debe documentarse la regla
  exacta de conteo de palabras/caracteres.

- La interfaz afirma “100% Local & Confidencial”. Está demostrado que el código
  revisado no envía el corpus al licenciante, pero “confidencial” puede
  interpretarse como una garantía de seguridad que no existe: `localStorage`,
  `state.json`, `.bak` y exportaciones no tienen cifrado propio.
- El límite beta de 10.000 “palabras” cuenta secuencias separadas por espacios.
  Un texto sin espacios puede alcanzar hasta 10 MiB y contar como una palabra;
  además, al ser JavaScript público, una persona determinada puede retirar los
  límites. La restricción sirve para segmentación comercial casual, no como DRM.

**Cierre:** sustituir absolutos por una descripción comprobable (“procesamiento
local; la app no transmite tus documentos”), mostrar las limitaciones de
almacenamiento y definir palabra/caracteres. Mantener las funciones Pro fuera del
bundle beta y no presentar los límites cliente como una protección inviolable.

### AUD-025 — La unidad “párrafo” cambia según el formato importado

- **Estado de remediación:** **PARCIAL (2026-08-06).** El extractor DOCX nativo
  conserva ahora cada `<w:p>` como separación inequívoca de línea en blanco y
  las pruebas Rust/Analytics impiden la falsa coocurrencia reproducida. Aún debe
  documentarse y probarse la política aproximada para PDF y TXT.

- **Severidad:** crítica de validez analítica.
- **Afecta:** principalmente Pro nativo; potencialmente cualquier TXT/PDF con
  saltos simples.
- **Evidencia:** el extractor DOCX Rust añade un solo `\n` al cerrar cada `<w:p>`.
  `analytics.js:15` sólo separa párrafos mediante `\n\s*\n`. Por tanto, varios
  párrafos Word consecutivos pueden convertirse en una única unidad analítica.
- **Impacto:** en modo de coocurrencia por párrafo, categorías situadas en
  párrafos diferentes pueden contarse como relacionadas. Los resultados pueden
  variar por formato o por ruta de importación del mismo contenido.
- **Cierre exigido:** preservar límites estructurales de párrafo mediante una
  representación inequívoca o metadatos de spans; normalizar TXT/PDF con una
  política documentada; pruebas equivalentes del mismo corpus en TXT, DOCX y PDF
  que produzcan las mismas unidades y métricas cuando su estructura sea igual.

### AUD-026 — Jaccard inválido en el modo por ventana

- **Estado de remediación:** **CORREGIDO Y PROBADO (2026-08-06).** El conteo de
  pares próximos queda separado. Jaccard por ventana se calcula sobre la
  intersección/unión de regiones textuales ampliadas, por documento; las pruebas
  garantizan rango `[0,1]` en el caso que antes producía 300 % y 0 %.

- **Severidad:** crítica de validez estadística.
- **Afecta:** Beta y Pro.
- **Evidencia:** para `unit === 'window'`, `count` es la cantidad de pares
  A×B próximos, pero `unitsA` y `unitsB` son cantidades de codificaciones. Se
  calcula después `count / (unitsA + unitsB - count)`, mezclando magnitudes que
  no representan conjuntos comparables.
- **Reproducción:** con dos codificaciones A y dos B, una ventana de 5 produjo
  `count=3, jaccard=3` (300 %); una ventana de 100 produjo `count=4,
  jaccard=0` porque el denominador quedó en cero.
- **Impacto:** matriz, grafo, ranking y reportes pueden mostrar asociaciones
  matemáticamente imposibles o invertir su fuerza al ampliar la ventana.
- **Cierre exigido:** definir formalmente la unidad/conjunto para proximidad;
  separar “cantidad de pares próximos” de una métrica normalizada apropiada;
  garantizar rango [0,1], simetría y monotonicidad pertinente mediante pruebas
  de propiedades y casos conocidos revisados metodológicamente.

### AUD-027 — Formato de proyecto sin versión ni migraciones

- **Estado de remediación:** **CORREGIDO Y PROBADO (2026-08-06).** Los nuevos
  proyectos usan `AnalizadorCualiUY.Project`, `schemaVersion: 1`, edición y
  versión creadora. Los proyectos heredados sin sobre siguen abriendo y se
  migran al próximo guardado; los esquemas futuros o formatos ajenos se rechazan.
  Autoguardado y exportación manual comparten el mismo payload canónico.

- **Severidad:** alta de compatibilidad e integridad futura.
- **Afecta:** Beta y Pro.
- **Evidencia:** el guardado manual serializa `state` directamente y el
  autoguardado serializa un subconjunto, pero ninguno incorpora `schemaVersion`,
  edición creadora, versión mínima/máxima compatible ni checksum lógico.
- **Impacto:** una actualización puede rechazar proyectos previos, descartar
  campos silenciosamente o interpretar un mismo campo con otra semántica. No se
  puede aplicar una migración determinista ni informar compatibilidad antes de
  modificar el estado.
- **Cierre exigido:** sobre de proyecto versionado, migraciones puras y
  encadenadas, rechazo seguro de versiones futuras, copia previa a migración y
  corpus de fixtures de cada versión soportada. El JSON manual y el autoguardado
  deben compartir el mismo esquema canónico.

## Riesgos medios y menores

- La salida declarada como sólo PDF conserva una ruta HTML de respaldo.
- Los `ObjectURL` de descargas no se revocan después de usarse.
- La coincidencia de autocodificación puede encontrar términos dentro de otras
  palabras, afectando la calidad metodológica.
- El respaldo `.bak` existe, pero no hay recuperación automática guiada.
- Estado y respaldo Pro no están cifrados en disco.
- El correo público de contacto puede recibir spam y suplantaciones.
- No fue posible ejecutar QA visual/interactivo porque el entorno de auditoría
  no tenía un navegador disponible. Esta evidencia permanece pendiente.

## Consideraciones legales y comerciales pendientes

Antes de cobrar de forma habitual deben confirmarse, con asesoramiento local:

- registro de actividad independiente ante BPS/DGI y documentación fiscal;
- identidad completa del proveedor, precio, moneda, impuestos y comprobante;
- información precontractual y derecho de retracto en ventas a distancia;
- tratamiento y eventual registro de bases de datos de interesados/clientes;
- versión exacta del EULA aceptada y evidencia de aceptación;
- alcance de licencia, soporte, actualizaciones, devolución, transferencia de
  dispositivo y terminación;
- disponibilidad y, si corresponde, registro de nombre/marca;
- registro de derecho de autor como evidencia complementaria.

El usuario final conserva responsabilidad sobre licitud del corpus, permisos,
confidencialidad, copias de respaldo y decisiones metodológicas. Eso debe
explicarse de forma clara, sin intentar excluir derechos obligatorios del
consumidor ni responsabilidades que la ley no permita limitar.

## Modelo técnico recomendado para licencias

1. Generar una licencia estructurada con identificador, titular, edición,
   dispositivo o cantidad autorizada y condiciones temporales si existieran.
2. Firmarla con Ed25519 u otro esquema moderno equivalente.
3. Mantener la clave privada únicamente en una herramienta administrativa bajo
   control del licenciante, con respaldo cifrado y rotación documentada.
4. Incluir sólo la clave pública y el verificador en Rust dentro de la app.
5. Permitir uso sin conexión. Un servidor puede añadirse después para
   autoservicio, revocación o recuperación, pero no debe ser imprescindible para
   validar cada inicio.
6. Nunca usar un “generador” simétrico cuyo secreto quede dentro de JavaScript o
   del ejecutable.

## Gate de publicación

Una versión sólo podrá marcarse **PUBLICABLE** cuando exista evidencia para
todos estos puntos:

- [ ] AUD-001 a AUD-027 cerrados o aceptados formalmente con justificación no
      contradictoria con seguridad, ley o integridad de datos.
- [ ] Suite funcional y de regresión aprobada.
- [ ] `npm audit` y `cargo audit` sin vulnerabilidades aplicables.
- [ ] SBOM y avisos de terceros generados desde los artefactos finales.
- [ ] Beta probada en navegadores soportados sobre HTTPS real.
- [ ] Instalador y ejecutable firmados y verificados.
- [ ] Build reproducible desde un commit/tag limpio.
- [ ] Prueba de instalación, actualización, desinstalación y portable en una
      máquina Windows limpia.
- [ ] Restauración de respaldo y manejo de archivos dañados comprobados.
- [ ] Documentos legales y comerciales revisados para la modalidad real de venta.
- [ ] Canal `santiherben@gmail.com` y procedimiento de privacidad/soporte
      operativos.

## Próximo ciclo recomendado

El siguiente ciclo debe corregir primero AUD-001, AUD-002 y AUD-011 y añadir sus
pruebas de regresión. Después corresponde resolver el importador PDF beta y la
dependencia RustSec. No debe generarse un nuevo instalador comercial antes de
que esos gates estén aprobados.
