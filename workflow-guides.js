/* Beta pilot: small, task-oriented maps. No project data is read or changed. */
(function (global) {
    'use strict';

    const ROUTES = Object.freeze([
        Object.freeze({
            id: 'corpus',
            icon: '📁',
            title: 'Cargar y preparar el corpus',
            summary: 'Desde un proyecto seguro hasta un respaldo verificable de las fuentes incorporadas.',
            steps: Object.freeze([
                Object.freeze({
                    title: 'Definir el punto de partida',
                    description: 'Crea un proyecto en blanco o abre un respaldo existente. Antes de reemplazar un trabajo, conserva su archivo original.',
                    result: 'Sabes qué proyecto recibiría las nuevas fuentes y tienes identificado el respaldo anterior.',
                    manualSection: 'manual-sec-1',
                    manualLabel: '1. Filosofía y privacidad',
                    targetId: 'btn-new-blank-project',
                    actionLabel: 'Crear proyecto en blanco',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Importar las fuentes',
                    description: 'Incorpora archivos TXT, DOCX o PDF. En esta Beta se admiten hasta dos documentos por proyecto.',
                    result: 'Cada archivo aparece una sola vez en la lista de documentos.',
                    manualSection: 'manual-sec-2',
                    manualLabel: '2. Espacio de trabajo',
                    targetId: 'btn-import-files',
                    actionLabel: 'Importar fuentes',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Comprobar la lectura',
                    description: 'Abre cada fuente y verifica título, contenido, saltos de línea y cantidad aproximada de palabras antes de comenzar a codificar.',
                    result: 'La fuente puede leerse completa y el texto corresponde al archivo esperado.',
                    manualSection: 'manual-sec-2',
                    manualLabel: '2. Espacio de trabajo',
                    targetSelector: '#document-list button',
                    actionLabel: 'Abrir una fuente',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Delimitar y documentar el corpus',
                    description: 'Usa nombres consistentes y registra fuera de esta Beta qué participante, técnica y momento corresponde a cada archivo. Al integrarse en Pro, esta acción utilizará la Ficha de Contexto con caso, grupo y período.',
                    result: 'Puedes explicar por qué cada fuente pertenece al corpus y cómo se relaciona con las demás.',
                    manualSection: 'manual-sec-2',
                    manualLabel: '2. Espacio de trabajo'
                }),
                Object.freeze({
                    title: 'Guardar un respaldo',
                    description: 'Guarda el proyecto JSON después de comprobar las fuentes. Una exportación de resultados no reemplaza el respaldo del proyecto.',
                    result: 'Conservas un archivo que puede abrirse nuevamente antes de iniciar la codificación.',
                    manualSection: 'manual-sec-7',
                    manualLabel: '7. Calidad y exportación',
                    targetId: 'btn-save-project',
                    actionLabel: 'Guardar proyecto',
                    actionMode: 'click'
                })
            ])
        }),
        Object.freeze({
            id: 'categories',
            icon: '🏷️',
            title: 'Crear categorías y validar asignaciones',
            summary: 'Del concepto analítico a una codificación revisada y trazable.',
            steps: Object.freeze([
                Object.freeze({
                    title: 'Definir qué representa la categoría',
                    description: 'Aclara si surge del marco conceptual o del corpus y qué pregunta ayuda a responder. La validez de la categoría es una decisión metodológica del investigador.',
                    result: 'La categoría tiene un propósito analítico y un origen documentable.',
                    manualSection: 'manual-sec-3',
                    manualLabel: '3. Codificación y memos'
                }),
                Object.freeze({
                    title: 'Crear categoría o subcategoría',
                    description: 'Decide si será una categoría principal o si dependerá de otra. Usa un nombre claro y un código breve y estable.',
                    result: 'La ubicación en el libro de códigos coincide con su alcance conceptual.',
                    manualSection: 'manual-sec-3',
                    manualLabel: '3. Codificación y memos',
                    targetId: 'btn-add-category',
                    actionLabel: 'Abrir nueva categoría',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Escribir reglas y límites',
                    description: 'Completa descripción, criterio de inclusión, exclusiones y términos de búsqueda. Los términos recuperan candidatos: no validan interpretaciones.',
                    result: 'Otra persona puede comprender cuándo aplicar y cuándo no aplicar la categoría.',
                    manualSection: 'manual-sec-3',
                    manualLabel: '3. Codificación y memos',
                    targetId: 'btn-add-category',
                    actionLabel: 'Abrir formulario',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Buscar candidatos o codificar manualmente',
                    description: 'Usa Buscar Todo para recuperar propuestas por reglas o selecciona un pasaje para codificarlo manualmente. Mantén separada la recuperación automática de la decisión humana.',
                    result: 'Cada asignación conserva el pasaje exacto y la categoría aplicada.',
                    manualSection: 'manual-sec-3',
                    manualLabel: '3. Codificación y memos',
                    targetId: 'btn-auto-code-all',
                    actionLabel: 'Buscar candidatos',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Revisar cada asignación',
                    description: 'En Decodificador, vuelve al pasaje y marca la asignación como aceptada, pendiente o rechazada. Un resultado propuesto no debe tratarse como hallazgo.',
                    result: 'Las asignaciones aceptadas tienen respaldo verificable y las dudas permanecen visibles.',
                    manualSection: 'manual-sec-3',
                    manualLabel: '3. Codificación y memos',
                    targetSelector: '.tab-btn[data-tab="tab-decoders"]',
                    actionLabel: 'Abrir Decodificador',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Escribir memos y revisar el libro',
                    description: 'Registra decisiones, casos dudosos y cambios de criterio. Comprueba categorías vacías, solapamientos innecesarios y excepciones relevantes.',
                    result: 'El libro de códigos y las asignaciones cuentan con justificación interpretativa.',
                    manualSection: 'manual-sec-7',
                    manualLabel: '7. Calidad y exportación',
                    targetSelector: '.tab-btn[data-tab="tab-network"]',
                    actionLabel: 'Abrir Calidad',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Guardar el proyecto revisado',
                    description: 'Guarda un respaldo después de validar las asignaciones. El archivo debe conservar categorías, pasajes, estados de revisión y memos.',
                    result: 'Puedes recuperar el estado revisado sin depender de una exportación final.',
                    manualSection: 'manual-sec-7',
                    manualLabel: '7. Calidad y exportación',
                    targetId: 'btn-save-project',
                    actionLabel: 'Guardar proyecto',
                    actionMode: 'click'
                })
            ])
        }),
        Object.freeze({
            id: 'analysis',
            icon: '🔎',
            title: 'Analizar el corpus',
            summary: 'Delimita el alcance, examina patrones y regresa siempre a la evidencia que sostiene la interpretación.',
            steps: Object.freeze([
                Object.freeze({
                    title: 'Precisar la pregunta y el alcance',
                    description: 'Define qué pregunta orientarás con este análisis y si observarás todo el corpus o una fuente concreta. No cambies el alcance durante una comparación sin dejarlo registrado.',
                    result: 'Puedes nombrar la pregunta, las fuentes incluidas y el criterio de revisión que usarás.',
                    manualSection: 'manual-sec-2',
                    manualLabel: '2. Espacio de trabajo',
                    targetSelector: '#document-list button',
                    actionLabel: 'Revisar fuentes',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Depurar el texto analizable',
                    description: 'Revisa si encabezados, intervenciones del equipo u otros tramos deben excluirse. Una exclusión modifica el corpus analítico, por lo que debe ser explícita y justificable.',
                    result: 'Los tramos excluidos están identificados y el motivo puede explicarse.',
                    manualSection: 'manual-sec-5',
                    manualLabel: '5. Unidades y métricas',
                    targetId: 'btn-open-corpus-exclusion',
                    actionLabel: 'Gestionar exclusiones',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Comprobar el estado de revisión',
                    description: 'Filtra las asignaciones por aceptadas, pendientes y rechazadas. Para un resultado final, explicita qué estados participan del cálculo.',
                    result: 'Las propuestas pendientes no se presentan como evidencia aceptada.',
                    manualSection: 'manual-sec-3',
                    manualLabel: '3. Codificación y memos',
                    targetSelector: '.tab-btn[data-tab="tab-decoders"]',
                    actionLabel: 'Abrir Decodificador',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Examinar frecuencias y matriz',
                    description: 'Abre la matriz para reconocer distribución, categorías dominantes y fragmentos asociados. La frecuencia orienta preguntas; por sí sola no explica el significado.',
                    result: 'Puedes distinguir recuento, ponderación y evidencia textual de cada categoría.',
                    manualSection: 'manual-sec-6',
                    manualLabel: '6. Matrices y consultas',
                    targetId: 'btn-open-matrix',
                    actionLabel: 'Abrir Matriz & Stats',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Contrastar patrón, excepción y relación',
                    description: 'Compara regularidades con discrepancias y casos negativos. Regresa al pasaje original antes de afirmar una relación entre categorías.',
                    result: 'La interpretación incluye evidencia convergente, excepciones y límites.',
                    manualSection: 'manual-sec-4',
                    manualLabel: '4. Cruce de datos y gráficos'
                }),
                Object.freeze({
                    title: 'Registrar la interpretación',
                    description: 'Escribe memos que conecten la evidencia con la pregunta de investigación. Separa descripción del pasaje, interpretación y alcance de la afirmación.',
                    result: 'Cada afirmación analítica importante puede rastrearse hasta pasajes y memos concretos.',
                    manualSection: 'manual-sec-3',
                    manualLabel: '3. Codificación y memos',
                    targetSelector: '.tab-btn[data-tab="tab-decoders"]',
                    actionLabel: 'Volver a la evidencia',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Cerrar con control de calidad',
                    description: 'Revisa cobertura, memos faltantes, automatizaciones y decisiones pendientes antes de comunicar hallazgos.',
                    result: 'Las tareas pendientes y las limitaciones quedan visibles antes de exportar.',
                    manualSection: 'manual-sec-7',
                    manualLabel: '7. Calidad y exportación',
                    targetSelector: '.tab-btn[data-tab="tab-network"]',
                    actionLabel: 'Abrir panel de gráficos',
                    actionMode: 'click'
                })
            ])
        }),
        Object.freeze({
            id: 'exports',
            icon: '📤',
            title: 'Preparar exportaciones',
            summary: 'Distingue respaldo, documento codificado, datos del gráfico e informe analítico antes de generar entregables.',
            steps: Object.freeze([
                Object.freeze({
                    title: 'Definir el propósito del entregable',
                    description: 'Decide si necesitas continuar el trabajo, revisar evidencia, compartir resultados o presentar un informe. Cada propósito requiere una salida distinta.',
                    result: 'Has identificado destinatario, alcance y formato del entregable.',
                    manualSection: 'manual-sec-7',
                    manualLabel: '7. Calidad y exportación'
                }),
                Object.freeze({
                    title: 'Revisar alcance y estados',
                    description: 'Comprueba qué documento, categorías y estados de revisión se incluirán. No mezcles propuestas pendientes con resultados aceptados sin declararlo.',
                    result: 'El conjunto que se exportará coincide con lo que deseas comunicar.',
                    manualSection: 'manual-sec-7',
                    manualLabel: '7. Calidad y exportación',
                    targetSelector: '.tab-btn[data-tab="tab-decoders"]',
                    actionLabel: 'Revisar asignaciones',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Guardar el proyecto editable',
                    description: 'Guarda el JSON antes de producir salidas. Es el respaldo que permite recuperar categorías, pasajes, estados y memos; un PDF o CSV no lo reemplaza.',
                    result: 'Conservas un respaldo reciente que puede abrirse nuevamente.',
                    manualSection: 'manual-sec-7',
                    manualLabel: '7. Calidad y exportación',
                    targetId: 'btn-save-project',
                    actionLabel: 'Guardar proyecto JSON',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Exportar un documento codificado',
                    description: 'Usa el PDF del documento para compartir el texto con sus categorías seleccionadas, pasajes, métricas, relaciones y memos.',
                    result: 'La selección de categorías representa el documento que necesitas revisar o presentar.',
                    manualSection: 'manual-sec-7',
                    manualLabel: '7. Calidad y exportación',
                    targetId: 'btn-export-doc-pdf',
                    actionLabel: 'Configurar PDF del documento',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Preparar un informe analítico',
                    description: 'Completa título, autoría, objetivo, metodología y conclusiones. Decide si incluirás evidencia, relaciones y control de calidad.',
                    result: 'El informe declara cómo se produjo la interpretación y qué evidencia la respalda.',
                    manualSection: 'manual-sec-7',
                    manualLabel: '7. Calidad y exportación',
                    targetId: 'btn-open-matrix',
                    actionLabel: 'Abrir Matriz & Stats',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Exportar datos de una gráfica',
                    description: 'El CSV conserva valores y contexto analítico del gráfico activo. Registra además unidad, métrica, filtros y alcance para que el resultado sea interpretable.',
                    result: 'Los datos exportados pueden vincularse con la configuración que los produjo.',
                    manualSection: 'manual-sec-4',
                    manualLabel: '4. Cruce de datos y gráficos',
                    targetSelector: '.tab-btn[data-tab="tab-network"]',
                    actionLabel: 'Abrir Gráficos Cuali',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Verificar y archivar',
                    description: 'Abre el archivo generado, revisa identificación de la edición, contenido, legibilidad y límites declarados. Conserva juntos el entregable y el respaldo JSON correspondiente.',
                    result: 'El archivo se abre correctamente y puede rastrearse al proyecto que lo originó.',
                    manualSection: 'manual-sec-7',
                    manualLabel: '7. Calidad y exportación'
                })
            ])
        }),
        Object.freeze({
            id: 'graphics',
            icon: '📊',
            title: 'Realizar análisis gráfico',
            summary: 'Elige la visualización según la pregunta, declara sus parámetros y verifica cada patrón contra la evidencia.',
            steps: Object.freeze([
                Object.freeze({
                    title: 'Preparar evidencia revisada',
                    description: 'Comprueba estados de revisión y memos antes de graficar. El gráfico resume las asignaciones incluidas; no corrige una codificación incompleta.',
                    result: 'Sabes qué decisiones de revisión alimentarán la visualización.',
                    manualSection: 'manual-sec-3',
                    manualLabel: '3. Codificación y memos',
                    targetSelector: '.tab-btn[data-tab="tab-decoders"]',
                    actionLabel: 'Revisar evidencia',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Abrir el espacio gráfico',
                    description: 'Entra a Gráficos Cuali y observa primero la configuración activa. Cambiar de vista no cambia el corpus, pero sí la pregunta que el resumen ayuda a responder.',
                    result: 'La gráfica visible corresponde al alcance que deseas explorar.',
                    manualSection: 'manual-sec-4',
                    manualLabel: '4. Cruce de datos y gráficos',
                    targetSelector: '.tab-btn[data-tab="tab-network"]',
                    actionLabel: 'Abrir Gráficos Cuali',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Elegir la representación',
                    description: 'Usa red para relaciones, coocurrencias para cruces, comparación para distribución y calidad para revisar el proceso. No todas las vistas responden la misma pregunta.',
                    result: 'Puedes justificar por qué la vista elegida es adecuada para tu pregunta.',
                    manualSection: 'manual-sec-4',
                    manualLabel: '4. Cruce de datos y gráficos',
                    targetId: 'chart-type-network',
                    actionLabel: 'Mostrar Red / Grafo',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Configurar alcance, unidad y métrica',
                    description: 'Define estados de revisión, nivel categorial, documento, unidad de coocurrencia, métrica y umbral. Registra estos parámetros cuando compares resultados.',
                    result: 'La unidad, el denominador, la métrica y los filtros son explícitos.',
                    manualSection: 'manual-sec-5',
                    manualLabel: '5. Unidades y métricas',
                    targetId: 'cooccurrence-unit',
                    actionLabel: 'Configurar unidad',
                    actionMode: 'focus'
                }),
                Object.freeze({
                    title: 'Leer etiquetas, nodos y relaciones',
                    description: 'Interpreta tamaños, colores y enlaces según la leyenda. Una conexión indica asociación bajo la unidad elegida; no demuestra causalidad ni acuerdo conceptual.',
                    result: 'Puedes explicar qué codifica cada elemento visual y qué no permite concluir.',
                    manualSection: 'manual-sec-4',
                    manualLabel: '4. Cruce de datos y gráficos'
                }),
                Object.freeze({
                    title: 'Volver a la evidencia',
                    description: 'Abre nodos, barras o celdas para inspeccionar los pasajes que producen el patrón. Contrasta ejemplos típicos, discrepantes y límites.',
                    result: 'La lectura gráfica está respaldada por evidencia localizable en el corpus.',
                    manualSection: 'manual-sec-4',
                    manualLabel: '4. Cruce de datos y gráficos'
                }),
                Object.freeze({
                    title: 'Registrar y exportar la lectura',
                    description: 'Edita la nota interpretativa para documentar tu lectura y exporta los datos si necesitas auditarlos. Conserva la configuración utilizada.',
                    result: 'La interpretación distingue datos observados, lectura del investigador y límites.',
                    manualSection: 'manual-sec-7',
                    manualLabel: '7. Calidad y exportación',
                    targetId: 'btn-edit-interpretation',
                    actionLabel: 'Editar nota de la gráfica',
                    actionMode: 'click'
                })
            ])
        }),
        Object.freeze({
            id: 'semantics',
            icon: '🧠',
            title: 'Planificar análisis semántico',
            summary: 'Vista previa metodológica: esta Beta permite validar el recorrido, pero no ejecuta el motor semántico disponible en Pro.',
            steps: Object.freeze([
                Object.freeze({
                    title: 'Definir la pregunta de exploración',
                    description: 'Formula qué concepto, categoría o pasaje deseas explorar y qué contaría como resultado relevante. La similitud semántica recupera candidatos; no confirma significados.',
                    result: 'La consulta tiene un propósito, un alcance y un criterio de relevancia explícitos.',
                    manualSection: 'manual-sec-5',
                    manualLabel: '5. Unidades y métricas'
                }),
                Object.freeze({
                    title: 'Preparar el concepto o la categoría',
                    description: 'Revisa nombre, descripción, reglas de inclusión, exclusiones y ejemplos. Una definición vaga produce candidatos difíciles de evaluar.',
                    result: 'El concepto puede aplicarse de forma comprensible y consistente.',
                    manualSection: 'manual-sec-3',
                    manualLabel: '3. Codificación y memos',
                    targetId: 'btn-add-category',
                    actionLabel: 'Revisar categorías',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Delimitar el corpus y los estados',
                    description: 'Define fuentes, filtros y estados de revisión que participarán. Conserva fuera del análisis semántico los textos excluidos o no pertinentes.',
                    result: 'El conjunto de búsqueda es conocido y reproducible.',
                    manualSection: 'manual-sec-2',
                    manualLabel: '2. Espacio de trabajo'
                }),
                Object.freeze({
                    title: 'Ejecutar la exploración en Pro',
                    description: 'En Pro, inicia la búsqueda con el concepto o varios vectores y registra modelo, versión, umbral y alcance. Esta Beta solo presenta el paso para validar la guía y no simula resultados.',
                    result: 'La ejecución conserva parámetros y procedencia verificables; en esta Beta, el recorrido queda identificado como vista previa.',
                    manualSection: 'manual-sec-4',
                    manualLabel: '4. Cruce de datos y gráficos'
                }),
                Object.freeze({
                    title: 'Examinar propuestas y pasajes',
                    description: 'Evalúa cada candidato en su contexto. Una puntuación alta expresa proximidad del modelo, no verdad, acuerdo ni pertinencia metodológica.',
                    result: 'Cada propuesta se contrasta con su texto original y puede explicarse por su pertinencia.',
                    manualSection: 'manual-sec-3',
                    manualLabel: '3. Codificación y memos'
                }),
                Object.freeze({
                    title: 'Aceptar, modificar, rechazar o dejar pendiente',
                    description: 'La decisión final es humana. Conserva las propuestas rechazadas y los cambios de límites como parte de la trazabilidad, sin convertirlos automáticamente en evidencia aceptada.',
                    result: 'Cada propuesta tiene un estado explícito y las decisiones conservan su historial.',
                    manualSection: 'manual-sec-3',
                    manualLabel: '3. Codificación y memos',
                    targetSelector: '.tab-btn[data-tab="tab-decoders"]',
                    actionLabel: 'Ver estados de revisión',
                    actionMode: 'click'
                }),
                Object.freeze({
                    title: 'Comparar, documentar y comunicar límites',
                    description: 'Contrasta lo recuperado semánticamente con la codificación manual o lexical, registra omisiones y falsos positivos, y declara que el hallazgo surge de revisión humana.',
                    result: 'El informe separa propuesta automática, evidencia, decisión humana y límites del procedimiento.',
                    manualSection: 'manual-sec-7',
                    manualLabel: '7. Calidad y exportación'
                })
            ])
        })
    ]);

    function validateRoutes(routes = ROUTES) {
        if (!Array.isArray(routes) || routes.length === 0) return false;
        const routeIds = new Set();
        for (const route of routes) {
            if (!route || !route.id || !route.title || !Array.isArray(route.steps) || route.steps.length < 2) return false;
            if (routeIds.has(route.id)) return false;
            routeIds.add(route.id);
            for (const step of route.steps) {
                if (!step.title || !step.description || !step.result) return false;
                if (step.manualSection && !/^manual-sec-[1-7]$/.test(step.manualSection)) return false;
                if (step.actionLabel && !step.targetId && !step.targetSelector) return false;
            }
        }
        return true;
    }

    let openRoute = null;
    const api = Object.freeze({
        routes: ROUTES,
        validateRoutes,
        open(routeId) {
            return openRoute ? openRoute(routeId) : undefined;
        }
    });
    global.WorkflowGuides = api;
    if (typeof document === 'undefined') return;

    function init() {
        const openButton = document.getElementById('btn-open-workflow-guides');
        if (!openButton || document.getElementById('modal-workflow-guides')) return;

        const modal = document.createElement('div');
        modal.id = 'modal-workflow-guides';
        modal.className = 'modal-backdrop workflow-guide-backdrop';
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="modal-card workflow-guide-card" role="dialog" aria-modal="true" aria-labelledby="workflow-guide-title">
                <div class="workflow-guide-header">
                    <div>
                        <span class="workflow-beta-badge">Piloto Beta</span>
                        <h2 id="workflow-guide-title">Rutas paso a paso</h2>
                        <p>Mapas breves para completar tareas concretas sin perder la trazabilidad.</p>
                    </div>
                    <button type="button" class="modal-close workflow-guide-close" aria-label="Cerrar rutas">&times;</button>
                </div>
                <div class="workflow-route-tabs" role="tablist" aria-label="Rutas disponibles"></div>
                <div class="workflow-guide-body">
                    <div class="workflow-route-summary">
                        <span class="workflow-route-icon" aria-hidden="true"></span>
                        <div><h3></h3><p></p></div>
                    </div>
                    <ol class="workflow-map" aria-label="Pasos de la ruta"></ol>
                    <section class="workflow-step-detail" aria-live="polite">
                        <div class="workflow-step-count"></div>
                        <h3></h3>
                        <p class="workflow-step-description"></p>
                        <div class="workflow-result"><strong>La tarea está completa cuando:</strong><span></span></div>
                        <div class="workflow-step-actions">
                            <button type="button" class="btn btn-outline btn-sm workflow-manual-button">📘 Consultar el Manual de Usuario</button>
                            <button type="button" class="btn btn-primary btn-sm workflow-action-button"></button>
                        </div>
                    </section>
                </div>
                <div class="modal-footer workflow-guide-footer">
                    <button type="button" class="btn btn-secondary workflow-previous">Anterior</button>
                    <span class="workflow-position" aria-live="polite"></span>
                    <button type="button" class="btn btn-primary workflow-next">Siguiente</button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        const tabs = modal.querySelector('.workflow-route-tabs');
        const map = modal.querySelector('.workflow-map');
        const routeIcon = modal.querySelector('.workflow-route-icon');
        const routeTitle = modal.querySelector('.workflow-route-summary h3');
        const routeSummary = modal.querySelector('.workflow-route-summary p');
        const count = modal.querySelector('.workflow-step-count');
        const detailTitle = modal.querySelector('.workflow-step-detail h3');
        const description = modal.querySelector('.workflow-step-description');
        const result = modal.querySelector('.workflow-result span');
        const manualButton = modal.querySelector('.workflow-manual-button');
        const actionButton = modal.querySelector('.workflow-action-button');
        const previousButton = modal.querySelector('.workflow-previous');
        const nextButton = modal.querySelector('.workflow-next');
        const position = modal.querySelector('.workflow-position');
        let routeIndex = 0;
        let stepIndex = 0;
        let lastFocus = null;

        function currentRoute() { return ROUTES[routeIndex]; }
        function currentStep() { return currentRoute().steps[stepIndex]; }
        function resolveTarget(step) {
            if (step.targetId) return document.getElementById(step.targetId);
            if (step.targetSelector) return document.querySelector(step.targetSelector);
            return null;
        }

        function renderTabs() {
            tabs.replaceChildren();
            ROUTES.forEach((route, index) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'workflow-route-tab';
                button.setAttribute('role', 'tab');
                button.setAttribute('aria-selected', index === routeIndex ? 'true' : 'false');
                button.textContent = `${route.icon} ${route.title}`;
                button.onclick = () => { routeIndex = index; stepIndex = 0; render(); };
                tabs.appendChild(button);
            });
        }

        function renderMap() {
            map.replaceChildren();
            currentRoute().steps.forEach((step, index) => {
                const item = document.createElement('li');
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'workflow-node';
                if (index < stepIndex) button.classList.add('is-complete');
                if (index === stepIndex) button.classList.add('is-current');
                button.setAttribute('aria-current', index === stepIndex ? 'step' : 'false');
                const number = document.createElement('span');
                number.className = 'workflow-node-number';
                number.textContent = String(index + 1);
                const label = document.createElement('span');
                label.textContent = step.title;
                if (step.manualSection) {
                    const manualMark = document.createElement('span');
                    manualMark.className = 'workflow-manual-mark';
                    manualMark.textContent = '📘';
                    manualMark.setAttribute('aria-label', 'Referencia al Manual de Usuario');
                    label.append(' ', manualMark);
                }
                button.append(number, label);
                button.onclick = () => { stepIndex = index; render(); };
                item.appendChild(button);
                map.appendChild(item);
            });
        }

        function openManual(sectionId) {
            close();
            const manual = document.getElementById('modal-user-manual');
            if (!manual) return;
            const manualOpenButton = document.getElementById('btn-open-manual');
            if (manualOpenButton) manualOpenButton.click();
            else {
                manual.style.display = 'flex';
                manual.setAttribute('aria-hidden', 'false');
            }
            const nav = manual.querySelector(`.manual-nav-btn[data-target="${sectionId}"]`);
            if (nav) nav.click();
            const section = document.getElementById(sectionId);
            if (section) section.scrollIntoView({ block: 'start' });
        }

        function runAction(step) {
            const target = resolveTarget(step);
            if (!target) return;
            close();
            setTimeout(() => {
                target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                if (step.actionMode === 'click' && typeof target.click === 'function') target.click();
                else if (typeof target.focus === 'function') target.focus();
            }, 0);
        }

        function render() {
            const route = currentRoute();
            const step = currentStep();
            renderTabs();
            renderMap();
            routeIcon.textContent = route.icon;
            routeTitle.textContent = route.title;
            routeSummary.textContent = route.summary;
            count.textContent = `Paso ${stepIndex + 1} de ${route.steps.length}`;
            detailTitle.textContent = step.title;
            description.textContent = step.description;
            result.textContent = step.result;
            position.textContent = `${stepIndex + 1} / ${route.steps.length}`;
            previousButton.disabled = stepIndex === 0;
            nextButton.disabled = stepIndex === route.steps.length - 1;
            manualButton.hidden = !step.manualSection;
            manualButton.textContent = step.manualSection ? `📘 Manual de Usuario · ${step.manualLabel}` : '';
            manualButton.onclick = () => openManual(step.manualSection);
            const target = resolveTarget(step);
            actionButton.hidden = !step.actionLabel;
            actionButton.disabled = Boolean(step.actionLabel && !target);
            actionButton.textContent = step.actionLabel || '';
            actionButton.onclick = () => runAction(step);
        }

        function open(routeId) {
            if (routeId) {
                const nextRoute = ROUTES.findIndex(route => route.id === routeId);
                if (nextRoute >= 0 && nextRoute !== routeIndex) {
                    routeIndex = nextRoute;
                    stepIndex = 0;
                }
            }
            lastFocus = document.activeElement;
            render();
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
            modal.querySelector('.workflow-guide-close').focus();
        }

        function close() {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        }

        openButton.addEventListener('click', () => open());
        modal.querySelectorAll('.workflow-guide-close').forEach(button => button.addEventListener('click', close));
        modal.addEventListener('click', event => { if (event.target === modal) close(); });
        previousButton.addEventListener('click', () => { if (stepIndex > 0) { stepIndex -= 1; render(); } });
        nextButton.addEventListener('click', () => {
            if (stepIndex < currentRoute().steps.length - 1) { stepIndex += 1; render(); }
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && modal.style.display !== 'none') close();
        });
        openRoute = open;
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(typeof window === 'undefined' ? globalThis : window);
