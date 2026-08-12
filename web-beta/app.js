/* ==========================================================================
   AnalizadorCualiUY Pro - Core JavaScript Engine
   PDF Export Engine for Painted Coded Documents (Selected Categories Filtering),
   Category Editing & Deleting, Suggested Codes, Qualitative Charts,
   Categorical Matrix & F3 In-Text Search Engine
   ========================================================================== */

(function() {
    'use strict';

    const STORAGE_KEY = 'ANALIZADOR_CUALI_UY_BETA_PROJECT_V1';
    const BETA_LIMITS = Object.freeze({ maxDocuments: 2, maxCategories: 4, maxTotalWords: 10000 });

    function betaLimitMessage() {
        return `La beta admite hasta ${BETA_LIMITS.maxDocuments} documentos, ${BETA_LIMITS.maxCategories} categorías (incluidas las subcategorías) y ${BETA_LIMITS.maxTotalWords.toLocaleString('es-UY')} palabras en total. Contacta al autor para solicitar AnalizadorCualiUY Pro.`;
    }

    function getTauriInvoke() {
        if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
            return window.__TAURI__.core.invoke;
        }
        if (window.__TAURI__ && window.__TAURI__.invoke) {
            return window.__TAURI__.invoke;
        }
        if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
            return window.__TAURI_INTERNALS__.invoke;
        }
        return null;
    }

    async function universalSaveFile(blob, defaultFileName) {
        const invoke = getTauriInvoke();
        if (invoke) {
            try {
                const arrayBuf = await blob.arrayBuffer();
                const bytes = Array.from(new Uint8Array(arrayBuf));
                const saved = await invoke('native_save_file', { defaultName: defaultFileName, bytes: bytes });
                if (saved) {
                    alert(`✅ Archivo guardado exitosamente.`);
                }
            } catch (err) {
                console.error('Tauri native save error:', err);
                alert(`Error al guardar: ${err.message || err}`);
            }
        } else {
            // Browser fallback
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.setAttribute('download', defaultFileName);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    let state = {
        theme: 'dark',
        activeDocId: null,
        activeCategoryId: null,
        viewMode: 'standard', // 'standard' | 'tiers'
        graphLayout: 'circular',
        activeChartType: 'network', // 'network' | 'heatmap' | 'bars' | 'quality'
        analyticsUnit: 'paragraph',
        analyticsMetric: 'jaccard',
        analyticsCategoryMode: 'main',
        analyticsNodeSize: 'documentShare',
        analyticsWindow: 100,
        analyticsThreshold: 0,
        analyticsDocumentId: '',
        analyticsHideZeros: true,
        isSampleLoaded: false,
        documents: [],
        categories: [],
        codings: [],
        selectedRange: null,
        // In-Text Search F3 State
        searchQuery: '',
        searchHits: [],
        searchActiveIndex: 0
    };

    window.getAppState = () => state;

    let nativeSaveTimer = null;
    let nativeSaveQueue = Promise.resolve();
    let lastParsedProjectMetadata = null;

    function projectLimits() {
        return {
            maxProjectChars: 20 * 1024 * 1024,
            maxDocumentChars: 10 * 1024 * 1024,
            maxDocuments: BETA_LIMITS.maxDocuments,
            maxCategories: BETA_LIMITS.maxCategories,
            maxCodings: 100000
        };
    }

    function requireString(value, field, maxLength, allowEmpty = false) {
        if (typeof value !== 'string' || (!allowEmpty && value.length === 0) || value.length > maxLength) {
            throw new Error(`${field} no es un texto válido o supera ${maxLength.toLocaleString()} caracteres.`);
        }
        return value;
    }

    function requireSafeId(value, field) {
        const id = requireString(value, field, 160);
        if (!/^[A-Za-z0-9._:-]+$/.test(id)) {
            throw new Error(`${field} contiene caracteres no permitidos.`);
        }
        return id;
    }

    function safeColor(value) {
        return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : '#3b82f6';
    }

    const CATEGORY_COLOR_PALETTE = [
        '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
        '#06b6d4', '#f97316', '#84cc16', '#a855f7', '#6366f1',
        '#eab308', '#14b8a6', '#ef4444', '#0284c7', '#d97706'
    ];

    function getNextDistinctCategoryColor() {
        const usedColors = new Set((state.categories || []).map(c => (c.color || '').toLowerCase()));
        for (const color of CATEGORY_COLOR_PALETTE) {
            if (!usedColors.has(color.toLowerCase())) {
                return color;
            }
        }
        const index = (state.categories || []).length;
        return CATEGORY_COLOR_PALETTE[index % CATEGORY_COLOR_PALETTE.length];
    }

    function validateProjectObject(parsed) {
        ProjectIntegrity.validateProjectMetadata(parsed);
        if (!Array.isArray(parsed.documents) || !Array.isArray(parsed.categories) || !Array.isArray(parsed.codings)) {
            throw new Error('El proyecto debe contener documents, categories y codings como listas.');
        }

        const limits = projectLimits();
        if (parsed.documents.length > limits.maxDocuments) {
            throw new Error(`El estado guardado contiene ${parsed.documents.length} documentos y esta beta admite hasta ${limits.maxDocuments}.`);
        }
        if (parsed.categories.length > limits.maxCategories) {
            throw new Error(`El estado guardado contiene ${parsed.categories.length} categorías y esta beta admite hasta ${limits.maxCategories}.`);
        }
        if (parsed.codings.length > limits.maxCodings) {
            throw new Error(`El estado guardado contiene ${parsed.codings.length.toLocaleString('es-UY')} codificaciones y esta beta admite hasta ${limits.maxCodings.toLocaleString('es-UY')}.`);
        }

        let totalChars = 0;
        const documentIds = new Set();
        const documents = parsed.documents.map((document, index) => {
            if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error(`Documento ${index + 1} inválido.`);
            const id = requireSafeId(document.id, `documents[${index}].id`);
            if (documentIds.has(id)) throw new Error(`ID de documento duplicado: ${id}`);
            documentIds.add(id);
            const title = requireString(document.title, `documents[${index}].title`, 4096);
            const content = requireString(document.content, `documents[${index}].content`, limits.maxDocumentChars, true);
            totalChars += content.length;
            if (totalChars > limits.maxProjectChars) throw new Error('El corpus supera el límite dinámico calculado según la RAM del equipo.');
            return { id, title, content, wordCount: countWords(content) };
        });

        const totalWords = documents.reduce((sum, document) => sum + document.wordCount, 0);
        if (totalWords > BETA_LIMITS.maxTotalWords) throw new Error(betaLimitMessage());

        const categoryIds = new Set();
        const categories = parsed.categories.map((category, index) => {
            if (!category || typeof category !== 'object' || Array.isArray(category)) throw new Error(`Categoría ${index + 1} inválida.`);
            const id = requireSafeId(category.id, `categories[${index}].id`);
            if (categoryIds.has(id)) throw new Error(`ID de categoría duplicado: ${id}`);
            categoryIds.add(id);
            const parentId = category.parentId == null ? null : requireSafeId(category.parentId, `categories[${index}].parentId`);
            const keywords = category.keywords == null ? [] : category.keywords;
            if (!Array.isArray(keywords) || keywords.length > 10000) throw new Error(`categories[${index}].keywords es inválido.`);
            return {
                id,
                parentId,
                code: requireString(category.code || '', `categories[${index}].code`, 512, true),
                name: requireString(category.name, `categories[${index}].name`, 4096),
                color: safeColor(category.color),
                keywords: keywords.map((keyword, keywordIndex) => requireString(keyword, `categories[${index}].keywords[${keywordIndex}]`, 16384, true)),
                description: requireString(category.description || '', `categories[${index}].description`, 1024 * 1024, true)
            };
        });
        ProjectIntegrity.validateHierarchy(categories);

        const documentMap = new Map(documents.map(document => [document.id, document]));
        const codingIds = new Set();
        const codings = parsed.codings.map((coding, index) => {
            if (!coding || typeof coding !== 'object' || Array.isArray(coding)) throw new Error(`Codificación ${index + 1} inválida.`);
            const id = requireSafeId(coding.id, `codings[${index}].id`);
            if (codingIds.has(id)) throw new Error(`ID de codificación duplicado: ${id}`);
            codingIds.add(id);
            const docId = requireSafeId(coding.docId, `codings[${index}].docId`);
            const categoryId = requireSafeId(coding.categoryId, `codings[${index}].categoryId`);
            const document = documentMap.get(docId);
            if (!document || !categoryIds.has(categoryId)) throw new Error(`La codificación ${id} contiene referencias inexistentes.`);
            const canonicalQuote = ProjectIntegrity.canonicalQuote(document, coding);
            return {
                id,
                docId,
                categoryId,
                startChar: coding.startChar,
                endChar: coding.endChar,
                quoteText: requireString(canonicalQuote, `codings[${index}].quoteText`, limits.maxDocumentChars),
                memo: requireString(coding.memo || '', `codings[${index}].memo`, 1024 * 1024, true),
                createdAt: Number.isFinite(coding.createdAt) ? coding.createdAt : Date.now(),
                source: coding.source === 'automatic' || coding.automated === true || String(id).startsWith('cod-auto-') ? 'automatic' : 'manual'
            };
        });

        return {
            documents,
            categories,
            codings,
            theme: parsed.theme === 'light' ? 'light' : 'dark',
            isSampleLoaded: parsed.isSampleLoaded === true,
            analyticsUnit: ['paragraph', 'document', 'window'].includes(parsed.analyticsUnit) ? parsed.analyticsUnit : 'paragraph',
            analyticsMetric: ['jaccard', 'count', 'documentShare'].includes(parsed.analyticsMetric) ? parsed.analyticsMetric : 'jaccard',
            analyticsCategoryMode: ['main', 'all'].includes(parsed.analyticsCategoryMode) ? parsed.analyticsCategoryMode : 'main',
            analyticsNodeSize: ['documentShare', 'count', 'perThousand'].includes(parsed.analyticsNodeSize) ? parsed.analyticsNodeSize : 'documentShare',
            analyticsWindow: Number.isFinite(parsed.analyticsWindow) ? Math.max(10, Math.min(parsed.analyticsWindow, 100000)) : 100,
            analyticsThreshold: Number.isFinite(parsed.analyticsThreshold) ? Math.max(0, Math.min(parsed.analyticsThreshold, 1)) : 0,
            analyticsDocumentId: typeof parsed.analyticsDocumentId === 'string' && documentIds.has(parsed.analyticsDocumentId) ? parsed.analyticsDocumentId : '',
            analyticsHideZeros: parsed.analyticsHideZeros !== false
        };
    }

    function parseAndValidateProject(raw) {
        if (typeof raw !== 'string' || raw.length > projectLimits().maxProjectChars) {
            throw new Error('El archivo de proyecto supera el límite dinámico calculado según la RAM.');
        }
        const parsed = JSON.parse(raw);
        lastParsedProjectMetadata = ProjectIntegrity.validateProjectMetadata(parsed);
        return validateProjectObject(parsed);
    }

    function applyValidatedProject(project) {
        Object.assign(state, project);
    }

    const SAMPLE_CATEGORIES = [
        { id: 'cat-1', parentId: null, code: 'CAT-TD', name: 'Transformación Digital', color: '#ef4444', keywords: ['tecnología', 'digital', 'automatización', 'plataformas', 'software'], description: 'Uso de nuevas tecnologías y automatización.' },
        { id: 'cat-1-1', parentId: 'cat-1', code: 'SUB-AUT', name: 'Automatización de Procesos', color: '#f87171', keywords: ['automatización', 'reestructurar'], description: 'Subcategoría: Reestructuración automatizada.' },
        { id: 'cat-2', parentId: null, code: 'CAT-DES', name: 'Desafíos & Barreras', color: '#3b82f6', keywords: ['desafío', 'resistencia', 'miedo', 'barreras', 'aislamiento'], description: 'Dificultades de adaptación y resistencia.' },
        { id: 'cat-4', parentId: null, code: 'CAT-EMPA', name: 'Conexión Humana & Empatía', color: '#f59e0b', keywords: ['empatía', 'humana', 'apoyo', 'conexión', 'escuchadas'], description: 'Relaciones interpersonales y clima laboral.' }
    ];

    const SAMPLE_DOCUMENTS = [
        {
            id: 'doc-1',
            title: 'Entrevista_01_Impacto_Tecnologico.txt',
            content: `Transcripción de Entrevista N° 1 - Impacto Digital y Trabajo Remoto

Investigador: ¿Cómo ha sido la transición hacia el uso de nuevas plataformas digitales en el equipo?

Entrevistado: Al principio fue un desafío enorme. Muchos compañeros sentían cierta resistencia al cambio porque estaban acostumbrados a los métodos tradicionales en papel. La automatización nos obligó a reestructurar la forma en que colaboramos a diario.

Investigador: ¿Qué factores facilitaron que la gente se adaptara a estos sistemas?

Entrevistado: Definitivamente el rol de la dirección fue clave. La motivación que nos transmitieron los líderes permitió perder el miedo a equivocarse. Hubo mucho énfasis en la empatía y la conexión humana durante las semanas de capacitación más intensas.

Investigador: ¿Consideras que la tecnología mejoró la comunicación interna?

Entrevistado: En parte sí, porque los mensajes fluyen más rápido. Sin embargo, si no se fomenta una comunicación abierta y transparente, los canales digitales pueden generar malentendidos o sensación de aislamiento. Por eso siempre intentamos complementar el chat con videollamadas más humanas.`,
            wordCount: 165
        },
        {
            id: 'doc-2',
            title: 'Entrevista_02_Cultura_Organizacional.txt',
            content: `Transcripción de Entrevista N° 2 - Cultura y Dinámica de Equipo

Investigador: ¿Qué valoras más dentro de la cultura de la organización hoy en día?

Entrevistado: Lo que más valoro es que exista espacio para la empatía y el apoyo entre compañeros. Cuando alguien enfrenta desafíos personales o barreras operativas, el equipo reacciona ayudando en lugar de juzgar.

Investigador: ¿Cómo influye la transformación digital en el día a día?

Entrevistado: Nos brinda herramientas increíbles para ahorrar tiempo, pero el verdadero motor sigue siendo el liderazgo empático. Una plataforma por sí sola no genera motivación; la motivación surge cuando las personas sienten que su trabajo tiene significado y son escuchadas a través de canales de comunicación fluidos.`,
            wordCount: 112
        }
    ];

    const SAMPLE_CODINGS = [
        {
            id: 'cod-1',
            docId: 'doc-1',
            categoryId: 'cat-2',
            startChar: 172,
            endChar: 275,
            quoteText: 'Muchos compañeros sentían cierta resistencia al cambio porque estaban acostumbrados a los métodos tradicionales',
            memo: 'Representa la barrera cultural inicial frente a la innovación digital.',
            createdAt: Date.now() - 100000
        },
        {
            id: 'cod-2',
            docId: 'doc-1',
            categoryId: 'cat-1-1',
            startChar: 294,
            endChar: 366,
            quoteText: 'La automatización nos obligó a reestructurar la forma en que colaboramos a diario',
            memo: 'Impacto estructural directo en los procesos cotidianos de trabajo.',
            createdAt: Date.now() - 90000
        },
        {
            id: 'cod-4',
            docId: 'doc-1',
            categoryId: 'cat-4',
            startChar: 641,
            endChar: 708,
            quoteText: 'Hubo mucho énfasis en la empatía y la conexión humana durante las semanas',
            memo: 'Dimensión socioemocional crucial durante procesos de aprendizaje.',
            createdAt: Date.now() - 70000
        },
        {
            id: 'cod-5',
            docId: 'doc-2',
            categoryId: 'cat-4',
            startChar: 175,
            endChar: 250,
            quoteText: 'Lo que más valoro es que exista espacio para la empatía y el apoyo entre compañeros',
            memo: 'Cultura centrada en las relaciones humanas de apoyo mutuo.',
            createdAt: Date.now() - 60000
        }
    ];

    let canvasNodes = [];
    let canvasLinks = [];
    let draggedNode = null;
    let dragOffset = { x: 0, y: 0 };

    function normalizeText(str) {
        if (!str) return '';
        return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function generateSuggestedCode(name, parentId) {
        if (!name) return 'CAT-01';
        const clean = name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').trim();
        const words = clean.split(/\s+/);
        let prefix = isSubcategory(parentId) ? 'SUB' : 'CAT';
        let codePart = '';
        if (words.length === 1) {
            codePart = words[0].slice(0, 4).toUpperCase();
        } else {
            codePart = words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
        }
        return `${prefix}-${codePart}`;
    }

    function isSubcategory(parentId) {
        return parentId && parentId !== 'NONE';
    }

    // ==========================================
    // 1. Initialization & Storage
    // ==========================================

    async function initApp() {
        await loadFromStorage();
        if (state.documents.length === 0) {
            loadSampleData();
        }
        setupEventListeners();
        setupAccessibleDialogs();
        setupResizablePanes();
        applyTheme();
        checkNoticeBanner();
        renderDocumentList();
        refreshAnalyticsDocumentFilter();
        renderCodebookList();
        if (state.documents.length > 0) {
            setActiveDocument(state.documents[0].id);
        }
        renderDecoderList();
        setupNetworkCanvas();
        document.getElementById('modal-pro-intro').style.display = 'flex';
    }


    function setupAccessibleDialogs() {
        const previousFocus = new WeakMap();
        const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
        document.querySelectorAll('.modal-backdrop').forEach((backdrop, index) => {
            const card = backdrop.querySelector('.modal-card');
            if (!card) return;
            const heading = card.querySelector('h1, h2, h3');
            if (heading && !heading.id) heading.id = `dialog-title-${index + 1}`;
            card.setAttribute('role', 'dialog');
            card.setAttribute('aria-modal', 'true');
            if (heading) card.setAttribute('aria-labelledby', heading.id);
            backdrop.setAttribute('aria-hidden', backdrop.style.display === 'none' ? 'true' : 'false');
            card.querySelectorAll('.modal-close').forEach(button => {
                if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', 'Cerrar diálogo');
            });

            const observer = new MutationObserver(() => {
                const visible = backdrop.style.display !== 'none';
                backdrop.setAttribute('aria-hidden', visible ? 'false' : 'true');
                if (visible) {
                    previousFocus.set(backdrop, document.activeElement);
                    queueMicrotask(() => {
                        const initial = card.querySelector('[autofocus]') || card.querySelector(focusableSelector);
                        if (initial) initial.focus();
                    });
                } else {
                    const prior = previousFocus.get(backdrop);
                    if (prior && typeof prior.focus === 'function' && document.contains(prior)) prior.focus();
                }
            });
            observer.observe(backdrop, { attributes: true, attributeFilter: ['style'] });

            backdrop.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    const close = card.querySelector('.modal-close, .modal-cancel');
                    if (close) close.click();
                    return;
                }
                if (event.key !== 'Tab') return;
                const controls = [...card.querySelectorAll(focusableSelector)].filter(element => element.offsetParent !== null);
                if (!controls.length) {
                    event.preventDefault();
                    return;
                }
                const first = controls[0], last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            });
        });
    }

    async function loadFromStorage() {
        const invoke = getTauriInvoke();
        try {
            const nativeRaw = invoke ? await invoke('load_app_state') : null;
            const raw = nativeRaw || localStorage.getItem(STORAGE_KEY);
            if (raw) {
                applyValidatedProject(parseAndValidateProject(raw));
                if ((invoke && !nativeRaw) || (lastParsedProjectMetadata && lastParsedProjectMetadata.legacy)) saveToStorage();
            }
        } catch (e) {
            console.error('Error loading from storage:', e);
            alert(`El estado guardado no pudo abrirse de forma segura: ${e.message || e}`);
        }
    }

    function createProjectPayload() {
        return ProjectIntegrity.createProjectEnvelope({
                documents: state.documents,
                categories: state.categories,
                codings: state.codings,
                theme: state.theme,
                isSampleLoaded: state.isSampleLoaded,
                analyticsUnit: state.analyticsUnit,
                analyticsMetric: state.analyticsMetric,
                analyticsCategoryMode: state.analyticsCategoryMode,
                analyticsNodeSize: state.analyticsNodeSize,
                analyticsWindow: state.analyticsWindow,
                analyticsThreshold: state.analyticsThreshold,
                analyticsDocumentId: state.analyticsDocumentId,
                analyticsHideZeros: state.analyticsHideZeros
            }, 'beta', '1.0.0');
    }

    function saveToStorage() {
        try {
            const payload = createProjectPayload();
            const serialized = JSON.stringify(payload);
            const invoke = getTauriInvoke();
            if (invoke) {
                clearTimeout(nativeSaveTimer);
                nativeSaveTimer = setTimeout(() => {
                    nativeSaveQueue = nativeSaveQueue
                        .catch(() => undefined)
                        .then(() => invoke('save_app_state', { projectJson: serialized }))
                        .then(() => localStorage.removeItem(STORAGE_KEY))
                        .catch(error => {
                            console.error('Error saving native state:', error);
                            alert(`No se pudo guardar el proyecto: ${error.message || error}`);
                        });
                }, 150);
            } else {
                localStorage.setItem(STORAGE_KEY, serialized);
            }
        } catch (e) {
            console.error('Error saving to storage:', e);
        }
    }

    function loadSampleData() {
        state.categories = JSON.parse(JSON.stringify(SAMPLE_CATEGORIES));
        state.documents = JSON.parse(JSON.stringify(SAMPLE_DOCUMENTS));
        state.codings = JSON.parse(JSON.stringify(SAMPLE_CODINGS));
        state.isSampleLoaded = true;
        saveToStorage();
        checkNoticeBanner();
    }

    function clearProject() {
        state.categories = [];
        state.documents = [];
        state.codings = [];
        state.activeDocId = null;
        state.activeCategoryId = null;
        state.isSampleLoaded = false;
        saveToStorage();
        checkNoticeBanner();
        renderDocumentList();
        renderCodebookList();
        setActiveDocument(null);
        renderDecoderList();
        setupNetworkCanvas();
    }

    function checkNoticeBanner() {
        const banner = document.getElementById('sample-notice-banner');
        if (state.isSampleLoaded) {
            banner.style.display = 'flex';
        } else {
            banner.style.display = 'none';
        }
    }

    function applyTheme() {
        document.documentElement.setAttribute('data-theme', state.theme);
    }

    // ==========================================
    // 2. Resizable Panes Engine
    // ==========================================

    function setupResizablePanes() {
        const sidebar = document.getElementById('pane-sidebar');
        const resizerLeft = document.getElementById('resizer-left');
        const analysisPane = document.getElementById('pane-analysis');
        const resizerRight = document.getElementById('resizer-right');

        let isResizingLeft = false;
        resizerLeft.addEventListener('mousedown', () => {
            isResizingLeft = true;
            resizerLeft.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        let isResizingRight = false;
        resizerRight.addEventListener('mousedown', () => {
            isResizingRight = true;
            resizerRight.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (isResizingLeft) {
                const newWidth = Math.max(180, Math.min(e.clientX, 500));
                sidebar.style.width = `${newWidth}px`;
            }
            if (isResizingRight) {
                const newWidth = Math.max(220, Math.min(window.innerWidth - e.clientX, 600));
                analysisPane.style.width = `${newWidth}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizingLeft || isResizingRight) {
                isResizingLeft = false;
                isResizingRight = false;
                resizerLeft.classList.remove('dragging');
                resizerRight.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                setupNetworkCanvas();
            }
        });
    }

    // ==========================================
    // 3. Category Occurrence Search Engine
    // ==========================================

    function autoCodeCategoryInDocument(docId, categoryId) {
        const doc = state.documents.find(d => d.id === docId);
        const cat = state.categories.find(c => c.id === categoryId);
        if (!doc || !cat) return 0;

        const content = doc.content;
        const normalizedContent = normalizeText(content);
        let addedCount = 0;

        const terms = [cat.name, cat.code, ...(cat.keywords || [])].filter(Boolean);

        terms.forEach(termRaw => {
            const raw = termRaw.trim();
            const term = normalizeText(raw);
            if (term.length < 2) return;

            let pos = 0;
            while ((pos = normalizedContent.indexOf(term, pos)) !== -1) {
                let startChar = Math.max(0, content.lastIndexOf('.', pos) + 1);
                let endChar = content.indexOf('.', pos + term.length);
                if (endChar === -1) endChar = content.length;
                else endChar = endChar + 1;

                const normalizedRange = ProjectIntegrity.trimSelectionOffsets(content, startChar, endChar);
                startChar = normalizedRange.start;
                endChar = normalizedRange.end;
                const quoteText = normalizedRange.text;

                const exists = state.codings.some(c => 
                    c.docId === docId && 
                    c.categoryId === categoryId && 
                    Math.abs(c.startChar - startChar) < 20
                );

                if (!exists && quoteText.length > 3) {
                    state.codings.push({
                        id: `cod-auto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                        docId: docId,
                        categoryId: categoryId,
                        startChar: startChar,
                        endChar: endChar,
                        quoteText: quoteText,
                        memo: `Ocurrencia identificada por término: "${raw}"`,
                        source: 'automatic',
                        createdAt: Date.now()
                    });
                    addedCount++;
                }

                pos += term.length;
            }
        });

        if (addedCount > 0) saveToStorage();
        return addedCount;
    }

    function autoCodeAllCategories() {
        if (!state.activeDocId) {
            alert('Abre primero un documento para buscar e identificar ocurrencias.');
            return;
        }

        let totalAdded = 0;
        state.categories.forEach(cat => {
            totalAdded += autoCodeCategoryInDocument(state.activeDocId, cat.id);
        });

        setActiveDocument(state.activeDocId);
        renderCodebookList();
        renderDecoderList();
        updateQualitativeCharts();

        if (totalAdded > 0) {
            alert(`🔍 ¡Búsqueda de Ocurrencias Completada!\nSe identificaron y codificaron automáticamente ${totalAdded} pasajes coincidentes en el documento.`);
        } else {
            alert('🔍 Búsqueda de Ocurrencias: No se encontraron nuevas coincidencias de términos en este documento.');
        }
    }

    // ==========================================
    // 4. In-Text Reader Search Engine (F3 Navigation)
    // ==========================================

    function performInTextSearch(query) {
        state.searchQuery = query.trim();
        state.searchHits = [];
        state.searchActiveIndex = 0;

        const countLabel = document.getElementById('reader-search-count');
        if (!state.searchQuery || !state.activeDocId) {
            countLabel.textContent = '0/0';
            renderTextContent(state.documents.find(d => d.id === state.activeDocId), state.codings.filter(c => c.docId === state.activeDocId));
            return;
        }

        const doc = state.documents.find(d => d.id === state.activeDocId);
        const docCodings = state.codings.filter(c => c.docId === state.activeDocId);
        renderTextContent(doc, docCodings);

        const textBody = document.getElementById('text-body');
        const textNodes = [];

        function getLeafTextNodes(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent.trim().length > 0) textNodes.push(node);
            } else {
                if (node.classList && node.classList.contains('tier-subline')) return;
                node.childNodes.forEach(child => getLeafTextNodes(child));
            }
        }
        getLeafTextNodes(textBody);

        const normQuery = normalizeText(state.searchQuery);

        textNodes.forEach(node => {
            const val = node.textContent;
            const normVal = normalizeText(val);
            let pos = 0;

            if (normVal.includes(normQuery)) {
                const parent = node.parentNode;
                const frag = document.createDocumentFragment();
                
                while ((pos = normVal.indexOf(normQuery, pos)) !== -1) {
                    const before = val.slice(0, pos);
                    const match = val.slice(pos, pos + state.searchQuery.length);
                    
                    if (before) frag.appendChild(document.createTextNode(before));

                    const span = document.createElement('span');
                    span.className = 'reader-search-hit';
                    span.textContent = match;
                    frag.appendChild(span);

                    state.searchHits.push(span);
                    pos += normQuery.length;
                }
                const after = val.slice(pos);
                if (after) frag.appendChild(document.createTextNode(after));

                parent.replaceChild(frag, node);
            }
        });

        const total = state.searchHits.length;
        if (total > 0) {
            state.searchActiveIndex = 0;
            updateSearchHitHighlight();
        } else {
            countLabel.textContent = '0/0';
        }
    }

    function updateSearchHitHighlight() {
        const total = state.searchHits.length;
        const countLabel = document.getElementById('reader-search-count');
        if (total === 0) {
            countLabel.textContent = '0/0';
            return;
        }

        state.searchHits.forEach((hit, idx) => {
            if (idx === state.searchActiveIndex) {
                hit.className = 'reader-search-hit reader-search-active';
                hit.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                hit.className = 'reader-search-hit';
            }
        });

        countLabel.textContent = `${state.searchActiveIndex + 1}/${total}`;
    }

    function navigateSearchHit(direction) {
        const total = state.searchHits.length;
        if (total === 0) return;

        if (direction === 'next') {
            state.searchActiveIndex = (state.searchActiveIndex + 1) % total;
        } else if (direction === 'prev') {
            state.searchActiveIndex = (state.searchActiveIndex - 1 + total) % total;
        }
        updateSearchHitHighlight();
    }

    // ==========================================
    // 5. UI Rendering Engine (Category Tree with Edit ✏️ and Delete 🗑️)
    // ==========================================

    function renderDocumentList() {
        const listEl = document.getElementById('document-list');
        refreshAnalyticsDocumentFilter();
        const filterText = document.getElementById('filter-docs').value.toLowerCase();
        document.getElementById('doc-count').textContent = state.documents.length;

        listEl.innerHTML = '';

        const filtered = state.documents.filter(d => d.title.toLowerCase().includes(filterText));
        if (filtered.length === 0) {
            listEl.innerHTML = '<li class="empty-state-sm">Sin documentos.</li>';
            return;
        }

        filtered.forEach(doc => {
            const li = document.createElement('li');
            li.className = `item-row ${doc.id === state.activeDocId ? 'active' : ''}`;
            const count = state.codings.filter(c => c.docId === doc.id).length;

            li.innerHTML = `
                <div class="item-title-wrapper">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span>${escapeHtml(doc.title)}</span>
                </div>
                <div style="display:flex; align-items:center; gap:0.25rem;">
                    <button class="btn-doc-action btn-delete-doc" title="Eliminar documento del análisis">&times;</button>
                    <span class="item-count-badge" title="${count} pasajes codificados">${count}</span>
                </div>
            `;

            const deleteBtn = li.querySelector('.btn-delete-doc');
            if (deleteBtn) {
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteDocument(doc.id);
                };
            }

            li.onclick = () => setActiveDocument(doc.id);
            listEl.appendChild(li);
        });
    }

    function deleteDocument(docId) {
        const doc = state.documents.find(d => d.id === docId);
        if (!doc) return;
        if (!confirm(`¿Deseas eliminar el documento "${doc.title}" del análisis? Esta acción también eliminará todos sus pasajes codificados.`)) {
            return;
        }

        state.documents = state.documents.filter(d => d.id !== docId);
        state.codings = state.codings.filter(c => c.docId !== docId);

        if (state.activeDocId === docId) {
            state.activeDocId = state.documents.length > 0 ? state.documents[0].id : null;
        }

        saveToStorage();

        checkNoticeBanner();
        renderDocumentList();
        refreshAnalyticsDocumentFilter();
        renderCodebookList();
        renderDecoderList();
        setActiveDocument(state.activeDocId);
        updateQualitativeCharts();
    }

    function populateParentCategorySelect(excludedCategoryId = null) {
        const parentSelect = document.getElementById('cat-parent-select');
        const excluded = excludedCategoryId
            ? ProjectIntegrity.descendantCategoryIds(state.categories, excludedCategoryId)
            : new Set();
        parentSelect.innerHTML = '<option value="NONE">Ninguna (Categoría Principal)</option>';
        state.categories.filter(category => !category.parentId && !excluded.has(category.id)).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.code ? '[' + p.code + '] ' : ''}${p.name}`;
            parentSelect.appendChild(opt);
        });
    }

    function renderCodebookList() {
        const listEl = document.getElementById('codebook-list');
        const filterText = document.getElementById('filter-codes').value.toLowerCase();
        listEl.innerHTML = '';

        populateParentCategorySelect();

        const selectFilter = document.getElementById('decoder-filter-code');
        const currentSel = selectFilter.value;
        selectFilter.innerHTML = '<option value="ALL">Todas las categorías</option>';
        state.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.parentId ? '└─ ' : ''}${cat.name}`;
            selectFilter.appendChild(opt);
        });
        selectFilter.value = currentSel || 'ALL';

        if (state.categories.length === 0) {
            listEl.innerHTML = '<li class="empty-state-sm">Sin categorías.</li>';
            return;
        }

        state.categories.filter(c => !c.parentId).forEach(parentCat => {
            appendCategoryTreeRow(listEl, parentCat, false);
            
            const children = state.categories.filter(c => c.parentId === parentCat.id);
            children.forEach(childCat => {
                appendCategoryTreeRow(listEl, childCat, true);
            });
        });
    }

    function appendCategoryTreeRow(containerEl, cat, isSub) {
        const li = document.createElement('li');
        li.className = `item-row ${isSub ? 'sub-item-row' : ''} ${cat.id === state.activeCategoryId ? 'active' : ''}`;
        const count = state.codings.filter(c => c.categoryId === cat.id).length;
        const codeDisplay = cat.code ? `<span class="cat-code-badge">${escapeHtml(cat.code)}</span>` : '';

        if (cat.id === state.activeCategoryId) {
            li.style.borderLeft = `4px solid ${safeColor(cat.color)}`;
            li.style.backgroundColor = hexToRgba(safeColor(cat.color), 0.18);
        } else {
            li.style.borderLeft = 'none';
        }

        const isCategoryActive = cat.id === state.activeCategoryId;
        li.innerHTML = `
            <div class="item-title-wrapper">
                <span class="code-color-dot" style="background:${safeColor(cat.color)}"></span>
                <span>${isSub ? '└ ' : ''}${escapeHtml(cat.name)}</span>
                ${codeDisplay}
            </div>
            <div style="display:flex; align-items:center; gap:0.2rem;">
                <button class="btn-cat-action btn-edit-cat" title="Editar categoría '✏️'">✏️</button>
                <button class="btn-cat-action btn-delete-cat" title="Eliminar categoría '🗑️'">🗑️</button>
                <button class="btn-scan-cat ${isCategoryActive ? 'active-scan' : ''}" title="🔍 Buscar e identificar ocurrencias de '${escapeHtml(cat.name)}'">🔍 Ocurrencias</button>
                <span class="item-count-badge" title="${count} pasajes">${count}</span>
            </div>
        `;

        const editBtn = li.querySelector('.btn-edit-cat');
        editBtn.onclick = (e) => {
            e.stopPropagation();
            openCategoryModal(cat);
        };

        const deleteBtn = li.querySelector('.btn-delete-cat');
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`¿Deseas eliminar la categoría "${cat.name}" y todos sus pasajes codificados asociados?`)) {
                deleteCategory(cat.id);
            }
        };

        const scanBtn = li.querySelector('.btn-scan-cat');
        scanBtn.onclick = (e) => {
            e.stopPropagation();
            if (!state.activeDocId) {
                alert('Selecciona primero un documento de la lista superior.');
                return;
            }

            const added = autoCodeCategoryInDocument(state.activeDocId, cat.id);
            state.activeCategoryId = cat.id;
            
            setActiveDocument(state.activeDocId);
            renderCodebookList();
            renderDecoderList();
            updateQualitativeCharts();
            updateCategoryFilterBanner();

            if (added > 0) {
                alert(`🔍 ¡Identificadas ${added} nuevas ocurrencias para "${cat.name}"!`);
            } else {
                alert(`🔍 Búsqueda para "${cat.name}": Se encontraron ${count} ocurrencias ya registradas.`);
            }
        };

        li.onclick = () => {
            if (state.activeCategoryId === cat.id) {
                state.activeCategoryId = null;
            } else {
                state.activeCategoryId = cat.id;
                if (state.activeDocId) {
                    const existing = state.codings.filter(c => c.docId === state.activeDocId && c.categoryId === cat.id);
                    if (existing.length === 0) {
                        autoCodeCategoryInDocument(state.activeDocId, cat.id);
                    }
                }
            }

            renderCodebookList();
            updateCategoryFilterBanner();

            if (state.activeDocId) {
                setActiveDocument(state.activeDocId);
            }

            const selectFilter = document.getElementById('decoder-filter-code');
            selectFilter.value = state.activeCategoryId || 'ALL';
            renderDecoderList();
        };

        containerEl.appendChild(li);
    }

    function deleteCategory(catId) {
        const removedIds = ProjectIntegrity.descendantCategoryIds(state.categories, catId);
        state.categories = state.categories.filter(category => !removedIds.has(category.id));
        state.codings = state.codings.filter(coding => !removedIds.has(coding.categoryId));
        if (state.activeCategoryId && removedIds.has(state.activeCategoryId)) state.activeCategoryId = null;

        saveToStorage();
        renderCodebookList();
        renderDecoderList();
        if (state.activeDocId) setActiveDocument(state.activeDocId);
        updateQualitativeCharts();
        updateCategoryFilterBanner();
    }

    function updateCategoryFilterBanner() {
        const banner = document.getElementById('active-category-banner');
        const label = document.getElementById('selected-cat-label');

        if (state.activeCategoryId) {
            const cat = state.categories.find(c => c.id === state.activeCategoryId);
            label.textContent = cat ? cat.name : 'Categoría';
            banner.style.display = 'flex';
        } else {
            banner.style.display = 'none';
        }
    }

    // --- Active Document Reader & Color Painting Engine ---
    function setActiveDocument(docId) {
        state.activeDocId = docId;
        renderDocumentList();
        renderDecoderList();

        const doc = state.documents.find(d => d.id === docId);
        const titleEl = document.getElementById('active-doc-title');
        const emptyState = document.getElementById('empty-reader');
        const textBody = document.getElementById('text-body');
        const marginBar = document.getElementById('margin-bar');

        if (!doc) {
            titleEl.textContent = 'Ningún documento seleccionado';
            document.getElementById('stat-words').textContent = '0 palabras';
            document.getElementById('stat-segments').textContent = '0 pasajes';
            emptyState.style.display = 'flex';
            textBody.style.display = 'none';
            marginBar.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        textBody.style.display = 'block';
        // Mantiene las coincidencias como una lista vertical desplazable.
        marginBar.style.display = 'block';

        titleEl.textContent = doc.title;
        document.getElementById('stat-words').textContent = `${doc.wordCount || countWords(doc.content)} palabras`;
        
        let docCodings = state.codings.filter(c => c.docId === docId);
        document.getElementById('stat-segments').textContent = `${docCodings.length} pasajes codificados`;

        renderTextContent(doc, docCodings);
        renderMarginBar(docCodings);

        if (state.searchQuery) {
            performInTextSearch(state.searchQuery);
        }
    }

    function renderTextContent(doc, docCodings) {
        const textBody = document.getElementById('text-body');
        textBody.innerHTML = '';

        if (!doc.content) return;
        const codingMap = new Map(docCodings.map(coding => [coding.id, coding]));
        const fragments = ProjectIntegrity.buildTextSegments(doc.content, docCodings);
        let firstMatchMark = null;

        fragments.forEach(frag => {
            const codings = frag.codingIds.map(id => codingMap.get(id)).filter(Boolean);
            const element = document.createElement(codings.length ? 'mark' : 'span');
            element.textContent = frag.text;
            element.dataset.textStart = String(frag.start);
            element.dataset.textEnd = String(frag.end);

            if (codings.length) {
                const categories = codings.map(coding => state.categories.find(category => category.id === coding.categoryId));
                const colors = categories.map(category => safeColor(category && category.color));
                element.className = 'coded-passage';
                element.dataset.codingIds = codings.map(coding => coding.id).join(' ');
                if (colors.length === 1) {
                    element.style.backgroundColor = hexToRgba(colors[0], 0.35);
                } else {
                    const step = 100 / colors.length;
                    const stops = colors.flatMap((color, index) => [
                        `${hexToRgba(color, 0.45)} ${(index * step).toFixed(2)}%`,
                        `${hexToRgba(color, 0.45)} ${((index + 1) * step).toFixed(2)}%`
                    ]);
                    element.style.backgroundImage = `linear-gradient(90deg, ${stops.join(', ')})`;
                    element.style.borderBottom = `2px solid ${colors[colors.length - 1]}`;
                }

                const activeCoding = codings.find(coding => coding.categoryId === state.activeCategoryId);
                if (state.activeCategoryId && activeCoding) {
                    const activeColor = safeColor((state.categories.find(category => category.id === activeCoding.categoryId) || {}).color);
                    element.style.outline = `3px solid ${activeColor}`;
                    element.style.fontWeight = '700';
                    element.style.boxShadow = `0 0 12px ${hexToRgba(activeColor, 0.6)}`;
                    if (!firstMatchMark) firstMatchMark = element;
                } else if (state.activeCategoryId) {
                    element.style.opacity = '0.3';
                }

                element.title = codings.map((coding, index) => {
                    const category = categories[index];
                    return `${category ? category.name : 'Categoría'}${coding.memo ? ` • Memo: ${coding.memo}` : ''}`;
                }).join('\n');
                element.onclick = event => {
                    event.stopPropagation();
                    if (codings.length === 1) {
                        showCodingContextMenu(event, codings[0]);
                        return;
                    }
                    const choices = codings.map((coding, index) => {
                        const category = state.categories.find(item => item.id === coding.categoryId);
                        return `${index + 1}. ${category ? category.name : coding.categoryId}`;
                    }).join('\n');
                    const selected = Number.parseInt(prompt(`Este tramo tiene varias codificaciones:\n${choices}\n\nIndica el número que deseas gestionar:`), 10);
                    if (selected >= 1 && selected <= codings.length) showCodingContextMenu(event, codings[selected - 1]);
                };
            }

            textBody.appendChild(element);

            if (state.viewMode === 'tiers' && codings.length) {
                codings.filter(coding => coding.endChar === frag.end).forEach(coding => {
                    const category = state.categories.find(item => item.id === coding.categoryId);
                    const tierDiv = document.createElement('div');
                    tierDiv.className = 'tier-subline';
                    tierDiv.style.userSelect = 'none';
                    const memoText = coding.memo || 'Sin decodificación escrita aún (Haz clic para agregar nota/interpretación)';
                    tierDiv.innerHTML = `<strong>[${escapeHtml(category ? category.name : 'Categoría')} / Memo]:</strong> ${escapeHtml(memoText)}`;
                    textBody.appendChild(tierDiv);
                });
            }
        });

        if (firstMatchMark) {
            setTimeout(() => {
                firstMatchMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }

    function renderMarginBar(docCodings) {
        const marginBar = document.getElementById('margin-bar');
        marginBar.innerHTML = '';

        if (docCodings.length === 0) {
            marginBar.innerHTML = '<div style="font-size:0.7rem; color:var(--text-muted); text-align:center;">Sin códigos</div>';
            return;
        }

        docCodings.forEach(coding => {
            const cat = state.categories.find(c => c.id === coding.categoryId);
            if (!cat) return;

            const stripe = document.createElement('div');
            stripe.className = 'margin-stripe';
            stripe.style.borderColor = safeColor(cat.color);

            if (state.activeCategoryId && coding.categoryId === state.activeCategoryId) {
                stripe.style.fontWeight = '700';
                stripe.style.boxShadow = `0 0 8px ${safeColor(cat.color)}`;
            } else if (state.activeCategoryId && coding.categoryId !== state.activeCategoryId) {
                stripe.style.opacity = '0.3';
            }

            stripe.innerHTML = `
                <span class="code-color-dot" style="background:${safeColor(cat.color)};"></span>
                <span>${escapeHtml(cat.name)}</span>
            `;
            stripe.title = `Cita: "${coding.quoteText.slice(0, 40)}..."`;

            stripe.onclick = () => {
                const mark = document.querySelector(`mark[data-coding-ids~="${coding.id}"]`);
                if (mark) {
                    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    mark.style.outline = `2px solid ${safeColor(cat.color)}`;
                    setTimeout(() => mark.style.outline = 'none', 1500);
                }
            };

            marginBar.appendChild(stripe);
        });
    }

    // --- Decoder Tab Cards ---
    function renderDecoderList() {
        const container = document.getElementById('decoder-list');
        const catFilter = document.getElementById('decoder-filter-code').value;
        container.innerHTML = '';

        const activeDoc = state.documents.find(document => document.id === state.activeDocId);
        const context = document.getElementById('decoder-document-context');
        if (context) context.textContent = activeDoc ? `Documento actual: ${activeDoc.title}` : 'Selecciona un documento para ver sus pasajes.';

                // Aunque la Beta admite pocos documentos, el panel debe acompañar
        // siempre a la fuente abierta y no mezclar evidencias de otro archivo.
        let filtered = state.codings.filter(coding => coding.docId === state.activeDocId);
        if (catFilter !== 'ALL') {
            filtered = filtered.filter(coding => coding.categoryId === catFilter);
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state-sm">No hay pasajes codificados para el documento seleccionado.</div>';
            return;
        }

        filtered.forEach(coding => {
            const cat = state.categories.find(c => c.id === coding.categoryId);
            const doc = state.documents.find(d => d.id === coding.docId);
            if (!cat) return;

            const card = document.createElement('div');
            card.className = 'decoder-card';
            card.innerHTML = `
                <div class="decoder-card-header">
                    <span class="tag-badge" style="background:${safeColor(cat.color)}">
                        ${escapeHtml(cat.name)}
                    </span>
                    <span style="font-size:0.75rem; color:var(--text-muted);">${doc ? escapeHtml(doc.title) : ''}</span>
                </div>
                <blockquote class="decoder-quote">"${escapeHtml(coding.quoteText)}"</blockquote>
                <div class="decoder-memo">
                    <strong>Decodificación / Significado:</strong><br>
                    ${coding.memo ? escapeHtml(coding.memo) : '<em style="color:var(--text-muted);">Sin nota asignada aún. Haz clic para agregar una.</em>'}
                </div>
            `;

            card.onclick = () => {
                if (coding.docId !== state.activeDocId) {
                    setActiveDocument(coding.docId);
                }
                setTimeout(() => {
                    const mark = document.querySelector(`mark[data-coding-ids~="${coding.id}"]`);
                    if (mark) {
                        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        mark.style.outline = `3px solid ${safeColor(cat.color)}`;
                        mark.style.boxShadow = `0 0 12px ${hexToRgba(safeColor(cat.color), 0.8)}`;
                        setTimeout(() => {
                            mark.style.outline = 'none';
                            mark.style.boxShadow = 'none';
                        }, 2000);
                    }
                }, 100);
            };

            container.appendChild(card);
        });
    }

    // ==========================================
    // 6. Qualitative Visual Charts Engine (Network, Crosstab Heatmap, Bars)
    // ==========================================

    function getAnalyticsOptions() {
        return {
            unit: state.analyticsUnit,
            metric: state.analyticsMetric,
            categoryMode: state.analyticsCategoryMode,
            windowSize: state.analyticsWindow,
            threshold: state.analyticsThreshold,
            documentId: state.analyticsDocumentId
        };
    }

    function getAnalytics() {
        return window.AnalyticsEngine.analyze(state, getAnalyticsOptions());
    }

    function metricLabel() {
        if (state.analyticsMetric === 'count') return 'coocurrencias';
        if (state.analyticsMetric === 'documentShare') return '% de documentos';
        return 'Jaccard';
    }

    function categoryModeLabel() {
        return state.analyticsCategoryMode === 'main' ? 'categorías principales (subcategorías consolidadas)' : 'árbol completo (codificación directa)';
    }

    function nodeSizeValue(stat) {
        if (!stat) return 0;
        if (state.analyticsNodeSize === 'count') return stat.count;
        if (state.analyticsNodeSize === 'perThousand') return stat.perThousand;
        return stat.documentShare;
    }

    function formatMetric(edge) {
        if (!edge) return '0';
        if (state.analyticsMetric === 'count') return String(edge.count);
        return `${(edge.metricValue * 100).toFixed(1)}%`;
    }

    function refreshAnalyticsDocumentFilter() {
        const select = document.getElementById('analytics-document-filter');
        if (!select) return;
        const current = state.analyticsDocumentId;
        select.innerHTML = '<option value="">Todo el corpus</option>' + state.documents.map(doc => `<option value="${doc.id}">${escapeHtml(doc.title)}</option>`).join('');
        select.value = state.documents.some(doc => doc.id === current) ? current : '';
        state.analyticsDocumentId = select.value;
    }

    function closeChartDrilldown() {
        const panel = document.getElementById('chart-drilldown');
        if (panel) panel.style.display = 'none';
    }

    function openChartDrilldown(title, evidence) {
        const panel = document.getElementById('chart-drilldown');
        const body = document.getElementById('chart-drilldown-body');
        document.getElementById('chart-drilldown-title').textContent = title;
        body.innerHTML = '';
        if (!evidence || !evidence.length) {
            body.innerHTML = '<div class="empty-state-sm">No hay evidencia para esta selección.</div>';
        } else {
            evidence.forEach(item => {
                const doc = state.documents.find(d => d.id === item.docId);
                const div = document.createElement('div');
                div.className = 'evidence-item';
                div.innerHTML = `<strong>${doc ? escapeHtml(doc.title) : 'Documento'}</strong><blockquote>“${escapeHtml(item.quoteA || '')}”<br>“${escapeHtml(item.quoteB || '')}”</blockquote>`;
                div.onclick = () => {
                    if (item.docId) setActiveDocument(item.docId);
                    setTimeout(() => {
                        const mark = document.querySelector(`mark[data-coding-ids~="${item.codingAId}"]`);
                        if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 80);
                };
                body.appendChild(div);
            });
        }
        panel.style.display = 'block';
    }

    function updateQualitativeCharts() {
        ['network', 'heatmap', 'bars', 'quality'].forEach(type => {
            const el = document.getElementById(`chart-container-${type}`);
            if (el) el.style.display = state.activeChartType === type ? 'block' : 'none';
        });
        document.getElementById('graph-toolbar-container').style.display = state.activeChartType === 'network' ? 'flex' : 'none';
        if (state.activeChartType === 'network') {
            updateNetworkCanvas();
        } else if (state.activeChartType === 'heatmap') {
            renderQualitativeHeatmap();
        } else if (state.activeChartType === 'bars') {
            renderProportionalBars();
        } else if (state.activeChartType === 'quality') {
            renderQualityDashboard();
        }
    }

    function renderQualitativeHeatmap() {
        const wrapper = document.getElementById('heatmap-table-wrapper');
        wrapper.innerHTML = '';

        const analytics = getAnalytics();
        if (analytics.categories.length === 0 || analytics.documents.length === 0) {
            wrapper.innerHTML = '<div class="empty-state-sm">Carga documentos y categorías para visualizar la matriz de coocurrencia.</div>';
            return;
        }
        const maxValue = Math.max(0.0001, ...analytics.edges.map(edge => edge.metricValue));
        document.getElementById('heatmap-description').textContent = `Categoría × categoría por ${state.analyticsUnit}; ${categoryModeLabel()}; métrica: ${metricLabel()}. Haz clic en una celda para ver evidencia.`;
        let html = '<table class="heatmap-table"><thead><tr><th>Categoría</th>' + analytics.categories.map(cat => `<th title="${escapeHtml(cat.name)}">${escapeHtml(cat.code || cat.name.slice(0, 6))}</th>`).join('') + '</tr></thead><tbody>';
        analytics.categories.forEach(catA => {
            html += `<tr><td style="text-align:left;font-weight:600;"><span class="code-color-dot" style="background:${safeColor(catA.color)}"></span>${escapeHtml(catA.name)}</td>`;
            analytics.categories.forEach(catB => {
                if (catA.id === catB.id) {
                    const stat = analytics.statsMap.get(catA.id);
                    html += `<td title="Frecuencia de ${escapeHtml(catA.name)}"><strong>${stat.count}</strong></td>`;
                    return;
                }
                const edge = analytics.matrix[catA.id][catB.id];
                const visible = edge && (!state.analyticsHideZeros || edge.count > 0);
                const alpha = visible ? 0.12 + 0.78 * (edge.metricValue / maxValue) : 0;
                html += `<td class="heatmap-cell-intensity" data-source="${catA.id}" data-target="${catB.id}" style="background:${visible ? hexToRgba(safeColor(catA.color), alpha) : 'transparent'};">${visible ? formatMetric(edge) : '·'}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        wrapper.innerHTML = html;
        wrapper.querySelectorAll('[data-source]').forEach(cell => {
            cell.onclick = () => {
                const source = analytics.categoryMap.get(cell.dataset.source);
                const target = analytics.categoryMap.get(cell.dataset.target);
                const edge = analytics.matrix[source.id][target.id];
                openChartDrilldown(`${source.name} ↔ ${target.name}: ${formatMetric(edge)}`, edge.evidence);
            };
        });
    }

    function renderProportionalBars() {
        const wrapper = document.getElementById('proportional-bars-list');
        wrapper.innerHTML = '';

        const analytics = getAnalytics();
        if (analytics.categories.length === 0) {
            wrapper.innerHTML = '<div class="empty-state-sm">Sin categorías.</div>';
            return;
        }
        document.getElementById('bars-description').innerHTML = `${categoryModeLabel()}. <strong>Barra sólida:</strong> frecuencia absoluta. <strong>Barra suave:</strong> tasa por 1.000 palabras. El texto indica presencia documental.`;
        const sorted = [...analytics.categories].sort((a, b) => analytics.statsMap.get(b.id).perThousand - analytics.statsMap.get(a.id).perThousand);
        const maxCount = Math.max(1, ...analytics.stats.map(stat => stat.count));
        const maxRate = Math.max(0.001, ...analytics.stats.map(stat => stat.perThousand));
        sorted.forEach(cat => {
            const stat = analytics.statsMap.get(cat.id);
            const parentCat = cat.parentId ? state.categories.find(p => p.id === cat.parentId) : null;
            const div = document.createElement('div');
            div.className = 'metric-row';
            div.innerHTML = `
                <div class="metric-row-head"><span><span class="code-color-dot" style="background:${safeColor(cat.color)}"></span><strong>${parentCat ? escapeHtml(parentCat.name) + ' ➔ ' : ''}${escapeHtml(cat.name)}</strong></span><span>${stat.count} pasajes · ${stat.perThousand.toFixed(1)}/1.000 palabras</span></div>
                <div class="metric-bars"><div class="metric-bar" title="Frecuencia absoluta" style="width:${stat.count / maxCount * 100}%;background:${safeColor(cat.color)};"></div><div class="metric-bar" title="Tasa normalizada" style="width:${stat.perThousand / maxRate * 100}%;background:${hexToRgba(safeColor(cat.color), 0.45)};"></div></div>
                <div class="metric-row-sub">Presente en ${stat.docCount}/${analytics.documents.length} documentos (${(stat.documentShare * 100).toFixed(1)}%) · memos ${stat.memoCount}/${stat.count}</div>
            `;
            wrapper.appendChild(div);
        });
    }

    function renderQualityDashboard() {
        const wrapper = document.getElementById('quality-dashboard');
        const report = window.AnalyticsEngine.quality(state, { documentId: state.analyticsDocumentId });
        const cards = [
            ['Cobertura', `${(report.coverage * 100).toFixed(1)}%`, `${report.codedChars} de ${report.totalChars} caracteres`, report.coverage > 0 ? 'ok' : 'warn'],
            ['Memos faltantes', report.missingMemos.length, 'pasajes sin interpretación', report.missingMemos.length ? 'warn' : 'ok'],
            ['Categorías incompletas', report.incompleteCategories.length, 'sin código, criterio o palabras clave', report.incompleteCategories.length ? 'warn' : 'ok'],
            ['Documentos sin codificar', report.uncodedDocuments.length, 'documentos sin evidencia', report.uncodedDocuments.length ? 'warn' : 'ok'],
            ['Duplicados', report.duplicates.length, 'codificaciones idénticas', report.duplicates.length ? 'warn' : 'ok'],
            ['Solapamientos', report.overlaps.length, 'pares que se superponen', report.overlaps.length ? 'warn' : 'ok'],
            ['Categorías de un solo documento', report.singleDocumentCategories.length, 'revisar transferibilidad', report.singleDocumentCategories.length ? 'warn' : 'ok'],
            ['Manual / automática', `${report.manual} / ${report.automatic}`, `${report.totalCodings} codificaciones`, '']
        ];
        wrapper.innerHTML = cards.map((card, index) => `<div class="quality-card ${card[3]}" data-quality-index="${index}"><strong>${card[1]}</strong><span>${card[0]}<br>${card[2]}</span></div>`).join('');
        const details = [[], report.missingMemos, report.incompleteCategories, report.uncodedDocuments, report.duplicates.flat(), report.overlaps.flat(), report.singleDocumentCategories, []];
        wrapper.querySelectorAll('[data-quality-index]').forEach(card => {
            card.onclick = () => {
                const index = Number(card.dataset.qualityIndex);
                const rows = details[index];
                const evidence = rows.map(item => ({ docId: item.docId || item.id, codingAId: item.id, quoteA: item.quoteText || item.name || item.title || '', quoteB: item.memo || '' }));
                openChartDrilldown(cards[index][0], evidence);
            };
        });
    }

    // ==========================================
    // 7. Matriz Categorial & PDF Export Engines
    // ==========================================

    function renderCategoricalMatrixModal() {
        const tableBody = document.getElementById('stats-table-body');
        const fragContainer = document.getElementById('matrix-fragments-container');
        tableBody.innerHTML = '';
        fragContainer.innerHTML = '';

        const analytics = getAnalytics();
        const totalCodings = analytics.codings.length;

        analytics.categories.forEach(cat => {
            const stat = analytics.statsMap.get(cat.id) || { count: 0, documentShare: 0, perThousand: 0 };
            const count = stat.count;
            const percentage = totalCodings > 0 ? ((count / totalCodings) * 100).toFixed(1) : '0.0';
            const parentCat = cat.parentId ? state.categories.find(p => p.id === cat.parentId) : null;
            const keywordsStr = [cat.name, cat.code, ...(cat.keywords || [])].filter(Boolean).join(', ');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="cat-code-badge">${escapeHtml(cat.code || '-')}</span></td>
                <td>
                    <span class="code-color-dot" style="background:${safeColor(cat.color)}; display:inline-block; margin-right:4px;"></span>
                    <strong>${parentCat ? escapeHtml(parentCat.name) + ' ➔ ' : ''}${escapeHtml(cat.name)}</strong>
                </td>
                <td><code style="font-size:0.75rem;">${escapeHtml(keywordsStr)}</code></td>
                <td><strong>${count}</strong></td>
                <td>${percentage}%</td>
                <td>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width:${percentage}%; background:${safeColor(cat.color)};"></div>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);

            const catCodings = analytics.codings.filter(c => c.categoryId === cat.id);
            catCodings.forEach(coding => {
                const doc = state.documents.find(d => d.id === coding.docId);
                const card = document.createElement('div');
                card.className = 'decoder-card';
                card.innerHTML = `
                    <div class="decoder-card-header">
                        <span class="tag-badge" style="background:${safeColor(cat.color)}">
                            ${parentCat ? escapeHtml(parentCat.name) + ' ➔ ' : ''}${escapeHtml(cat.name)}
                        </span>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${doc ? escapeHtml(doc.title) : ''}</span>
                    </div>
                    <blockquote class="decoder-quote">"${escapeHtml(coding.quoteText)}"</blockquote>
                    <div class="decoder-memo">
                        <strong>Decodificación / Significado:</strong> ${coding.memo ? escapeHtml(coding.memo) : 'Sin nota.'}
                    </div>
                `;
                fragContainer.appendChild(card);
            });
        });

        document.getElementById('modal-matrix').style.display = 'flex';
    }

    function getReportOptions() {
        const detail = (document.querySelector('input[name="report-detail"]:checked') || {}).value || 'summary';
        const analytics = getAnalytics();
        const quality = window.AnalyticsEngine.quality(state, { documentId: state.analyticsDocumentId });
        const allowedDocs = new Set(analytics.documents.map(doc => doc.id));
        return {
            title: document.getElementById('report-title').value.trim() || 'Informe de análisis cualitativo',
            author: document.getElementById('report-author').value.trim() || 'Equipo investigador',
            objective: document.getElementById('report-objective').value.trim(),
            methodology: document.getElementById('report-methodology').value.trim(),
            conclusions: document.getElementById('report-conclusions').value.trim(),
            evaluation: true,
            detail,
            includeEvidence: document.getElementById('report-include-evidence').checked,
            includeRelations: document.getElementById('report-include-relations').checked,
            includeQuality: document.getElementById('report-include-quality').checked,
            date: new Date().toLocaleDateString('es-UY'),
            analytics,
            quality,
            categories: analytics.categories,
            documents: analytics.documents,
            codings: analytics.codings.filter(coding => allowedDocs.has(coding.docId))
        };
    }

    function updateReportPreview() {
        const preview = document.getElementById('report-preview');
        if (!preview || document.getElementById('modal-report-builder').style.display === 'none') return;
        const options = getReportOptions();
        const top = [...options.analytics.stats].sort((a, b) => b.perThousand - a.perThousand).slice(0, 3).map(stat => {
            const category = state.categories.find(cat => cat.id === stat.id);
            return `${category ? category.name : stat.id} (${stat.perThousand.toFixed(1)}/1.000)`;
        });
        preview.innerHTML = `<strong>Vista previa del contenido</strong><br>${options.analytics.documents.length} documentos · ${options.codings.length} pasajes · ${options.categories.length} categorías.<br><strong>Categorías principales:</strong> ${escapeHtml(top.join(', ') || 'Sin datos')}.<br>Secciones: resumen, corpus/metodología, distribución${options.includeRelations ? ', relaciones' : ''}${options.includeQuality ? ', calidad' : ''}${options.includeEvidence ? ', evidencias/memos' : ''}, conclusiones y apéndice.`;
    }

    function openReportBuilder() {
        document.getElementById('modal-matrix').style.display = 'none';
        const methodology = document.getElementById('report-methodology');
        if (!methodology.value) methodology.value = `Codificación categorial del corpus con ${categoryModeLabel()}. Unidad de coocurrencia: ${state.analyticsUnit}; métrica de asociación: ${metricLabel()}.`;
        document.getElementById('modal-report-builder').style.display = 'flex';
        updateReportPreview();
    }

    async function exportAnalyticalReport() {
        const options = getReportOptions();
        const safeTitle = options.title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_').slice(0, 60);
        const blob = await window.PdfReportExporter.createAnalyticalReport(options);
        await universalSaveFile(blob, `${safeTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    function exportExecutiveReportHTML() {

        const totalCodings = state.codings.length;
        const totalDocs = state.documents.length;

        let rowsHtml = '';
        state.categories.forEach(cat => {
            const count = state.codings.filter(c => c.categoryId === cat.id).length;
            const percentage = totalCodings > 0 ? ((count / totalCodings) * 100).toFixed(1) : '0.0';
            const catCodings = state.codings.filter(c => c.categoryId === cat.id);

            rowsHtml += `
                <div style="margin-bottom:1.5rem; page-break-inside:avoid;">
                    <h3 style="color:${safeColor(cat.color)}; border-bottom:2px solid ${safeColor(cat.color)}; padding-bottom:0.3rem;">
                        [${escapeHtml(cat.code || 'CAT')}] ${escapeHtml(cat.name)} — ${percentage}% (${count} pasajes)
                    </h3>
                    <p style="font-size:0.85rem; color:#475569;"><em>Palabras Clave / Términos:</em> ${escapeHtml([cat.name, cat.code, ...(cat.keywords || [])].filter(Boolean).join(', '))}</p>
            `;

            if (catCodings.length === 0) {
                rowsHtml += `<p style="font-size:0.85rem; color:#94a3b8; font-style:italic;">Sin pasajes registrados para esta categoría.</p>`;
            } else {
                catCodings.forEach(coding => {
                    const doc = state.documents.find(d => d.id === coding.docId);
                    rowsHtml += `
                        <div style="background:#f8fafc; border-left:4px solid ${safeColor(cat.color)}; padding:0.75rem; margin-top:0.6rem; border-radius:4px;">
                            <div style="font-weight:bold; font-size:0.8rem; color:#334155; margin-bottom:0.25rem;">📄 Documento: ${doc ? escapeHtml(doc.title) : 'Doc'}</div>
                            <blockquote style="margin:0.25rem 0; font-style:italic; font-size:0.9rem; color:#0f172a;">"${escapeHtml(coding.quoteText)}"</blockquote>
                            <div style="font-size:0.85rem; color:#1e293b; margin-top:0.35rem;"><strong>Decodificación / Memo:</strong> ${coding.memo ? escapeHtml(coding.memo) : 'Sin nota.'}</div>
                        </div>
                    `;
                });
            }

            rowsHtml += `</div>`;
        });

        const reportHtml = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte ejecutivo cualitativo - AnalizadorCualiUY Pro</title>
                <style>
                    body { font-family: 'Segoe UI', Roboto, sans-serif; padding: 2rem; color: #0f172a; line-height: 1.5; }
                    .header-title { font-size: 1.6rem; margin-bottom: 0.2rem; }
                    .meta-info { font-size: 0.85rem; color: #64748b; border-bottom: 1px solid #cbd5e1; padding-bottom: 1rem; margin-bottom: 1.5rem; }
                    .summary-box { background: #f1f5f9; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; display: flex; gap: 2rem; }
                    @media print { body { padding: 0; } .btn-print { display: none; } }
                </style>
            </head>
            <body>
                <button class="btn-print" onclick="window.print()" style="float:right; padding:0.5rem 1rem; background:#3b82f6; color:#fff; border:none; border-radius:4px; cursor:pointer;">🖨️ Imprimir / Guardar en PDF</button>
                <h1 class="header-title">Reporte ejecutivo de análisis cualitativo</h1>
                <div class="meta-info">
                    <strong>AnalizadorCualiUY Pro</strong> • <strong>Prof. Esp. Santiago Hernández</strong><br>
                    Fecha de emisión: ${new Date().toLocaleDateString('es-UY')}
                </div>

                <div class="summary-box">
                    <div><strong>Documentos Procesados:</strong> ${totalDocs}</div>
                    <div><strong>Categorías Activas:</strong> ${state.categories.length}</div>
                    <div><strong>Pasajes Codificados Totales:</strong> ${totalCodings}</div>
                </div>

                <h2>Matriz categorial y evidencias decodificadas</h2>
                ${rowsHtml}
            </body>
            </html>
        `;

        const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
        universalSaveFile(blob, `AnalizadorCualiUY_Pro_Reporte_Ejecutivo_${new Date().toISOString().slice(0, 10)}.html`);
    }

    // --- Export Coded Document as Painted PDF ---
    function openExportPdfModal() {
        if (!state.activeDocId) {
            alert('Abre primero un documento para exportar a PDF.');
            return;
        }

        const container = document.getElementById('pdf-category-checkboxes');
        container.innerHTML = '';

        if (state.categories.length === 0) {
            alert('No hay categorías creadas.');
            return;
        }

        state.categories.forEach(cat => {
            const isSelected = !state.activeCategoryId || state.activeCategoryId === cat.id;
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '0.4rem';
            label.style.fontSize = '0.85rem';
            label.style.cursor = 'pointer';

            label.innerHTML = `
                <input type="checkbox" class="pdf-cat-checkbox" value="${cat.id}" ${isSelected ? 'checked' : ''}>
                <span class="code-color-dot" style="background:${safeColor(cat.color)}"></span>
                <span>${cat.parentId ? '└─ ' : ''}${escapeHtml(cat.name)}</span>
            `;
            container.appendChild(label);
        });

        document.getElementById('modal-export-pdf').style.display = 'flex';
    }

    function preflightBetaPdfExport(doc, categories, codings) {
        const errors = [];
        if (!doc) errors.push('No hay documento activo.');
        if (!categories.length) errors.push('No hay categorías seleccionadas.');
        const categoryIds = new Set(categories.map(category => category.id));
        codings.forEach((coding, index) => {
            if (coding.docId !== doc.id) errors.push(`El pasaje ${index + 1} pertenece a otro documento.`);
            if (!categoryIds.has(coding.categoryId)) errors.push(`El pasaje ${index + 1} pertenece a una categoría no seleccionada.`);
            try {
                if (ProjectIntegrity.canonicalQuote(doc, coding) !== coding.quoteText) {
                    errors.push(`El texto del pasaje ${index + 1} no coincide con su posición en el documento.`);
                }
            } catch (_) {
                errors.push(`La posición del pasaje ${index + 1} no es válida.`);
            }
        });
        if (errors.length) {
            alert(`⛔ Exportación detenida.\n\n${errors.slice(0, 5).map(error => `• ${error}`).join('\n')}`);
            return false;
        }
        return confirm(`✅ Verificación previa de PDF Beta\n${doc.title}\n${categories.length} categoría(s) · ${codings.length} pasaje(s) activo(s).\n\n¿Deseas continuar con la exportación?`);
    }

    async function generateCodedDocumentPDF() {
        const checkboxes = document.querySelectorAll('.pdf-cat-checkbox:checked');
        const selectedCatIds = new Set(Array.from(checkboxes).map(cb => cb.value));

        if (selectedCatIds.size === 0) {
            alert('Selecciona al menos una categoría para pintar en el PDF.');
            return;
        }

        const doc = state.documents.find(d => d.id === state.activeDocId);
        if (!doc) {
            alert('Abre un documento antes de exportar.');
            return;
        }

        const docCodings = state.codings.filter(c => c.docId === doc.id && selectedCatIds.has(c.categoryId));
        const sortedCodings = [...docCodings].sort((a, b) => a.startChar - b.startChar);
        const categories = state.categories.filter(category => selectedCatIds.has(category.id));
        if (!preflightBetaPdfExport(doc, categories, sortedCodings)) return;
        document.getElementById('modal-export-pdf').style.display = 'none';

        if (window.PdfReportExporter && window.AnalyticsEngine) {
            const scoped = { documents: [doc], categories, codings: sortedCodings };
            const analytics = window.AnalyticsEngine.analyze(scoped, Object.assign({}, getAnalyticsOptions(), { documentId: '' }));
            const quality = window.AnalyticsEngine.quality(scoped);
            const blob = await window.PdfReportExporter.createAnalyticalReport({
                title: `Documento codificado: ${doc.title}`,
                author: 'Prof. Esp. Santiago Hernández',
                date: new Date().toLocaleDateString('es-UY'),
                objective: `Presentar el documento completo y la trazabilidad de ${sortedCodings.length} pasajes codificados.`,
                methodology: `Categorías incluidas: ${categories.map(category => category.name).join(', ')}. Los pasajes se listan con su memo y fuente.`,
                conclusions: doc.content,
                evaluation: true,
                detail: 'full',
                includeEvidence: true,
                includeRelations: true,
                includeQuality: true,
                analytics,
                quality,
                categories,
                documents: [doc],
                codings: sortedCodings
            });
            await universalSaveFile(blob, `AnalizadorCualiUY_Beta_${doc.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}_Codificado_${new Date().toISOString().slice(0, 10)}.pdf`);
            return;
        }

        const text = doc.content;
        let bodyHtml = '';
        const codingMap = new Map(sortedCodings.map(coding => [coding.id, coding]));
        ProjectIntegrity.buildTextSegments(text, sortedCodings).forEach(segment => {
            const codings = segment.codingIds.map(id => codingMap.get(id)).filter(Boolean);
            if (!codings.length) {
                bodyHtml += escapeHtml(segment.text);
                return;
            }
            const categories = codings.map(coding => state.categories.find(category => category.id === coding.categoryId));
            const colors = categories.map(category => safeColor(category && category.color));
            const names = categories.map(category => category ? category.name : 'Categoría');
            const background = colors.length === 1
                ? hexToRgba(colors[0], 0.4)
                : `linear-gradient(90deg, ${colors.map((color, index) => `${hexToRgba(color, 0.45)} ${(index * 100 / colors.length).toFixed(2)}%, ${hexToRgba(color, 0.45)} ${((index + 1) * 100 / colors.length).toFixed(2)}%`).join(', ')})`;
            bodyHtml += `<mark style="background:${background}; border-left:3px solid ${colors[0]}; padding:0.1rem 0.2rem; border-radius:2px; font-weight:600; color:#0f172a;" title="${escapeHtml(names.join(' + '))}">${escapeHtml(segment.text)}</mark>`;
            if (state.viewMode === 'tiers') {
                codings.filter(coding => coding.endChar === segment.end).forEach((coding, index) => {
                    const category = state.categories.find(item => item.id === coding.categoryId);
                    bodyHtml += `<span style="display:block; font-size:0.75rem; color:#475569; font-weight:normal; background:#f1f5f9; border-left:2px solid ${colors[index] || colors[0]}; padding:0.2rem 0.4rem; margin:0.2rem 0; font-style:italic;"><strong>[${escapeHtml(category ? category.name : 'Categoría')} / Memo]:</strong> ${escapeHtml(coding.memo || 'Sin nota')}</span>`;
                });
            }
        });

        // Build Category Palette Legend
        let legendHtml = '';
        state.categories.filter(c => selectedCatIds.has(c.id)).forEach(cat => {
            legendHtml += `
                <span style="display:inline-flex; align-items:center; gap:0.3rem; margin-right:1rem; font-size:0.8rem; background:#f8fafc; padding:0.2rem 0.5rem; border-radius:4px; border:1px solid #e2e8f0;">
                    <span style="width:12px; height:12px; border-radius:50%; background:${safeColor(cat.color)}; display:inline-block;"></span>
                    <strong>${escapeHtml(cat.name)}</strong>
                </span>
            `;
        });

        const pdfHtml = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>${escapeHtml(doc.title)} - Documento Codificado PDF</title>
                <style>
                    body { font-family: 'Segoe UI', Roboto, sans-serif; padding: 2rem; color: #0f172a; line-height: 1.6; font-size: 0.95rem; }
                    .pdf-header { border-bottom: 2px solid #cbd5e1; padding-bottom: 0.75rem; margin-bottom: 1.5rem; }
                    .pdf-title { font-size: 1.5rem; margin-bottom: 0.3rem; }
                    .legend-box { margin-bottom: 1.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
                    .text-content { white-space: pre-wrap; font-family: inherit; line-height: 1.8; text-align: justify; }
                    @media print { body { padding: 0; } .btn-print { display: none; } }
                </style>
            </head>
            <body>
                <button class="btn-print" onclick="window.print()" style="float:right; padding:0.6rem 1.2rem; background:#3b82f6; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">🖨️ Imprimir / Guardar en PDF</button>
                <div class="pdf-header">
                    <h1 class="pdf-title">📄 Documento Transcrito y Codificado</h1>
                    <div style="font-size:0.85rem; color:#64748b;">
                        <strong>Archivo:</strong> ${escapeHtml(doc.title)} • <strong>Pasajes Pintados:</strong> ${sortedCodings.length}<br>
                        <strong>AnalizadorCualiUY Beta</strong> • <strong>Prof. Esp. Santiago Hernández</strong>
                    </div>
                </div>

                <div class="legend-box">
                    <strong style="width:100%; font-size:0.85rem; color:#475569;">Leyenda de Categorías Seleccionadas:</strong>
                    ${legendHtml}
                </div>

                <div class="text-content">
${bodyHtml}
                </div>
            </body>
            </html>
        `;

        const pdfBlob = new Blob([pdfHtml], { type: 'text/html;charset=utf-8' });
        universalSaveFile(pdfBlob, `AnalizadorCualiUY_Pro_${doc.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}_Codificado_${new Date().toISOString().slice(0, 10)}.html`);
    }

    let pendingCodebookImportItems = null;

    function generateSampleCodebookCSV() {
        const csvContent = 'Código,Categoría,Jerarquía,Descripción,Criterios metodológicos,Términos,Color\n' +
            '"CAT-TD","Transformación Digital","","Uso de tecnologías y automatización","Excluir soporte técnico básico","tecnología, digital, software, sistemas","#3b82f6"\n' +
            '"SUB-AUT","Automatización de Procesos","Transformación Digital","Optimización y automatización de flujos","","automatización, procesos, bots","#60a5fa"\n' +
            '"CAT-LID","Liderazgo & Gestión","","Estilos de dirección y motivación de equipos","","liderazgo, equipo, gestión, comunicación","#10b981"\n' +
            '"CAT-DES","Desafíos & Barreras","","Dificultades y resistencia al cambio","","resistencia, obstáculos, dificultad, problemas","#ef4444"\n';
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        universalSaveFile(blob, 'AnalizadorCualiUY_Plantilla_Libro_Categorias.csv');
    }

    function parseCodebookCSV(csvText) {
        if (!csvText || !csvText.trim()) throw new Error('El archivo CSV está vacío.');
        csvText = csvText.replace(/^\uFEFF/, '');

        const firstLine = csvText.split(/\r?\n/)[0] || '';
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semiCount = (firstLine.match(/;/g) || []).length;
        const delimiter = semiCount > commaCount ? ';' : ',';

        function parseCSVLines(text, delim) {
            const rows = [];
            let currentRow = [];
            let currentField = '';
            let insideQuotes = false;
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const nextChar = text[i + 1];
                if (insideQuotes) {
                    if (char === '"' && nextChar === '"') {
                        currentField += '"';
                        i++;
                    } else if (char === '"') {
                        insideQuotes = false;
                    } else {
                        currentField += char;
                    }
                } else {
                    if (char === '"') {
                        insideQuotes = true;
                    } else if (char === delim) {
                        currentRow.push(currentField.trim());
                        currentField = '';
                    } else if (char === '\r' && nextChar === '\n') {
                        currentRow.push(currentField.trim());
                        rows.push(currentRow);
                        currentRow = [];
                        currentField = '';
                        i++;
                    } else if (char === '\n' || char === '\r') {
                        currentRow.push(currentField.trim());
                        rows.push(currentRow);
                        currentRow = [];
                        currentField = '';
                    } else {
                        currentField += char;
                    }
                }
            }
            if (currentField || currentRow.length) {
                currentRow.push(currentField.trim());
                rows.push(currentRow);
            }
            return rows.filter(row => row.length > 0 && row.some(cell => cell.length > 0));
        }

        const rows = parseCSVLines(csvText, delimiter);
        if (rows.length < 2) throw new Error('El archivo CSV debe incluir una fila de encabezados y al menos una categoría.');

        const normalizeHeader = str => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
        const headers = rows[0].map(h => normalizeHeader(h));

        let codeIdx = headers.findIndex(h => h.includes('codigo') || h.includes('code') || h.includes('etiqueta'));
        let nameIdx = headers.findIndex(h => h.includes('categoria') || h.includes('nombre') || h.includes('name') || h.includes('subcategoria'));
        let parentIdx = headers.findIndex(h => h.includes('jerarquia') || h.includes('padre') || h.includes('parent') || h.includes('superior'));
        let descIdx = headers.findIndex(h => h.includes('descripcion') || h.includes('desc') || h.includes('inclusio'));
        let criteriaIdx = headers.findIndex(h => h.includes('criterio') || h.includes('exclusio') || h.includes('limite'));
        let keywordsIdx = headers.findIndex(h => h.includes('termino') || h.includes('palabra') || h.includes('keyword') || h.includes('busqueda'));
        let colorIdx = headers.findIndex(h => h.includes('color'));

        if (nameIdx === -1) {
            nameIdx = headers.length > 1 ? 1 : 0;
        }

        const items = [];
        for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            const rawName = (nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : (row[0] || '')).trim();
            if (!rawName) continue;

            const rawCode = (codeIdx !== -1 && row[codeIdx] ? row[codeIdx] : '').trim();
            const rawParent = (parentIdx !== -1 && row[parentIdx] ? row[parentIdx] : '').trim();
            const rawDesc = (descIdx !== -1 && row[descIdx] ? row[descIdx] : '').trim();
            const rawCriteria = (criteriaIdx !== -1 && row[criteriaIdx] ? row[criteriaIdx] : '').trim();
            const rawKeywords = (keywordsIdx !== -1 && row[keywordsIdx] ? row[keywordsIdx] : '').trim();
            const rawColor = (colorIdx !== -1 && row[colorIdx] ? row[colorIdx] : '').trim();

            const keywords = rawKeywords ? rawKeywords.split(/[,;]/).map(k => k.trim()).filter(Boolean) : [];

            items.push({
                code: rawCode,
                name: rawName,
                rawParent: rawParent,
                description: rawDesc,
                criteria: rawCriteria,
                keywords: keywords,
                color: rawColor
            });
        }

        if (items.length === 0) throw new Error('No se encontraron filas con nombres de categoría válidos.');
        return items;
    }

    function openImportCodebookModal() {
        pendingCodebookImportItems = null;
        const fileInput = document.getElementById('codebook-csv-file-input');
        if (fileInput) fileInput.value = '';
        const previewBox = document.getElementById('codebook-csv-preview-box');
        if (previewBox) {
            previewBox.style.display = 'none';
            previewBox.innerHTML = '';
        }
        const btnProcess = document.getElementById('btn-process-import-codebook');
        if (btnProcess) btnProcess.disabled = true;
        document.getElementById('modal-import-codebook').style.display = 'flex';
    }

    function handleCodebookFileSelection(file) {
        const previewBox = document.getElementById('codebook-csv-preview-box');
        const btnProcess = document.getElementById('btn-process-import-codebook');
        if (!file) {
            pendingCodebookImportItems = null;
            if (previewBox) previewBox.style.display = 'none';
            if (btnProcess) btnProcess.disabled = true;
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const items = parseCodebookCSV(text);
                pendingCodebookImportItems = items;

                if (previewBox) {
                    previewBox.style.display = 'block';
                    previewBox.innerHTML = `
                        <div style="color:var(--accent-primary, #10b981); font-weight:600; margin-bottom:0.4rem;">
                            ✅ Se leyeron ${items.length} categoría(s) / subcategoría(s) válidas.
                        </div>
                        <ul style="margin:0; padding-left:1.2rem; max-height:120px; overflow-y:auto; color:var(--text-secondary);">
                            ${items.slice(0, 5).map(it => `<li><strong>${escapeHtml(it.code || 'Auto')}</strong>: ${escapeHtml(it.name)}${it.rawParent ? ` <em>(Padre: ${escapeHtml(it.rawParent)})</em>` : ''}</li>`).join('')}
                            ${items.length > 5 ? `<li><em>...y ${items.length - 5} categoría(s) más.</em></li>` : ''}
                        </ul>
                    `;
                }
                if (btnProcess) btnProcess.disabled = false;
            } catch (err) {
                pendingCodebookImportItems = null;
                if (previewBox) {
                    previewBox.style.display = 'block';
                    previewBox.innerHTML = `<div style="color:#ef4444; font-weight:600;">❌ Error al leer el archivo: ${escapeHtml(err.message || err)}</div>`;
                }
                if (btnProcess) btnProcess.disabled = true;
            }
        };
        reader.onerror = () => {
            alert('No se pudo leer el archivo seleccionado.');
        };
        reader.readAsText(file, 'UTF-8');
    }

    function processCodebookImport() {
        if (!pendingCodebookImportItems || pendingCodebookImportItems.length === 0) return;

        const modeRadios = document.getElementsByName('import-codebook-mode');
        let mode = 'merge';
        for (const r of modeRadios) {
            if (r.checked) mode = r.value;
        }

        if (mode === 'replace' && state.categories.length > 0) {
            if (!confirm(`⚠️ ¿Deseas reemplazar las ${state.categories.length} categorías actuales? Esta acción desvinculará las codificaciones existentes de las categorías eliminadas.`)) {
                return;
            }
        }

        const defaultColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
        let colorIdx = 0;

        const baseCategories = mode === 'replace' ? [] : [...state.categories];
        const existingCodes = new Set(baseCategories.map(c => (c.code || '').toUpperCase()));

        const lookupMap = new Map();
        baseCategories.forEach(c => {
            if (c.code) lookupMap.set(c.code.toUpperCase(), c.id);
            lookupMap.set(c.name.toLowerCase(), c.id);
        });

        const newCategories = [];
        const itemsToResolveParent = [];

        for (let i = 0; i < pendingCodebookImportItems.length; i++) {
            const item = pendingCodebookImportItems[i];
            let name = item.name;
            if (!name) continue;

            let code = item.code;
            if (!code) {
                code = generateSuggestedCode(name, null);
            }

            let uniqueCode = code;
            let counter = 1;
            while (existingCodes.has(uniqueCode.toUpperCase())) {
                uniqueCode = `${code}-${counter++}`;
            }
            existingCodes.add(uniqueCode.toUpperCase());

            const newId = `cat-import-${Date.now()}-${i + 1}`;
            const color = safeColor(item.color) || defaultColors[colorIdx % defaultColors.length];
            colorIdx++;

            const newCat = {
                id: newId,
                parentId: null,
                code: uniqueCode,
                name: name,
                color: color,
                keywords: Array.isArray(item.keywords) ? item.keywords : [],
                description: item.description || '',
                criteria: item.criteria || ''
            };

            newCategories.push(newCat);
            lookupMap.set(uniqueCode.toUpperCase(), newId);
            lookupMap.set(name.toLowerCase(), newId);

            if (item.rawParent) {
                itemsToResolveParent.push({ cat: newCat, rawParent: item.rawParent });
            }
        }

        for (const ref of itemsToResolveParent) {
            const parentKey = ref.rawParent.trim();
            const parentId = lookupMap.get(parentKey.toUpperCase()) || lookupMap.get(parentKey.toLowerCase());
            if (parentId && parentId !== ref.cat.id) {
                ref.cat.parentId = parentId;
            }
        }

        const proposedCategories = [...baseCategories, ...newCategories];

        const limits = typeof projectLimits === 'function' ? projectLimits() : null;
        if (limits && limits.maxCategories && proposedCategories.length > limits.maxCategories) {
            alert(`⛔ Límite de categorías superado: Esta versión permite hasta ${limits.maxCategories} categorías en total (el archivo generaría ${proposedCategories.length}).`);
            return;
        }

        try {
            ProjectIntegrity.validateHierarchy(proposedCategories);
            if (typeof validateProjectObject === 'function') {
                const candidatePayload = createProjectPayload({ categories: proposedCategories });
                validateProjectObject(candidatePayload);
            }
        } catch (error) {
            alert(`No se pudo importar el libro de categorías: ${error.message || error}`);
            return;
        }

        state.categories = proposedCategories;
        if (mode === 'replace') {
            state.codings = [];
            state.activeCategoryId = state.categories.length > 0 ? state.categories[0].id : null;
        }

        if (typeof recordAudit === 'function') {
            recordAudit('Importación CSV/Excel', `Se incorporaron ${newCategories.length} categorías al libro de códigos`);
        }
        saveToStorage();

        let totalAuto = 0;
        if (state.documents && state.documents.length > 0 && newCategories.length > 0) {
            if (typeof autoCodeBatch === 'function') {
                const autoRes = autoCodeBatch(state.documents, newCategories, 'importación CSV');
                totalAuto = autoRes.addedCount;
            } else if (typeof autoCodeCategoryInDocument === 'function') {
                state.documents.forEach(doc => {
                    newCategories.forEach(cat => {
                        totalAuto += autoCodeCategoryInDocument(doc.id, cat.id);
                    });
                });
            }
        }

        renderCodebookList();
        if (typeof updateQualitativeCharts === 'function') updateQualitativeCharts();
        document.getElementById('modal-import-codebook').style.display = 'none';

        alert(`✨ ¡Importación exitosa!\n\nSe incorporaron ${newCategories.length} categoría(s) / subcategoría(s) al proyecto.${totalAuto > 0 ? `\nSe identificaron ${totalAuto} pasaje(s) automáticos por palabras clave.` : ''}`);
    }

    // --- Export Coded Document / Passages as Word (.docx) ---
    function openExportDocxModal() {
        if (state.categories.length === 0) {
            alert('No hay categorías creadas para exportar.');
            return;
        }

        const container = document.getElementById('docx-category-checkboxes');
        if (container) {
            container.innerHTML = '';
            state.categories.forEach(cat => {
                const isSelected = !state.activeCategoryId || state.activeCategoryId === cat.id;
                const label = document.createElement('label');
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                label.style.gap = '0.4rem';
                label.style.fontSize = '0.85rem';
                label.style.cursor = 'pointer';

                label.innerHTML = `
                    <input type="checkbox" class="docx-cat-checkbox" value="${cat.id}" ${isSelected ? 'checked' : ''}>
                    <span class="code-color-dot" style="background:${safeColor(cat.color)}"></span>
                    <span>${cat.parentId ? '└─ ' : ''}${escapeHtml(cat.name)} (${escapeHtml(cat.code || '')})</span>
                `;
                container.appendChild(label);
            });
        }

        document.getElementById('modal-export-docx').style.display = 'flex';
    }

    async function generateCodedDocumentDOCX() {
        const checkboxes = document.querySelectorAll('.docx-cat-checkbox:checked');
        const selectedCatIds = new Set(Array.from(checkboxes).map(cb => cb.value));

        if (selectedCatIds.size === 0) {
            alert('Selecciona al menos una categoría para incluir en la exportación Word.');
            return;
        }

        const selectedModeEl = document.querySelector('input[name="docx-export-mode"]:checked');
        const exportMode = selectedModeEl ? selectedModeEl.value : 'full';
        const todayStr = new Date().toISOString().slice(0, 10);
        const categories = state.categories.filter(category => selectedCatIds.has(category.id));
        const codings = state.codings.filter(coding => selectedCatIds.has(coding.categoryId));
        let blob;
        let fileName;

        if (!window.DocxExporter) {
            alert('No se pudo cargar el generador DOCX. Reinicia la aplicación e inténtalo nuevamente.');
            return;
        }

        if (exportMode === 'passages') {
            fileName = `AnalizadorCualiUY_Pro_Pasajes_Por_Categoria_${todayStr}.docx`;
            blob = window.DocxExporter.createPassagesDocument({
                categories,
                allCategories: state.categories,
                codings,
                documents: state.documents,
                date: todayStr
            });
        } else {
            const doc = state.documents.find(d => d.id === state.activeDocId);
            if (!doc) {
                alert('Abre primero un documento para exportarlo sombreado a Word.');
                return;
            }
            fileName = `AnalizadorCualiUY_Pro_${doc.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}_Sombreado_${todayStr}.docx`;
            blob = window.DocxExporter.createFullDocument({
                title: doc.title,
                content: doc.content,
                categories,
                codings: codings.filter(coding => coding.docId === doc.id),
                date: todayStr
            });
        }

        document.getElementById('modal-export-docx').style.display = 'none';
        await universalSaveFile(blob, fileName);
    }

    function exportCategoricalMatrixCSV() {
        let csv = 'Código,Categoría Padre,Subcategoría / Nombre,Términos / Palabras Clave,Ocurrencias,Ponderación %,Documento,Fragmento Coincidente,Decodificación / Memo\n';
        const totalCodings = state.codings.filter(c => !c.dismissed).length;

        state.categories.forEach(cat => {
            const parentCat = cat.parentId ? state.categories.find(p => p.id === cat.parentId) : null;
            const parentName = parentCat ? escapeCsv(parentCat.name) : 'Principal';
            const catName = escapeCsv(cat.name);
            const codeStr = escapeCsv(cat.code || '');
            const keywordsStr = escapeCsv([cat.name, cat.code, ...(cat.keywords || [])].filter(Boolean).join(', '));
            const catCodings = state.codings.filter(c => c.categoryId === cat.id && !c.dismissed);
            const count = catCodings.length;
            const percentage = totalCodings > 0 ? ((count / totalCodings) * 100).toFixed(1) : '0.0';

            if (catCodings.length === 0) {
                csv += `"${codeStr}","${parentName}","${catName}","${keywordsStr}","0","0%","--","--","--"\n`;
            } else {
                catCodings.forEach(coding => {
                    const doc = state.documents.find(d => d.id === coding.docId);
                    const docName = doc ? escapeCsv(doc.title) : '';
                    const quote = escapeCsv(coding.quoteText);
                    const memo = escapeCsv(coding.memo || '');
                    csv += `"${codeStr}","${parentName}","${catName}","${keywordsStr}","${count}","${percentage}%","${docName}","${quote}","${memo}"\n`;
                });
            }
        });

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        universalSaveFile(blob, `AnalizadorCualiUY_Beta_MatrizCategorial_${new Date().toISOString().slice(0, 10)}.csv`);
    }

    // ==========================================
    // 8. Interactive Selection & Quick Toolbar
    // ==========================================

    function handleTextSelection() {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            hideFloatingToolbar();
            return;
        }

        const range = selection.getRangeAt(0);
        const textBody = document.getElementById('text-body');
        if (!textBody.contains(range.startContainer) || !textBody.contains(range.endContainer)) {
            hideFloatingToolbar();
            return;
        }

        const doc = state.documents.find(d => d.id === state.activeDocId);
        if (!doc) return;
        const offsets = ProjectIntegrity.rangeToOffsets(textBody, range, doc.content);
        if (!offsets || offsets.text.length < 3) {
            hideFloatingToolbar();
            return;
        }

        state.selectedRange = {
            docId: doc.id,
            startChar: offsets.start,
            endChar: offsets.end,
            quoteText: offsets.text
        };

        const rect = range.getBoundingClientRect();
        const textBodyRect = textBody ? textBody.getBoundingClientRect() : rect;
        const toolbarWidth = 320;

        let leftPos = textBodyRect.right + 15 + window.scrollX;
        const maxAllowedLeft = window.innerWidth + window.scrollX - toolbarWidth - 10;
        if (leftPos > maxAllowedLeft) {
            leftPos = maxAllowedLeft;
        }

        const topPos = rect.top + window.scrollY;
        showFloatingToolbar(leftPos, topPos);
    }

    function showFloatingToolbar(x, y) {
        const toolbar = document.getElementById('floating-toolbar');
        const codeButtonsRow = document.getElementById('floating-code-buttons');
        codeButtonsRow.innerHTML = '';

        state.categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'btn-code-tag';
            btn.style.backgroundColor = safeColor(cat.color);
            btn.textContent = `${cat.parentId ? '└ ' : ''}${cat.name}`;
            btn.onclick = () => {
                applyCodeToSelectedRange(cat.id);
                hideFloatingToolbar();
            };
            codeButtonsRow.appendChild(btn);
        });

        toolbar.style.display = 'flex';
        toolbar.style.left = `${Math.max(10, Math.min(x, window.innerWidth - 340))}px`;
        toolbar.style.top = `${Math.max(60, y)}px`;
    }

    function hideFloatingToolbar() {
        document.getElementById('floating-toolbar').style.display = 'none';
        state.selectedRange = null;
    }

    function applyCodeToSelectedRange(categoryId, memoText = '') {
        if (!state.selectedRange) return;

        const newCoding = {
            id: `cod-${Date.now()}`,
            docId: state.selectedRange.docId,
            categoryId: categoryId,
            startChar: state.selectedRange.startChar,
            endChar: state.selectedRange.endChar,
            quoteText: state.selectedRange.quoteText,
            memo: memoText,
            source: 'manual',
            createdAt: Date.now()
        };

        state.codings.push(newCoding);
        saveToStorage();

        setActiveDocument(state.activeDocId);
        renderCodebookList();
        renderDecoderList();
        updateQualitativeCharts();
    }

    function showCodingContextMenu(e, coding) {
        const cat = state.categories.find(c => c.id === coding.categoryId);
        const confirmDelete = confirm(`Categoría: "${cat ? cat.name : ''}"\n\n¿Deseas eliminar este código asignado o editar su nota?`);
        if (confirmDelete) {
            state.codings = state.codings.filter(c => c.id !== coding.id);
            saveToStorage();
            setActiveDocument(state.activeDocId);
            renderCodebookList();
            renderDecoderList();
            updateQualitativeCharts();
        }
    }

    // ==========================================
    // 9. Visual Network Graph (Canvas)
    // ==========================================

    function setupNetworkCanvas() {
        const canvas = document.getElementById('network-canvas');
        if (!canvas) return;

        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width || 340;
        canvas.height = rect.height || 380;

        canvas.removeEventListener('mousedown', onCanvasMouseDown);
        canvas.removeEventListener('mousemove', onCanvasMouseMove);
        canvas.removeEventListener('mouseup', onCanvasMouseUp);

        canvas.addEventListener('mousedown', onCanvasMouseDown);
        canvas.addEventListener('mousemove', onCanvasMouseMove);
        canvas.addEventListener('mouseup', onCanvasMouseUp);

        recalculateGraphLayout();
        updateNetworkCanvas();
    }

    function recalculateGraphLayout() {
        const canvas = document.getElementById('network-canvas');
        if (!canvas) return;
        const width = canvas.width;
        const height = canvas.height;
        const analytics = getAnalytics();
        const visualCategories = analytics.categories;
        const count = visualCategories.length;
        if (count === 0) return;

        const centerX = width / 2;
        const centerY = height / 2;

        const maxSizeValue = Math.max(0.0001, ...analytics.stats.map(nodeSizeValue));
        function makeNode(cat, x, y) {
            const stat = analytics.statsMap.get(cat.id) || { count: 0, docCount: 0 };
            return { id: cat.id, name: cat.name, color: safeColor(cat.color), parentId: cat.parentId, count: stat.count, docCount: stat.docCount, perThousand: stat.perThousand, documentShare: stat.documentShare, x, y, radius: 14 + 18 * Math.sqrt(nodeSizeValue(stat) / maxSizeValue) };
        }
        if (state.graphLayout === 'circular') {
            const radius = Math.min(width, height) * 0.35;
            canvasNodes = visualCategories.map((cat, i) => {
                const angle = (i / count) * 2 * Math.PI;
                return makeNode(cat, centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
            });
        } else if (state.graphLayout === 'grid') {
            const cols = Math.ceil(Math.sqrt(count));
            const stepX = width / (cols + 1);
            const stepY = height / (Math.ceil(count / cols) + 1);
            canvasNodes = visualCategories.map((cat, i) => {
                const row = Math.floor(i / cols);
                const col = i % cols;
                return makeNode(cat, stepX * (col + 1), stepY * (row + 1));
            });
        } else {
            canvasNodes = visualCategories.map((cat, i) => makeNode(cat, centerX + Math.cos(i * 2.399) * Math.min(width, height) * 0.25, centerY + Math.sin(i * 2.399) * Math.min(width, height) * 0.25));
            const forceEdges = analytics.edges;
            for (let iteration = 0; iteration < 180; iteration++) {
                const cooling = 1 - iteration / 180;
                canvasNodes.forEach(node => { node.vx = (node.vx || 0) * 0.72 + (centerX - node.x) * 0.0008; node.vy = (node.vy || 0) * 0.72 + (centerY - node.y) * 0.0008; });
                for (let i = 0; i < canvasNodes.length; i++) for (let j = i + 1; j < canvasNodes.length; j++) {
                    const a = canvasNodes[i], b = canvasNodes[j];
                    let dx = b.x - a.x, dy = b.y - a.y;
                    const distance = Math.max(8, Math.hypot(dx, dy));
                    const repulsion = 900 / (distance * distance);
                    dx /= distance; dy /= distance;
                    a.vx -= dx * repulsion; a.vy -= dy * repulsion; b.vx += dx * repulsion; b.vy += dy * repulsion;
                }
                forceEdges.forEach(edge => {
                    const a = canvasNodes.find(node => node.id === edge.sourceId), b = canvasNodes.find(node => node.id === edge.targetId);
                    if (!a || !b) return;
                    let dx = b.x - a.x, dy = b.y - a.y;
                    const distance = Math.max(1, Math.hypot(dx, dy));
                    const pull = (distance - 115) * 0.0025 * Math.max(0.25, edge.metricValue);
                    dx /= distance; dy /= distance;
                    a.vx += dx * pull; a.vy += dy * pull; b.vx -= dx * pull; b.vy -= dy * pull;
                });
                canvasNodes.forEach(node => {
                    node.x = Math.max(node.radius + 8, Math.min(width - node.radius - 8, node.x + node.vx * cooling));
                    node.y = Math.max(node.radius + 8, Math.min(height - node.radius - 24, node.y + node.vy * cooling));
                });
            }
        }
    }

    function updateNetworkCanvas() {
        const canvas = document.getElementById('network-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        const analytics = getAnalytics();
        if (canvasNodes.length !== analytics.categories.length || canvasNodes.some(node => !analytics.categoryMap.has(node.id))) {
            recalculateGraphLayout();
        } else {
            canvasNodes.forEach(node => {
                const cat = state.categories.find(c => c.id === node.id);
                if (cat) {
                    node.name = cat.name;
                    node.color = safeColor(cat.color);
                }
            });
        }

        const maxSizeValue = Math.max(0.0001, ...analytics.stats.map(nodeSizeValue));
        canvasNodes.forEach(node => {
            const stat = analytics.statsMap.get(node.id) || { count: 0, docCount: 0 };
            node.count = stat.count;
            node.docCount = stat.docCount;
            node.perThousand = stat.perThousand;
            node.documentShare = stat.documentShare;
            node.radius = 14 + 18 * Math.sqrt(nodeSizeValue(stat) / maxSizeValue);
        });
        canvasLinks = analytics.edges.map(edge => Object.assign({ weight: edge.metricValue }, edge));
        canvas.setAttribute('aria-label', `Red de ${analytics.categories.length} ${categoryModeLabel()}; tamaño por ${state.analyticsNodeSize}; vínculos por ${metricLabel()}.`);

        drawNetworkCanvas(ctx, width, height);
    }

    function drawNetworkCanvas(ctx, width, height) {
        ctx.clearRect(0, 0, width, height);

        canvasLinks.forEach(link => {
            const sourceNode = canvasNodes.find(n => n.id === link.sourceId);
            const targetNode = canvasNodes.find(n => n.id === link.targetId);
            if (!sourceNode || !targetNode) return;

            ctx.beginPath();
            ctx.moveTo(sourceNode.x, sourceNode.y);
            ctx.lineTo(targetNode.x, targetNode.y);
            const normalized = state.analyticsMetric === 'count' ? Math.min(1, link.count / Math.max(1, ...canvasLinks.map(item => item.count))) : link.metricValue;
            ctx.strokeStyle = state.theme === 'dark' ? `rgba(148,163,184,${0.18 + normalized * 0.65})` : `rgba(51,65,85,${0.14 + normalized * 0.62})`;
            ctx.lineWidth = 1 + normalized * 7;
            ctx.stroke();

            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;
            ctx.fillStyle = state.theme === 'dark' ? '#94a3b8' : '#475569';
            ctx.font = '11px sans-serif';
            ctx.fillText(formatMetric(link), midX, midY);
        });

        canvasNodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.fill();
            ctx.strokeStyle = node.parentId ? (state.theme === 'dark' ? '#cbd5e1' : '#334155') : (state.theme === 'dark' ? '#ffffff' : '#0f172a');
            ctx.lineWidth = node.parentId ? 2 : 4;
            ctx.stroke();

            ctx.fillStyle = state.theme === 'dark' ? '#f8fafc' : '#0f172a';
            ctx.font = '500 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(node.name, node.x, node.y + node.radius + 14);
            ctx.font = '10px sans-serif';
            ctx.fillStyle = state.theme === 'dark' ? '#94a3b8' : '#64748b';
            const nodeMetric = state.analyticsNodeSize === 'count' ? `${node.count} citas` : (state.analyticsNodeSize === 'perThousand' ? `${node.perThousand.toFixed(1)}/1k` : `${(node.documentShare * 100).toFixed(0)}% docs`);
            ctx.fillText(nodeMetric, node.x, node.y + 3);
        });
    }

    function exportGraphPNG() {
        const canvas = document.getElementById('network-canvas');
        if (!canvas) return;
        canvas.toBlob(function(blob) {
            if (blob) universalSaveFile(blob, `AnalizadorCualiUY_Pro_RedVisual_${new Date().toISOString().slice(0, 10)}.png`);
        }, 'image/png');
    }

    function exportGraphSVG() {
        const canvas = document.getElementById('network-canvas');
        if (!canvas) return;
        const w = canvas.width;
        const h = canvas.height;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="background-color:${state.theme === 'dark' ? '#0b1329' : '#ffffff'}; font-family:sans-serif;">\n`;

        canvasLinks.forEach(link => {
            const s = canvasNodes.find(n => n.id === link.sourceId);
            const t = canvasNodes.find(n => n.id === link.targetId);
            if (!s || !t) return;
            const strokeColor = state.theme === 'dark' ? '#475569' : '#cbd5e1';
            const normalized = state.analyticsMetric === 'count' ? Math.min(1, link.count / Math.max(1, ...canvasLinks.map(item => item.count))) : link.metricValue;
            svg += `  <line x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" stroke="${strokeColor}" stroke-opacity="${0.2 + normalized * 0.75}" stroke-width="${1 + normalized * 7}" />\n`;
        });

        canvasNodes.forEach(node => {
            svg += `  <circle cx="${node.x}" cy="${node.y}" r="${node.radius}" fill="${node.color}" stroke="#ffffff" stroke-width="2" />\n`;
            svg += `  <text x="${node.x}" y="${node.y + node.radius + 14}" fill="${state.theme === 'dark' ? '#ffffff' : '#000000'}" font-size="12" text-anchor="middle">${escapeHtml(node.name)}</text>\n`;
            const nodeMetric = state.analyticsNodeSize === 'count' ? `${node.count} citas` : (state.analyticsNodeSize === 'perThousand' ? `${node.perThousand.toFixed(1)}/1k` : `${(node.documentShare * 100).toFixed(0)}% docs`);
            svg += `  <text x="${node.x}" y="${node.y + 3}" fill="${state.theme === 'dark' ? '#e2e8f0' : '#334155'}" font-size="10" text-anchor="middle">${nodeMetric}</text>\n`;
        });

        svg += `</svg>`;

        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        universalSaveFile(blob, `AnalizadorCualiUY_Pro_RedVisual_${new Date().toISOString().slice(0, 10)}.svg`);
    }

    function onCanvasMouseDown(e) {
        const rect = e.target.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let hitNode = null;
        canvasNodes.forEach(node => {
            const dist = Math.hypot(mouseX - node.x, mouseY - node.y);
            if (dist < node.radius) {
                draggedNode = node;
                hitNode = node;
                dragOffset.x = mouseX - node.x;
                dragOffset.y = mouseY - node.y;
            }
        });
        if (hitNode) {
            const cat = state.categories.find(item => item.id === hitNode.id);
            const codings = getAnalytics().codings.filter(coding => coding.categoryId === hitNode.id);
            openChartDrilldown(`${cat ? cat.name : hitNode.name}: ${codings.length} pasajes`, codings.map(coding => ({ docId: coding.docId, codingAId: coding.id, quoteA: coding.quoteText, quoteB: coding.memo })));
            return;
        }
        const hitLink = canvasLinks.find(link => {
            const a = canvasNodes.find(node => node.id === link.sourceId), b = canvasNodes.find(node => node.id === link.targetId);
            if (!a || !b) return false;
            const lengthSquared = Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
            const t = lengthSquared ? Math.max(0, Math.min(1, ((mouseX - a.x) * (b.x - a.x) + (mouseY - a.y) * (b.y - a.y)) / lengthSquared)) : 0;
            return Math.hypot(mouseX - (a.x + t * (b.x - a.x)), mouseY - (a.y + t * (b.y - a.y))) < 7;
        });
        if (hitLink) {
            const a = state.categories.find(cat => cat.id === hitLink.sourceId), b = state.categories.find(cat => cat.id === hitLink.targetId);
            openChartDrilldown(`${a.name} ↔ ${b.name}: ${formatMetric(hitLink)}`, hitLink.evidence);
        }
    }

    function onCanvasMouseMove(e) {
        if (!draggedNode) return;
        const rect = e.target.getBoundingClientRect();
        draggedNode.x = e.clientX - rect.left - dragOffset.x;
        draggedNode.y = e.clientY - rect.top - dragOffset.y;

        const canvas = document.getElementById('network-canvas');
        drawNetworkCanvas(canvas.getContext('2d'), canvas.width, canvas.height);
    }

    function onCanvasMouseUp() {
        draggedNode = null;
    }

    // ==========================================
    // 10. Multi-Document Search Engine
    // ==========================================

    function executeGlobalSearch() {
        const query = document.getElementById('global-search-input').value.trim();
        const resultsEl = document.getElementById('global-search-results');
        resultsEl.innerHTML = '';

        if (!query) {
            resultsEl.innerHTML = '<div class="empty-state-sm">Ingresa un término para buscar.</div>';
            return;
        }

        const normQuery = normalizeText(query);
        const hits = [];

        state.documents.forEach(doc => {
            const contentNorm = normalizeText(doc.content);
            let pos = 0;
            while ((pos = contentNorm.indexOf(normQuery, pos)) !== -1) {
                const snippetStart = Math.max(0, pos - 40);
                const snippetEnd = Math.min(doc.content.length, pos + query.length + 40);
                hits.push({
                    docId: doc.id,
                    docTitle: doc.title,
                    snippet: doc.content.slice(snippetStart, snippetEnd),
                    charPos: pos
                });
                pos += normQuery.length;
            }
        });

        if (hits.length === 0) {
            resultsEl.innerHTML = `<div class="empty-state-sm">Sin coincidencias para "${escapeHtml(query)}".</div>`;
            return;
        }

        hits.forEach(hit => {
            const item = document.createElement('div');
            item.className = 'search-hit-item';
            item.innerHTML = `
                <div class="search-hit-doc">${escapeHtml(hit.docTitle)}</div>
                <div>"...${escapeHtml(hit.snippet)}..."</div>
            `;
            item.onclick = () => {
                setActiveDocument(hit.docId);
                const input = document.getElementById('reader-search-input');
                input.value = query;
                performInTextSearch(query);
            };
            resultsEl.appendChild(item);
        });
    }

    // ==========================================
    // 11. Event Listeners & Modals Control
    // ==========================================

    function initOperationalGuideWizard() {
        const modal = document.getElementById('modal-operational-guide');
        const openBtn = document.getElementById('btn-open-guide');
        if (!modal) return;

        let currentStep = 1;
        const totalSteps = 5;

        const dots = modal.querySelectorAll('.step-dot');
        const panels = modal.querySelectorAll('.guide-step-panel');
        const prevBtn = document.getElementById('btn-guide-prev');
        const nextBtn = document.getElementById('btn-guide-next');
        const dontShowChk = document.getElementById('chk-guide-dont-show');

        function updateStepView(step) {
            currentStep = step;
            dots.forEach(dot => {
                const stepNum = Number(dot.dataset.step);
                dot.classList.toggle('active', stepNum === currentStep);
            });
            panels.forEach(panel => {
                const stepNum = Number(panel.dataset.step);
                panel.style.display = stepNum === currentStep ? 'block' : 'none';
            });

            if (prevBtn) prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
            if (nextBtn) nextBtn.textContent = currentStep === totalSteps ? '¡Comenzar!' : 'Siguiente';
        }

        function closeModal() {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            if (dontShowChk && dontShowChk.checked) {
                try { localStorage.setItem('ACUY_GUIDE_SEEN', 'true'); } catch (e) {}
            }
        }

        function openModal() {
            updateStepView(1);
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
        }

        if (openBtn) {
            openBtn.onclick = openModal;
        }

        modal.querySelectorAll('.guide-skip-btn').forEach(btn => {
            btn.onclick = closeModal;
        });

        if (prevBtn) {
            prevBtn.onclick = () => {
                if (currentStep > 1) updateStepView(currentStep - 1);
            };
        }

        if (nextBtn) {
            nextBtn.onclick = () => {
                if (currentStep < totalSteps) {
                    updateStepView(currentStep + 1);
                } else {
                    closeModal();
                }
            };
        }

        try {
            const seen = localStorage.getItem('ACUY_GUIDE_SEEN');
            if (!seen) {
                setTimeout(openModal, 400);
            }
        } catch (e) {}
    }

    function setupEventListeners() {
        initOperationalGuideWizard();
        document.getElementById('btn-dismiss-banner').onclick = () => {
            document.getElementById('sample-notice-banner').style.display = 'none';
        };
        document.getElementById('btn-clear-sample').onclick = () => {
            if (confirm('¿Deseas eliminar los datos de ejemplo e iniciar un proyecto totalmente en blanco?')) {
                clearProject();
            }
        };

        document.getElementById('btn-new-blank-project').onclick = () => {
            if (confirm('¿Deseas iniciar un nuevo proyecto cualitativo en blanco? Se limpiará el espacio de trabajo actual.')) {
                clearProject();
            }
        };

        // ---- Unified File Processing Engine (native Tauri files and browser File objects) ----
        function loadProjectJson(raw, fileName) {
            applyValidatedProject(parseAndValidateProject(raw));
            saveToStorage();
            checkNoticeBanner();
            renderDocumentList();
            renderCodebookList();
            if (state.documents.length > 0) setActiveDocument(state.documents[0].id);
            renderDecoderList();
            updateQualitativeCharts();
            alert(`✨ ¡Proyecto "${fileName}" cargado exitosamente!`);
        }

        async function processSelectedFiles(files) {
            if (!files || files.length === 0) return;
            const selected = Array.from(files);
            if (selected.length > 128) throw new Error('El máximo por selección es de 128 archivos.');
            const limits = projectLimits();
            const browserFiles = selected.filter(file => Number.isFinite(file.size));
            const totalBrowserBytes = browserFiles.reduce((sum, file) => sum + file.size, 0);
            const perFileBytes = Math.min(limits.maxDocumentChars * 2, 2 * 1024 * 1024 * 1024);
            if (browserFiles.some(file => file.size > perFileBytes) || totalBrowserBytes > limits.maxProjectChars * 2) {
                throw new Error('La selección supera los límites amplios calculados según la RAM disponible.');
            }

            for (const file of selected) {
                const fileName = file.name || 'Documento';
                const ext = (file.extension || fileName.split('.').pop() || '').toLowerCase();
                // Los resultados del comando Tauri siempre incluyen extension/content/path.
                // No dependemos de que Vec<u8> llegue como Array o Uint8Array.
                const isNativeFile = typeof file.extension === 'string'
                    && typeof file.content === 'string'
                    && typeof file.path === 'string';
                try {
                    if (ext === 'json') {
                        loadProjectJson(isNativeFile ? file.content : await file.text(), fileName);
                    } else if (ext === 'txt') {
                        addDocumentToState(fileName, isNativeFile ? file.content : await file.text());
                    } else if (ext === 'docx') {
                        if (isNativeFile) {
                            addDocumentToState(fileName, file.content);
                        } else if (window.mammoth) {
                            const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
                            addDocumentToState(fileName, result.value);
                        } else {
                            throw new Error('El lector DOCX no está disponible.');
                        }
                    } else if (ext === 'pdf') {
                        if (isNativeFile) {
                            addDocumentToState(fileName, file.content);
                        } else {
                            const pdfjs = window.pdfjsLib || (window.pdfjsReady ? await window.pdfjsReady : null);
                            if (!pdfjs) throw new Error(`El lector PDF no está disponible${window.pdfjsLoadError ? `: ${window.pdfjsLoadError.message || window.pdfjsLoadError}` : '.'}`);
                            const bytes = new Uint8Array(await file.arrayBuffer());
                            const vendorBase = new URL('./public/vendor/', window.location.href);
                            const loadingTask = pdfjs.getDocument({
                                data: bytes,
                                cMapUrl: new URL('cmaps/', vendorBase).href,
                                cMapPacked: true,
                                standardFontDataUrl: new URL('standard_fonts/', vendorBase).href,
                                wasmUrl: new URL('wasm/', vendorBase).href
                            });
                            const pdf = await loadingTask.promise;
                            let fullText = '';
                            try {
                                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                                    const page = await pdf.getPage(pageNum);
                                    const textContent = await page.getTextContent();
                                    fullText += textContent.items.map(item => item.str).join(' ') + '\n\n';
                                }
                            } finally {
                                await loadingTask.destroy();
                            }
                            addDocumentToState(fileName, fullText.trim());
                        }
                    } else {
                        throw new Error(`Formato no compatible: .${ext}`);
                    }
                } catch (err) {
                    console.error(`Error importing ${fileName}:`, err);
                    alert(`Error al importar "${fileName}": ${err.message || err}`);
                }
            }
        }

        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.onchange = async (e) => {
                try {
                    await processSelectedFiles(e.target.files);
                } catch (error) {
                    alert(`No se pudo procesar la selección: ${error.message || error}`);
                }
                e.target.value = '';
            };
        }

        const projectInput = document.getElementById('project-input');
        if (projectInput) {
            projectInput.onchange = async (e) => {
                try {
                    await processSelectedFiles(e.target.files);
                } catch (error) {
                    alert(`No se pudo abrir el proyecto: ${error.message || error}`);
                }
                e.target.value = '';
            };
        }

        const btnImportFiles = document.getElementById('btn-import-files');
        const btnImportEmpty = document.getElementById('btn-import-empty');
        const btnAddDocument = document.getElementById('btn-add-document');
        const openImportDialog = async () => {
            const invoke = getTauriInvoke();
            if (!invoke) {
                fileInput.click();
                return;
            }
            try {
                const selectedFiles = await invoke('native_open_files', { filterType: 'all' });
                await processSelectedFiles(selectedFiles || []);
            } catch (err) {
                console.error('Error opening native file dialog:', err);
                alert(`Error al abrir o importar archivos: ${err.message || err}`);
            }
        };
        if (btnImportFiles) btnImportFiles.onclick = openImportDialog;
        if (btnImportEmpty) btnImportEmpty.onclick = openImportDialog;
        if (btnAddDocument) btnAddDocument.onclick = openImportDialog;


        document.getElementById('btn-open-matrix').onclick = () => {
            renderCategoricalMatrixModal();
        };
        document.getElementById('btn-export-executive-report').onclick = openReportBuilder;
        document.getElementById('btn-export-report-pdf').onclick = exportAnalyticalReport;
        document.querySelectorAll('#modal-report-builder input, #modal-report-builder textarea').forEach(control => {
            control.addEventListener('input', updateReportPreview);
            control.addEventListener('change', updateReportPreview);
        });

        // PDF & DOCX Export Buttons
        document.getElementById('btn-export-doc-pdf').onclick = openExportPdfModal;
        document.getElementById('btn-confirm-pdf-export').onclick = generateCodedDocumentPDF;
        const contactButton = document.getElementById('btn-contact-pro');
        if (contactButton) contactButton.onclick = () => {
            const contactUrl = contactButton.dataset.contactUrl;
            if (contactUrl) window.location.href = contactUrl;
            else alert('El canal de contacto para solicitar AnalizadorCualiUY Pro se configurará antes de publicar esta beta.');
        };
        const introContactButton = document.getElementById('btn-intro-contact-pro');
        if (introContactButton && contactButton) introContactButton.onclick = () => contactButton.click();

        document.getElementById('btn-clear-cat-filter').onclick = () => {
            state.activeCategoryId = null;
            updateCategoryFilterBanner();
            renderCodebookList();
            if (state.activeDocId) setActiveDocument(state.activeDocId);
        };

        // Header Search All Button
        document.getElementById('btn-auto-code-all').onclick = () => {
            autoCodeAllCategories();
        };

        // Qualitative Chart Type Switchers
        document.getElementById('chart-type-network').onclick = function() {
            state.activeChartType = 'network';
            document.querySelectorAll('.btn-chart-type').forEach(button => button.classList.remove('active'));
            this.classList.add('active');
            updateQualitativeCharts();
        };
        document.getElementById('chart-type-heatmap').onclick = function() {
            state.activeChartType = 'heatmap';
            document.querySelectorAll('.btn-chart-type').forEach(button => button.classList.remove('active'));
            this.classList.add('active');
            updateQualitativeCharts();
        };
        document.getElementById('chart-type-bars').onclick = function() {
            state.activeChartType = 'bars';
            document.querySelectorAll('.btn-chart-type').forEach(button => button.classList.remove('active'));
            this.classList.add('active');
            updateQualitativeCharts();
        };
        document.getElementById('chart-type-quality').onclick = function() {
            state.activeChartType = 'quality';
            document.querySelectorAll('.btn-chart-type').forEach(button => button.classList.remove('active'));
            this.classList.add('active');
            updateQualitativeCharts();
        };
        const analyticsControls = {
            'analytics-category-mode': value => { state.analyticsCategoryMode = value; },
            'analytics-node-size': value => { state.analyticsNodeSize = value; },
            'cooccurrence-unit': value => { state.analyticsUnit = value; },
            'association-metric': value => { state.analyticsMetric = value; },
            'cooccurrence-window': value => { state.analyticsWindow = Number(value); },
            'analytics-document-filter': value => { state.analyticsDocumentId = value; },
            'analytics-threshold': value => { state.analyticsThreshold = Math.max(0, Number(value) || 0); }
        };
        Object.entries(analyticsControls).forEach(([id, setter]) => {
            const control = document.getElementById(id);
            control.onchange = () => { setter(control.value); saveToStorage(); recalculateGraphLayout(); updateQualitativeCharts(); closeChartDrilldown(); };
        });
        document.getElementById('cooccurrence-unit').value = state.analyticsUnit;
        document.getElementById('analytics-category-mode').value = state.analyticsCategoryMode;
        document.getElementById('analytics-node-size').value = state.analyticsNodeSize;
        document.getElementById('association-metric').value = state.analyticsMetric;
        document.getElementById('cooccurrence-window').value = String(state.analyticsWindow);
        document.getElementById('analytics-threshold').value = String(state.analyticsThreshold);
        document.getElementById('analytics-hide-zeros').checked = state.analyticsHideZeros;
        document.getElementById('analytics-hide-zeros').onchange = event => { state.analyticsHideZeros = event.target.checked; saveToStorage(); updateQualitativeCharts(); };
        document.getElementById('chart-drilldown-close').onclick = closeChartDrilldown;

        // In-Text Search Toolbar Controls
        const searchInput = document.getElementById('reader-search-input');
        searchInput.oninput = (e) => performInTextSearch(e.target.value);
        searchInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                navigateSearchHit(e.shiftKey ? 'prev' : 'next');
            }
        };

        document.getElementById('btn-search-next').onclick = () => navigateSearchHit('next');
        document.getElementById('btn-search-prev').onclick = () => navigateSearchHit('prev');
        document.getElementById('btn-search-clear').onclick = () => {
            searchInput.value = '';
            performInTextSearch('');
        };

        document.addEventListener('keydown', (e) => {
            if (e.key === 'F3' || (e.ctrlKey && e.key === 'f')) {
                e.preventDefault();
                searchInput.focus();
                searchInput.select();
            }
        });

        // Theme Toggle
        document.getElementById('theme-toggle').onclick = () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            applyTheme();
            saveToStorage();
            updateQualitativeCharts();
        };

        function addDocumentToState(title, content) {
            if (state.documents.length >= BETA_LIMITS.maxDocuments) {
                throw new Error(betaLimitMessage());
            }
            const incomingWords = countWords(content);
            const currentWords = state.documents.reduce((sum, document) => sum + countWords(document.content), 0);
            if (currentWords + incomingWords > BETA_LIMITS.maxTotalWords) {
                throw new Error(betaLimitMessage());
            }
            const newDoc = {
                id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                title: title,
                content: content,
                wordCount: incomingWords
            };
            state.documents.push(newDoc);
            saveToStorage();
            renderDocumentList();
            if (!state.activeDocId) setActiveDocument(newDoc.id);

            state.categories.forEach(cat => {
                autoCodeCategoryInDocument(newDoc.id, cat.id);
            });
            setActiveDocument(newDoc.id);
            renderCodebookList();
        }

        // Load Sample Button
        document.getElementById('btn-load-sample').onclick = () => {
            loadSampleData();
            renderDocumentList();
            renderCodebookList();
            if (state.documents.length > 0) setActiveDocument(state.documents[0].id);
            renderDecoderList();
            updateQualitativeCharts();
        };

        // Save Project (JSON)
        document.getElementById('btn-save-project').onclick = async () => {
            const projectJson = JSON.stringify(createProjectPayload(), null, 2);
            const blob = new Blob([projectJson], { type: 'application/json;charset=utf-8;' });
            await universalSaveFile(blob, `AnalizadorCualiUY_Beta_Proyecto_${new Date().toISOString().slice(0, 10)}.json`);
        };

        // View Mode Toggles
        document.getElementById('view-mode-standard').onclick = function() {
            state.viewMode = 'standard';
            this.classList.add('active');
            document.getElementById('view-mode-tiers').classList.remove('active');
            if (state.activeDocId) setActiveDocument(state.activeDocId);
        };
        document.getElementById('view-mode-tiers').onclick = function() {
            state.viewMode = 'tiers';
            this.classList.add('active');
            document.getElementById('view-mode-standard').classList.remove('active');
            if (state.activeDocId) setActiveDocument(state.activeDocId);
        };

        // Parent Select change in Modal -> Suggest Subcategory Code & Palette!
        document.getElementById('cat-parent-select').onchange = (e) => {
            const pId = e.target.value;
            const catName = document.getElementById('cat-name').value;
            document.getElementById('cat-code').value = generateSuggestedCode(catName, pId);

            if (pId !== 'NONE') {
                const parentCat = state.categories.find(c => c.id === pId);
                if (parentCat) {
                    document.getElementById('cat-color').value = lightenHexColor(parentCat.color, 25);
                }
            }
        };

        document.getElementById('cat-name').oninput = (e) => {
            const pId = document.getElementById('cat-parent-select').value;
            if (!document.getElementById('edit-cat-id').value) {
                document.getElementById('cat-code').value = generateSuggestedCode(e.target.value, pId);
            }
        };

        // Graph Layout Selector & Exports
        document.getElementById('graph-layout-select').onchange = (e) => {
            state.graphLayout = e.target.value;
            recalculateGraphLayout();
            updateNetworkCanvas();
        };
        document.getElementById('btn-reset-network').onclick = () => {
            recalculateGraphLayout();
            updateNetworkCanvas();
        };

        // Filters in Sidebars
        document.getElementById('filter-docs').oninput = renderDocumentList;
        document.getElementById('filter-codes').oninput = renderCodebookList;
        document.getElementById('decoder-filter-code').onchange = renderDecoderList;

        // Text Selection Event
        document.addEventListener('selectionchange', handleTextSelection);

        // Floating Toolbar Buttons
        document.getElementById('close-toolbar').onclick = hideFloatingToolbar;
        document.getElementById('btn-quick-new-code').onclick = () => {
            openCategoryModal();
        };
        document.getElementById('btn-add-memo-quick').onclick = () => {
            if (state.selectedRange) {
                openMemoModal(state.selectedRange);
            }
        };

        // Modal Category Buttons
        document.getElementById('btn-open-credits').onclick = () => {
            document.getElementById('modal-credits').style.display = 'flex';
        };

        document.getElementById('btn-add-category').onclick = () => openCategoryModal();
        const btnImportCodebookCsv = document.getElementById('btn-import-codebook-csv');
        if (btnImportCodebookCsv) btnImportCodebookCsv.onclick = openImportCodebookModal;

        const btnDownloadTemplate = document.getElementById('btn-download-codebook-template');
        if (btnDownloadTemplate) btnDownloadTemplate.onclick = generateSampleCodebookCSV;

        const codebookFileInput = document.getElementById('codebook-csv-file-input');
        if (codebookFileInput) {
            codebookFileInput.onchange = (e) => {
                const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                handleCodebookFileSelection(file);
            };
        }

        const btnProcessImport = document.getElementById('btn-process-import-codebook');
        if (btnProcessImport) btnProcessImport.onclick = processCodebookImport;

        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.onclick = () => {
                document.getElementById('modal-category').style.display = 'none';
                document.getElementById('modal-memo').style.display = 'none';
                document.getElementById('modal-credits').style.display = 'none';
                document.getElementById('modal-pro-intro').style.display = 'none';
                document.getElementById('modal-matrix').style.display = 'none';
                document.getElementById('modal-export-pdf').style.display = 'none';
                document.getElementById('modal-report-builder').style.display = 'none';
                document.getElementById('modal-import-codebook').style.display = 'none';
            };
        });

        // Color Presets in Modal
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.onclick = () => {
                document.getElementById('cat-color').value = preset.dataset.color;
            };
        });

        // SAVE / EDIT CATEGORY
        document.getElementById('btn-save-category').onclick = () => {
            const editId = document.getElementById('edit-cat-id').value;
            const parentIdVal = document.getElementById('cat-parent-select').value;
            const name = document.getElementById('cat-name').value.trim();
            let code = document.getElementById('cat-code').value.trim();
            const keywordsRaw = document.getElementById('cat-keywords').value.trim();
            const color = document.getElementById('cat-color').value;
            const desc = document.getElementById('cat-desc').value.trim();

            if (!name) {
                alert('Ingresa el nombre de la categoría.');
                return;
            }

            if (!code) {
                code = generateSuggestedCode(name, parentIdVal);
            }

            const keywordsArr = keywordsRaw ? keywordsRaw.split(',').map(k => k.trim()).filter(Boolean) : [];
            if (!editId && state.categories.length >= BETA_LIMITS.maxCategories) {
                alert(betaLimitMessage());
                return;
            }
            const proposedParentId = parentIdVal === 'NONE' ? null : parentIdVal;
            const proposedId = editId || `cat-${Date.now()}`;
            const proposedCategory = {
                id: proposedId,
                parentId: proposedParentId,
                code,
                name,
                color,
                keywords: keywordsArr,
                description: desc
            };
            const proposedCategories = editId
                ? state.categories.map(category => category.id === editId ? proposedCategory : category)
                : [...state.categories, proposedCategory];
            try {
                if (editId && ProjectIntegrity.wouldCreateCycle(state.categories, editId, proposedParentId)) {
                    throw new Error('La categoría no puede depender de sí misma ni de una descendiente.');
                }
                ProjectIntegrity.validateHierarchy(proposedCategories);
            } catch (error) {
                alert(`No se puede guardar la categoría: ${error.message || error}`);
                return;
            }

            if (editId) {
                const cat = state.categories.find(c => c.id === editId);
                if (cat) {
                    cat.parentId = proposedParentId;
                    cat.name = name;
                    cat.code = code;
                    cat.color = color;
                    cat.keywords = keywordsArr;
                    cat.description = desc;
                }
            } else {
                const newCat = proposedCategory;
                state.categories.push(newCat);
                state.activeCategoryId = newCat.id;
            }

            saveToStorage();

            const targetCatId = editId || state.categories[state.categories.length - 1].id;
            let autoCount = 0;
            if (state.documents.length > 0) {
                state.documents.forEach(doc => {
                    autoCount += autoCodeCategoryInDocument(doc.id, targetCatId);
                });
            }

            renderCodebookList();
            updateQualitativeCharts();
            document.getElementById('modal-category').style.display = 'none';

            if (state.selectedRange) {
                applyCodeToSelectedRange(targetCatId);
                hideFloatingToolbar();
            } else if (state.activeDocId) {
                setActiveDocument(state.activeDocId);
            }

            if (autoCount > 0) {
                alert(`🔍 Categoría "${name}" [${code}] guardada e identificada en ${autoCount} pasajes del texto.`);
            }
        };

        // Save Memo Form
        document.getElementById('btn-save-memo').onclick = () => {
            const catId = document.getElementById('memo-category-select').value;
            const memoText = document.getElementById('memo-text').value.trim();

            if (!catId) {
                alert('Selecciona una categoría.');
                return;
            }

            applyCodeToSelectedRange(catId, memoText);
            document.getElementById('modal-memo').style.display = 'none';
            hideFloatingToolbar();
        };

        // Analysis Tabs Switcher
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => switchTab(btn.dataset.tab);
        });

        // Global Search
        document.getElementById('btn-exec-search').onclick = executeGlobalSearch;
        document.getElementById('global-search-input').onkeyup = (e) => {
            if (e.key === 'Enter') executeGlobalSearch();
        };
    }

    function switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        const targetContent = document.getElementById(tabId);

        if (targetBtn) targetBtn.classList.add('active');
        if (targetContent) targetContent.classList.add('active');

        if (tabId === 'tab-network') {
            updateQualitativeCharts();
        }
    }

    function openCategoryModal(existingCat = null) {
        populateParentCategorySelect(existingCat ? existingCat.id : null);
        if (existingCat) {
            document.getElementById('modal-cat-title').textContent = 'Editar categoría / subcategoría';
            document.getElementById('edit-cat-id').value = existingCat.id;
            document.getElementById('cat-name').value = existingCat.name;
            document.getElementById('cat-code').value = existingCat.code || generateSuggestedCode(existingCat.name, existingCat.parentId);
            document.getElementById('cat-keywords').value = existingCat.keywords ? existingCat.keywords.join(', ') : '';
            document.getElementById('cat-desc').value = existingCat.description || '';
            document.getElementById('cat-parent-select').value = existingCat.parentId || 'NONE';
            document.getElementById('cat-color').value = existingCat.color || '#3b82f6';
        } else {
            document.getElementById('modal-cat-title').textContent = 'Nueva categoría / subcategoría';
            document.getElementById('edit-cat-id').value = '';
            document.getElementById('cat-name').value = '';
            document.getElementById('cat-code').value = '';
            document.getElementById('cat-keywords').value = '';
            document.getElementById('cat-desc').value = '';
            document.getElementById('cat-parent-select').value = 'NONE';
            document.getElementById('cat-color').value = getNextDistinctCategoryColor();
        }
        document.getElementById('modal-category').style.display = 'flex';
    }

    function openMemoModal(range) {
        document.getElementById('memo-quote-text').textContent = `"${range.quoteText}"`;
        const select = document.getElementById('memo-category-select');
        select.innerHTML = '';

        state.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.parentId ? '└─ ' : ''}${cat.name}`;
            select.appendChild(opt);
        });

        document.getElementById('memo-text').value = '';
        document.getElementById('modal-memo').style.display = 'flex';
    }

    function countWords(text) {
        if (!text) return 0;
        return text.trim().split(/\s+/).length;
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeCsv(str) {
        if (str == null) return '';
        let value = String(str);
        if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`;
        return value.replace(/"/g, '""');
    }

    function hexToRgba(hex, alpha = 1) {
        let c = safeColor(hex).replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    }

    function lightenHexColor(hex, percent) {
        let num = parseInt(hex.replace('#', ''), 16),
            amt = Math.round(2.55 * percent),
            R = (num >> 16) + amt,
            B = (num >> 8 & 0x00FF) + amt,
            G = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
    }

    // Launch App
    document.addEventListener('DOMContentLoaded', initApp);

})();
