(function () {
    'use strict';

    const contactUrl = 'mailto:analizadorcualiuy@gmail.com?subject=Consulta%20sobre%20AnalizadorCualiUY%20Pro%20desde%20la%20Edici%C3%B3n%20Educativa&body=Hola%2C%0A%0AEstoy usando la Edici%C3%B3n%20Educativa%20de%20AnalizadorCualiUY%20y%20quisiera%20recibir%20informaci%C3%B3n%20para%20adquirir%20la%20versi%C3%B3n%20Pro.%0A%0AGracias.';

    const concepts = [
        ['1. Preparar el corpus', 'Incorporá un documento y definí qué pregunta querés comprender. El corpus es el conjunto de textos que analizarás.'],
        ['2. Crear categorías', 'Una categoría reúne una idea relevante para tu pregunta. Por ejemplo: “Barreras para aprender”. Su criterio explica qué pasajes incluye.'],
        ['3. Usar subcategorías', 'Una subcategoría afina una categoría más amplia. Por ejemplo: “Falta de tiempo” puede estar dentro de “Barreras para aprender”.'],
        ['4. Codificar evidencia', 'Codificar es vincular un fragmento concreto del texto con una categoría. No es contar palabras: es marcar evidencia que responde a tu pregunta.'],
        ['5. Escribir memos e interpretar', 'Un memo registra por qué el pasaje importa, qué significa en su contexto y qué dudas o comparaciones abre. Después, la matriz ayuda a revisar patrones sin reemplazar tu interpretación.']
    ];

    const educationalCases = {
        primer_anio: {
            title: 'Adaptación a una nueva trayectoria',
            prompt: '¿Qué factores facilitan u obstaculizan la adaptación a un nuevo espacio de formación?',
            task: 'Codificá al menos dos pasajes por categoría y escribí un memo que compare ambas entrevistas.',
            categories: [
                ['cat-adaptacion', null, 'CAT-ADAP', 'Adaptación al aprendizaje', '#0f766e', 'Estrategias y dificultades para organizar el estudio y comprender las exigencias.'],
                ['sub-autonomia', 'cat-adaptacion', 'SUB-AUT', 'Autonomía para estudiar', '#14b8a6', 'Formas de organizarse, buscar ayuda y sostener el estudio de manera autónoma.'],
                ['cat-apoyo', null, 'CAT-APO', 'Redes de apoyo', '#2563eb', 'Personas, espacios y recursos que acompañan la trayectoria.'],
                ['cat-incertidumbre', null, 'CAT-INC', 'Incertidumbre inicial', '#b45309', 'Dudas, miedos o desorientación frente al inicio.']
            ],
            documents: [
                ['Entrevista_Ana_Trayectoria_Educativa.txt', 'Entrevistadora: ¿Qué fue lo más difícil al comenzar esta formación?\n\nAna: Me costó entender cuánto tenía que estudiar por mi cuenta. Antes preguntaba todo enseguida, pero al inicio sentía que si no comprendía una lectura era un problema sólo mío.\n\nEntrevistadora: ¿Qué te ayudó a continuar?\n\nAna: Una compañera armó un grupo de estudio. Ahí descubrí que varias personas tenían las mismas dudas y dejamos de sentirnos tan perdidas.'],
                ['Entrevista_Mateo_Trayectoria_Educativa.txt', 'Entrevistadora: ¿Cómo viviste las primeras semanas?\n\nMateo: Estaba entusiasmado, pero también con mucha incertidumbre porque no conocía a nadie y los temas parecían enormes.\n\nEntrevistadora: ¿Hubo algo que facilitara tu adaptación?\n\nMateo: La tutoría de personas con más experiencia fue importante. No me resolvieron las tareas, pero me explicaron cómo planificar y a quién consultar.']
            ]
        },
        retroalimentacion: {
            title: 'Devoluciones docentes',
            prompt: '¿Cómo perciben los estudiantes la retroalimentación sobre sus aprendizajes?',
            task: 'Distingí entre valoración, orientación para mejorar y aspectos que generan frustración. Luego compará los casos en la matriz.',
            categories: [
                ['cat-clara', null, 'CAT-CLA', 'Orientación clara', '#0f766e', 'Devoluciones que explican qué se logró y qué paso seguir.'],
                ['sub-criterios', 'cat-clara', 'SUB-CRI', 'Criterios para mejorar', '#14b8a6', 'Referencias concretas a evidencias, ejemplos o próximos pasos de mejora.'],
                ['cat-emocion', null, 'CAT-EMO', 'Impacto emocional', '#9333ea', 'Emociones asociadas a recibir comentarios sobre el trabajo.'],
                ['cat-dialogo', null, 'CAT-DIA', 'Diálogo pedagógico', '#2563eb', 'Posibilidades de preguntar, revisar y conversar la devolución.']
            ],
            documents: [
                ['Grupo_focal_Devoluciones_1.txt', 'Estudiante 1: Cuando la docente escribe solamente “revisar”, no sé qué cambiar y me da frustración.\n\nEstudiante 2: Me sirve mucho cuando marca un ejemplo y explica por qué una idea quedó poco desarrollada. Ahí puedo volver a intentarlo.\n\nEstudiante 3: A veces da vergüenza preguntar delante de todos, por eso valoro poder conversar después de clase.'],
                ['Entrevista_Valentina_Devoluciones.txt', 'Valentina: Una devolución útil no es la que me dice si está bien o mal, sino la que me orienta. En un trabajo me señalaron que mi argumento era interesante, pero faltaba evidencia. Después pude buscar fuentes y mejorarlo.\n\nValentina: También importa el tono. Si siento que me están juzgando, me cierro; si siento que me invitan a revisar, aprendo.']
            ]
        },
        participacion: {
            title: 'Participación en clase',
            prompt: '¿Qué condiciones influyen en la participación de estudiantes en el aula?',
            task: 'Marcá evidencias de barreras y facilitadores. En el memo, explicá cómo se vinculan el clima del aula y las formas de participación.',
            categories: [
                ['cat-barreras', null, 'CAT-BAR', 'Barreras para participar', '#b91c1c', 'Factores que inhiben la participación oral o escrita.'],
                ['sub-temor', 'cat-barreras', 'SUB-TEM', 'Temor al error', '#ef4444', 'Miedo a equivocarse, ser juzgado o exponerse ante el grupo.'],
                ['cat-clima', null, 'CAT-CLI', 'Clima de confianza', '#0f766e', 'Señales de seguridad, respeto y aceptación del error.'],
                ['cat-estrategias', null, 'CAT-EST', 'Estrategias de participación', '#2563eb', 'Recursos que habilitan distintas maneras de aportar.']
            ],
            documents: [
                ['Entrevista_Lucia_Participacion.txt', 'Lucía: Sé la respuesta muchas veces, pero no levanto la mano porque temo equivocarme y que se rían.\n\nLucía: Cuando trabajamos primero en parejas me animo más; puedo ordenar la idea y después alguien del grupo la comparte.\n\nLucía: La profesora dice que el error sirve para aprender. Eso cambia bastante el ambiente.'],
                ['Observacion_Clase_Participacion.txt', 'Durante la discusión, el docente habilitó un minuto de escritura antes de pedir intervenciones. Participaron estudiantes que habitualmente permanecían en silencio.\n\nUna estudiante señaló que le resultaba más fácil compartir una pregunta por escrito. El docente retomó la pregunta sin identificarla y el grupo desarrolló varias respuestas.']
            ]
        }
    };

    function createProject(caseId) {
        const selected = educationalCases[caseId];
        if (!selected) return null;
        const categories = selected.categories.map(([id, parentId, code, name, color, description]) => ({ id, parentId, code, name, color, keywords: [], description }));
        const documents = selected.documents.map(([title, content], index) => ({ id: `doc-edu-${caseId}-${index + 1}`, title, content }));
        return { documents, categories, codings: [], isSampleLoaded: true, theme: 'dark' };
    }

    function loadEducationalCase(caseId) {
        const selected = educationalCases[caseId];
        const project = createProject(caseId);
        const input = document.getElementById('project-input');
        if (!selected || !project || !input || !window.DataTransfer || !window.File) return;
        if (!window.confirm(`Cargar el caso “${selected.title}”? Reemplazará el proyecto actual.`)) return;
        const transfer = new DataTransfer();
        transfer.items.add(new File([JSON.stringify(project)], `Caso_educativo_${caseId}.json`, { type: 'application/json' }));
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        window.alert(`Caso cargado: ${selected.title}\n\nPregunta de análisis: ${selected.prompt}\n\nConsigna: ${selected.task}`);
    }

    function makeGuide() {
        const guide = document.createElement('aside');
        guide.className = 'educational-guide';
        guide.setAttribute('aria-label', 'Guía de análisis cualitativo');
        guide.innerHTML = `
            <button type="button" class="educational-guide-toggle" aria-expanded="true">Guía educativa <span aria-hidden="true">▾</span></button>
            <div class="educational-guide-content">
                <p class="educational-guide-intro"><strong>Así se articula un análisis cualitativo:</strong> vas del texto a la evidencia, de la evidencia a la interpretación y de allí a conclusiones justificadas.</p>
                <section class="educational-cases" aria-labelledby="educational-cases-title">
                    <strong id="educational-cases-title">Casos para practicar</strong>
                    <p>Elegí un caso; incluye una pregunta, dos textos y categorías iniciales. Tu tarea es codificar y escribir memos.</p>
                    <div class="educational-case-list">${Object.entries(educationalCases).map(([id, item]) => `<button type="button" class="educational-case-button" data-case-id="${id}"><strong>${item.title}</strong><span>${item.prompt}</span></button>`).join('')}</div>
                </section>
                <ol>${concepts.map(([title, text]) => `<li><strong>${title}</strong><span>${text}</span></li>`).join('')}</ol>
                <div class="educational-glossary">
                    <strong>Glosario rápido</strong>
                    <p><b>Categoría:</b> idea analítica que organiza evidencias.</p>
                    <p><b>Codificación:</b> enlace entre un pasaje y una categoría.</p>
                    <p><b>Memo:</b> nota interpretativa sobre esa evidencia.</p>
                </div>
                <a class="btn educational-pro-cta" href="${contactUrl}">Obtener versión Pro</a>
                <small>Pro elimina los límites educativos y agrega exportaciones profesionales.</small>
            </div>`;
        document.body.append(guide);

        const toggle = guide.querySelector('.educational-guide-toggle');
        const content = guide.querySelector('.educational-guide-content');
        toggle.addEventListener('click', () => {
            const collapsed = guide.classList.toggle('is-collapsed');
            toggle.setAttribute('aria-expanded', String(!collapsed));
            content.hidden = collapsed;
        });
        guide.querySelectorAll('[data-case-id]').forEach(button => button.addEventListener('click', () => loadEducationalCase(button.dataset.caseId)));
    }

    function addContextualHelp() {
        const tips = [
            ['#btn-add-category', 'Categoría: una idea que reúne pasajes relevantes. Empezá por una pregunta de investigación y escribí un criterio de inclusión.'],
            ['#btn-add-memo-quick', 'Memo: anotá qué significa este pasaje y por qué aporta a tu análisis; no repitas solamente lo que dice.'],
            ['#btn-open-matrix', 'Matriz: permite comparar categorías, documentos y evidencias. Sirve para revisar patrones; la interpretación sigue siendo tuya.'],
            ['#btn-export-doc-pdf', 'La exportación conserva una marca de agua educativa. Revisá primero que cada hallazgo esté respaldado por citas y memos.']
        ];
        for (const [selector, tip] of tips) {
            const target = document.querySelector(selector);
            if (!target) continue;
            target.classList.add('educational-has-tip');
            target.setAttribute('data-educational-tip', tip);
            target.setAttribute('title', `${target.getAttribute('title') || ''} — ${tip}`.trim());
        }

        const categoryModal = document.querySelector('#modal-category .modal-body');
        if (categoryModal) categoryModal.insertAdjacentHTML('afterbegin', '<div class="educational-context-card"><strong>¿Qué estás haciendo?</strong> Una categoría es una etiqueta analítica: reúne fragmentos que comparten un significado para tu pregunta. Una subcategoría permite distinguir matices dentro de esa idea.</div>');
        const memoModal = document.querySelector('#modal-memo .modal-body');
        if (memoModal) memoModal.insertAdjacentHTML('afterbegin', '<div class="educational-context-card"><strong>¿Para qué sirve un memo?</strong> Registrá tu interpretación del pasaje, su contexto, preguntas y vínculos con otras evidencias. El memo convierte la codificación en razonamiento analítico.</div>');
    }

    const sectorHelp = [
        {
            selector: '.sidebar-section:first-child',
            title: 'Corpus de Documentos',
            functional: 'Gestión y lectura del corpus textual cargado (entrevistas, observaciones, grupos focales).',
            theoretical: 'Corpus Empírico: Conjunto de fuentes primarias que sustentan la investigación cualitativa. Garantiza la evidencia discursiva y la validez contextual.'
        },
        {
            selector: '.sidebar-section:nth-child(3)',
            title: 'Libro de Códigos (Categorías y Subcategorías)',
            functional: 'Árbol interactivo para crear conceptos, definir criterios de inclusión y asignar colores visuales.',
            theoretical: 'Codificación Abierta y Axial: Proceso de abstraer significados compartidos. La jerarquía diferencia temas generales de matices específicos.'
        },
        {
            selector: '.doc-info, #active-doc-title, #doc-meta-stats',
            title: 'Documento Activo y Metadatos',
            functional: 'Informa el título del archivo en lectura, su extensión de palabras y la cantidad total de citas codificadas hasta el momento.',
            theoretical: 'Unidad de Análisis Individual: Corresponde a un caso específico o participante dentro del muestreo cualitativo intencional.'
        },
        {
            selector: '#btn-export-doc-pdf',
            title: 'Exportación de Documento Codificado',
            functional: 'Genera un archivo PDF ejecutable que conserva el texto completo con sus pasajes destacados en colores.',
            theoretical: 'Audibilidad y Transparencia: Facilita la revisión por pares e informantes manteniendo las citas contextualizadas con sus marcas originales.'
        },
        {
            selector: '#text-body, mark.coding-mark, .reader-container',
            title: 'Pasajes Codificados en el Texto (Citas)',
            functional: 'Fragmentos discursivos seleccionados vinculados a categorías. Permiten edición directa o desvinculación.',
            theoretical: 'Inscripción y Evidencia Empírica: Extrae unidades de significado preservando el contexto original del relato para justificar las inferencias del estudio.'
        },
        {
            selector: '#margin-bar, .coding-margin-item',
            title: 'Franjas Categoriales en Margen',
            functional: 'Muestra franjas de colores paralelas al texto indicando qué categorías están aplicadas a ese párrafo o fragmento.',
            theoretical: 'Visibilidad de Codificación Cruzada: Permite identificar áreas de alta densidad conceptual y solapamientos temáticos dentro del mismo pasaje.'
        },
        {
            selector: '.analysis-tabs, .analysis-tabs .tab-btn',
            title: 'Solapas de Herramientas Analíticas',
            functional: 'Pestañas para alternar entre la decodificación de significados, los gráficos cualitativos y la búsqueda avanzada multi-archivo.',
            theoretical: 'Triangulación Inter-Métodos: Combina la lectura cualitativa microscópica (memos) con la visualización macroscópica de patrones.'
        },
        {
            selector: '#tab-decoders, #decoder-list, .decoder-card, #pane-memos',
            title: 'Decodificación y Memos de Significado',
            functional: 'Muestra cada pasaje codificado junto con el espacio para redactar la interpretación o significado analítico del investigador.',
            theoretical: 'Memonotación (Memoing): Bisagra entre los datos crudos y la teoría. Registra el razonamiento abstracto y la conceptualización sobre cada evidencia.'
        },
        {
            selector: '#btn-open-matrix',
            title: 'Matriz Categorial y Estadísticas',
            functional: 'Visualización de frecuencias, coocurrencias, matrices de síntesis y gráficos de red de categorías.',
            theoretical: 'Comparación Constante y Triangulación: Permite contrastar patrones discursivos y verificar la convergencia temática entre informantes.'
        }
    ];

    function setupSectorPopovers() {
        const popover = document.createElement('div');
        popover.id = 'educational-sector-popover';
        popover.className = 'educational-sector-popover';
        popover.hidden = true;
        popover.innerHTML = `
            <div class="popover-header">
                <span class="popover-badge">Guía Teórico-Funcional</span>
                <h4 id="popover-title"></h4>
            </div>
            <div class="popover-body">
                <div class="popover-box functional-box">
                    <strong>Función Operativa</strong>
                    <p id="popover-functional"></p>
                </div>
                <div class="popover-box theoretical-box">
                    <strong>Sustento Teórico</strong>
                    <p id="popover-theoretical"></p>
                </div>
            </div>`;
        document.body.append(popover);

        const titleEl = popover.querySelector('#popover-title');
        const funcEl = popover.querySelector('#popover-functional');
        const theoEl = popover.querySelector('#popover-theoretical');

        let activeTimer = null;

        sectorHelp.forEach(item => {
            const targets = document.querySelectorAll(item.selector);
            targets.forEach(target => {
                target.classList.add('educational-sector-target');
                target.setAttribute('data-sector-title', item.title);
                target.addEventListener('mouseenter', () => {
                    clearTimeout(activeTimer);
                    titleEl.textContent = item.title;
                    funcEl.textContent = item.functional;
                    theoEl.textContent = item.theoretical;

                    const rect = target.getBoundingClientRect();
                    popover.hidden = false;
                    popover.classList.add('is-visible');

                    let top = rect.top + window.scrollY + 10;
                    let left = rect.left + window.scrollX + 20;

                    const popWidth = 340;
                    if (left + popWidth > window.innerWidth) {
                        left = Math.max(10, window.innerWidth - popWidth - 20);
                    }

                    popover.style.top = `${top}px`;
                    popover.style.left = `${left}px`;
                });

                target.addEventListener('mouseleave', () => {
                    activeTimer = setTimeout(() => {
                        popover.classList.remove('is-visible');
                        popover.hidden = true;
                    }, 250);
                });
            });
        });
    }

    function addProCallsToAction() {
        const intro = document.querySelector('#modal-pro-intro .modal-body');
        if (intro) intro.insertAdjacentHTML('afterbegin', '<div class="educational-intro-note"><strong>Edición Educativa:</strong> aprendé el proceso completo con límites formativos y exportaciones identificadas. Si tu proyecto crece, podés pasar a Pro.</div>');
        const exportFooter = document.querySelector('#modal-export-pdf .modal-footer');
        if (exportFooter) exportFooter.insertAdjacentHTML('beforeend', `<a class="btn btn-outline educational-export-pro" href="${contactUrl}">Obtener versión Pro</a>`);
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.classList.add('edition-educational');
        document.title = 'AnalizadorCualiUY Educativa — Aprender análisis cualitativo';
        makeGuide();
        addContextualHelp();
        setupSectorPopovers();
        addProCallsToAction();
    });
})();

