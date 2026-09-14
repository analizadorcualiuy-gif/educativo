/* ==========================================================================
   AnalizadorCualiUY Pro - Core JavaScript Engine
   PDF Export Engine for Painted Coded Documents (Selected Categories Filtering),
   Category Editing & Deleting, Suggested Codes, Qualitative Charts,
   Categorical Matrix & F3 In-Text Search Engine
   ========================================================================== */

(function() {
    'use strict';

    const STORAGE_KEY = 'ANALIZADOR_CUALI_UY_PRO_PROJECT_V8';
    const APP_VERSION = '1.0.4';
    const MAX_STATE_BYTES = 128 * 1024 * 1024;
    const MAX_IMPORT_FILE_BYTES = 128 * 1024 * 1024;
    const MAX_IMPORT_SELECTION_BYTES = 256 * 1024 * 1024;
    const MAX_EXPORT_BYTES = 64 * 1024 * 1024;
    const MAX_IMPORT_FILES = 64;
    const MAX_VISUAL_CATEGORIES = 100;
    const MAX_DRILLDOWN_ITEMS = 500;
    const MAX_MATRIX_UI_CELLS = 10000;
    const MAX_MATRIX_EXPORT_ROWS = 100000;
    const MAX_DOCX_ENTRIES = 2048;
    const MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES = 512 * 1024 * 1024;
    const MAX_DOCX_EXPANSION_RATIO = 200;
    const MAX_IN_TEXT_SEARCH_RESULTS = 5000;
    const MAX_GLOBAL_SEARCH_RESULTS = 2000;
    const MAX_ADVANCED_QUERY_RESULTS = 2000;
    const MAX_ADVANCED_QUERY_COMPARISONS = 500000;
    const MAX_AUTOCODE_MATCH_CANDIDATES = 100000;
    const MAX_AUTOCODE_TERMS = 1000;
    const MAX_AUTOCODE_SCAN_CODE_UNITS = 100 * 1024 * 1024;
    const MAX_AUTOCODE_CATEGORIES_PER_BATCH = 100;
    const MAX_AUTOCODE_DOCUMENTS_PER_BATCH = 100;
    const MAX_FOLDED_INDEX_SOURCE_CHARS = 1024 * 1024;
    const MAX_NORMALIZED_SEARCH_TERM_CHARS = 16384;
    const MAX_DOCUMENT_LIST_ITEMS = 1000;
    const MAX_CODEBOOK_LIST_ITEMS = 2000;
    const MAX_CATEGORY_SELECT_OPTIONS = 5000;
    const MAX_ANALYTICS_FILTER_OPTIONS = 5000;
    const MAX_READER_CODINGS = 500;
    const MAX_CODINGS_PER_TEXT_SEGMENT = 20;
    const MAX_TIER_ITEMS = 5000;
    const MAX_MARGIN_ITEMS = 500;
    const MAX_DECODER_ITEMS = 500;
    let runtimeCapabilities = {
        maxFilesPerSelection: MAX_IMPORT_FILES,
        maxFileBytes: MAX_IMPORT_FILE_BYTES,
        maxSelectionBytes: MAX_IMPORT_SELECTION_BYTES,
        maxExtractedTextBytes: MAX_IMPORT_FILE_BYTES,
        maxStateBytes: MAX_STATE_BYTES,
        maxExportBytes: MAX_EXPORT_BYTES
    };
    const FIELD_LIMITS = Object.freeze({
        documentTitle: 4096,
        categoryName: 4096,
        categoryCode: 512,
        categoryKeywordsText: 1024 * 1024,
        categoryKeyword: 16384,
        categoryExcludeKeywordsText: 1024 * 1024,
        categoryExcludeKeyword: 16384,
        categoryDescription: 1024 * 1024,
        categoryCriteria: 1024 * 1024,
        memo: 1024 * 1024,
        summary: 1024 * 1024
    });

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

    function safeFilenameSegment(value, maxLength = 80) {
        const normalized = String(value || '')
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, maxLength);
        return normalized || 'Documento';
    }

    async function blobToBase64(blob) {
        if (typeof FileReader === 'function') {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo generado.'));
                reader.onload = () => {
                    const dataUrl = String(reader.result || '');
                    const separator = dataUrl.indexOf(',');
                    if (separator < 0) reject(new Error('No se pudo codificar el archivo generado.'));
                    else resolve(dataUrl.slice(separator + 1));
                };
                reader.readAsDataURL(blob);
            });
        }

        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        const chunkSize = 0x8000;
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
        }
        return btoa(binary);
    }

    async function universalSaveFile(blob, defaultFileName) {
        const exportBytes = Number(blob && blob.size);
        if (!Number.isSafeInteger(exportBytes) || exportBytes < 0) {
            alert('Error al guardar: el archivo generado no es válido.');
            return false;
        }
        if (exportBytes > runtimeCapabilities.maxExportBytes) {
            alert(`Error al guardar: el archivo ocupa ${Math.ceil(exportBytes / 1024 / 1024)} MiB y supera el máximo de ${Math.floor(runtimeCapabilities.maxExportBytes / 1024 / 1024)} MiB.`);
            return false;
        }
        const invoke = getTauriInvoke();
        if (invoke) {
            try {
                const base64Data = await blobToBase64(blob);
                const saved = await invoke('native_save_file_base64', { defaultName: defaultFileName, base64Data });
                if (saved) {
                    alert(`✅ Archivo guardado exitosamente.`);
                }
                return saved === true;
            } catch (err) {
                console.error('Tauri native save error:', err);
                alert(`Error al guardar: ${err.message || err}`);
                return false;
            }
        }

        // Alternativa para pruebas desde navegador: los navegadores modernos
        // muestran el diálogo "Guardar como" en lugar de descargar al Escritorio.
        if (typeof window.showSaveFilePicker === 'function') {
            try {
                const extension = defaultFileName.includes('.') ? `.${defaultFileName.split('.').pop()}` : '';
                const handle = await window.showSaveFilePicker({
                    suggestedName: defaultFileName,
                    types: [{ description: 'Archivo de exportación', accept: { [blob.type || 'application/octet-stream']: [extension || '.txt'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                alert('✅ Archivo guardado exitosamente.');
                return true;
            } catch (err) {
                if (err && err.name === 'AbortError') return false;
                console.error('Browser save dialog error:', err);
            }
        }

        // Compatibilidad con navegadores sin selector nativo de destino.
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.setAttribute('download', defaultFileName);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return true;
    }

    let state = {
        theme: 'dark',
        activeDocId: null,
        activeCategoryId: null,
        viewMode: 'standard', // 'standard' | 'tiers'
        graphLayout: 'circular',
        activeChartType: 'network', // 'network' | 'heatmap' | 'bars' | 'quality'
        customChartInterpretations: { network: '', heatmap: '', bars: '', quality: '' },
        analyticsUnit: 'paragraph',
        analyticsMetric: 'jaccard',
        analyticsCategoryMode: 'main',
        analyticsNodeSize: 'documentShare',
        analyticsWindow: 100,
        analyticsThreshold: 0,
        analyticsDocumentId: '',
        analyticsDocumentGroup: '',
        analyticsHideZeros: true,
        isSampleLoaded: false,
        documents: [],
        categories: [],
        codings: [],
        corpusExclusions: [],
        summaries: [],
        auditLog: [],
        projectTemplate: '',
        selectedRange: null,
        // In-Text Search F3 State
        searchQuery: '',
        searchHits: [],
        searchActiveIndex: 0,
        searchResultsTruncated: false
    };

    let nativeSaveTimer = null;
    let nativeSaveQueue = null;
    let pendingNativeProject = null;
    let nativeCloseInProgress = false;
    let lastParsedProjectMetadata = null;
    let memoEditingCodingId = null;
    let storageWritesBlocked = false;
    let storageRecoveryMessage = '';
    let recoverySaveWarningShown = false;
    let licenseRevalidationTimer = null;
    let licenseRevalidationRunning = false;
    let lastLicenseValidationAt = 0;

    function projectLimits() {
        const reportedGiB = Number(navigator.deviceMemory) || 8;
        const ramGiB = Math.max(2, Math.min(reportedGiB, 32));
        const scale = Math.max(0.5, Math.min(ramGiB / 8, 4));
        return {
            // El backend nativo acepta como máximo 128 MiB de estado UTF-8.
            // El control exacto de bytes se realiza al serializar; estos topes
            // evitan construir en memoria proyectos que nunca podrían guardarse.
            maxProjectChars: runtimeCapabilities.maxStateBytes,
            maxDocumentChars: runtimeCapabilities.maxExtractedTextBytes,
            maxDocuments: Math.floor(10000 * scale),
            maxCategories: Math.floor(50000 * scale),
            maxCodings: Math.floor(1000000 * scale)
        };
    }

    function utf8ByteLength(value) {
        return utf8StringByteLength(String(value || ''));
    }

    function validateDocxArchiveSafety(arrayBuffer) {
        const bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
        if (bytes.byteLength < 22 || bytes.byteLength > runtimeCapabilities.maxFileBytes) {
            throw new Error('El DOCX está truncado o supera el límite permitido.');
        }
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const eocdMinimum = Math.max(0, bytes.byteLength - 22 - 0xffff);
        let eocdOffset = -1;
        for (let offset = bytes.byteLength - 22; offset >= eocdMinimum; offset--) {
            if (view.getUint32(offset, true) !== 0x06054b50) continue;
            const commentLength = view.getUint16(offset + 20, true);
            if (offset + 22 + commentLength === bytes.byteLength) {
                eocdOffset = offset;
                break;
            }
        }
        if (eocdOffset < 0) throw new Error('El DOCX no contiene un directorio ZIP válido.');

        const diskNumber = view.getUint16(eocdOffset + 4, true);
        const centralDisk = view.getUint16(eocdOffset + 6, true);
        const entriesOnDisk = view.getUint16(eocdOffset + 8, true);
        const entryCount = view.getUint16(eocdOffset + 10, true);
        const centralSize = view.getUint32(eocdOffset + 12, true);
        const centralOffset = view.getUint32(eocdOffset + 16, true);
        if (diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) {
            throw new Error('El DOCX usa un ZIP multidisco no admitido.');
        }
        if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
            throw new Error('El DOCX usa ZIP64, que no se admite en la importación web segura.');
        }
        if (entryCount === 0 || entryCount > MAX_DOCX_ENTRIES) {
            throw new Error(`El DOCX contiene una cantidad inválida de entradas ZIP (máximo ${MAX_DOCX_ENTRIES}).`);
        }
        const centralEnd = centralOffset + centralSize;
        if (!Number.isSafeInteger(centralEnd) || centralEnd > eocdOffset) {
            throw new Error('El directorio ZIP del DOCX está fuera de límites.');
        }

        let offset = centralOffset;
        let totalUncompressed = 0;
        for (let index = 0; index < entryCount; index++) {
            if (offset + 46 > centralEnd || view.getUint32(offset, true) !== 0x02014b50) {
                throw new Error('El directorio ZIP del DOCX está corrupto.');
            }
            const flags = view.getUint16(offset + 8, true);
            const compressionMethod = view.getUint16(offset + 10, true);
            const compressedSize = view.getUint32(offset + 20, true);
            const uncompressedSize = view.getUint32(offset + 24, true);
            const fileNameLength = view.getUint16(offset + 28, true);
            const extraLength = view.getUint16(offset + 30, true);
            const commentLength = view.getUint16(offset + 32, true);
            if ((flags & 0x1) !== 0) throw new Error('El DOCX está cifrado y no puede inspeccionarse de forma segura.');
            if (![0, 8].includes(compressionMethod)) throw new Error('El DOCX usa un método de compresión ZIP no admitido.');
            if (compressedSize === 0 && uncompressedSize > 0) throw new Error('El DOCX declara una entrada comprimida inválida.');
            if (compressedSize > 0 && Math.floor(uncompressedSize / compressedSize) > MAX_DOCX_EXPANSION_RATIO) {
                throw new Error(`El DOCX contiene una entrada con ratio de expansión inseguro (máximo ${MAX_DOCX_EXPANSION_RATIO}:1).`);
            }
            totalUncompressed += uncompressedSize;
            if (!Number.isSafeInteger(totalUncompressed) || totalUncompressed > MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES) {
                throw new Error(`El DOCX supera ${Math.floor(MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES / 1024 / 1024)} MiB descomprimidos.`);
            }
            offset += 46 + fileNameLength + extraLength + commentLength;
            if (offset > centralEnd) throw new Error('Una entrada ZIP del DOCX está fuera de límites.');
        }
        if (offset !== centralEnd) throw new Error('El directorio ZIP del DOCX contiene datos inesperados.');
        return { entryCount, totalUncompressed };
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

    function normalizeDocumentProfile(profile, field) {
        const value = profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {};
        return {
            group: requireString(value.group || '', `${field}.group`, 512, true),
            caseLabel: requireString(value.caseLabel || '', `${field}.caseLabel`, 512, true),
            period: requireString(value.period || '', `${field}.period`, 512, true),
            notes: requireString(value.notes || '', `${field}.notes`, 65536, true)
        };
    }

    function normalizedWeight(value) {
        const weight = Number(value);
        return [1, 2, 3].includes(weight) ? weight : 1;
    }

    function normalizedAnalyticsThreshold(value, metric) {
        const threshold = Number(value);
        if (!Number.isFinite(threshold)) return 0;
        const upperBound = metric === 'count' ? Number.MAX_SAFE_INTEGER : 1;
        return Math.max(0, Math.min(threshold, upperBound));
    }

    function validateProjectObject(parsed) {
        ProjectIntegrity.validateProjectMetadata(parsed);
        if (!Array.isArray(parsed.documents) || !Array.isArray(parsed.categories) || !Array.isArray(parsed.codings)) {
            throw new Error('El proyecto debe contener documents, categories y codings como listas.');
        }

        const limits = projectLimits();
        if (parsed.documents.length > limits.maxDocuments || parsed.categories.length > limits.maxCategories || parsed.codings.length > limits.maxCodings) {
            throw new Error(`El proyecto supera los límites permitidos (${limits.maxDocuments} documentos, ${limits.maxCategories} categorías o ${limits.maxCodings} codificaciones).`);
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
            if (totalChars > limits.maxProjectChars) throw new Error('El corpus supera el límite de estado guardable de la aplicación.');
            return { id, title, content, wordCount: countWords(content), profile: normalizeDocumentProfile(document.profile, `documents[${index}].profile`) };
        });

        const categoryIds = new Set();
        const categories = parsed.categories.map((category, index) => {
            if (!category || typeof category !== 'object' || Array.isArray(category)) throw new Error(`Categoría ${index + 1} inválida.`);
            const id = requireSafeId(category.id, `categories[${index}].id`);
            if (categoryIds.has(id)) throw new Error(`ID de categoría duplicado: ${id}`);
            categoryIds.add(id);
            const parentId = category.parentId == null ? null : requireSafeId(category.parentId, `categories[${index}].parentId`);
            const keywords = category.keywords == null ? [] : category.keywords;
            if (!Array.isArray(keywords) || keywords.length > 10000) throw new Error(`categories[${index}].keywords es inválido.`);
            const excludeKeywords = category.excludeKeywords == null ? [] : category.excludeKeywords;
            if (!Array.isArray(excludeKeywords) || excludeKeywords.length > 10000) throw new Error(`categories[${index}].excludeKeywords es inválido.`);
            return {
                id,
                parentId,
                code: requireString(category.code || '', `categories[${index}].code`, 512, true),
                name: requireString(category.name, `categories[${index}].name`, 4096),
                color: safeColor(category.color),
                keywords: keywords.map((keyword, keywordIndex) => requireString(keyword, `categories[${index}].keywords[${keywordIndex}]`, 16384, true)),
                excludeKeywords: excludeKeywords.map((keyword, keywordIndex) => requireString(keyword, `categories[${index}].excludeKeywords[${keywordIndex}]`, 16384, true)),
                description: requireString(category.description || '', `categories[${index}].description`, 1024 * 1024, true),
                criteria: requireString(category.criteria || '', `categories[${index}].criteria`, 1024 * 1024, true)
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
                source: coding.source === 'automatic' || coding.automated === true || String(id).startsWith('cod-auto-') ? 'automatic' : 'manual',
                dismissed: coding.dismissed === true,
                weight: normalizedWeight(coding.weight)
            };
        });

        if (Array.isArray(parsed.summaries) && parsed.summaries.length > 100000) throw new Error('El proyecto supera el máximo de 100.000 síntesis.');
        const summaryIds = new Set();
        const summaryPairs = new Set();
        const summaries = Array.isArray(parsed.summaries) ? parsed.summaries.map((summary, index) => {
            if (!summary || typeof summary !== 'object' || Array.isArray(summary)) throw new Error(`Síntesis ${index + 1} inválida.`);
            const id = requireSafeId(summary.id, `summaries[${index}].id`);
            const docId = requireSafeId(summary.docId, `summaries[${index}].docId`);
            const categoryId = requireSafeId(summary.categoryId, `summaries[${index}].categoryId`);
            if (!documentIds.has(docId) || !categoryIds.has(categoryId)) throw new Error(`La síntesis ${index + 1} contiene referencias inexistentes.`);
            const pairKey = `${docId}\u0000${categoryId}`;
            if (summaryIds.has(id)) throw new Error(`ID de síntesis duplicado: ${id}`);
            if (summaryPairs.has(pairKey)) throw new Error(`Hay más de una síntesis para el documento ${docId} y la categoría ${categoryId}.`);
            summaryIds.add(id);
            summaryPairs.add(pairKey);
            return { id, docId, categoryId, text: requireString(summary.text || '', `summaries[${index}].text`, 1024 * 1024, true), updatedAt: Number.isFinite(summary.updatedAt) ? summary.updatedAt : Date.now() };
        }) : [];
        const corpusExclusionIds = new Set();
        const corpusExclusions = Array.isArray(parsed.corpusExclusions) ? parsed.corpusExclusions.slice(0, 100000).map((ex, index) => {
            if (!ex || typeof ex !== 'object' || Array.isArray(ex)) throw new Error(`Exclusión del corpus ${index + 1} inválida.`);
            const id = requireSafeId(ex.id, `corpusExclusions[${index}].id`);
            if (corpusExclusionIds.has(id)) throw new Error(`ID de exclusión duplicado: ${id}`);
            corpusExclusionIds.add(id);
            const docId = requireSafeId(ex.docId, `corpusExclusions[${index}].docId`);
            if (!documentIds.has(docId)) throw new Error(`La exclusión ${id} contiene una referencia inexistente al documento ${docId}.`);
            const startChar = Number(ex.startChar);
            const endChar = Number(ex.endChar);
            if (!Number.isSafeInteger(startChar) || !Number.isSafeInteger(endChar) || startChar < 0 || endChar <= startChar) {
                throw new Error(`Rango de caracteres inválido para la exclusión ${id}.`);
            }
            return {
                id,
                docId,
                startChar,
                endChar,
                text: requireString(ex.text || '', `corpusExclusions[${index}].text`, limits.maxDocumentChars, true),
                term: requireString(ex.term || '', `corpusExclusions[${index}].term`, 4096, true),
                createdAt: Number.isFinite(ex.createdAt) ? ex.createdAt : Date.now()
            };
        }) : [];

        const auditLog = Array.isArray(parsed.auditLog) ? parsed.auditLog.slice(-10000).map((entry, index) => {
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`Registro metodológico ${index + 1} inválido.`);
            return { id: requireSafeId(entry.id, `auditLog[${index}].id`), timestamp: Number.isFinite(entry.timestamp) ? entry.timestamp : Date.now(), action: requireString(entry.action || 'Actualización', `auditLog[${index}].action`, 512), detail: requireString(entry.detail || '', `auditLog[${index}].detail`, 4096, true) };
        }) : [];

        const analyticsMetric = ['jaccard', 'count', 'documentShare'].includes(parsed.analyticsMetric) ? parsed.analyticsMetric : 'jaccard';
        return {
            documents,
            categories,
            codings,
            corpusExclusions,
            theme: parsed.theme === 'light' ? 'light' : 'dark',
            isSampleLoaded: parsed.isSampleLoaded === true,
            analyticsUnit: ['paragraph', 'sentence', 'document', 'window', 'overlap'].includes(parsed.analyticsUnit) ? parsed.analyticsUnit : 'paragraph',
            analyticsMetric,
            analyticsCategoryMode: ['main', 'all'].includes(parsed.analyticsCategoryMode) ? parsed.analyticsCategoryMode : 'main',
            analyticsNodeSize: ['documentShare', 'count', 'perThousand'].includes(parsed.analyticsNodeSize) ? parsed.analyticsNodeSize : 'documentShare',
            analyticsWindow: Number.isFinite(parsed.analyticsWindow) ? Math.max(10, Math.min(parsed.analyticsWindow, 100000)) : 100,
            analyticsThreshold: normalizedAnalyticsThreshold(parsed.analyticsThreshold, analyticsMetric),
            analyticsDocumentId: typeof parsed.analyticsDocumentId === 'string' && documentIds.has(parsed.analyticsDocumentId) ? parsed.analyticsDocumentId : '',
            analyticsDocumentGroup: typeof parsed.analyticsDocumentGroup === 'string' ? requireString(parsed.analyticsDocumentGroup, 'analyticsDocumentGroup', 512, true) : '',
            analyticsHideZeros: parsed.analyticsHideZeros !== false,
            summaries,
            auditLog,
            projectTemplate: typeof parsed.projectTemplate === 'string' ? requireString(parsed.projectTemplate, 'projectTemplate', 512, true) : ''
        };
    }

    function parseAndValidateProject(raw) {
        if (typeof raw !== 'string' || raw.length > projectLimits().maxProjectChars || utf8ByteLength(raw) > runtimeCapabilities.maxStateBytes) {
            throw new Error(`El archivo de proyecto supera el límite de estado de ${Math.floor(runtimeCapabilities.maxStateBytes / 1024 / 1024)} MiB.`);
        }
        const parsed = JSON.parse(raw);
        lastParsedProjectMetadata = ProjectIntegrity.validateProjectMetadata(parsed);
        return validateProjectObject(parsed);
    }

    function resetEphemeralState() {
        state.activeDocId = null;
        state.activeCategoryId = null;
        state.viewMode = 'standard';
        state.graphLayout = 'circular';
        state.activeChartType = 'network';
        state.selectedRange = null;
        state.searchQuery = '';
        state.searchHits = [];
        state.searchActiveIndex = 0;
        state.searchResultsTruncated = false;
        memoEditingCodingId = null;
    }

    function applyValidatedProject(project) {
        resetEphemeralState();
        Object.assign(state, project);
    }

    function recordAudit(action, detail = '') {
        state.auditLog.push({ id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: Date.now(), action, detail });
        if (state.auditLog.length > 10000) state.auditLog.splice(0, state.auditLog.length - 10000);
    }

    const SAMPLE_CATEGORIES = [
        { id: 'cat-1', parentId: null, code: 'CAT-TD', name: 'Transformación Digital', color: '#ef4444', keywords: ['tecnología', 'digital', 'automatización', 'plataformas', 'software'], description: 'Uso de nuevas tecnologías y automatización.' },
        { id: 'cat-1-1', parentId: 'cat-1', code: 'SUB-AUT', name: 'Automatización de Procesos', color: '#f87171', keywords: ['automatización', 'reestructurar'], description: 'Subcategoría: Reestructuración automatizada.' },
        { id: 'cat-2', parentId: null, code: 'CAT-DES', name: 'Desafíos & Barreras', color: '#3b82f6', keywords: ['desafío', 'resistencia', 'miedo', 'barreras', 'aislamiento'], description: 'Dificultades de adaptación y resistencia.' },
        { id: 'cat-3', parentId: null, code: 'CAT-LID', name: 'Liderazgo & Motivación', color: '#10b981', keywords: ['liderazgo', 'líderes', 'dirección', 'motivación'], description: 'Estrategias de guiar equipos e incentivos.' },
        { id: 'cat-4', parentId: null, code: 'CAT-EMPA', name: 'Conexión Humana & Empatía', color: '#f59e0b', keywords: ['empatía', 'humana', 'apoyo', 'conexión', 'escuchadas'], description: 'Relaciones interpersonales y clima laboral.' },
        { id: 'cat-5', parentId: null, code: 'CAT-COM', name: 'Comunicación', color: '#8b5cf6', keywords: ['comunicación', 'mensajes', 'chat', 'videollamadas', 'canales'], description: 'Canales de diálogo y flujo de información.' }
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
            wordCount: 116
        }
    ];

    const SAMPLE_CODINGS = [
        {
            id: 'cod-1',
            docId: 'doc-1',
            categoryId: 'cat-2',
            startChar: 221,
            endChar: 332,
            quoteText: 'Muchos compañeros sentían cierta resistencia al cambio porque estaban acostumbrados a los métodos tradicionales',
            memo: 'Representa la barrera cultural inicial frente a la innovación digital.',
            createdAt: Date.now() - 100000
        },
        {
            id: 'cod-2',
            docId: 'doc-1',
            categoryId: 'cat-1-1',
            startChar: 343,
            endChar: 424,
            quoteText: 'La automatización nos obligó a reestructurar la forma en que colaboramos a diario',
            memo: 'Impacto estructural directo en los procesos cotidianos de trabajo.',
            createdAt: Date.now() - 90000
        },
        {
            id: 'cod-3',
            docId: 'doc-1',
            categoryId: 'cat-3',
            startChar: 575,
            endChar: 661,
            quoteText: 'La motivación que nos transmitieron los líderes permitió perder el miedo a equivocarse',
            memo: 'Liderazgo positivo como catalizador para superar el temor al cambio.',
            createdAt: Date.now() - 80000
        },
        {
            id: 'cod-4',
            docId: 'doc-1',
            categoryId: 'cat-4',
            startChar: 663,
            endChar: 736,
            quoteText: 'Hubo mucho énfasis en la empatía y la conexión humana durante las semanas',
            memo: 'Dimensión socioemocional crucial durante procesos de aprendizaje.',
            createdAt: Date.now() - 70000
        },
        {
            id: 'cod-5',
            docId: 'doc-2',
            categoryId: 'cat-4',
            startChar: 163,
            endChar: 246,
            quoteText: 'Lo que más valoro es que exista espacio para la empatía y el apoyo entre compañeros',
            memo: 'Cultura centrada en las relaciones humanas de apoyo mutuo.',
            createdAt: Date.now() - 60000
        },
        {
            id: 'cod-6',
            docId: 'doc-2',
            categoryId: 'cat-5',
            startChar: 643,
            endChar: 733,
            quoteText: 'las personas sienten que su trabajo tiene significado y son escuchadas a través de canales',
            memo: 'Asociación entre comunicación fluida y sentido de pertenencia.',
            createdAt: Date.now() - 50000
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

    function normalizedTextWithOffsets(value) {
        const source = String(value || '');
        if (source.length > MAX_FOLDED_INDEX_SOURCE_CHARS) return null;
        let text = '';
        const starts = [];
        const ends = [];
        let offset = 0;
        for (const character of source) {
            const nextOffset = offset + character.length;
            const folded = normalizeText(character);
            if (!folded && /\p{M}/u.test(character) && ends.length) {
                ends[ends.length - 1] = nextOffset;
            } else {
                text += folded;
                for (let index = 0; index < folded.length; index++) {
                    starts.push(offset);
                    ends.push(nextOffset);
                }
            }
            offset = nextOffset;
        }
        return { text, starts: Uint32Array.from(starts), ends: Uint32Array.from(ends) };
    }

    function findNormalizedMatchesInFolded(folded, query, limit = Infinity) {
        const needle = normalizeText(String(query || '').trim());
        if (!folded || !needle || needle.length > MAX_NORMALIZED_SEARCH_TERM_CHARS) return [];
        const safeLimit = Number.isSafeInteger(limit) && limit >= 0 ? limit : Infinity;
        const matches = [];
        let searchFrom = 0;
        let normalizedStart;
        while (matches.length < safeLimit && (normalizedStart = folded.text.indexOf(needle, searchFrom)) !== -1) {
            const normalizedEnd = normalizedStart + needle.length - 1;
            matches.push({
                start: folded.starts[normalizedStart],
                end: folded.ends[normalizedEnd]
            });
            searchFrom = normalizedStart + needle.length;
        }
        return matches;
    }

    function findNormalizedMatchesStreaming(value, query, limit = Infinity) {
        const source = String(value || '');
        const needle = normalizeText(String(query || '').trim());
        if (!needle || needle.length > MAX_NORMALIZED_SEARCH_TERM_CHARS) return [];
        const safeLimit = Number.isSafeInteger(limit) && limit >= 0 ? limit : Infinity;
        if (safeLimit === 0) return [];

        const prefix = new Uint32Array(needle.length);
        for (let index = 1, matched = 0; index < needle.length; index++) {
            while (matched > 0 && needle[index] !== needle[matched]) matched = prefix[matched - 1];
            if (needle[index] === needle[matched]) matched++;
            prefix[index] = matched;
        }

        const recentStarts = new Uint32Array(needle.length);
        const matches = [];
        let normalizedOffset = 0;
        let matched = 0;
        let sourceOffset = 0;
        let pending = null;

        function consumeFoldedGroup(group) {
            for (let unitIndex = 0; unitIndex < group.text.length; unitIndex++) {
                const unit = group.text[unitIndex];
                recentStarts[normalizedOffset % needle.length] = group.start;
                while (matched > 0 && unit !== needle[matched]) matched = prefix[matched - 1];
                if (unit === needle[matched]) matched++;
                normalizedOffset++;
                if (matched === needle.length) {
                    const startSlot = (normalizedOffset - needle.length) % needle.length;
                    matches.push({ start: recentStarts[startSlot], end: group.end });
                    if (matches.length >= safeLimit) return false;
                    // Igual que indexOf(..., finCoincidencia), las coincidencias no se solapan.
                    matched = 0;
                }
            }
            return true;
        }

        for (const character of source) {
            const nextOffset = sourceOffset + character.length;
            const foldedCharacter = normalizeText(character);
            if (!foldedCharacter && /\p{M}/u.test(character) && pending) {
                pending.end = nextOffset;
            } else {
                if (pending && consumeFoldedGroup(pending) === false) return matches;
                pending = foldedCharacter ? { text: foldedCharacter, start: sourceOffset, end: nextOffset } : null;
            }
            sourceOffset = nextOffset;
        }
        if (pending) consumeFoldedGroup(pending);
        return matches;
    }

    function findNormalizedMatches(value, query, limit = Infinity) {
        const folded = normalizedTextWithOffsets(value);
        return folded
            ? findNormalizedMatchesInFolded(folded, query, limit)
            : findNormalizedMatchesStreaming(value, query, limit);
    }

    function searchMatchSlicesForRange(matches, rangeStart, rangeEnd) {
        const start = Number(rangeStart);
        const end = Number(rangeEnd);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
        const slices = [];
        const orderedMatches = matches || [];
        let low = 0;
        let high = orderedMatches.length;
        while (low < high) {
            const middle = Math.floor((low + high) / 2);
            if (Number(orderedMatches[middle].end) <= start) low = middle + 1;
            else high = middle;
        }
        for (let matchIndex = low; matchIndex < orderedMatches.length; matchIndex++) {
            const match = orderedMatches[matchIndex];
            if (Number(match.start) >= end) break;
            const sliceStart = Math.max(start, Number(match.start));
            const sliceEnd = Math.min(end, Number(match.end));
            if (sliceEnd > sliceStart) {
                slices.push({ matchIndex, start: sliceStart - start, end: sliceEnd - start });
            }
        }
        return slices;
    }

    function sentenceRangesForMatches(value, matches) {
        const content = String(value || '');
        const orderedMatches = matches || [];
        const ranges = new Array(orderedMatches.length);
        const pending = [];
        const rangeCache = new Map();
        let pendingHead = 0;
        let nextMatch = 0;
        let sentenceStart = 0;

        function settleBoundary(sentenceEnd, nextSentenceStart) {
            while (nextMatch < orderedMatches.length && Number(orderedMatches[nextMatch].start) < sentenceEnd) {
                pending.push({ index: nextMatch, start: sentenceStart, end: Number(orderedMatches[nextMatch].end) });
                nextMatch++;
            }
            while (pendingHead < pending.length && pending[pendingHead].end <= sentenceEnd) {
                const item = pending[pendingHead++];
                const key = `${item.start}:${sentenceEnd}`;
                let range = rangeCache.get(key);
                if (!range) {
                    range = ProjectIntegrity.trimSelectionOffsets(content, item.start, sentenceEnd);
                    rangeCache.set(key, range);
                }
                ranges[item.index] = range;
            }
            sentenceStart = nextSentenceStart;
        }

        for (let index = 0; index < content.length && pendingHead + nextMatch < pending.length + orderedMatches.length; index++) {
            const character = content[index];
            if (!/[.!?\n]/.test(character)) continue;
            const sentenceEnd = character === '\n' ? index : index + 1;
            settleBoundary(sentenceEnd, index + 1);
        }
        settleBoundary(content.length, content.length);
        return ranges;
    }

    function activeCodingCountIndexes(codings) {
        const byDocument = new Map();
        const byCategory = new Map();
        (codings || []).forEach(coding => {
            if (coding.dismissed) return;
            byDocument.set(coding.docId, (byDocument.get(coding.docId) || 0) + 1);
            byCategory.set(coding.categoryId, (byCategory.get(coding.categoryId) || 0) + 1);
        });
        return { byDocument, byCategory };
    }

    function readerCodingsForDisplay(codings) {
        const active = (codings || []).filter(coding => !coding.dismissed);
        if (!state.activeCategoryId) return active.slice(0, MAX_READER_CODINGS);
        const preferred = [];
        const remaining = [];
        active.forEach(coding => {
            (coding.categoryId === state.activeCategoryId ? preferred : remaining).push(coding);
        });
        return preferred.slice(0, MAX_READER_CODINGS).concat(
            remaining.slice(0, Math.max(0, MAX_READER_CODINGS - preferred.length))
        );
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
        if (!await initLicenseGate()) return;
        setupLicenseRevalidation();
        await loadNativeCapabilities();
        const loadStatus = await loadFromStorage();
        if (loadStatus === 'absent') {
            // La muestra inicial es sólo una vista de bienvenida. No se persiste
            // hasta que la persona realice un cambio o la cargue expresamente.
            loadSampleData({ persist: false });
        }
        setupEventListeners();
        setupAccessibleDialogs();
        setupNativeCloseFlush();
        setupResizablePanes();
        applyTheme();
        checkNoticeBanner();
        renderDocumentList();
        refreshAnalyticsDocumentFilter();
        renderCodebookList();
        setActiveDocument(state.documents.length > 0 ? state.documents[0].id : null);
        renderDecoderList();
        setupNetworkCanvas();
    }

    async function loadNativeCapabilities() {
        const invoke = getTauriInvoke();
        if (!invoke) return;
        try {
            const reported = await invoke('native_capabilities');
            const next = { ...runtimeCapabilities };
            Object.keys(next).forEach(key => {
                const value = Number(reported && reported[key]);
                if (Number.isSafeInteger(value) && value > 0) next[key] = value;
            });
            runtimeCapabilities = next;
        } catch (error) {
            // Mantener los mismos topes conservadores del backend anterior.
            console.warn('No se pudieron consultar las capacidades nativas:', error);
        }
    }

    function setApplicationInert(inert) {
        document.querySelectorAll('body > :not(#modal-license)').forEach(element => { element.inert = inert; });
    }

    function showLicenseGate(status) {
        const modal = document.getElementById('modal-license');
        document.getElementById('license-message').textContent = status.message || 'Se requiere una licencia Pro válida.';
        document.getElementById('license-device-code').value = status.deviceCode || '';
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        setApplicationInert(true);
        document.getElementById('btn-install-license').focus();
    }

    function configureLicenseInstaller() {
        const install = document.getElementById('btn-install-license');
        install.disabled = false;
        install.onclick = async () => {
            const invoke = getTauriInvoke();
            if (!invoke) return;
            install.disabled = true;
            try {
                const installed = await invoke('install_license');
                if (installed.valid) {
                    document.getElementById('license-message').textContent = `Licencia válida para ${installed.holder}. Reiniciando…`;
                    window.location.reload();
                    return;
                }
                showLicenseGate(installed);
            } catch (error) {
                document.getElementById('license-message').textContent = `Licencia rechazada: ${error.message || error}`;
            } finally {
                install.disabled = false;
            }
        };
    }

    async function initLicenseGate() {
        const invoke = getTauriInvoke();
        const install = document.getElementById('btn-install-license');
        const copy = document.getElementById('btn-copy-device-code');
        copy.onclick = async () => {
            const code = document.getElementById('license-device-code').value;
            if (!code) return;
            try {
                await navigator.clipboard.writeText(code);
                copy.textContent = 'Código copiado';
            } catch (_) {
                const input = document.getElementById('license-device-code');
                input.select();
                document.execCommand('copy');
            }
        };
        if (!invoke) {
            install.disabled = true;
            showLicenseGate({ message: 'La edición Pro sólo puede activarse dentro de la aplicación de escritorio.', deviceCode: '' });
            return false;
        }
        let status;
        try {
            status = await invoke('license_status');
        } catch (error) {
            showLicenseGate({ message: `No se pudo comprobar la licencia: ${error.message || error}`, deviceCode: '' });
            return false;
        }
        if (status.valid) return true;
        showLicenseGate(status);
        configureLicenseInstaller();
        return false;
    }

    function stopLicenseRevalidation() {
        if (licenseRevalidationTimer) clearInterval(licenseRevalidationTimer);
        licenseRevalidationTimer = null;
        document.removeEventListener('visibilitychange', onLicenseVisibilityChange);
        window.removeEventListener('focus', onLicenseWindowFocus);
    }

    function failClosedLicenseRevalidation(status) {
        stopLicenseRevalidation();
        const invoke = getTauriInvoke();
        if (invoke) configureLicenseInstaller();
        else document.getElementById('btn-install-license').disabled = true;
        showLicenseGate(status || { message: 'No se pudo revalidar la licencia.', deviceCode: '' });
    }

    async function revalidateLicense(force = false) {
        const now = Date.now();
        if (licenseRevalidationRunning || (!force && now - lastLicenseValidationAt < 60000)) return;
        const invoke = getTauriInvoke();
        if (!invoke) {
            failClosedLicenseRevalidation({ message: 'Se perdió el canal seguro de validación de licencia. Reinicia la aplicación.', deviceCode: '' });
            return;
        }
        licenseRevalidationRunning = true;
        try {
            const status = await invoke('license_status');
            lastLicenseValidationAt = Date.now();
            if (!status || status.valid !== true) {
                failClosedLicenseRevalidation(status || { message: 'La licencia dejó de ser válida.', deviceCode: '' });
            }
        } catch (error) {
            console.error('No se pudo revalidar la licencia:', error);
            lastLicenseValidationAt = Date.now();
            failClosedLicenseRevalidation({ message: `No se pudo revalidar la licencia: ${error.message || error}`, deviceCode: '' });
        } finally {
            licenseRevalidationRunning = false;
        }
    }

    function onLicenseVisibilityChange() {
        if (document.visibilityState === 'visible') revalidateLicense(false);
    }

    function onLicenseWindowFocus() {
        revalidateLicense(false);
    }

    function setupLicenseRevalidation() {
        stopLicenseRevalidation();
        lastLicenseValidationAt = Date.now();
        document.addEventListener('visibilitychange', onLicenseVisibilityChange);
        window.addEventListener('focus', onLicenseWindowFocus);
        licenseRevalidationTimer = setInterval(() => revalidateLicense(true), 5 * 60 * 1000);
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
        const failures = [];
        let foundStoredState = false;

        if (invoke) {
            let candidates;
            try {
                candidates = await invoke('load_app_state_candidates');
            } catch (error) {
                storageWritesBlocked = true;
                storageRecoveryMessage = `No se pudo inspeccionar el estado guardado: ${error.message || error}`;
                alert(`${storageRecoveryMessage}\n\nEl archivo existente no será reemplazado. Usa “Abrir Proyecto”, “Nuevo Proyecto” o “Cargar Muestra” para recuperarte.`);
                return 'invalid';
            }

            if (!Array.isArray(candidates)) {
                storageWritesBlocked = true;
                storageRecoveryMessage = 'El backend devolvió una lista de recuperación inválida.';
                alert(`${storageRecoveryMessage}\n\nEl archivo existente no será reemplazado.`);
                return 'invalid';
            }

            foundStoredState = candidates.length > 0;
            for (const candidate of candidates) {
                if (!candidate || typeof candidate.raw !== 'string' || typeof candidate.source !== 'string') {
                    failures.push('candidato con formato inválido');
                    continue;
                }
                try {
                    const project = parseAndValidateProject(candidate.raw);
                    await invoke('promote_app_state_candidate', { source: candidate.source, projectJson: candidate.raw });
                    applyValidatedProject(project);
                    storageWritesBlocked = false;
                    storageRecoveryMessage = '';
                    recoverySaveWarningShown = false;
                    if (lastParsedProjectMetadata && lastParsedProjectMetadata.legacy) saveToStorage();
                    return 'loaded';
                } catch (error) {
                    failures.push(`${candidate.source}: ${error.message || error}`);
                }
            }

            if (foundStoredState) {
                storageWritesBlocked = true;
                storageRecoveryMessage = 'Ninguna copia guardada pudo abrirse de forma segura.';
                console.error('Error loading stored project candidates:', failures);
                alert(`${storageRecoveryMessage}\n\n${failures.slice(0, 4).join('\n')}\n\nLas copias existentes se conservaron. Usa “Abrir Proyecto”, “Nuevo Proyecto” o “Cargar Muestra” para continuar.`);
                return 'invalid';
            }
        }

        const browserRaw = localStorage.getItem(STORAGE_KEY);
        if (browserRaw) {
            foundStoredState = true;
            try {
                applyValidatedProject(parseAndValidateProject(browserRaw));
                storageWritesBlocked = false;
                storageRecoveryMessage = '';
                recoverySaveWarningShown = false;
                if (invoke || (lastParsedProjectMetadata && lastParsedProjectMetadata.legacy)) saveToStorage();
                return 'loaded';
            } catch (error) {
                failures.push(`almacenamiento local: ${error.message || error}`);
            }
        }

        if (!foundStoredState) return 'absent';

        storageWritesBlocked = true;
        storageRecoveryMessage = 'Ninguna copia guardada pudo abrirse de forma segura.';
        console.error('Error loading stored project candidates:', failures);
        alert(`${storageRecoveryMessage}\n\n${failures.slice(0, 4).join('\n')}\n\nLas copias existentes se conservaron. Usa “Abrir Proyecto”, “Nuevo Proyecto” o “Cargar Muestra” para continuar.`);
        return 'invalid';
    }

    function createProjectPayload(overrides = {}) {
        const projectData = {
                documents: state.documents,
                categories: state.categories,
                codings: state.codings,
                corpusExclusions: state.corpusExclusions,
                theme: state.theme,
                isSampleLoaded: state.isSampleLoaded,
                analyticsUnit: state.analyticsUnit,
                analyticsMetric: state.analyticsMetric,
                analyticsCategoryMode: state.analyticsCategoryMode,
                analyticsNodeSize: state.analyticsNodeSize,
                analyticsWindow: state.analyticsWindow,
                analyticsThreshold: normalizedAnalyticsThreshold(state.analyticsThreshold, state.analyticsMetric),
                analyticsDocumentId: state.analyticsDocumentId,
                analyticsDocumentGroup: state.analyticsDocumentGroup,
                analyticsHideZeros: state.analyticsHideZeros,
                summaries: state.summaries,
                auditLog: state.auditLog,
                projectTemplate: state.projectTemplate
            };
        return ProjectIntegrity.createProjectEnvelope({ ...projectData, ...overrides }, 'pro', APP_VERSION);
    }

    async function flushNativeSave() {
        const invoke = getTauriInvoke();
        if (!invoke) return;
        clearTimeout(nativeSaveTimer);
        nativeSaveTimer = null;
        if (nativeSaveQueue) {
            await nativeSaveQueue;
            return;
        }

        nativeSaveQueue = (async () => {
            while (pendingNativeProject) {
                const serialized = pendingNativeProject;
                pendingNativeProject = null;
                try {
                    await invoke('save_app_state', { projectJson: serialized });
                    localStorage.removeItem(STORAGE_KEY);
                } catch (error) {
                    // Una escritura antigua que falla nunca debe reemplazar un
                    // proyecto más nuevo que se encoló mientras estaba en curso.
                    if (pendingNativeProject) {
                        console.warn('Falló una escritura antigua; se guardará el estado más reciente:', error);
                        continue;
                    }
                    pendingNativeProject = serialized;
                    throw error;
                }
            }
        })();
        try {
            await nativeSaveQueue;
        } finally {
            nativeSaveQueue = null;
        }
    }

    function setupNativeCloseFlush() {
        const getCurrentWindow = (window.__TAURI__ && window.__TAURI__.window && window.__TAURI__.window.getCurrentWindow)
            || (window.__TAURI__ && window.__TAURI__.webviewWindow && window.__TAURI__.webviewWindow.getCurrentWebviewWindow);
        if (typeof getCurrentWindow !== 'function') return;
        const appWindow = getCurrentWindow();
        appWindow.onCloseRequested(async event => {
            event.preventDefault();
            if (nativeCloseInProgress) return;
            nativeCloseInProgress = true;
            try {
                await flushNativeSave();
                const invoke = getTauriInvoke();
                if (!invoke) throw new Error('No se encontró el canal nativo de cierre.');
                await invoke('close_application');
            } catch (error) {
                nativeCloseInProgress = false;
                console.error('Error flushing native state before close:', error);
                alert(`No se cerró la aplicación porque el último cambio no pudo guardarse: ${error.message || error}`);
            }
        }).catch(error => console.error('No se pudo instalar el guardado al cerrar:', error));
    }

    function validateAndSerializeProject(overrides = {}, pretty = false) {
        const payload = createProjectPayload(overrides);
        const validated = validateProjectObject(payload);
        if (validated.codings.length !== payload.codings.length) {
            throw new Error('La lista de codificaciones no pudo validarse completamente.');
        }
        validated.codings.forEach((coding, index) => {
            const original = payload.codings[index];
            if (!original || original.quoteText !== coding.quoteText) {
                throw new Error(`La cita ${coding.id} ya no coincide con el texto del documento. Revisa esa codificación antes de guardar.`);
            }
        });
        const canonicalPayload = ProjectIntegrity.createProjectEnvelope(validated, 'pro', APP_VERSION);
        const serialized = JSON.stringify(canonicalPayload, null, pretty ? 2 : 0);
        const size = utf8ByteLength(serialized);
        if (size > runtimeCapabilities.maxStateBytes) {
            throw new Error(`El proyecto ocupa ${Math.ceil(size / 1024 / 1024)} MiB y supera el máximo de ${Math.floor(runtimeCapabilities.maxStateBytes / 1024 / 1024)} MiB.`);
        }
        return { validated, serialized };
    }

    function serializeProjectForStorage(pretty = false) {
        return validateAndSerializeProject({}, pretty).serialized;
    }

    function enqueueSerializedProject(serialized) {
        const invoke = getTauriInvoke();
        if (invoke) {
            pendingNativeProject = serialized;
            clearTimeout(nativeSaveTimer);
            nativeSaveTimer = setTimeout(() => {
                flushNativeSave().catch(error => {
                    console.error('Error saving native state:', error);
                    alert(`No se pudo guardar el proyecto: ${error.message || error}`);
                });
            }, 150);
        } else {
            localStorage.setItem(STORAGE_KEY, serialized);
        }
    }

    function auditLogWith(action, detail = '', source = state.auditLog) {
        return [...source, {
            id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: Date.now(),
            action,
            detail
        }].slice(-10000);
    }

    function commitProjectMutation(overrides, errorPrefix = 'No se pudo guardar el proyecto') {
        if (storageWritesBlocked) {
            if (!recoverySaveWarningShown) {
                recoverySaveWarningShown = true;
                alert('El guardado automático está detenido para no sobrescribir las copias que no pudieron recuperarse. Abre un proyecto válido, crea uno nuevo o carga la muestra para continuar.');
            }
            return false;
        }
        try {
            const { validated, serialized } = validateAndSerializeProject(overrides || {});
            // La persistencia/encolado ocurre antes de publicar las nuevas
            // referencias en memoria. Si falla, el estado vigente queda intacto.
            enqueueSerializedProject(serialized);
            Object.assign(state, validated);
            recoverySaveWarningShown = false;
            return true;
        } catch (error) {
            console.error('Error committing project mutation:', error);
            alert(`${errorPrefix}: ${error.message || error}`);
            return false;
        }
    }

    function saveToStorage() {
        if (storageWritesBlocked) {
            if (!recoverySaveWarningShown) {
                recoverySaveWarningShown = true;
                alert('El guardado automático está detenido para no sobrescribir las copias que no pudieron recuperarse. Abre un proyecto válido, crea uno nuevo o carga la muestra para continuar.');
            }
            return false;
        }
        try {
            enqueueSerializedProject(serializeProjectForStorage());
            recoverySaveWarningShown = false;
            return true;
        } catch (error) {
            console.error('Error saving to storage:', error);
            alert(`No se pudo guardar el proyecto: ${error.message || error}`);
            return false;
        }
    }

    function resetProjectSettings() {
        state.analyticsUnit = 'paragraph';
        state.analyticsMetric = 'jaccard';
        state.analyticsCategoryMode = 'main';
        state.analyticsNodeSize = 'documentShare';
        state.analyticsWindow = 100;
        state.analyticsThreshold = 0;
        state.analyticsDocumentId = '';
        state.analyticsDocumentGroup = '';
        state.analyticsHideZeros = true;
    }

    function resetTransientControls() {
        ['filter-docs', 'filter-codes', 'reader-search-input', 'global-search-input'].forEach(id => {
            const control = document.getElementById(id);
            if (control) control.value = '';
        });
        const decoderFilter = document.getElementById('decoder-filter-code');
        if (decoderFilter) decoderFilter.value = 'ALL';
        const searchCount = document.getElementById('reader-search-count');
        if (searchCount) searchCount.textContent = '0/0';
        const globalResults = document.getElementById('global-search-results');
        if (globalResults) globalResults.innerHTML = '<div class="empty-state-sm">Ingresa un término para buscar.</div>';
        const standard = document.getElementById('view-mode-standard');
        const tiers = document.getElementById('view-mode-tiers');
        if (standard) standard.classList.add('active');
        if (tiers) tiers.classList.remove('active');
        document.querySelectorAll('.btn-chart-type').forEach(button => button.classList.toggle('active', button.id === 'chart-type-network'));
        const graphLayout = document.getElementById('graph-layout-select');
        if (graphLayout) graphLayout.value = 'circular';
        const toolbar = document.getElementById('floating-toolbar');
        if (toolbar) toolbar.style.display = 'none';
        closeChartDrilldown();
        updateCategoryFilterBanner();
    }

    function syncAnalyticsControlsFromState() {
        const values = {
            'cooccurrence-unit': state.analyticsUnit,
            'analytics-category-mode': state.analyticsCategoryMode,
            'analytics-node-size': state.analyticsNodeSize,
            'association-metric': state.analyticsMetric,
            'cooccurrence-window': String(state.analyticsWindow),
            'analytics-threshold': String(state.analyticsThreshold)
        };
        Object.entries(values).forEach(([id, value]) => {
            const control = document.getElementById(id);
            if (control) control.value = value;
        });
        const hideZeros = document.getElementById('analytics-hide-zeros');
        if (hideZeros) hideZeros.checked = state.analyticsHideZeros;
    }

    function loadSampleData({ persist = true } = {}) {
        resetEphemeralState();
        resetProjectSettings();
        state.categories = JSON.parse(JSON.stringify(SAMPLE_CATEGORIES));
        state.documents = JSON.parse(JSON.stringify(SAMPLE_DOCUMENTS));
        state.codings = JSON.parse(JSON.stringify(SAMPLE_CODINGS));
        state.summaries = [];
        state.auditLog = [];
        state.projectTemplate = '';
        state.isSampleLoaded = true;
        recordAudit('Proyecto de muestra cargado');
        resetTransientControls();
        syncAnalyticsControlsFromState();
        if (persist) {
            storageWritesBlocked = false;
            storageRecoveryMessage = '';
            recoverySaveWarningShown = false;
            saveToStorage();
        }
        checkNoticeBanner();
    }

    function clearProject() {
        resetEphemeralState();
        resetProjectSettings();
        state.categories = [];
        state.documents = [];
        state.codings = [];
        state.corpusExclusions = [];
        state.summaries = [];
        state.auditLog = [];
        state.projectTemplate = '';
        state.isSampleLoaded = false;
        storageWritesBlocked = false;
        storageRecoveryMessage = '';
        recoverySaveWarningShown = false;
        resetTransientControls();
        syncAnalyticsControlsFromState();
        saveToStorage();
        checkNoticeBanner();
        renderDocumentList();
        refreshAnalyticsDocumentFilter();
        renderCodebookList();
        setActiveDocument(null);
        renderDecoderList();
        setupNetworkCanvas();
    }

    function checkNoticeBanner() {
        const banner = document.getElementById('sample-notice-banner');
        const text = document.getElementById('notice-banner-text');
        if (storageRecoveryMessage) {
            if (text) text.textContent = `${storageRecoveryMessage} Las copias se conservaron; abre un proyecto válido o inicia uno nuevo.`;
            banner.style.display = 'flex';
        } else if (state.isSampleLoaded) {
            if (text) text.innerHTML = '<strong>Proyecto de Muestra:</strong> Estás explorando datos de ejemplo precargados. Puedes conservar este ejemplo o iniciar tu propio análisis desde cero.';
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

    function autoCodingRangeKey(docId, categoryId, startChar, endChar) {
        return `${docId}\u0000${categoryId}\u0000${startChar}:${endChar}`;
    }

    function createAutoCodeBatchContext(documents) {
        const largestDocument = Math.max(0, ...(documents || []).map(document => String(document.content || '').length));
        const existingByRange = new Map();
        const usedCodingIds = new Set();
        state.codings.forEach((coding, index) => {
            usedCodingIds.add(coding.id);
            const key = autoCodingRangeKey(coding.docId, coding.categoryId, coding.startChar, coding.endChar);
            const prior = existingByRange.get(key);
            if (!prior || (prior.coding.dismissed && !coding.dismissed)) existingByRange.set(key, { coding, index });
        });
        const context = {
            codings: null,
            existingByRange,
            usedCodingIds,
            foldedByDocument: new Map(),
            remainingWork: Math.max(MAX_AUTOCODE_SCAN_CODE_UNITS, largestDocument * 2),
            remainingCandidates: MAX_AUTOCODE_MATCH_CANDIDATES,
            remainingTerms: MAX_AUTOCODE_TERMS,
            termsProcessed: 0,
            addedCount: 0,
            workBudgetReached: false,
            candidateBudgetReached: false,
            termBudgetReached: false,
            codingLimitReached: false,
            batchTimestamp: Date.now(),
            generatedId: 0,
            ensureCodings() {
                if (!this.codings) this.codings = [...state.codings];
                return this.codings;
            },
            nextCodingId() {
                let id;
                do {
                    id = `cod-auto-${this.batchTimestamp}-${this.generatedId++}`;
                } while (this.usedCodingIds.has(id));
                this.usedCodingIds.add(id);
                return id;
            }
        };
        return context;
    }

    function proposeAutoCodeCategoryInDocument(doc, cat, context) {
        if (!doc || !cat || context.codingLimitReached || context.candidateBudgetReached) return 0;
        const content = String(doc.content || '');
        const seenTerms = new Set();
        const terms = [cat.name, cat.code, ...(cat.keywords || [])].filter(termValue => {
            const normalized = normalizeText(String(termValue || '').trim());
            if (!normalized || normalized.length < 2 || seenTerms.has(normalized)) return false;
            seenTerms.add(normalized);
            return true;
        });
        const excludeTerms = (cat.excludeKeywords || []).map(termValue => {
            const normalized = normalizeText(String(termValue || '').trim());
            return normalized && normalized.length >= 2 ? normalized : null;
        }).filter(Boolean);
        let addedForPair = 0;

        for (const termRaw of terms) {
            if (context.remainingTerms <= 0) {
                context.termBudgetReached = true;
                break;
            }
            const scanCost = Math.max(1, content.length * 2);
            if (scanCost > context.remainingWork && context.termsProcessed > 0) {
                context.workBudgetReached = true;
                break;
            }
            context.remainingWork = Math.max(0, context.remainingWork - scanCost);
            context.remainingTerms--;
            context.termsProcessed++;

            const raw = String(termRaw).trim();
            if (!context.foldedByDocument.has(doc.id)) {
                context.foldedByDocument.set(doc.id, normalizedTextWithOffsets(content));
            }
            const foldedContent = context.foldedByDocument.get(doc.id);
            const termMatches = foldedContent
                ? findNormalizedMatchesInFolded(foldedContent, raw, context.remainingCandidates + 1)
                : findNormalizedMatchesStreaming(content, raw, context.remainingCandidates + 1);
            if (termMatches.length > context.remainingCandidates) {
                termMatches.length = context.remainingCandidates;
                context.candidateBudgetReached = true;
            }
            context.remainingCandidates -= termMatches.length;
            const termSentenceRanges = sentenceRangesForMatches(content, termMatches);

            for (let matchIndex = 0; matchIndex < termMatches.length; matchIndex++) {
                const match = termMatches[matchIndex];
                const sentenceRange = termSentenceRanges[matchIndex];
                if (!sentenceRange || sentenceRange.text.length <= 3) continue;

                // Exclusión metodológica: no codificar turnos del entrevistador/investigador/moderador/observador
                const matchPos = match && typeof match.start === 'number' ? match.start : sentenceRange.start;
                const lastParaBreak = Math.max(0, content.lastIndexOf('\n\n', matchPos));
                const turnSnippet = content.slice(lastParaBreak, lastParaBreak + 80).trim();
                const isInterviewer = /^(moderador|moderadora|entrevistador|entrevistadora|investigador|investigadora|observador|observadora|docente\s*\(consigna\))\b/i.test(turnSnippet);
                if (isInterviewer) {
                    continue;
                }

                // Exclusión metodológica global del corpus
                if (Array.isArray(state.corpusExclusions) && state.corpusExclusions.length > 0) {
                    const isCorpusExcluded = state.corpusExclusions.some(ex =>
                        ex.docId === doc.id &&
                        sentenceRange.start < ex.endChar &&
                        sentenceRange.end > ex.startChar
                    );
                    if (isCorpusExcluded) {
                        continue;
                    }
                }

                // Exclusión por términos o frases no deseadas definidas en la categoría
                if (excludeTerms.length > 0) {
                    const normalizedSentence = normalizeText(sentenceRange.text);
                    if (excludeTerms.some(ex => normalizedSentence.includes(ex))) {
                        continue;
                    }
                }

                const rangeKey = autoCodingRangeKey(doc.id, cat.id, sentenceRange.start, sentenceRange.end);
                const existingEntry = context.existingByRange.get(rangeKey);
                const existingCoding = existingEntry && existingEntry.coding;
                if (existingCoding && existingCoding.dismissed) {
                    const reactivated = { ...existingCoding, dismissed: false };
                    context.ensureCodings()[existingEntry.index] = reactivated;
                    context.existingByRange.set(rangeKey, { coding: reactivated, index: existingEntry.index });
                    context.addedCount++;
                    addedForPair++;
                } else if (!existingCoding) {
                    const codings = context.codings || state.codings;
                    if (codings.length >= projectLimits().maxCodings) {
                        context.codingLimitReached = true;
                        break;
                    }
                    const newCoding = {
                        id: context.nextCodingId(),
                        docId: doc.id,
                        categoryId: cat.id,
                        startChar: sentenceRange.start,
                        endChar: sentenceRange.end,
                        quoteText: sentenceRange.text,
                        memo: `Ocurrencia identificada por término: "${raw}"`,
                        source: 'automatic',
                        weight: 1,
                        createdAt: Date.now()
                    };
                    context.ensureCodings().push(newCoding);
                    context.existingByRange.set(rangeKey, { coding: newCoding, index: context.codings.length - 1 });
                    context.addedCount++;
                    addedForPair++;
                }
            }
            if (context.codingLimitReached || context.candidateBudgetReached) break;
        }
        return addedForPair;
    }

    function commitAutoCodeBatch(context, detail) {
        if (!context.codings || context.addedCount === 0) return true;
        const auditEntry = {
            id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: Date.now(),
            action: 'Autocodificación aplicada',
            detail
        };
        const proposedAuditLog = [...state.auditLog, auditEntry].slice(-10000);
        return commitProjectMutation({ codings: context.codings, auditLog: proposedAuditLog }, 'No se aplicó la autocodificación');
    }

    function notifyAutoCodeBatchLimits(context) {
        if (context.codingLimitReached) alert(`La búsqueda se detuvo al alcanzar el máximo de ${projectLimits().maxCodings.toLocaleString()} codificaciones.`);
        if (context.candidateBudgetReached) alert(`La búsqueda automática se detuvo tras revisar ${MAX_AUTOCODE_MATCH_CANDIDATES.toLocaleString()} coincidencias. Acota las palabras clave para completar el análisis.`);
        if (context.termBudgetReached || context.workBudgetReached) alert(`La búsqueda automática se detuvo tras ${context.termsProcessed.toLocaleString()} combinaciones documento–categoría–término por el presupuesto global de escala. Acota el lote para analizar lo restante.`);
    }

    function autoCodeBatch(documents, categories, detail) {
        const boundedDocuments = (documents || []).slice(0, MAX_AUTOCODE_DOCUMENTS_PER_BATCH);
        const boundedCategories = (categories || []).slice(0, MAX_AUTOCODE_CATEGORIES_PER_BATCH);
        const context = createAutoCodeBatchContext(boundedDocuments);
        let processedPairs = 0;
        outer: for (const doc of boundedDocuments) {
            for (const cat of boundedCategories) {
                if (context.workBudgetReached || context.termBudgetReached || context.candidateBudgetReached || context.codingLimitReached) break outer;
                proposeAutoCodeCategoryInDocument(doc, cat, context);
                processedPairs++;
            }
        }
        const committed = commitAutoCodeBatch(context, `${detail}: ${context.addedCount} pasaje(s)`);
        notifyAutoCodeBatchLimits(context);
        return {
            addedCount: committed ? context.addedCount : 0,
            processedPairs,
            truncated: boundedDocuments.length < (documents || []).length
                || boundedCategories.length < (categories || []).length
                || context.workBudgetReached || context.termBudgetReached || context.candidateBudgetReached || context.codingLimitReached
        };
    }

    function autoCodeCategoryInDocument(docId, categoryId) {
        const doc = state.documents.find(document => document.id === docId);
        const cat = state.categories.find(category => category.id === categoryId);
        if (!doc || !cat) return 0;
        return autoCodeBatch([doc], [cat], `${doc.title} · ${cat.name}`).addedCount;
    }

    function autoCodeAllCategories() {
        if (!state.activeDocId) {
            alert('Abre primero un documento para buscar e identificar ocurrencias.');
            return;
        }

        const activeDocument = state.documents.find(document => document.id === state.activeDocId);
        if (!activeDocument) return;
        const batch = autoCodeBatch([activeDocument], state.categories, `${activeDocument.title} · lote de categorías`);
        const totalAdded = batch.addedCount;

        setActiveDocument(state.activeDocId);
        renderCodebookList();
        renderDecoderList();
        updateQualitativeCharts();

        if (totalAdded > 0) {
            alert(`🔍 ¡Búsqueda de Ocurrencias Completada!\nSe identificaron y codificaron automáticamente ${totalAdded} pasajes coincidentes en el documento.`);
        } else {
            alert('🔍 Búsqueda de Ocurrencias: No se encontraron nuevas coincidencias de términos en este documento.');
        }
        if (batch.truncated) {
            alert(`La operación global revisó ${batch.processedPairs.toLocaleString()} combinaciones de ${state.categories.length.toLocaleString()} categorías posibles. Analiza las restantes por categoría.`);
        }
    }

    // ==========================================
    // 4. In-Text Reader Search Engine (F3 Navigation)
    // ==========================================

    function performInTextSearch(query, targetOffset = null) {
        state.searchQuery = String(query || '').trim();
        state.searchHits = [];
        state.searchActiveIndex = 0;
        state.searchResultsTruncated = false;

        const countLabel = document.getElementById('reader-search-count');
        const doc = state.documents.find(d => d.id === state.activeDocId);
        if (state.searchQuery.length > MAX_NORMALIZED_SEARCH_TERM_CHARS) {
            state.searchQuery = '';
            if (doc) {
                const visibleCodings = state.codings
                    .filter(coding => !coding.dismissed && coding.docId === doc.id);
                renderTextContent(doc, readerCodingsForDisplay(visibleCodings));
            }
            countLabel.textContent = `máx. ${MAX_NORMALIZED_SEARCH_TERM_CHARS.toLocaleString()}`;
            return;
        }
        const normQuery = normalizeText(state.searchQuery);
        if (!doc) {
            countLabel.textContent = '0/0';
            return;
        }

        const docCodings = state.codings
            .filter(coding => !coding.dismissed && coding.docId === state.activeDocId);
        renderTextContent(doc, readerCodingsForDisplay(docCodings));
        if (!normQuery) {
            state.searchQuery = '';
            countLabel.textContent = '0/0';
            return;
        }

        const textBody = document.getElementById('text-body');
        const textNodes = [];
        const documentMatches = findNormalizedMatches(doc.content, state.searchQuery, MAX_IN_TEXT_SEARCH_RESULTS + 1);
        if (documentMatches.length > MAX_IN_TEXT_SEARCH_RESULTS) {
            documentMatches.length = MAX_IN_TEXT_SEARCH_RESULTS;
            state.searchResultsTruncated = true;
        }
        const logicalHits = documentMatches.map(match => ({
            offset: match.start,
            start: match.start,
            end: match.end,
            elements: []
        }));

        function getLeafTextNodes(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent.length > 0) textNodes.push(node);
            } else {
                if (node.classList && node.classList.contains('tier-subline')) return;
                node.childNodes.forEach(child => getLeafTextNodes(child));
            }
        }
        getLeafTextNodes(textBody);

        textNodes.forEach(node => {
            const val = node.textContent;
            const parent = node.parentNode;
            const owner = parent && parent.nodeType === Node.ELEMENT_NODE
                ? (parent.closest('[data-text-start]') || parent)
                : null;
            const baseOffset = Number(owner && owner.dataset && owner.dataset.textStart);
            if (!Number.isFinite(baseOffset)) return;
            const slices = searchMatchSlicesForRange(documentMatches, baseOffset, baseOffset + val.length);
            if (!slices.length) return;

            const frag = document.createDocumentFragment();
            let cursor = 0;
            slices.forEach(slice => {
                const before = val.slice(cursor, slice.start);
                if (before) frag.appendChild(document.createTextNode(before));

                const span = document.createElement('span');
                span.className = 'reader-search-hit';
                span.textContent = val.slice(slice.start, slice.end);
                span.dataset.searchOffset = String(documentMatches[slice.matchIndex].start);
                frag.appendChild(span);
                logicalHits[slice.matchIndex].elements.push(span);
                cursor = slice.end;
            });
            const after = val.slice(cursor);
            if (after) frag.appendChild(document.createTextNode(after));
            parent.replaceChild(frag, node);
        });

        state.searchHits = logicalHits.filter(hit => hit.elements.length > 0);

        const total = state.searchHits.length;
        if (total > 0) {
            const exactIndex = targetOffset == null
                ? -1
                : state.searchHits.findIndex(hit => Number(hit.offset) === Number(targetOffset));
            state.searchActiveIndex = exactIndex >= 0 ? exactIndex : 0;
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
            const elements = Array.isArray(hit.elements) ? hit.elements : [hit];
            elements.forEach(element => {
                element.className = idx === state.searchActiveIndex
                    ? 'reader-search-hit reader-search-active'
                    : 'reader-search-hit';
            });
            if (idx === state.searchActiveIndex && elements[0]) {
                elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });

        countLabel.textContent = `${state.searchActiveIndex + 1}/${total}${state.searchResultsTruncated ? '+' : ''}`;
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

        const codingCounts = activeCodingCountIndexes(state.codings).byDocument;
        const visibleDocuments = filtered.slice(0, MAX_DOCUMENT_LIST_ITEMS);
        visibleDocuments.forEach(doc => {
            const li = document.createElement('li');
            li.className = `item-row ${doc.id === state.activeDocId ? 'active' : ''}`;
            const count = codingCounts.get(doc.id) || 0;

            const group = (doc.profile || {}).group;
            li.innerHTML = `
                <div class="item-title-wrapper">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span>${escapeHtml(doc.title)}</span>${group ? `<small style="color:var(--text-muted); margin-left:0.25rem;">${escapeHtml(group)}</small>` : ''}
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
        if (filtered.length > visibleDocuments.length) {
            const notice = document.createElement('li');
            notice.className = 'empty-state-sm';
            notice.textContent = `Se muestran ${visibleDocuments.length.toLocaleString()} de ${filtered.length.toLocaleString()} documentos. Usa el filtro para acotar la lista.`;
            listEl.appendChild(notice);
        }
    }

    function deleteDocument(docId) {
        const doc = state.documents.find(d => d.id === docId);
        if (!doc) return;
        if (!confirm(`¿Deseas eliminar el documento "${doc.title}" del análisis? Esta acción también eliminará todos sus pasajes codificados.`)) {
            return;
        }

        const proposedDocuments = state.documents.filter(d => d.id !== docId);
        const proposedCodings = state.codings.filter(c => c.docId !== docId);
        const proposedAuditLog = auditLogWith('Documento eliminado', doc.title);

        let nextActiveDocId = state.activeDocId;
        if (state.activeDocId === docId) {
            nextActiveDocId = proposedDocuments.length > 0 ? proposedDocuments[0].id : null;
        }

        if (!commitProjectMutation({
            documents: proposedDocuments,
            codings: proposedCodings,
            auditLog: proposedAuditLog
        }, 'No se pudo eliminar el documento')) return;

        state.activeDocId = nextActiveDocId;

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
        const eligibleParents = state.categories.filter(category => !category.parentId && !excluded.has(category.id));
        eligibleParents.slice(0, MAX_CATEGORY_SELECT_OPTIONS).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.code ? '[' + p.code + '] ' : ''}${p.name}`;
            parentSelect.appendChild(opt);
        });
        if (eligibleParents.length > MAX_CATEGORY_SELECT_OPTIONS) {
            const notice = document.createElement('option');
            notice.disabled = true;
            notice.textContent = `Se muestran ${MAX_CATEGORY_SELECT_OPTIONS.toLocaleString()} de ${eligibleParents.length.toLocaleString()} categorías principales`;
            parentSelect.appendChild(notice);
        }
    }

    function renderCodebookList() {
        const listEl = document.getElementById('codebook-list');
        const filterText = normalizeText(document.getElementById('filter-codes').value.trim());
        listEl.innerHTML = '';

        populateParentCategorySelect();

        const selectFilter = document.getElementById('decoder-filter-code');
        const currentSel = selectFilter.value;
        selectFilter.innerHTML = '<option value="ALL">Todas las categorías</option>';
        const selectCategories = state.categories.slice(0, MAX_CATEGORY_SELECT_OPTIONS);
        const selectedCategory = state.categories.find(category => category.id === currentSel);
        if (selectedCategory && !selectCategories.some(category => category.id === selectedCategory.id)) selectCategories.push(selectedCategory);
        selectCategories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.parentId ? '└─ ' : ''}${cat.name}`;
            selectFilter.appendChild(opt);
        });
        if (state.categories.length > MAX_CATEGORY_SELECT_OPTIONS) {
            const notice = document.createElement('option');
            notice.disabled = true;
            notice.textContent = `Usa el buscador del libro de códigos para localizar otras categorías`;
            selectFilter.appendChild(notice);
        }
        selectFilter.value = state.categories.some(category => category.id === currentSel) ? currentSel : 'ALL';

        if (state.categories.length === 0) {
            listEl.innerHTML = '<li class="empty-state-sm">Sin categorías.</li>';
            return;
        }

        const codingCounts = activeCodingCountIndexes(state.codings).byCategory;
        const filterMatches = new Map();
        const matchesFilter = category => !filterText || normalizeText([
            category.name,
            category.code,
            ...(category.keywords || []),
            category.description,
            category.criteria
        ].filter(Boolean).join(' ')).includes(filterText);
        const cachedMatchesFilter = category => {
            if (!filterMatches.has(category.id)) filterMatches.set(category.id, matchesFilter(category));
            return filterMatches.get(category.id);
        };
        const childrenByParent = new Map();
        const rootCategories = [];
        state.categories.forEach(category => {
            if (!category.parentId) rootCategories.push(category);
            else {
                if (!childrenByParent.has(category.parentId)) childrenByParent.set(category.parentId, []);
                childrenByParent.get(category.parentId).push(category);
            }
        });

        const visibleRows = [];
        let totalVisibleRows = 0;
        rootCategories.forEach(parentCat => {
            const children = childrenByParent.get(parentCat.id) || [];
            const parentMatches = cachedMatchesFilter(parentCat);
            const visibleChildren = parentMatches ? children : children.filter(cachedMatchesFilter);
            if (!parentMatches && visibleChildren.length === 0) return;
            totalVisibleRows += 1 + visibleChildren.length;
            if (visibleRows.length < MAX_CODEBOOK_LIST_ITEMS) visibleRows.push({ category: parentCat, isSub: false });
            visibleChildren.forEach(childCat => {
                if (visibleRows.length < MAX_CODEBOOK_LIST_ITEMS) visibleRows.push({ category: childCat, isSub: true });
            });
        });
        visibleRows.forEach(row => appendCategoryTreeRow(listEl, row.category, row.isSub, codingCounts.get(row.category.id) || 0));
        if (totalVisibleRows === 0) {
            listEl.innerHTML = '<li class="empty-state-sm">Sin categorías coincidentes.</li>';
        } else if (totalVisibleRows > visibleRows.length) {
            const notice = document.createElement('li');
            notice.className = 'empty-state-sm';
            notice.textContent = `Se muestran ${visibleRows.length.toLocaleString()} de ${totalVisibleRows.toLocaleString()} categorías coincidentes. Usa el filtro para acotar la lista.`;
            listEl.appendChild(notice);
        }
    }

    function appendCategoryTreeRow(containerEl, cat, isSub, count = 0) {
        const li = document.createElement('li');
        li.className = `item-row ${isSub ? 'sub-item-row' : ''} ${cat.id === state.activeCategoryId ? 'active' : ''}`;
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
        const category = state.categories.find(item => item.id === catId);
        const proposedCategories = state.categories.filter(category => !removedIds.has(category.id));
        const proposedCodings = state.codings.filter(coding => !removedIds.has(coding.categoryId));
        const proposedSummaries = state.summaries.filter(summary => !removedIds.has(summary.categoryId));
        const proposedAuditLog = auditLogWith('Categoría eliminada', category ? category.name : catId);
        if (!commitProjectMutation({
            categories: proposedCategories,
            codings: proposedCodings,
            summaries: proposedSummaries,
            auditLog: proposedAuditLog
        }, 'No se pudo eliminar la categoría')) return;
        if (state.activeCategoryId && removedIds.has(state.activeCategoryId)) state.activeCategoryId = null;
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
        const renderLimitNotice = document.getElementById('reader-render-limit-notice');

        if (!doc) {
            titleEl.textContent = 'Ningún documento seleccionado';
            document.getElementById('stat-words').textContent = '0 palabras';
            document.getElementById('stat-segments').textContent = '0 pasajes';
            emptyState.style.display = 'flex';
            textBody.style.display = 'none';
            marginBar.style.display = 'none';
            if (renderLimitNotice) {
                renderLimitNotice.style.display = 'none';
                renderLimitNotice.dataset.baseMessage = '';
                renderLimitNotice.textContent = '';
            }
            return;
        }

        emptyState.style.display = 'none';
        textBody.style.display = 'block';
        // La barra de coincidencias es una lista vertical desplazable.
        // No usar flex aquí: el estilo en línea anularía su layout vertical.
        marginBar.style.display = 'block';

        titleEl.textContent = doc.title;
        document.getElementById('stat-words').textContent = `${doc.wordCount || countWords(doc.content)} palabras`;
        
        const activeDocCodings = state.codings.filter(coding => !coding.dismissed && coding.docId === docId);
        document.getElementById('stat-segments').textContent = `${activeDocCodings.length} pasajes codificados`;

        const visibleDocCodings = readerCodingsForDisplay(activeDocCodings);
        if (renderLimitNotice) {
            renderLimitNotice.style.display = activeDocCodings.length > visibleDocCodings.length ? 'block' : 'none';
            renderLimitNotice.dataset.baseMessage = activeDocCodings.length > visibleDocCodings.length
                ? `El lector pinta ${visibleDocCodings.length.toLocaleString()} de ${activeDocCodings.length.toLocaleString()} pasajes, priorizando la categoría activa, para mantener la interfaz estable. Los datos completos se conservan para análisis y exportación.`
                : '';
            renderLimitNotice.textContent = renderLimitNotice.dataset.baseMessage;
        }
        renderTextContent(doc, visibleDocCodings);
        renderMarginBar(activeDocCodings);

        if (state.searchQuery) {
            performInTextSearch(state.searchQuery);
        }
    }

    function renderTextContent(doc, docCodings) {
        const textBody = document.getElementById('text-body');
        textBody.innerHTML = '';

        if (!doc.content) return;
        const codingMap = new Map(docCodings.filter(coding => !coding.dismissed).map(coding => [coding.id, coding]));
        const categoryMap = new Map(state.categories.map(category => [category.id, category]));
        const docExclusions = (state.corpusExclusions || []).filter(ex => ex.docId === doc.id);
        const exclusionVirtualCodings = docExclusions.map(ex => ({
            id: `__exclusion__${ex.id}`,
            docId: ex.docId,
            startChar: ex.startChar,
            endChar: ex.endChar
        }));
        const combinedForSegmentation = [...docCodings, ...exclusionVirtualCodings];
        const fragments = ProjectIntegrity.buildTextSegments(doc.content, combinedForSegmentation);
        let firstMatchMark = null;
        let renderedTierItems = 0;
        let maxHiddenOverlap = 0;

        fragments.forEach(frag => {
            const hasExclusion = frag.codingIds.some(id => id.startsWith('__exclusion__'));
            const activeExclusionIds = frag.codingIds
                .filter(id => id.startsWith('__exclusion__'))
                .map(id => id.replace('__exclusion__', ''));

            if (hasExclusion) {
                const element = document.createElement('span');
                element.textContent = frag.text;
                element.dataset.textStart = String(frag.start);
                element.dataset.textEnd = String(frag.end);
                element.className = 'corpus-excluded-segment';
                element.title = '🚫 Pasaje excluido del análisis metodológico.\nHaz clic para reincorporar este pasaje al análisis.';
                element.onclick = event => {
                    event.stopPropagation();
                    if (confirm(`¿Deseas reincorporar este pasaje al análisis levantando su exclusión?\n\n"${frag.text.slice(0, 160)}…"`)) {
                        activeExclusionIds.forEach(id => removeCorpusExclusion(id));
                    }
                };
                textBody.appendChild(element);
                return;
            }

            const allFragmentCodings = frag.codingIds
                .map(id => codingMap.get(id))
                .filter(Boolean);
            const prioritizedFragmentCodings = state.activeCategoryId
                ? allFragmentCodings.filter(coding => coding.categoryId === state.activeCategoryId)
                    .concat(allFragmentCodings.filter(coding => coding.categoryId !== state.activeCategoryId))
                : allFragmentCodings;
            const codings = prioritizedFragmentCodings.slice(0, MAX_CODINGS_PER_TEXT_SEGMENT);
            const hiddenCodingCount = Math.max(0, allFragmentCodings.length - codings.length);
            maxHiddenOverlap = Math.max(maxHiddenOverlap, hiddenCodingCount);
            const element = document.createElement(codings.length ? 'mark' : 'span');
            element.textContent = frag.text;
            element.dataset.textStart = String(frag.start);
            element.dataset.textEnd = String(frag.end);

            if (codings.length) {
                const categories = codings.map(coding => categoryMap.get(coding.categoryId));
                const colors = categories.map(category => safeColor(category && category.color));
                element.className = 'coded-passage';
                if (codings.every(coding => coding.dismissed)) element.classList.add('coding-dismissed');
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
                    const activeColor = safeColor((categoryMap.get(activeCoding.categoryId) || {}).color);
                    element.style.outline = `3px solid ${activeColor}`;
                    element.style.fontWeight = '700';
                    element.style.boxShadow = `0 0 12px ${hexToRgba(activeColor, 0.6)}`;
                    if (!firstMatchMark) firstMatchMark = element;
                } else if (state.activeCategoryId) {
                    element.style.opacity = '0.3';
                }

                element.title = codings.slice(0, 5).map((coding, index) => {
                    const category = categories[index];
                    return `${category ? category.name : 'Categoría'}${coding.memo ? ` • Memo: ${coding.memo.slice(0, 200)}` : ''}`;
                }).join('\n')
                    + (codings.length > 5 ? `\n… ${codings.length - 5} codificaciones visibles más en este tramo` : '')
                    + (hiddenCodingCount ? `\n⚠ ${hiddenCodingCount} codificaciones adicionales no se pintan en este tramo por el límite visual.` : '');
                element.onclick = event => {
                    event.stopPropagation();
                    if (codings.length === 1) {
                        showCodingContextMenu(event, codings[0]);
                        return;
                    }
                    const choices = codings.map((coding, index) => {
                        const category = categoryMap.get(coding.categoryId);
                        return `${index + 1}. ${category ? category.name : coding.categoryId}`;
                    }).join('\n');
                    const selected = Number.parseInt(prompt(`Este tramo tiene varias codificaciones:\n${choices}\n\nIndica el número que deseas gestionar:`), 10);
                    if (selected >= 1 && selected <= codings.length) showCodingContextMenu(event, codings[selected - 1]);
                };
            }

            textBody.appendChild(element);

            if (state.viewMode === 'tiers' && codings.length && renderedTierItems < MAX_TIER_ITEMS) {
                codings.filter(coding => coding.endChar === frag.end).slice(0, MAX_TIER_ITEMS - renderedTierItems).forEach(coding => {
                    const category = categoryMap.get(coding.categoryId);
                    const tierDiv = document.createElement('div');
                    tierDiv.className = 'tier-subline';
                    tierDiv.style.userSelect = 'none';
                    const fullMemoText = coding.memo || 'Sin decodificación escrita aún (Haz clic para agregar nota/interpretación)';
                    const memoText = fullMemoText.length > 4000 ? `${fullMemoText.slice(0, 4000)}…` : fullMemoText;
                    tierDiv.innerHTML = `<strong>[${escapeHtml(category ? category.name : 'Categoría')} / Memo]:</strong> ${escapeHtml(memoText)}`;
                    textBody.appendChild(tierDiv);
                    renderedTierItems++;
                });
            }
        });

        const renderLimitNotice = document.getElementById('reader-render-limit-notice');
        if (renderLimitNotice) {
            const messages = [renderLimitNotice.dataset.baseMessage || ''];
            if (maxHiddenOverlap) messages.push(`En los tramos con mayor superposición se omiten visualmente hasta ${maxHiddenOverlap.toLocaleString()} codificaciones; la categoría activa se prioriza.`);
            renderLimitNotice.textContent = messages.filter(Boolean).join(' ');
            renderLimitNotice.style.display = messages.some(Boolean) ? 'block' : 'none';
        }

        if (firstMatchMark) {
            setTimeout(() => {
                firstMatchMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }

    function renderMarginBar(docCodings) {
        const marginBar = document.getElementById('margin-bar');
        marginBar.innerHTML = '';
        const visibleCodings = docCodings.filter(coding => !coding.dismissed);

        if (visibleCodings.length === 0) {
            marginBar.innerHTML = '<div style="font-size:0.7rem; color:var(--text-muted); text-align:center;">Sin códigos</div>';
            return;
        }

        const categoryMap = new Map(state.categories.map(category => [category.id, category]));
        const renderedCodings = visibleCodings.slice(0, MAX_MARGIN_ITEMS);
        if (visibleCodings.length > renderedCodings.length) {
            const notice = document.createElement('div');
            notice.className = 'empty-state-sm';
            notice.textContent = `${renderedCodings.length.toLocaleString()}/${visibleCodings.length.toLocaleString()} franjas visibles`;
            marginBar.appendChild(notice);
        }
        renderedCodings.forEach(coding => {
            const cat = categoryMap.get(coding.categoryId);
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
                <button type="button" class="margin-dismiss" title="Quitar coincidencia del análisis" aria-label="Quitar coincidencia del análisis">×</button>
            `;
            stripe.title = `Cita: "${coding.quoteText.slice(0, 40)}..."`;

            stripe.querySelector('.margin-dismiss').onclick = event => {
                event.stopPropagation();
                dismissCoding(coding.id);
            };

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

    function dismissCoding(codingId) {
        const coding = state.codings.find(item => item.id === codingId);
        if (!coding || coding.dismissed) return;
        const category = state.categories.find(item => item.id === coding.categoryId);
        const proposedCodings = state.codings.map(item => item.id === codingId ? { ...item, dismissed: true } : item);
        const proposedAuditLog = auditLogWith('Coincidencia desestimada', category ? category.name : coding.categoryId);
        if (!commitProjectMutation({ codings: proposedCodings, auditLog: proposedAuditLog }, 'No se pudo desestimar la coincidencia')) return;
        setActiveDocument(state.activeDocId);
        renderCodebookList();
        renderDecoderList();
        updateQualitativeCharts();
    }

    // --- Decoder Tab Cards ---
    function renderDecoderList() {
        const container = document.getElementById('decoder-list');
        const catFilter = document.getElementById('decoder-filter-code').value;
        container.innerHTML = '';

        const activeDoc = state.documents.find(document => document.id === state.activeDocId);
        const context = document.getElementById('decoder-document-context');
        if (context) context.textContent = activeDoc ? `Documento actual: ${activeDoc.title}` : 'Selecciona un documento para ver sus pasajes.';

        // El visor lateral acompaña siempre al documento abierto en el lector.
        // Así no mezcla evidencias de otras fuentes al cambiar de documento.
        const filtered = [];
        let totalFiltered = 0;
        state.codings.forEach(coding => {
            if (coding.dismissed || coding.docId !== state.activeDocId || (catFilter !== 'ALL' && coding.categoryId !== catFilter)) return;
            totalFiltered++;
            if (filtered.length < MAX_DECODER_ITEMS) filtered.push(coding);
        });

        if (totalFiltered === 0) {
            container.innerHTML = '<div class="empty-state-sm">No hay pasajes codificados para el documento seleccionado.</div>';
            return;
        }

        if (totalFiltered > filtered.length) {
            const notice = document.createElement('div');
            notice.className = 'empty-state-sm';
            notice.textContent = `Se muestran ${filtered.length.toLocaleString()} de ${totalFiltered.toLocaleString()} pasajes. Selecciona una categoría para acotar la lista.`;
            container.appendChild(notice);
        }
        const categoryMap = new Map(state.categories.map(category => [category.id, category]));
        filtered.forEach(coding => {
            const cat = categoryMap.get(coding.categoryId);
            if (!cat) return;
            const quoteDisplay = coding.quoteText.length > 4000 ? `${coding.quoteText.slice(0, 4000)}…` : coding.quoteText;
            const memoDisplay = coding.memo && coding.memo.length > 4000 ? `${coding.memo.slice(0, 4000)}…` : coding.memo;

            const card = document.createElement('div');
            card.className = 'decoder-card';
            card.innerHTML = `
                <div class="decoder-card-header">
                    <span class="tag-badge" style="background:${safeColor(cat.color)}">
                        ${escapeHtml(cat.name)}
                    </span>
                    <span style="font-size:0.75rem; color:var(--text-muted);">${activeDoc ? escapeHtml(activeDoc.title) : ''}</span>
                </div>
                <blockquote class="decoder-quote">"${escapeHtml(quoteDisplay)}"</blockquote>
                <div class="decoder-memo">
                    <strong>Decodificación / Significado:</strong><br>
                    ${memoDisplay ? escapeHtml(memoDisplay) : '<em style="color:var(--text-muted);">Sin nota asignada aún. Haz clic para agregar una.</em>'}
                </div>
                <label style="display:block; margin-top:0.55rem; font-size:0.78rem; color:var(--text-muted);">Peso de evidencia
                    <select class="coding-weight" data-coding-id="${coding.id}" style="margin-left:0.35rem;"><option value="1">Baja</option><option value="2">Media</option><option value="3">Alta</option></select>
                </label>
            `;
            card.querySelector('.coding-weight').value = String(normalizedWeight(coding.weight));
            card.querySelector('.coding-weight').onchange = event => {
                event.stopPropagation();
                const previousWeight = normalizedWeight(coding.weight);
                const nextWeight = normalizedWeight(event.target.value);
                const proposedCodings = state.codings.map(item => item.id === coding.id ? { ...item, weight: nextWeight } : item);
                const proposedAuditLog = auditLogWith('Peso de evidencia actualizado', `${cat.name}: ${['baja', 'media', 'alta'][nextWeight - 1]}`);
                if (!commitProjectMutation({ codings: proposedCodings, auditLog: proposedAuditLog }, 'No se pudo actualizar el peso')) {
                    event.target.value = String(previousWeight);
                }
                renderCodebookList();
                updateQualitativeCharts();
            };

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
            documentId: state.analyticsDocumentId,
            documentGroup: state.analyticsDocumentGroup
        };
    }

    function getAnalytics() {
        return window.AnalyticsEngine.analyze(state, getAnalyticsOptions());
    }

    function analyticsTruncationMessages(analytics) {
        const diagnostics = analytics && analytics.diagnostics;
        if (!diagnostics) return [];
        const messages = [];
        if (diagnostics.pairScanTruncated) {
            messages.push(`El cálculo alcanzó el límite de ${Number(diagnostics.pairEvaluationLimit || 0).toLocaleString()} evaluaciones; algunos recuentos de relaciones pueden ser parciales.`);
        } else if (diagnostics.resultsTruncated || diagnostics.pairRecordLimitReached) {
            const omitted = Number(diagnostics.omittedPairMatches || 0);
            messages.push(`${omitted.toLocaleString()} relaciones${diagnostics.omittedPairMatchesIsLowerBound ? ' como mínimo' : ''} no se materializaron en esta vista por el límite de resultados.`);
        }
        if (diagnostics.evidenceTruncated) {
            messages.push(`${Number(diagnostics.omittedEvidence || 0).toLocaleString()} fragmentos de evidencia se omitieron de los detalles visuales; los recuentos retenidos se conservan salvo que se indique cálculo parcial.`);
        }
        return messages;
    }

    function updateAnalyticsDiagnosticsNotice(analytics) {
        const notice = document.getElementById('analytics-diagnostics-notice');
        if (!notice) return;
        const messages = analyticsTruncationMessages(analytics);
        notice.style.display = messages.length ? 'block' : 'none';
        notice.textContent = messages.length ? `Aviso de escala: ${messages.join(' ')}` : '';
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
        const groupSelect = document.getElementById('analytics-group-filter');
        if (!select || !groupSelect) return;
        const current = state.analyticsDocumentId;
        const documentOptions = state.documents.slice(0, MAX_ANALYTICS_FILTER_OPTIONS);
        const currentDocument = state.documents.find(doc => doc.id === current);
        if (currentDocument && !documentOptions.some(doc => doc.id === currentDocument.id)) documentOptions.push(currentDocument);
        select.innerHTML = '<option value="">Todo el corpus</option>' + documentOptions.map(doc => `<option value="${doc.id}">${escapeHtml(doc.title)}</option>`).join('')
            + (state.documents.length > MAX_ANALYTICS_FILTER_OPTIONS ? '<option value="" disabled>Usa la lista de documentos para acotar proyectos muy grandes</option>' : '');
        select.value = state.documents.some(doc => doc.id === current) ? current : '';
        state.analyticsDocumentId = select.value;
        const groups = [...new Set(state.documents.map(doc => String((doc.profile || {}).group || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
        const visibleGroups = groups.slice(0, MAX_ANALYTICS_FILTER_OPTIONS);
        if (state.analyticsDocumentGroup && groups.includes(state.analyticsDocumentGroup) && !visibleGroups.includes(state.analyticsDocumentGroup)) visibleGroups.push(state.analyticsDocumentGroup);
        groupSelect.innerHTML = '<option value="">Todos los grupos</option>' + visibleGroups.map(group => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join('')
            + (groups.length > MAX_ANALYTICS_FILTER_OPTIONS ? '<option value="" disabled>Se muestran los primeros 5.000 grupos</option>' : '');
        groupSelect.value = groups.includes(state.analyticsDocumentGroup) ? state.analyticsDocumentGroup : '';
        state.analyticsDocumentGroup = groupSelect.value;
    }

    function closeChartDrilldown() {
        const panel = document.getElementById('chart-drilldown');
        if (panel) panel.style.display = 'none';
    }

    function openChartDrilldown(title, evidence, diagnostics = null) {
        const panel = document.getElementById('chart-drilldown');
        const body = document.getElementById('chart-drilldown-body');
        document.getElementById('chart-drilldown-title').textContent = title;
        body.innerHTML = '';
        if (diagnostics && diagnostics.evidenceTruncated) {
            const notice = document.createElement('div');
            notice.className = 'empty-state-sm';
            notice.textContent = `Esta relación omite ${Number(diagnostics.omittedEvidence || 0).toLocaleString()} evidencias del detalle por el límite de ${Number(diagnostics.evidenceLimit || 100).toLocaleString()} elementos.`;
            body.appendChild(notice);
        }
        if (!evidence || !evidence.length) {
            body.innerHTML = '<div class="empty-state-sm">No hay evidencia para esta selección.</div>';
        } else {
            const visibleEvidence = evidence.slice(0, MAX_DRILLDOWN_ITEMS);
            if (evidence.length > visibleEvidence.length) {
                const notice = document.createElement('div');
                notice.className = 'empty-state-sm';
                notice.textContent = `Se muestran ${visibleEvidence.length.toLocaleString()} de ${evidence.length.toLocaleString()} evidencias para mantener la interfaz fluida.`;
                body.appendChild(notice);
            }
            visibleEvidence.forEach(item => {
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

    function analyticsVisualCategories(analytics) {
        return [...analytics.categories]
            .sort((a, b) => {
                const statA = analytics.statsMap.get(a.id) || { count: 0 };
                const statB = analytics.statsMap.get(b.id) || { count: 0 };
                return statB.count - statA.count || a.name.localeCompare(b.name, 'es');
            })
            .slice(0, MAX_VISUAL_CATEGORIES);
    }

    function generateNetworkInterpretation(analytics) {
        if (!analytics || !analytics.categories || analytics.categories.length === 0) {
            return 'No hay categorías ni datos suficientes para analizar la red de conceptos.';
        }
        const totalCats = analytics.categories.length;
        const totalEdges = (analytics.edges || []).filter(e => !e.unavailable && e.count > 0).length;
        const unitLabel = state.analyticsUnit || 'párrafo';
        const metric = metricLabel();

        const sortedCats = [...analytics.categories].sort((a, b) => {
            const statA = analytics.statsMap.get(a.id) || { count: 0 };
            const statB = analytics.statsMap.get(b.id) || { count: 0 };
            return statB.count - statA.count;
        });
        const topCat = sortedCats[0];
        const topStat = analytics.statsMap.get(topCat.id) || { count: 0, docCount: 0, documentShare: 0 };

        const sortedEdges = [...(analytics.edges || [])].filter(e => !e.unavailable && e.count > 0).sort((a, b) => b.metricValue - a.metricValue);
        let topPairText = '';
        if (sortedEdges.length > 0) {
            const topEdge = sortedEdges[0];
            const src = analytics.categoryMap.get(topEdge.sourceId);
            const tgt = analytics.categoryMap.get(topEdge.targetId);
            if (src && tgt) {
                topPairText = ` La relación de coocurrencia más fuerte se observa entre "${src.name}" y "${tgt.name}" (métrica ${metric}: ${formatMetric(topEdge)}, ${topEdge.count} pasajes).`;
            }
        } else {
            topPairText = ' No se registran relaciones de coocurrencia bajo el umbral actual.';
        }

        const connectedSet = new Set((analytics.edges || []).flatMap(e => [e.sourceId, e.targetId]));
        const isolatedCount = totalCats - analytics.categories.filter(c => connectedSet.has(c.id)).length;
        let isolationText = isolatedCount > 0 ? ` Existen ${isolatedCount} categorías sin relaciones significativas en este nivel.` : ' Todas las categorías forman una red interconectada.';

        return `Red cualitativa compuesta por ${totalCats} categorías y ${totalEdges} asociaciones en el nivel de ${unitLabel}.${topPairText} La categoría central con mayor evidencia es "${topCat.name}" (presente en ${topStat.docCount} documentos, ${(topStat.documentShare * 100).toFixed(0)}% del corpus, ${topStat.count} pasajes).${isolationText}\n💡 Guía cualitativa: Nodos más grandes reflejan mayor presencia; conexiones más gruesas indican mayor convergencia temática.`;
    }

    function generateHeatmapInterpretation(analytics) {
        if (!analytics || !analytics.categories || analytics.categories.length === 0) {
            return 'Carga documentos y categorías para visualizar la matriz de coocurrencia.';
        }
        const visualCats = analyticsVisualCategories(analytics);
        const totalCells = visualCats.length * visualCats.length;
        const sortedEdges = [...(analytics.edges || [])].filter(e => !e.unavailable && e.count > 0).sort((a, b) => b.metricValue - a.metricValue);
        let peakText = '';
        if (sortedEdges.length > 0) {
            const peak = sortedEdges[0];
            const src = analytics.categoryMap.get(peak.sourceId);
            const tgt = analytics.categoryMap.get(peak.targetId);
            if (src && tgt) {
                peakText = ` La máxima densidad de coocurrencia ocurre en la intersección "${src.name}" × "${tgt.name}" (${formatMetric(peak)}).`;
            }
        }
        const activePairs = sortedEdges.length;
        const activePct = totalCells > 0 ? ((activePairs * 2) / totalCells * 100).toFixed(1) : '0.0';

        return `Matriz de coocurrencia entre ${visualCats.length} categorías principales (${state.analyticsUnit}, métrica: ${metricLabel()}).${peakText} Se identifican ${activePairs} pares de coocurrencia activos (${activePct}% de densidad de la matriz).\n💡 Guía cualitativa: Las celdas de intensidad superior marcan solapamientos o proximidades contextuales frecuentes entre los códigos analizados.`;
    }

    function generateBarsInterpretation(analytics) {
        if (!analytics || !analytics.categories || analytics.categories.length === 0) {
            return 'Sin categorías para comparar.';
        }
        const sortedByDensity = [...analytics.categories].sort((a, b) => (analytics.statsMap.get(b.id)?.perThousand || 0) - (analytics.statsMap.get(a.id)?.perThousand || 0));
        const sortedByCoverage = [...analytics.categories].sort((a, b) => (analytics.statsMap.get(b.id)?.documentShare || 0) - (analytics.statsMap.get(a.id)?.documentShare || 0));

        const topDensity = sortedByDensity[0];
        const topDensityStat = analytics.statsMap.get(topDensity.id) || { perThousand: 0, count: 0 };
        const topCoverage = sortedByCoverage[0];
        const topCoverageStat = analytics.statsMap.get(topCoverage.id) || { docCount: 0, documentShare: 0 };

        const totalDocs = analytics.documents.length || 1;
        const lowDensity = sortedByDensity.filter(c => (analytics.statsMap.get(c.id)?.perThousand || 0) < 1).length;

        return `Comparación proporcional de ${analytics.categories.length} categorías en el corpus (${analytics.documents.length} documentos). La categoría con mayor densidad es "${topDensity.name}" (${topDensityStat.perThousand.toFixed(1)} pasajes/1.000 pal., ${topDensityStat.count} pasajes). La categoría de mayor cobertura documental es "${topCoverage.name}" (presente en ${topCoverageStat.docCount}/${totalDocs} docs, ${(topCoverageStat.documentShare * 100).toFixed(0)}%).${lowDensity > 0 ? ` Hay ${lowDensity} categorías con baja densidad (<1/1k pal.).` : ''}\n💡 Guía cualitativa: Barra sólida = frecuencia absoluta; Barra suave = tasa normalizada por volumen textual.`;
    }

    function generateQualityInterpretation(report) {
        if (!report) return 'Diagnóstico de calidad no disponible.';
        const cov = (report.coverage * 100).toFixed(1);
        const missingMemosCount = (report.missingMemos || []).length;
        const incompleteCount = (report.incompleteCategories || []).length;
        const uncodedDocsCount = (report.uncodedDocuments || []).length;
        const duplicatesCount = (report.duplicates || []).length;
        const overlapsCount = (report.overlaps || []).length;

        let statusText = [];
        if (missingMemosCount > 0) statusText.push(`${missingMemosCount} pasajes sin memo interpretativo`);
        if (incompleteCount > 0) statusText.push(`${incompleteCount} categorías incompletas`);
        if (uncodedDocsCount > 0) statusText.push(`${uncodedDocsCount} documentos sin codificar`);
        if (duplicatesCount > 0) statusText.push(`${duplicatesCount} codificaciones duplicadas`);
        if (overlapsCount > 0) statusText.push(`${overlapsCount} solapamientos detectados`);

        const statusSummary = statusText.length > 0 ? ` Hallazgos a revisar: ${statusText.join(', ')}.` : ' El corpus no presenta inconsistencias metodológicas detectables.';

        return `Diagnóstico global de codificación. Cobertura total: ${cov}% del texto analizado (${report.codedChars.toLocaleString('es-UY')} de ${report.totalChars.toLocaleString('es-UY')} caracteres). Citas totales: ${report.totalCodings} (Manual: ${report.manual}, Automática: ${report.automatic}).${statusSummary}\n💡 Guía cualitativa: Mantener memos explicativos en cada cita fortalece la validez interna y la triangulación del reporte.`;
    }

    function getActiveChartInterpretation(analytics, report) {
        const type = state.activeChartType || 'network';
        if (state.customChartInterpretations && state.customChartInterpretations[type]) {
            return {
                text: state.customChartInterpretations[type],
                isCustom: true
            };
        }
        let autoText = '';
        if (type === 'network') autoText = generateNetworkInterpretation(analytics);
        else if (type === 'heatmap') autoText = generateHeatmapInterpretation(analytics);
        else if (type === 'bars') autoText = generateBarsInterpretation(analytics);
        else if (type === 'quality') autoText = generateQualityInterpretation(report || window.AnalyticsEngine.quality(state, { documentId: state.analyticsDocumentId, documentGroup: state.analyticsDocumentGroup }));
        return {
            text: autoText,
            isCustom: false
        };
    }

    function updateInterpretationBox(analytics, report) {
        const bodyEl = document.getElementById('chart-interpretation-body');
        const titleEl = document.querySelector('.chart-interpretation-title');
        if (!bodyEl) return;

        const activeInterp = getActiveChartInterpretation(analytics, report);
        bodyEl.textContent = activeInterp.text;
        if (titleEl) {
            titleEl.innerHTML = activeInterp.isCustom 
                ? '💡 Interpretación Analítica Cualitativa <small style="color:var(--accent-primary); font-weight:normal;">(Nota personalizada)</small>'
                : '💡 Interpretación Analítica Cualitativa';
        }
    }

    function updateQualitativeCharts() {
        ['network', 'heatmap', 'bars', 'quality'].forEach(type => {
            const el = document.getElementById(`chart-container-${type}`);
            if (el) el.style.display = state.activeChartType === type ? 'block' : 'none';
        });
        const toolbar = document.getElementById('graph-toolbar-container');
        if (toolbar) {
            toolbar.style.display = 'flex';
            const layoutRow = toolbar.querySelector('.graph-toolbar-row:first-child');
            if (layoutRow) layoutRow.style.display = state.activeChartType === 'network' ? 'flex' : 'none';
            const btnReset = document.getElementById('btn-reset-network');
            if (btnReset) btnReset.style.display = state.activeChartType === 'network' ? 'inline-block' : 'none';
        }
        const analytics = getAnalytics();
        let report = null;
        if (state.activeChartType === 'network') {
            updateNetworkCanvas();
        } else if (state.activeChartType === 'heatmap') {
            renderQualitativeHeatmap();
        } else if (state.activeChartType === 'bars') {
            renderProportionalBars();
        } else if (state.activeChartType === 'quality') {
            report = window.AnalyticsEngine.quality(state, { documentId: state.analyticsDocumentId, documentGroup: state.analyticsDocumentGroup });
            renderQualityDashboard();
        }
        updateInterpretationBox(analytics, report);
    }

    function renderQualitativeHeatmap() {
        const wrapper = document.getElementById('heatmap-table-wrapper');
        wrapper.innerHTML = '';

        const analytics = getAnalytics();
        updateAnalyticsDiagnosticsNotice(analytics);
        if (analytics.categories.length === 0 || analytics.documents.length === 0) {
            wrapper.innerHTML = '<div class="empty-state-sm">Carga documentos y categorías para visualizar la matriz de coocurrencia.</div>';
            return;
        }
        const visualCategories = analyticsVisualCategories(analytics);
        const visualIds = new Set(visualCategories.map(category => category.id));
        const visualEdges = analytics.edges.filter(edge => visualIds.has(edge.sourceId) && visualIds.has(edge.targetId));
        const maxValue = Math.max(0.0001, ...visualEdges.map(edge => edge.metricValue));
        const scaleNotice = analytics.categories.length > visualCategories.length
            ? ` Se muestran las ${visualCategories.length} categorías con más evidencia de ${analytics.categories.length}.`
            : '';
        document.getElementById('heatmap-description').textContent = `Categoría × categoría por ${state.analyticsUnit}; ${categoryModeLabel()}; métrica: ${metricLabel()}. Haz clic en una celda para ver evidencia.${scaleNotice}`;
        let html = '<table class="heatmap-table"><thead><tr><th>Categoría</th>' + visualCategories.map(cat => `<th title="${escapeHtml(cat.name)}">${escapeHtml(cat.code || cat.name.slice(0, 6))}</th>`).join('') + '</tr></thead><tbody>';
        visualCategories.forEach(catA => {
            html += `<tr><td style="text-align:left;font-weight:600;"><span class="code-color-dot" style="background:${safeColor(catA.color)}"></span>${escapeHtml(catA.name)}</td>`;
            visualCategories.forEach(catB => {
                if (catA.id === catB.id) {
                    const stat = analytics.statsMap.get(catA.id);
                    html += `<td title="Frecuencia de ${escapeHtml(catA.name)}"><strong>${stat.count}</strong></td>`;
                    return;
                }
                const edge = analytics.matrix[catA.id] && analytics.matrix[catA.id][catB.id];
                if (edge && edge.unavailable) {
                    html += '<td title="Relación no disponible porque el cálculo alcanzó su límite">n/d</td>';
                    return;
                }
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
                const edge = analytics.matrix[source.id] && analytics.matrix[source.id][target.id];
                openChartDrilldown(`${source.name} ↔ ${target.name}: ${formatMetric(edge)}`, edge ? edge.evidence : [], edge);
            };
        });
    }

    function renderProportionalBars() {
        const wrapper = document.getElementById('proportional-bars-list');
        wrapper.innerHTML = '';

        const analytics = getAnalytics();
        updateAnalyticsDiagnosticsNotice(analytics);
        if (analytics.categories.length === 0) {
            wrapper.innerHTML = '<div class="empty-state-sm">Sin categorías.</div>';
            return;
        }
        const sorted = [...analytics.categories].sort((a, b) => analytics.statsMap.get(b.id).perThousand - analytics.statsMap.get(a.id).perThousand).slice(0, MAX_VISUAL_CATEGORIES);
        const scaleNotice = analytics.categories.length > sorted.length ? ` Se muestran ${sorted.length} de ${analytics.categories.length} categorías.` : '';
        document.getElementById('bars-description').innerHTML = `${categoryModeLabel()}. <strong>Barra sólida:</strong> frecuencia absoluta. <strong>Barra suave:</strong> tasa por 1.000 palabras. El texto indica presencia documental.${escapeHtml(scaleNotice)}`;
        const visibleStats = sorted.map(category => analytics.statsMap.get(category.id));
        const maxCount = Math.max(1, ...visibleStats.map(stat => stat.count));
        const maxRate = Math.max(0.001, ...visibleStats.map(stat => stat.perThousand));
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
        const report = window.AnalyticsEngine.quality(state, { documentId: state.analyticsDocumentId, documentGroup: state.analyticsDocumentGroup });
        updateAnalyticsDiagnosticsNotice(null);
        const overlapDiagnostics = report.overlapDiagnostics || {
            truncated: false,
            totalDetected: report.overlaps.length,
            returned: report.overlaps.length,
            omitted: 0,
            limit: report.overlaps.length
        };
        const cards = [
            ['Cobertura', `${(report.coverage * 100).toFixed(1)}%`, `${report.codedChars} de ${report.totalChars} caracteres`, report.coverage > 0 ? 'ok' : 'warn'],
            ['Memos faltantes', report.missingMemos.length, 'pasajes sin interpretación', report.missingMemos.length ? 'warn' : 'ok'],
            ['Categorías incompletas', report.incompleteCategories.length, 'sin código, criterio o palabras clave', report.incompleteCategories.length ? 'warn' : 'ok'],
            ['Documentos sin codificar', report.uncodedDocuments.length, 'documentos sin evidencia', report.uncodedDocuments.length ? 'warn' : 'ok'],
            ['Duplicados', report.duplicates.length, 'codificaciones idénticas', report.duplicates.length ? 'warn' : 'ok'],
            ['Solapamientos', overlapDiagnostics.totalDetected, overlapDiagnostics.truncated ? `${overlapDiagnostics.returned} mostrados · ${overlapDiagnostics.omitted} omitidos del detalle` : 'pares que se superponen', overlapDiagnostics.totalDetected ? 'warn' : 'ok'],
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

    function matrixCellCount(rowCount, columnCount) {
        const rows = Number(rowCount);
        const columns = Number(columnCount);
        if (!Number.isSafeInteger(rows) || rows < 0 || !Number.isSafeInteger(columns) || columns < 0) return Infinity;
        const cells = rows * columns;
        return Number.isSafeInteger(cells) ? cells : Infinity;
    }

    function pairIndexKey(docId, categoryId) {
        return `${docId}\u0000${categoryId}`;
    }

    function codingsByCategoryIndex(codings) {
        const index = new Map();
        (codings || []).forEach(coding => {
            if (!index.has(coding.categoryId)) index.set(coding.categoryId, []);
            index.get(coding.categoryId).push(coding);
        });
        return index;
    }

    function utf8StringByteLength(value) {
        const text = String(value == null ? '' : value);
        let bytes = 0;
        for (let index = 0; index < text.length; index++) {
            const codeUnit = text.charCodeAt(index);
            if (codeUnit <= 0x7f) bytes += 1;
            else if (codeUnit <= 0x7ff) bytes += 2;
            else if (codeUnit >= 0xd800 && codeUnit <= 0xdbff
                && index + 1 < text.length
                && text.charCodeAt(index + 1) >= 0xdc00
                && text.charCodeAt(index + 1) <= 0xdfff) {
                bytes += 4;
                index++;
            } else bytes += 3;
        }
        return bytes;
    }

    function csvRowByteLength(fields) {
        let bytes = Math.max(0, fields.length - 1) + 1; // separadores y salto de línea
        fields.forEach(field => {
            const value = String(field == null ? '' : field);
            bytes += 2; // comillas exteriores
            if (/^[=+\-@\t\r]/.test(value)) bytes += 1; // apóstrofo de neutralización
            for (const character of value) {
                const codePoint = character.codePointAt(0);
                const characterBytes = codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
                bytes += characterBytes * (character === '"' ? 2 : 1);
            }
        });
        return bytes;
    }

    function escapedHtmlByteLength(value) {
        let bytes = 0;
        for (const character of String(value == null ? '' : value)) {
            if (character === '"') { bytes += 6; continue; }
            if (character === "'") { bytes += 5; continue; }
            if (character === '&') { bytes += 5; continue; }
            if (character === '<' || character === '>') { bytes += 4; continue; }
            const codePoint = character.codePointAt(0);
            bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
        }
        return bytes;
    }

    function renderCategoricalMatrixModal() {
        const tableBody = document.getElementById('stats-table-body');
        const fragContainer = document.getElementById('matrix-fragments-container');
        tableBody.innerHTML = '';
        fragContainer.innerHTML = '';

        const analytics = getAnalytics();
        const totalCodings = analytics.codings.length;
        const itemCount = analytics.categories.length + analytics.codings.length;
        if (itemCount > MAX_MATRIX_UI_CELLS) {
            const message = `La matriz contiene ${itemCount.toLocaleString()} filas y evidencias; supera el máximo visual de ${MAX_MATRIX_UI_CELLS.toLocaleString()}. Aplica filtros de documento o grupo, o exporta una matriz acotada.`;
            tableBody.innerHTML = `<tr><td colspan="7">${escapeHtml(message)}</td></tr>`;
            fragContainer.innerHTML = `<div class="empty-state-sm">${escapeHtml(message)}</div>`;
            document.getElementById('modal-matrix').style.display = 'flex';
            return;
        }
        const categoryMap = new Map(analytics.categories.map(category => [category.id, category]));
        const documentMap = new Map(analytics.documents.map(document => [document.id, document]));
        const codingsByCategory = codingsByCategoryIndex(analytics.codings);

        analytics.categories.forEach(cat => {
            const stat = analytics.statsMap.get(cat.id) || { count: 0, weightedCount: 0, documentShare: 0, perThousand: 0 };
            const count = stat.count;
            const percentage = totalCodings > 0 ? ((count / totalCodings) * 100).toFixed(1) : '0.0';
            const parentCat = cat.parentId ? categoryMap.get(cat.parentId) : null;
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
                <td><strong>${stat.weightedCount || 0}</strong></td>
                <td>${percentage}%</td>
                <td>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width:${percentage}%; background:${safeColor(cat.color)};"></div>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);

            const catCodings = codingsByCategory.get(cat.id) || [];
            catCodings.forEach(coding => {
                const doc = documentMap.get(coding.docId);
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
                    <small style="color:var(--text-muted);">Peso de evidencia: ${['baja', 'media', 'alta'][normalizedWeight(coding.weight) - 1]}</small>
                `;
                fragContainer.appendChild(card);
            });
        });

        document.getElementById('modal-matrix').style.display = 'flex';
    }

    function getReportOptions() {
        const detail = (document.querySelector('input[name="report-detail"]:checked') || {}).value || 'summary';
        const analytics = getAnalytics();
        const quality = window.AnalyticsEngine.quality(state, { documentId: state.analyticsDocumentId, documentGroup: state.analyticsDocumentGroup });
        const allowedDocs = new Set(analytics.documents.map(doc => doc.id));
        return {
            title: document.getElementById('report-title').value.trim() || 'Informe de análisis cualitativo',
            author: document.getElementById('report-author').value.trim() || 'Equipo investigador',
            objective: document.getElementById('report-objective').value.trim(),
            methodology: document.getElementById('report-methodology').value.trim(),
            conclusions: document.getElementById('report-conclusions').value.trim(),
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

    function preflightExport({ label, documents, categories, codings, scopeDescription = '', requireDocument = false, requireCategory = false, warnWhenEmptyCodings = true }) {
        const scopedDocuments = Array.isArray(documents) ? documents : [];
        const scopedCategories = Array.isArray(categories) ? categories : [];
        const scopedCodings = Array.isArray(codings) ? codings : [];
        const documentMap = new Map(scopedDocuments.map(document => [document.id, document]));
        const categoryIds = new Set(scopedCategories.map(category => category.id));
        const errors = [];
        const warnings = [];

        if (requireDocument && !scopedDocuments.length) errors.push('No hay documentos dentro del alcance seleccionado.');
        if (requireCategory && !scopedCategories.length) errors.push('No hay categorías dentro del alcance seleccionado.');

        scopedCodings.forEach((coding, index) => {
            const document = documentMap.get(coding.docId);
            if (!document) { errors.push(`El pasaje ${index + 1} refiere a un documento fuera del alcance.`); return; }
            if (!categoryIds.has(coding.categoryId)) { errors.push(`El pasaje ${index + 1} refiere a una categoría fuera del alcance.`); return; }
            if (coding.dismissed) errors.push(`El pasaje ${index + 1} está desestimado y no puede exportarse.`);
            try {
                if (ProjectIntegrity.canonicalQuote(document, coding) !== coding.quoteText) {
                    errors.push(`El texto del pasaje ${index + 1} no coincide con su posición en el documento.`);
                }
            } catch (_) {
                errors.push(`La posición del pasaje ${index + 1} no es válida en su documento.`);
            }
        });

        const incomplete = scopedCategories.filter(category => !String(category.code || '').trim() || !String(category.description || '').trim());
        if (incomplete.length) warnings.push(`${incomplete.length} categoría(s) sin código o descripción completa.`);
        if (!scopedCodings.length && warnWhenEmptyCodings) warnings.push('No hay pasajes activos en el alcance seleccionado.');
        if (scopeDescription) warnings.push(scopeDescription);

        if (errors.length) {
            alert(`⛔ Exportación detenida: se detectaron inconsistencias.\n\n${errors.slice(0, 6).map(item => `• ${item}`).join('\n')}${errors.length > 6 ? `\n• y ${errors.length - 6} más.` : ''}`);
            return false;
        }

        const message = [
            `✅ Verificación previa: ${label}`,
            `${scopedDocuments.length} documento(s) · ${scopedCategories.length} categoría(s) · ${scopedCodings.length} pasaje(s) activo(s).`,
            ...warnings.map(item => `Aviso: ${item}`),
            '',
            '¿Deseas continuar con la exportación?'
        ].join('\n');
        return confirm(message);
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

    async function exportAnalyticalReport(format) {
        const options = getReportOptions();
        if (!preflightExport({
            label: `Informe analítico ${format.toUpperCase()}`,
            documents: options.documents,
            categories: options.categories,
            codings: options.codings,
            scopeDescription: `Alcance actual: ${state.analyticsDocumentId ? 'documento seleccionado' : state.analyticsDocumentGroup ? `grupo “${state.analyticsDocumentGroup}”` : 'todo el corpus'}; ${categoryModeLabel()}.`,
            requireDocument: true,
            requireCategory: true
        })) return;
        const safeTitle = options.title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_').slice(0, 60);
        try {
            let blob;
            if (format === 'docx') {
                blob = window.DocxExporter.createAnalyticalReport(options);
            } else {
                if (!window.PdfReportExporter) throw new Error('El generador PDF no está disponible.');
                blob = await window.PdfReportExporter.createAnalyticalReport(options);
            }
            await universalSaveFile(blob, `${safeTitle}_${new Date().toISOString().slice(0, 10)}.${format}`);
        } catch (error) {
            console.error('Error creating analytical report:', error);
            alert(`No se pudo crear el informe ${format.toUpperCase()}: ${error.message || error}`);
        }
    }

    function exportExecutiveReportHTML() {

        const activeCodings = state.codings.filter(coding => !coding.dismissed);
        const totalCodings = activeCodings.length;
        const totalDocs = state.documents.length;
        const projectedRows = state.categories.length + activeCodings.length;
        if (projectedRows > MAX_MATRIX_EXPORT_ROWS) {
            alert(`El reporte ejecutivo produciría ${projectedRows.toLocaleString()} secciones y supera el máximo de ${MAX_MATRIX_EXPORT_ROWS.toLocaleString()}.`);
            return;
        }
        const codingsByCategory = codingsByCategoryIndex(activeCodings);
        const documentMap = new Map(state.documents.map(document => [document.id, document]));
        let estimatedBytes = 4096;
        for (const category of state.categories) {
            const keywords = [category.name, category.code, ...(category.keywords || [])].filter(Boolean).join(', ');
            estimatedBytes += 2048 + escapedHtmlByteLength(category.code || 'CAT') + escapedHtmlByteLength(category.name) + escapedHtmlByteLength(keywords);
            for (const coding of codingsByCategory.get(category.id) || []) {
                const doc = documentMap.get(coding.docId);
                estimatedBytes += 2048 + escapedHtmlByteLength(doc ? doc.title : 'Doc') + escapedHtmlByteLength(coding.quoteText) + escapedHtmlByteLength(coding.memo || 'Sin nota.');
                if (estimatedBytes > runtimeCapabilities.maxExportBytes) break;
            }
            if (estimatedBytes > runtimeCapabilities.maxExportBytes) break;
        }
        if (estimatedBytes > runtimeCapabilities.maxExportBytes) {
            alert(`El reporte ejecutivo superaría el máximo de exportación de ${Math.floor(runtimeCapabilities.maxExportBytes / 1024 / 1024)} MiB.`);
            return;
        }

        const rowsHtml = [];
        state.categories.forEach(cat => {
            const catCodings = codingsByCategory.get(cat.id) || [];
            const count = catCodings.length;
            const percentage = totalCodings > 0 ? ((count / totalCodings) * 100).toFixed(1) : '0.0';

            rowsHtml.push(`
                <div style="margin-bottom:1.5rem; page-break-inside:avoid;">
                    <h3 style="color:${safeColor(cat.color)}; border-bottom:2px solid ${safeColor(cat.color)}; padding-bottom:0.3rem;">
                        [${escapeHtml(cat.code || 'CAT')}] ${escapeHtml(cat.name)} — ${percentage}% (${count} pasajes)
                    </h3>
                    <p style="font-size:0.85rem; color:#475569;"><em>Palabras Clave / Términos:</em> ${escapeHtml([cat.name, cat.code, ...(cat.keywords || [])].filter(Boolean).join(', '))}</p>
            `);

            if (catCodings.length === 0) {
                rowsHtml.push(`<p style="font-size:0.85rem; color:#94a3b8; font-style:italic;">Sin pasajes registrados para esta categoría.</p>`);
            } else {
                catCodings.forEach(coding => {
                    const doc = documentMap.get(coding.docId);
                    rowsHtml.push(`
                        <div style="background:#f8fafc; border-left:4px solid ${safeColor(cat.color)}; padding:0.75rem; margin-top:0.6rem; border-radius:4px;">
                            <div style="font-weight:bold; font-size:0.8rem; color:#334155; margin-bottom:0.25rem;">📄 Documento: ${doc ? escapeHtml(doc.title) : 'Doc'}</div>
                            <blockquote style="margin:0.25rem 0; font-style:italic; font-size:0.9rem; color:#0f172a;">"${escapeHtml(coding.quoteText)}"</blockquote>
                            <div style="font-size:0.85rem; color:#1e293b; margin-top:0.35rem;"><strong>Decodificación / Memo:</strong> ${coding.memo ? escapeHtml(coding.memo) : 'Sin nota.'}</div>
                        </div>
                    `);
                });
            }

            rowsHtml.push('</div>');
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
                    <strong>AnalizadorCualiUY Pro</strong><br>
                    Fecha de emisión: ${new Date().toLocaleDateString('es-UY')}
                </div>

                <div class="summary-box">
                    <div><strong>Documentos Procesados:</strong> ${totalDocs}</div>
                    <div><strong>Categorías Activas:</strong> ${state.categories.length}</div>
                    <div><strong>Pasajes Codificados Totales:</strong> ${totalCodings}</div>
                </div>

                <h2>Matriz categorial y evidencias decodificadas</h2>
                ${rowsHtml.join('')}
            </body>
            </html>
        `;

        const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
        universalSaveFile(blob, `AnalizadorCualiUY_Pro_Reporte_Ejecutivo_${new Date().toISOString().slice(0, 10)}.html`);
    }

    // --- Export Coded Document as Painted PDF ---
    function openExportPdfModal() {
        if (state.documents.length === 0) {
            alert('Importa al menos un documento para exportar a PDF.');
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

    async function generateCodedDocumentPDF() {
        const checkboxes = document.querySelectorAll('.pdf-cat-checkbox:checked');
        const selectedCatIds = new Set(Array.from(checkboxes).map(cb => cb.value));

        if (selectedCatIds.size === 0) {
            alert('Selecciona al menos una categoría para pintar en el PDF.');
            return;
        }

        const selectedModeEl = document.querySelector('input[name="pdf-export-mode"]:checked');
        const exportMode = selectedModeEl ? selectedModeEl.value : 'full';
        const includeMemos = document.getElementById('pdf-include-memos').checked;
        const activeDoc = state.documents.find(d => d.id === state.activeDocId);
        if (exportMode === 'full' && !activeDoc) {
            alert('Abre primero un documento para exportarlo completo a PDF.');
            return;
        }

        const documents = exportMode === 'passages' ? state.documents : [activeDoc];
        const documentIds = new Set(documents.map(document => document.id));
        const scopedCodings = state.codings.filter(coding =>
            !coding.dismissed
            && selectedCatIds.has(coding.categoryId)
            && documentIds.has(coding.docId)
        );
        const sortedCodings = [...scopedCodings].sort((a, b) => a.startChar - b.startChar);
        const categories = state.categories.filter(category => selectedCatIds.has(category.id));
        if (!preflightExport({
            label: exportMode === 'passages' ? 'Pasajes por categoría (PDF)' : 'Documento codificado (PDF)',
            documents,
            categories,
            codings: sortedCodings,
            scopeDescription: exportMode === 'passages' ? 'Alcance: todos los documentos y categorías seleccionadas.' : `Alcance: documento “${activeDoc.title}”.`,
            requireDocument: true,
            requireCategory: true
        })) return;
        document.getElementById('modal-export-pdf').style.display = 'none';

        if (!window.PdfReportExporter || !window.AnalyticsEngine) {
            alert('No se pudo iniciar el generador de PDF. No se creó ningún archivo; reinicia la aplicación e inténtalo nuevamente.');
            return;
        }

        try {
            const scoped = { documents, categories, codings: sortedCodings };
            const analyticsOptions = { ...getAnalyticsOptions() };
            delete analyticsOptions.documentId;
            delete analyticsOptions.documentGroup;
            const analytics = window.AnalyticsEngine.analyze(scoped, analyticsOptions);
            const blob = await window.PdfReportExporter.createCodedDocument({
                title: exportMode === 'passages' ? 'Pasajes clasificados por categoría' : `Documento codificado: ${activeDoc.title}`,
                author: 'AnalizadorCualiUY Pro',
                date: new Date().toLocaleDateString('es-UY'),
                mode: exportMode,
                includeMemos,
                analytics,
                categories,
                documents,
                codings: sortedCodings
            });
            const pdfName = exportMode === 'passages'
                ? `AnalizadorCualiUY_Pro_Pasajes_Por_Categoria_${new Date().toISOString().slice(0, 10)}.pdf`
                : `AnalizadorCualiUY_Pro_${safeFilenameSegment(activeDoc.title)}_Codificado_${new Date().toISOString().slice(0, 10)}.pdf`;
            await universalSaveFile(blob, pdfName);
        } catch (error) {
            console.error('Error creating coded PDF:', error);
            alert(`No se pudo crear el PDF codificado: ${error.message || error}`);
        }
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
        const includeMemos = document.getElementById('docx-include-memos').checked;
        const todayStr = new Date().toISOString().slice(0, 10);
        const categories = state.categories.filter(category => selectedCatIds.has(category.id));
        const codings = state.codings.filter(coding => !coding.dismissed && selectedCatIds.has(coding.categoryId));
        let blob;
        let fileName;

        if (!window.DocxExporter) {
            alert('No se pudo cargar el generador DOCX. Reinicia la aplicación e inténtalo nuevamente.');
            return;
        }

        const activeDoc = state.documents.find(d => d.id === state.activeDocId);
        const documents = exportMode === 'passages' ? state.documents : (activeDoc ? [activeDoc] : []);
        const documentIds = new Set(documents.map(document => document.id));
        const scopedCodings = codings.filter(coding => documentIds.has(coding.docId));
        if (!preflightExport({
            label: exportMode === 'passages' ? 'Pasajes por categoría (Word)' : 'Documento codificado (Word)',
            documents,
            categories,
            codings: scopedCodings,
            scopeDescription: exportMode === 'passages' ? 'Alcance: todos los documentos y categorías seleccionadas.' : `Alcance: ${activeDoc ? `documento “${activeDoc.title}”` : 'sin documento activo'}.`,
            requireDocument: true,
            requireCategory: true
        })) return;

        if (exportMode === 'passages') {
            fileName = `AnalizadorCualiUY_Pro_Pasajes_Por_Categoria_${todayStr}.docx`;
            blob = window.DocxExporter.createPassagesDocument({
                categories,
                allCategories: state.categories,
                codings,
                documents: state.documents,
                date: todayStr,
                includeMemos
            });
        } else {
            const doc = activeDoc;
            if (!doc) {
                alert('Abre primero un documento para exportarlo sombreado a Word.');
                return;
            }
            fileName = `AnalizadorCualiUY_Pro_${safeFilenameSegment(doc.title)}_Sombreado_${todayStr}.docx`;
            blob = window.DocxExporter.createFullDocument({
                title: doc.title,
                content: doc.content,
                categories,
                codings: codings.filter(coding => coding.docId === doc.id),
                date: todayStr,
                includeMemos
            });
        }

        document.getElementById('modal-export-docx').style.display = 'none';
        await universalSaveFile(blob, fileName);
    }

    function exportCategoricalMatrixCSV() {
        const analytics = getAnalytics();
        const activeCodings = analytics.codings;
        const totalCodings = activeCodings.length;
        const codingsByCategory = codingsByCategoryIndex(activeCodings);
        const projectedRows = analytics.categories.reduce((total, category) => total + Math.max(1, (codingsByCategory.get(category.id) || []).length), 0);
        if (projectedRows > MAX_MATRIX_EXPORT_ROWS) {
            alert(`La matriz produciría ${projectedRows.toLocaleString()} filas y supera el máximo de ${MAX_MATRIX_EXPORT_ROWS.toLocaleString()}. Aplica filtros de documento o grupo antes de exportar.`);
            return;
        }
        const categoryMap = new Map(analytics.categories.map(category => [category.id, category]));
        const documentMap = new Map(analytics.documents.map(document => [document.id, document]));
        let estimatedBytes = utf8StringByteLength('Código,Categoría Padre,Subcategoría / Nombre,Términos / Palabras Clave,Ocurrencias,Peso de evidencia,Ponderación %,Documento,Grupo,Fragmento Coincidente,Decodificación / Memo\n');
        for (const cat of analytics.categories) {
            const parent = cat.parentId ? categoryMap.get(cat.parentId) : null;
            const parentName = parent ? parent.name : 'Principal';
            const keywords = [cat.name, cat.code, ...(cat.keywords || [])].filter(Boolean).join(', ');
            const catCodings = codingsByCategory.get(cat.id) || [];
            const count = catCodings.length;
            const weightedCount = catCodings.reduce((sum, coding) => sum + normalizedWeight(coding.weight), 0);
            const percentage = totalCodings > 0 ? `${((count / totalCodings) * 100).toFixed(1)}%` : '0.0%';
            if (!catCodings.length) {
                estimatedBytes += csvRowByteLength([cat.code || '', parentName, cat.name, keywords, 0, 0, '0%', '--', '--', '--', '--']);
            } else {
                for (const coding of catCodings) {
                    const doc = documentMap.get(coding.docId);
                    estimatedBytes += csvRowByteLength([
                        cat.code || '', parentName, cat.name, keywords, count, weightedCount, percentage,
                        doc ? doc.title : '', doc ? (doc.profile || {}).group || '' : '', coding.quoteText, coding.memo || ''
                    ]);
                    if (estimatedBytes > runtimeCapabilities.maxExportBytes) break;
                }
            }
            if (estimatedBytes > runtimeCapabilities.maxExportBytes) break;
        }
        if (estimatedBytes > runtimeCapabilities.maxExportBytes) {
            alert(`La matriz superaría el máximo de exportación de ${Math.floor(runtimeCapabilities.maxExportBytes / 1024 / 1024)} MiB. Aplica filtros antes de generarla.`);
            return;
        }
        if (!preflightExport({
            label: 'Matriz categorial (CSV)',
            documents: analytics.documents,
            categories: analytics.categories,
            codings: activeCodings,
            scopeDescription: `Alcance actual: ${state.analyticsDocumentId ? 'documento seleccionado' : state.analyticsDocumentGroup ? `grupo “${state.analyticsDocumentGroup}”` : 'todo el corpus'}; ${categoryModeLabel()}.`,
            requireDocument: true,
            requireCategory: true
        })) return;

        const csvRows = ['Código,Categoría Padre,Subcategoría / Nombre,Términos / Palabras Clave,Ocurrencias,Peso de evidencia,Ponderación %,Documento,Grupo,Fragmento Coincidente,Decodificación / Memo\n'];
        analytics.categories.forEach(cat => {
            const parentCat = cat.parentId ? categoryMap.get(cat.parentId) : null;
            const parentName = parentCat ? escapeCsv(parentCat.name) : 'Principal';
            const catName = escapeCsv(cat.name);
            const codeStr = escapeCsv(cat.code || '');
            const keywordsStr = escapeCsv([cat.name, cat.code, ...(cat.keywords || [])].filter(Boolean).join(', '));
            const catCodings = codingsByCategory.get(cat.id) || [];
            const count = catCodings.length;
            const weightedCount = catCodings.reduce((sum, coding) => sum + normalizedWeight(coding.weight), 0);
            const percentage = totalCodings > 0 ? ((count / totalCodings) * 100).toFixed(1) : '0.0';

            if (catCodings.length === 0) {
                csvRows.push(`"${codeStr}","${parentName}","${catName}","${keywordsStr}","0","0","0%","--","--","--","--"\n`);
            } else {
                catCodings.forEach(coding => {
                    const doc = documentMap.get(coding.docId);
                    const docName = doc ? escapeCsv(doc.title) : '';
                    const group = doc ? escapeCsv((doc.profile || {}).group || '') : '';
                    const quote = escapeCsv(coding.quoteText);
                    const memo = escapeCsv(coding.memo || '');
                    csvRows.push(`"${codeStr}","${parentName}","${catName}","${keywordsStr}","${count}","${weightedCount}","${percentage}%","${docName}","${group}","${quote}","${memo}"\n`);
                });
            }
        });

        const blob = new Blob(['\uFEFF', ...csvRows], { type: 'text/csv;charset=utf-8;' });
        universalSaveFile(blob, `AnalizadorCualiUY_Pro_MatrizCategorial_${new Date().toISOString().slice(0, 10)}.csv`);
    }

    function exportCodebookCSV() {
        const analytics = window.AnalyticsEngine.analyze(state, Object.assign({}, getAnalyticsOptions(), { categoryMode: 'all' }));
        if (analytics.categories.length > MAX_MATRIX_EXPORT_ROWS) {
            alert(`El libro de códigos produciría ${analytics.categories.length.toLocaleString()} filas y supera el máximo de ${MAX_MATRIX_EXPORT_ROWS.toLocaleString()}.`);
            return;
        }
        const categoryMap = new Map(analytics.categories.map(category => [category.id, category]));
        let estimatedBytes = utf8StringByteLength('Código,Categoría,Jerarquía,Descripción,Criterios metodológicos,Términos,Color,Ocurrencias,Peso de evidencia\n');
        for (const category of analytics.categories) {
            const parent = category.parentId ? categoryMap.get(category.parentId) : null;
            const stat = analytics.statsMap.get(category.id) || { count: 0, weightedCount: 0 };
            estimatedBytes += csvRowByteLength([
                category.code || '', category.name, parent ? parent.name : 'Categoría principal',
                category.description || '', category.criteria || '', (category.keywords || []).join(', '),
                safeColor(category.color), stat.count, stat.weightedCount || 0
            ]);
            if (estimatedBytes > runtimeCapabilities.maxExportBytes) break;
        }
        if (estimatedBytes > runtimeCapabilities.maxExportBytes) {
            alert(`El libro de códigos superaría el máximo de exportación de ${Math.floor(runtimeCapabilities.maxExportBytes / 1024 / 1024)} MiB.`);
            return;
        }
        if (!preflightExport({
            label: 'Libro de códigos (CSV)',
            documents: analytics.documents,
            categories: analytics.categories,
            codings: analytics.codings,
            scopeDescription: `Alcance actual: ${state.analyticsDocumentId ? 'documento seleccionado' : state.analyticsDocumentGroup ? `grupo “${state.analyticsDocumentGroup}”` : 'todo el corpus'}; árbol completo de categorías.`,
            requireCategory: true
        })) return;
        const csvRows = ['Código,Categoría,Jerarquía,Descripción,Criterios metodológicos,Términos,Términos de exclusión,Color,Ocurrencias,Peso de evidencia\n'];
        analytics.categories.forEach(category => {
            const parent = category.parentId ? categoryMap.get(category.parentId) : null;
            const stat = analytics.statsMap.get(category.id) || { count: 0, weightedCount: 0 };
            csvRows.push(`"${escapeCsv(category.code || '')}","${escapeCsv(category.name)}","${escapeCsv(parent ? parent.name : 'Categoría principal')}","${escapeCsv(category.description || '')}","${escapeCsv(category.criteria || '')}","${escapeCsv((category.keywords || []).join(', '))}","${escapeCsv((category.excludeKeywords || []).join(', '))}","${safeColor(category.color)}","${stat.count}","${stat.weightedCount || 0}"\n`);
        });
        universalSaveFile(new Blob(['\uFEFF', ...csvRows], { type: 'text/csv;charset=utf-8;' }), `AnalizadorCualiUY_Pro_LibroDeCodigos_${new Date().toISOString().slice(0, 10)}.csv`);
    }

    let pendingCodebookImportItems = null;

    function generateSampleCodebookCSV() {
        const csvContent = 'Código,Categoría,Jerarquía,Descripción,Criterios metodológicos,Términos,Términos de exclusión,Color\n' +
            '"CAT-TD","Transformación Digital","","Uso de tecnologías y automatización","Excluir soporte técnico básico","tecnología, digital, software, sistemas","soporte básico, impresora, periférico","#3b82f6"\n' +
            '"SUB-AUT","Automatización de Procesos","Transformación Digital","Optimización y automatización de flujos","","automatización, procesos, bots","manual, artesanal","#60a5fa"\n' +
            '"CAT-LID","Liderazgo & Gestión","","Estilos de dirección y motivación de equipos","","liderazgo, equipo, gestión, comunicación","imposición, autoritario","#10b981"\n' +
            '"CAT-DES","Desafíos & Barreras","","Dificultades y resistencia al cambio","","resistencia, obstáculos, dificultad, problemas","éxito, logro","#ef4444"\n';
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
        let excludeKeywordsIdx = headers.findIndex(h => h.includes('excluir') || h.includes('exclusiontermino') || h.includes('terminosdeexclusion') || h.includes('terminosdeexclusio') || h.includes('palabrasexcluidas') || h.includes('omitir') || h.includes('excludekeyword'));
        let criteriaIdx = headers.findIndex((h, idx) => idx !== excludeKeywordsIdx && (h.includes('criterio') || h.includes('limite') || h.includes('regla') || (h.includes('exclusio') && !h.includes('termino'))));
        let keywordsIdx = headers.findIndex((h, idx) => idx !== excludeKeywordsIdx && (h.includes('termino') || h.includes('palabra') || h.includes('keyword') || h.includes('busqueda')));
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
            const rawExcludeKeywords = (excludeKeywordsIdx !== -1 && row[excludeKeywordsIdx] ? row[excludeKeywordsIdx] : '').trim();
            const rawColor = (colorIdx !== -1 && row[colorIdx] ? row[colorIdx] : '').trim();

            const keywords = rawKeywords ? rawKeywords.split(/[,;]/).map(k => k.trim()).filter(Boolean) : [];
            const excludeKeywords = rawExcludeKeywords ? rawExcludeKeywords.split(/[,;]/).map(k => k.trim()).filter(Boolean) : [];

            items.push({
                code: rawCode,
                name: rawName,
                rawParent: rawParent,
                description: rawDesc,
                criteria: rawCriteria,
                keywords: keywords,
                excludeKeywords: excludeKeywords,
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
                excludeKeywords: Array.isArray(item.excludeKeywords) ? item.excludeKeywords : [],
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

        recordAudit('Importación CSV/Excel', `Se incorporaron ${newCategories.length} categorías al libro de códigos`);
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

    function exportAuditLogCSV() {
        if (!preflightExport({ label: 'Registro metodológico (CSV)', documents: [], categories: [], codings: [], scopeDescription: `${state.auditLog.length} evento(s) registrados en el proyecto.`, warnWhenEmptyCodings: false })) return;
        const csvRows = ['Fecha y hora,Acción,Detalle\n'];
        state.auditLog.forEach(entry => {
            csvRows.push(`"${new Date(entry.timestamp).toLocaleString('es-UY')}","${escapeCsv(entry.action)}","${escapeCsv(entry.detail)}"\n`);
        });
        universalSaveFile(new Blob(['\uFEFF', ...csvRows], { type: 'text/csv;charset=utf-8;' }), `AnalizadorCualiUY_Pro_RegistroMetodologico_${new Date().toISOString().slice(0, 10)}.csv`);
    }

    function summaryFor(docId, categoryId) {
        return state.summaries.find(item => item.docId === docId && item.categoryId === categoryId);
    }

    function summaryPairIndex(summaries) {
        return new Map((summaries || []).map(summary => [pairIndexKey(summary.docId, summary.categoryId), summary]));
    }

    function codingPairCountIndex(codings) {
        const counts = new Map();
        (codings || []).forEach(coding => {
            if (coding.dismissed) return;
            const key = pairIndexKey(coding.docId, coding.categoryId);
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        return counts;
    }

    function renderSummaryMatrix() {
        const container = document.getElementById('summary-matrix-container');
        const categories = state.categories;
        if (!state.documents.length || !categories.length) {
            container.innerHTML = '<div class="empty-state-sm">Incorpora documentos y categorías para crear una matriz de síntesis.</div>';
            return;
        }
        const cellCount = matrixCellCount(state.documents.length, categories.length);
        if (cellCount > MAX_MATRIX_UI_CELLS || state.documents.length > 500 || categories.length > 200) {
            container.innerHTML = `<div class="empty-state-sm">La matriz tendría ${Number.isFinite(cellCount) ? cellCount.toLocaleString() : 'demasiadas'} celdas (${state.documents.length.toLocaleString()} documentos × ${categories.length.toLocaleString()} categorías) y supera el máximo visual de ${MAX_MATRIX_UI_CELLS.toLocaleString()} celdas, 500 documentos o 200 categorías. Reduce el número de documentos o categorías para abrirla.</div>`;
            return;
        }
        const summariesByPair = summaryPairIndex(state.summaries);
        const evidenceCounts = codingPairCountIndex(state.codings);
        const table = document.createElement('table');
        table.className = 'stats-table';
        table.innerHTML = `<thead><tr><th>Documento</th>${categories.map(cat => `<th>${escapeHtml(cat.code || cat.name)}</th>`).join('')}</tr></thead>`;
        const body = document.createElement('tbody');
        state.documents.forEach(doc => {
            const row = document.createElement('tr');
            row.innerHTML = `<td><strong>${escapeHtml(doc.title)}</strong>${(doc.profile || {}).group ? `<br><small>${escapeHtml(doc.profile.group)}</small>` : ''}</td>`;
            categories.forEach(category => {
                const key = pairIndexKey(doc.id, category.id);
                const summary = summariesByPair.get(key);
                const evidenceCount = evidenceCounts.get(key) || 0;
                const cell = document.createElement('td');
                const button = document.createElement('button');
                button.className = 'btn-sm btn-outline';
                button.textContent = summary && summary.text ? `${summary.text.slice(0, 52)}${summary.text.length > 52 ? '…' : ''}` : `+ Síntesis (${evidenceCount})`;
                button.title = 'Editar síntesis del cruce';
                button.onclick = () => openSummaryEditor(doc.id, category.id);
                cell.appendChild(button);
                row.appendChild(cell);
            });
            body.appendChild(row);
        });
        table.appendChild(body);
        container.innerHTML = '';
        container.appendChild(table);
    }

    function openSummaryEditor(docId, categoryId) {
        const doc = state.documents.find(item => item.id === docId);
        const category = state.categories.find(item => item.id === categoryId);
        const editor = document.getElementById('summary-editor');
        const summary = summaryFor(docId, categoryId);
        const evidence = [];
        let evidenceCount = 0;
        state.codings.forEach(coding => {
            if (coding.dismissed || coding.docId !== docId || coding.categoryId !== categoryId) return;
            evidenceCount++;
            if (evidence.length < MAX_DRILLDOWN_ITEMS) evidence.push(coding);
        });
        const evidenceNotice = evidenceCount > evidence.length
            ? `<div class="empty-state-sm">Se muestran ${evidence.length.toLocaleString()} de ${evidenceCount.toLocaleString()} pasajes.</div>`
            : '';
        editor.style.display = 'block';
        editor.innerHTML = `<div class="decoder-memo"><strong>${escapeHtml(doc.title)} × ${escapeHtml(category.name)}</strong><br><small>${evidenceCount} pasaje(s) asociado(s).</small></div><div class="form-group"><label>Síntesis interpretativa</label><textarea id="summary-text" rows="4" maxlength="${FIELD_LIMITS.summary}" placeholder="Redacta aquí la interpretación de este cruce..."></textarea></div>${evidenceNotice}<div class="cards-container">${evidence.map(coding => `<blockquote class="decoder-quote">“${escapeHtml(coding.quoteText.length > 4000 ? `${coding.quoteText.slice(0, 4000)}…` : coding.quoteText)}”</blockquote>`).join('') || '<em>Sin pasajes codificados en este cruce.</em>'}</div><button id="btn-save-summary" class="btn btn-primary" style="margin-top:0.75rem;">Guardar síntesis</button>`;
        document.getElementById('summary-text').value = summary ? summary.text : '';
        document.getElementById('btn-save-summary').onclick = () => {
            let text;
            try {
                text = requireString(document.getElementById('summary-text').value.trim(), 'Síntesis', FIELD_LIMITS.summary, true);
            } catch (error) {
                alert(`No se pudo guardar la síntesis: ${error.message || error}`);
                return;
            }
            const existing = summaryFor(docId, categoryId);
            const updatedAt = Date.now();
            const proposedSummaries = existing
                ? state.summaries.map(item => item.id === existing.id ? { ...item, text, updatedAt } : item)
                : [...state.summaries, { id: `summary-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, docId, categoryId, text, updatedAt }];
            const proposedAuditLog = auditLogWith('Síntesis actualizada', `${doc.title} × ${category.name}`);
            if (!commitProjectMutation({ summaries: proposedSummaries, auditLog: proposedAuditLog }, 'No se pudo guardar la síntesis')) {
                renderSummaryMatrix();
                return;
            }
            renderSummaryMatrix();
        };
    }

    function openSummaryMatrixModal() {
        document.getElementById('summary-editor').style.display = 'none';
        renderSummaryMatrix();
        document.getElementById('modal-summary-matrix').style.display = 'flex';
    }

    function exportSummaryMatrixCSV() {
        const activeCodings = state.codings.filter(coding => !coding.dismissed);
        const projectedRows = matrixCellCount(state.documents.length, state.categories.length);
        if (projectedRows > MAX_MATRIX_EXPORT_ROWS) {
            alert(`La matriz de síntesis produciría ${Number.isFinite(projectedRows) ? projectedRows.toLocaleString() : 'demasiadas'} filas y supera el máximo de ${MAX_MATRIX_EXPORT_ROWS.toLocaleString()}. Reduce documentos o categorías antes de exportar.`);
            return;
        }
        const summariesByPair = summaryPairIndex(state.summaries);
        const evidenceCounts = codingPairCountIndex(activeCodings);
        let estimatedBytes = utf8StringByteLength('Documento,Grupo,Categoría,Código,Síntesis,Pasajes activos\n');
        outer: for (const doc of state.documents) {
            for (const category of state.categories) {
                const key = pairIndexKey(doc.id, category.id);
                const summary = summariesByPair.get(key);
                estimatedBytes += csvRowByteLength([
                    doc.title, (doc.profile || {}).group || '', category.name, category.code || '',
                    summary ? summary.text : '', evidenceCounts.get(key) || 0
                ]);
                if (estimatedBytes > runtimeCapabilities.maxExportBytes) break outer;
            }
        }
        if (estimatedBytes > runtimeCapabilities.maxExportBytes) {
            alert(`La matriz de síntesis superaría el máximo de exportación de ${Math.floor(runtimeCapabilities.maxExportBytes / 1024 / 1024)} MiB. Reduce documentos o categorías antes de generarla.`);
            return;
        }
        if (!preflightExport({
            label: 'Matriz de síntesis (CSV)',
            documents: state.documents,
            categories: state.categories,
            codings: activeCodings,
            scopeDescription: 'Alcance: matriz completa del proyecto.',
            requireDocument: true,
            requireCategory: true
        })) return;
        const csvRows = ['Documento,Grupo,Categoría,Código,Síntesis,Pasajes activos\n'];
        state.documents.forEach(doc => state.categories.forEach(category => {
            const key = pairIndexKey(doc.id, category.id);
            const summary = summariesByPair.get(key);
            const count = evidenceCounts.get(key) || 0;
            csvRows.push(`"${escapeCsv(doc.title)}","${escapeCsv((doc.profile || {}).group || '')}","${escapeCsv(category.name)}","${escapeCsv(category.code || '')}","${escapeCsv(summary ? summary.text : '')}","${count}"\n`);
        }));
        universalSaveFile(new Blob(['\uFEFF', ...csvRows], { type: 'text/csv;charset=utf-8;' }), `AnalizadorCualiUY_Pro_MatrizSintesis_${new Date().toISOString().slice(0, 10)}.csv`);
    }

    function paragraphKeyFromSpans(spans, coding) {
        const start = Number(coding.startChar) || 0;
        const end = Number(coding.endChar) || start;
        let low = 0;
        let high = spans.length - 1;
        while (low <= high) {
            const middle = Math.floor((low + high) / 2);
            const span = spans[middle];
            if (span.end <= start) low = middle + 1;
            else if (span.start >= end) high = middle - 1;
            else return span.index;
        }
        return -1;
    }

    function codingGap(first, second) {
        const aStart = Number(first.startChar) || 0;
        const aEnd = Number(first.endChar) || aStart;
        const bStart = Number(second.startChar) || 0;
        const bEnd = Number(second.endChar) || bStart;
        return Math.max(0, Math.max(aStart, bStart) - Math.min(aEnd, bEnd));
    }

    function runAdvancedQuery() {
        const categoryA = document.getElementById('query-category-a').value;
        const categoryB = document.getElementById('query-category-b').value;
        const operator = document.getElementById('query-operator').value;
        const distance = Math.max(0, Number(document.getElementById('query-distance').value) || 0);
        const results = document.getElementById('advanced-query-results');
        if (!categoryA || !categoryB) { results.innerHTML = '<div class="empty-state-sm">Selecciona las dos categorías.</div>'; return; }
        const allowedDocs = state.documents.filter(doc => (!state.analyticsDocumentId || doc.id === state.analyticsDocumentId) && (!state.analyticsDocumentGroup || String((doc.profile || {}).group || '') === state.analyticsDocumentGroup));
        const documentMap = new Map(allowedDocs.map(doc => [doc.id, doc]));
        const rowsA = state.codings.filter(coding => !coding.dismissed && coding.categoryId === categoryA && documentMap.has(coding.docId));
        const rowsB = state.codings.filter(coding => !coding.dismissed && coding.categoryId === categoryB && documentMap.has(coding.docId));
        const rowsBByDocument = new Map();
        rowsB.forEach(coding => {
            if (!rowsBByDocument.has(coding.docId)) rowsBByDocument.set(coding.docId, []);
            rowsBByDocument.get(coding.docId).push(coding);
        });

        const rowsBByParagraph = new Map();
        if (operator !== 'near') {
            const paragraphDocumentIds = new Set(rowsA.map(coding => coding.docId));
            paragraphDocumentIds.forEach(docId => {
                const doc = documentMap.get(docId);
                if (!doc) return;
                const spans = window.AnalyticsEngine.spansFor(doc.content || '', 'paragraph');
                const byParagraph = new Map();
                (rowsBByDocument.get(doc.id) || []).forEach(coding => {
                    const paragraphIndex = paragraphKeyFromSpans(spans, coding);
                    if (!byParagraph.has(paragraphIndex)) byParagraph.set(paragraphIndex, []);
                    byParagraph.get(paragraphIndex).push(coding);
                });
                rowsBByParagraph.set(docId, { spans, byParagraph });
            });
        }

        const matches = [];
        let comparisons = 0;
        let truncatedByResults = false;
        let truncatedByComparisons = false;
        for (const first of rowsA) {
            if (matches.length >= MAX_ADVANCED_QUERY_RESULTS) {
                truncatedByResults = true;
                break;
            }
            const related = rowsBByDocument.get(first.docId) || [];
            if (operator === 'not') {
                const paragraphData = rowsBByParagraph.get(first.docId);
                const paragraphIndex = paragraphKeyFromSpans(paragraphData ? paragraphData.spans : [], first);
                const sameParagraph = paragraphData ? (paragraphData.byParagraph.get(paragraphIndex) || []) : [];
                if (!sameParagraph.length) matches.push({ first, second: null, gap: null });
            } else if (operator === 'near') {
                for (const second of related) {
                    if (comparisons >= MAX_ADVANCED_QUERY_COMPARISONS) {
                        truncatedByComparisons = true;
                        break;
                    }
                    comparisons++;
                    const gap = codingGap(first, second);
                    if (gap <= distance) matches.push({ first, second, gap });
                    if (matches.length >= MAX_ADVANCED_QUERY_RESULTS) {
                        truncatedByResults = true;
                        break;
                    }
                }
                if (truncatedByComparisons || truncatedByResults) break;
            } else {
                const paragraphData = rowsBByParagraph.get(first.docId);
                const paragraphIndex = paragraphKeyFromSpans(paragraphData ? paragraphData.spans : [], first);
                const sameParagraph = paragraphData ? (paragraphData.byParagraph.get(paragraphIndex) || []) : [];
                for (const second of sameParagraph) {
                    matches.push({ first, second, gap: 0 });
                    if (matches.length >= MAX_ADVANCED_QUERY_RESULTS) {
                        truncatedByResults = true;
                        break;
                    }
                }
            }
        }
        const catA = state.categories.find(category => category.id === categoryA);
        const catB = state.categories.find(category => category.id === categoryB);
        if (!catA || !catB) { results.innerHTML = '<div class="empty-state-sm">Una de las categorías ya no existe. Vuelve a abrir la consulta.</div>'; return; }
        if (!matches.length) {
            results.innerHTML = truncatedByComparisons
                ? `<div class="empty-state-sm">No hubo resultados antes de alcanzar el máximo de ${MAX_ADVANCED_QUERY_COMPARISONS.toLocaleString()} comparaciones. Acota la consulta para completarla.</div>`
                : '<div class="empty-state-sm">No se encontraron pasajes que cumplan esta consulta.</div>';
            return;
        }
        const truncationNotice = truncatedByComparisons
            ? ` Se detuvo al alcanzar ${MAX_ADVANCED_QUERY_COMPARISONS.toLocaleString()} comparaciones; acota categorías, documento, grupo o distancia.`
            : truncatedByResults
                ? ` Se muestran los primeros ${MAX_ADVANCED_QUERY_RESULTS.toLocaleString()} resultados; acota la consulta para ver el resto.`
                : '';
        results.innerHTML = `<p class="hint-text">${matches.length} resultado(s). Los filtros de documento y grupo del panel de gráficos se aplican también aquí.${escapeHtml(truncationNotice)}</p>`;
        matches.forEach(match => {
            const doc = documentMap.get(match.first.docId);
            const card = document.createElement('div');
            card.className = 'decoder-card';
            card.innerHTML = `<div class="decoder-card-header"><span class="tag-badge" style="background:${safeColor(catA.color)}">${escapeHtml(catA.name)}</span>${match.second ? `<span class="tag-badge" style="background:${safeColor(catB.color)}">${escapeHtml(catB.name)}</span>` : ''}<span style="font-size:.75rem; color:var(--text-muted)">${escapeHtml(doc.title)}</span></div><blockquote class="decoder-quote">“${escapeHtml(match.first.quoteText)}”</blockquote>${match.second ? `<blockquote class="decoder-quote">“${escapeHtml(match.second.quoteText)}”</blockquote>` : ''}${match.gap != null && operator === 'near' ? `<small>Distancia: ${match.gap} caracteres</small>` : ''}`;
            card.onclick = () => {
                setActiveDocument(match.first.docId);
                setTimeout(() => document.querySelector(`mark[data-coding-ids~="${match.first.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            };
            results.appendChild(card);
        });
    }

    function openAdvancedQueryModal() {
        const options = state.categories.map(category => `<option value="${category.id}">${escapeHtml(category.code ? `[${category.code}] ${category.name}` : category.name)}</option>`).join('');
        document.getElementById('query-category-a').innerHTML = options;
        document.getElementById('query-category-b').innerHTML = options;
        if (state.categories.length > 1) document.getElementById('query-category-b').selectedIndex = 1;
        document.getElementById('advanced-query-results').innerHTML = '<div class="empty-state-sm">Configura una relación y pulsa “Buscar pasajes”.</div>';
        document.getElementById('modal-advanced-query').style.display = 'flex';
    }

    const PROJECT_TEMPLATES = [
        { id: 'entrevistas', title: 'Entrevistas y grupos focales', description: 'Contexto, experiencias, barreras y propuestas.', categories: [
            ['Contexto y trayectoria', 'CAT-CTX', 'Datos contextuales relevantes para interpretar el relato.'],
            ['Experiencias y significados', 'CAT-EXP', 'Vivencias, valoraciones y sentidos atribuidos.'],
            ['Barreras y tensiones', 'CAT-BAR', 'Dificultades, resistencias o contradicciones.'],
            ['Propuestas y expectativas', 'CAT-PRO', 'Sugerencias, necesidades y proyecciones.']
        ] },
        { id: 'curricular', title: 'Análisis curricular o documental', description: 'Objetivos, contenidos, enseñanza, evaluación e inclusión.', categories: [
            ['Objetivos y fundamentos', 'CAT-OBJ', 'Propósitos, fundamentos y enfoques declarados.'],
            ['Contenidos y saberes', 'CAT-CON', 'Temas, conceptos, competencias y progresiones.'],
            ['Estrategias de enseñanza', 'CAT-ENS', 'Propuestas didácticas, recursos y mediaciones.'],
            ['Evaluación', 'CAT-EVA', 'Criterios, instrumentos y formas de valoración.'],
            ['Inclusión y diversidad', 'CAT-INC', 'Accesibilidad, diversidad y atención a diferencias.']
        ] },
        { id: 'observacion', title: 'Observación de aula o campo', description: 'Interacciones, participación, recursos, clima e incidencias.', categories: [
            ['Interacciones', 'CAT-INT', 'Intercambios entre participantes y roles asumidos.'],
            ['Participación', 'CAT-PAR', 'Formas, niveles y condiciones de participación.'],
            ['Recursos y mediaciones', 'CAT-REC', 'Materiales, tecnologías y organización de la actividad.'],
            ['Clima y convivencia', 'CAT-CLI', 'Ambiente, vínculos, cuidado y convivencia.'],
            ['Incidencias relevantes', 'CAT-INC', 'Situaciones inesperadas o especialmente significativas.']
        ] }
    ];

    function openProjectTemplatesModal() {
        const container = document.getElementById('project-template-options');
        container.innerHTML = '';
        PROJECT_TEMPLATES.forEach(template => {
            const card = document.createElement('div');
            card.className = 'decoder-card';
            card.innerHTML = `<strong>${escapeHtml(template.title)}</strong><p>${escapeHtml(template.description)}</p><small>${template.categories.length} categorías iniciales, siempre editables.</small><br><button class="btn btn-primary" style="margin-top:.7rem;">Usar esta plantilla</button>`;
            card.querySelector('button').onclick = () => applyProjectTemplate(template);
            container.appendChild(card);
        });
        document.getElementById('modal-project-templates').style.display = 'flex';
    }

    function applyProjectTemplate(template) {
        if (state.categories.length && !confirm(`La plantilla reemplazará las ${state.categories.length} categorías actuales y sus codificaciones asociadas. Los documentos se conservarán. ¿Deseas continuar?`)) return;
        const proposedCategories = template.categories.map(([name, code, description], index) => ({
            id: `cat-template-${template.id}-${index + 1}`,
            parentId: null,
            name,
            code,
            description,
            criteria: '',
            keywords: [],
            color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]
        }));
        const proposedAuditLog = auditLogWith('Plantilla aplicada', template.title);
        if (!commitProjectMutation({
            categories: proposedCategories,
            codings: [],
            summaries: [],
            projectTemplate: template.id,
            auditLog: proposedAuditLog
        }, 'No se pudo aplicar la plantilla')) {
            renderCodebookList();
            renderDecoderList();
            return;
        }
        state.activeCategoryId = null;
        renderCodebookList();
        renderDecoderList();
        if (state.activeDocId) setActiveDocument(state.activeDocId);
        updateQualitativeCharts();
        document.getElementById('modal-project-templates').style.display = 'none';
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

    function renderCorpusExclusionList() {
        const countEl = document.getElementById('corpus-exclusion-count');
        const listEl = document.getElementById('corpus-exclusion-list');
        if (!listEl) return;
        const exclusions = state.corpusExclusions || [];
        if (countEl) countEl.textContent = exclusions.length.toLocaleString();
        listEl.innerHTML = '';
        if (exclusions.length === 0) {
            listEl.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:0.8rem;">No hay pasajes excluidos en el proyecto.</div>';
            return;
        }
        const docMap = new Map((state.documents || []).map(d => [d.id, d.title]));
        exclusions.forEach(ex => {
            const item = document.createElement('div');
            item.className = 'exclusion-item';
            const docTitle = docMap.get(ex.docId) || 'Documento';
            const textPreview = ex.text ? ex.text.slice(0, 70) : 'Pasaje excluido';
            item.innerHTML = `
                <div class="exclusion-text" title="${escapeHtml(ex.text || '')}">
                    <strong>[${escapeHtml(docTitle)}]</strong> "${escapeHtml(textPreview)}${ex.text && ex.text.length > 70 ? '…' : ''}"
                </div>
                <div class="exclusion-meta">${escapeHtml(ex.term || 'Exclusión')}</div>
                <button class="btn btn-outline btn-sm btn-delete-ex" title="Reincorporar pasaje" style="color:#ef4444; padding:0.1rem 0.4rem; font-size:0.75rem;">Levantar</button>
            `;
            const deleteBtn = item.querySelector('.btn-delete-ex');
            if (deleteBtn) {
                deleteBtn.onclick = () => removeCorpusExclusion(ex.id);
            }
            listEl.appendChild(item);
        });
    }

    function openCorpusExclusionModal() {
        renderCorpusExclusionList();
        const modal = document.getElementById('modal-corpus-exclusion');
        if (modal) modal.style.display = 'flex';
    }

    function removeCorpusExclusion(exclusionId) {
        if (!state.corpusExclusions) return;
        const target = state.corpusExclusions.find(ex => ex.id === exclusionId);
        if (!target) return;
        state.corpusExclusions = state.corpusExclusions.filter(ex => ex.id !== exclusionId);
        recordAudit('Levantar exclusión de corpus', `Pasaje reincorporado en doc ${target.docId}: ${String(target.text || '').slice(0, 40)}`);
        saveToStorage();
        if (state.activeDocId === target.docId) {
            setActiveDocument(state.activeDocId);
        }
        renderCorpusExclusionList();
        renderDecoderList();
        updateQualitativeCharts();
    }

    function clearAllCorpusExclusions() {
        if (!state.corpusExclusions || state.corpusExclusions.length === 0) return;
        if (!confirm('¿Deseas levantar y eliminar todas las exclusiones del corpus? Los pasajes volverán a ser considerados en el análisis.')) return;
        const count = state.corpusExclusions.length;
        state.corpusExclusions = [];
        recordAudit('Levantar todas las exclusiones', `${count} pasajes reincorporados.`);
        saveToStorage();
        if (state.activeDocId) {
            setActiveDocument(state.activeDocId);
        }
        renderCorpusExclusionList();
        renderDecoderList();
        updateQualitativeCharts();
    }

    function applyGlobalCorpusExclusion(termsString, scope = 'all') {
        const rawTerms = String(termsString || '')
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length >= 2);
        if (rawTerms.length === 0) {
            alert('Por favor ingresa al menos un término o encabezado para excluir.');
            return;
        }

        const targetDocs = scope === 'active'
            ? (state.documents || []).filter(d => d.id === state.activeDocId)
            : (state.documents || []);

        if (targetDocs.length === 0) {
            alert('No hay documentos disponibles en el alcance seleccionado.');
            return;
        }

        if (!state.corpusExclusions) state.corpusExclusions = [];
        let addedCount = 0;
        const newExclusions = [...state.corpusExclusions];

        targetDocs.forEach(doc => {
            const content = String(doc.content || '');
            const normalizedContent = normalizeText(content);

            rawTerms.forEach(term => {
                const normalizedTerm = normalizeText(term);
                if (!normalizedTerm) return;

                let searchFrom = 0;
                let foundPos;
                while ((foundPos = normalizedContent.indexOf(normalizedTerm, searchFrom)) !== -1) {
                    searchFrom = foundPos + normalizedTerm.length;

                    let segStart = content.lastIndexOf('\n\n', foundPos);
                    segStart = segStart === -1 ? 0 : segStart + 2;
                    let segEnd = content.indexOf('\n\n', foundPos + term.length);
                    segEnd = segEnd === -1 ? content.length : segEnd;

                    const trimmed = ProjectIntegrity.trimSelectionOffsets(content, segStart, segEnd);
                    if (trimmed.start >= trimmed.end || trimmed.text.length < 2) continue;

                    const alreadyExists = newExclusions.some(ex =>
                        ex.docId === doc.id &&
                        ex.startChar <= trimmed.start &&
                        ex.endChar >= trimmed.end
                    );
                    if (alreadyExists) continue;

                    const newEx = {
                        id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        docId: doc.id,
                        startChar: trimmed.start,
                        endChar: trimmed.end,
                        text: trimmed.text,
                        term: term,
                        createdAt: Date.now()
                    };
                    newExclusions.push(newEx);
                    addedCount++;
                }
            });
        });

        if (addedCount === 0) {
            alert('No se encontraron nuevos pasajes que coincidan con los términos indicados.');
            return;
        }

        state.corpusExclusions = newExclusions;

        // Dismiss automatic codings that fall inside these new exclusions
        state.codings = (state.codings || []).map(coding => {
            if (coding.dismissed) return coding;
            const isOverlap = state.corpusExclusions.some(ex =>
                ex.docId === coding.docId &&
                coding.startChar < ex.endChar &&
                coding.endChar > ex.startChar
            );
            if (isOverlap && coding.source === 'automatic') {
                return { ...coding, dismissed: true };
            }
            return coding;
        });

        recordAudit('Exclusión global de corpus', `Términos: "${rawTerms.join(', ')}" (${scope === 'all' ? 'Todo el corpus' : 'Doc activo'}). ${addedCount} pasaje(s) excluido(s).`);
        saveToStorage();
        if (state.activeDocId) {
            setActiveDocument(state.activeDocId);
        }
        renderCorpusExclusionList();
        renderDecoderList();
        updateQualitativeCharts();
        alert(`✅ Se identificaron y excluyeron ${addedCount} pasaje(s) del análisis automático.`);
    }

    function excludeSelectedRange() {
        if (!state.selectedRange) return;
        if (!state.corpusExclusions) state.corpusExclusions = [];
        const { docId, startChar, endChar, quoteText } = state.selectedRange;
        const newEx = {
            id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            docId,
            startChar,
            endChar,
            text: quoteText,
            term: 'Selección manual',
            createdAt: Date.now()
        };
        state.corpusExclusions.push(newEx);

        state.codings = (state.codings || []).map(coding => {
            if (coding.docId === docId && coding.startChar < endChar && coding.endChar > startChar && coding.source === 'automatic') {
                return { ...coding, dismissed: true };
            }
            return coding;
        });

        recordAudit('Exclusión manual de pasaje', `Fragmento excluido en doc ${docId}: "${quoteText.slice(0, 40)}…"`);
        saveToStorage();
        hideFloatingToolbar();
        setActiveDocument(docId);
        renderDecoderList();
        updateQualitativeCharts();
    }

    function liftExclusionForSelectedRange() {
        if (!state.selectedRange || !state.corpusExclusions) return;
        const { docId, startChar, endChar } = state.selectedRange;
        const initialCount = state.corpusExclusions.length;
        state.corpusExclusions = state.corpusExclusions.filter(ex =>
            !(ex.docId === docId && startChar < ex.endChar && endChar > ex.startChar)
        );
        const removedCount = initialCount - state.corpusExclusions.length;
        if (removedCount > 0) {
            recordAudit('Levantar exclusión de pasaje', `${removedCount} exclusión(es) levantada(s) manualmente.`);
            saveToStorage();
        }
        hideFloatingToolbar();
        setActiveDocument(docId);
        renderDecoderList();
        updateQualitativeCharts();
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

        const isExcluded = state.selectedRange && (state.corpusExclusions || []).some(ex =>
            ex.docId === state.selectedRange.docId &&
            state.selectedRange.startChar < ex.endChar &&
            state.selectedRange.endChar > ex.startChar
        );
        const btnExclude = document.getElementById('btn-quick-exclude');
        const btnLift = document.getElementById('btn-quick-lift-exclude');
        if (btnExclude) btnExclude.style.display = isExcluded ? 'none' : 'inline-block';
        if (btnLift) btnLift.style.display = isExcluded ? 'inline-block' : 'none';

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
        let safeMemo;
        try {
            safeMemo = requireString(String(memoText || '').trim(), 'Nota analítica', FIELD_LIMITS.memo, true);
        } catch (error) {
            alert(`No se pudo aplicar la categoría: ${error.message || error}`);
            return;
        }
        const exactCodings = state.codings.filter(coding =>
            coding.docId === state.selectedRange.docId &&
            coding.categoryId === categoryId &&
            coding.startChar === state.selectedRange.startChar &&
            coding.endChar === state.selectedRange.endChar
        );
        const exactCoding = exactCodings.find(coding => !coding.dismissed) || exactCodings[0];
        if (exactCoding && !exactCoding.dismissed) {
            alert('Ese pasaje ya tiene aplicada la categoría seleccionada.');
            return;
        }
        if (!exactCoding && state.codings.length >= projectLimits().maxCodings) {
            alert(`El proyecto alcanzó el máximo de ${projectLimits().maxCodings.toLocaleString()} codificaciones.`);
            return;
        }

        const nextCoding = exactCoding
            ? {
                ...exactCoding,
                quoteText: state.selectedRange.quoteText,
                memo: safeMemo || exactCoding.memo || '',
                source: 'manual',
                dismissed: false,
                weight: normalizedWeight(exactCoding.weight),
                createdAt: Date.now()
            }
            : {
                id: `cod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                docId: state.selectedRange.docId,
                categoryId: categoryId,
                startChar: state.selectedRange.startChar,
                endChar: state.selectedRange.endChar,
                quoteText: state.selectedRange.quoteText,
                memo: safeMemo,
                source: 'manual',
                dismissed: false,
                weight: 1,
                createdAt: Date.now()
            };
        const proposedCodings = exactCoding
            ? state.codings.map(coding => coding === exactCoding ? nextCoding : coding)
            : [...state.codings, nextCoding];
        const auditEntry = {
            id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: Date.now(),
            action: exactCoding ? 'Codificación manual reactivada' : 'Codificación manual agregada',
            detail: `${state.selectedRange.docId} · ${categoryId}`
        };
        const proposedAuditLog = [...state.auditLog, auditEntry].slice(-10000);

        if (!commitProjectMutation({ codings: proposedCodings, auditLog: proposedAuditLog }, 'No se pudo aplicar la categoría')) return;

        setActiveDocument(state.activeDocId);
        renderCodebookList();
        renderDecoderList();
        updateQualitativeCharts();
    }

    function showCodingContextMenu(_event, coding) {
        openCodingMemoModal(coding);
    }

    // ==========================================
    // 9. Visual Network Graph (Canvas)
    // ==========================================

    function setupNetworkCanvas() {
        const canvas = document.getElementById('network-canvas');
        if (!canvas) return;

        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width || 600;
        canvas.height = Math.max(400, rect.height || 480);

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
        updateAnalyticsDiagnosticsNotice(analytics);
        const visualCategories = analyticsVisualCategories(analytics);
        const count = visualCategories.length;
        if (count === 0) return;

        const centerX = width / 2;
        const centerY = height / 2;

        const maxSizeValue = Math.max(0.0001, ...visualCategories.map(category => nodeSizeValue(analytics.statsMap.get(category.id))));
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
            const visualIds = new Set(visualCategories.map(category => category.id));
            const forceEdges = analytics.edges.filter(edge => visualIds.has(edge.sourceId) && visualIds.has(edge.targetId));
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
        updateAnalyticsDiagnosticsNotice(analytics);
        const visualCategories = analyticsVisualCategories(analytics);
        const visualIds = new Set(visualCategories.map(category => category.id));
        if (canvasNodes.length !== visualCategories.length || canvasNodes.some(node => !visualIds.has(node.id))) {
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

        const maxSizeValue = Math.max(0.0001, ...visualCategories.map(category => nodeSizeValue(analytics.statsMap.get(category.id))));
        canvasNodes.forEach(node => {
            const stat = analytics.statsMap.get(node.id) || { count: 0, docCount: 0 };
            node.count = stat.count;
            node.docCount = stat.docCount;
            node.perThousand = stat.perThousand;
            node.documentShare = stat.documentShare;
            node.radius = 14 + 18 * Math.sqrt(nodeSizeValue(stat) / maxSizeValue);
        });
        canvasLinks = analytics.edges
            .filter(edge => visualIds.has(edge.sourceId) && visualIds.has(edge.targetId))
            .map(edge => Object.assign({ weight: edge.metricValue }, edge));
        const scaleNotice = analytics.categories.length > visualCategories.length ? ` Se muestran ${visualCategories.length} de ${analytics.categories.length}.` : '';
        canvas.setAttribute('aria-label', `Red de ${visualCategories.length} ${categoryModeLabel()}; tamaño por ${state.analyticsNodeSize}; vínculos por ${metricLabel()}.${scaleNotice}`);

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

    function drawHeatmapToCanvas(ctx, analytics, startX, startY, availableWidth) {
        const visualCats = analyticsVisualCategories(analytics);
        if (!visualCats.length) return startY + 40;

        const labelWidth = Math.min(220, availableWidth * 0.25);
        const colWidth = Math.max(35, (availableWidth - labelWidth) / visualCats.length);

        const rowHeight = 32;
        const headerHeight = 38;

        ctx.fillStyle = state.theme === 'dark' ? '#1e293b' : '#e2e8f0';
        ctx.fillRect(startX, startY, availableWidth, headerHeight);
        ctx.fillStyle = state.theme === 'dark' ? '#94a3b8' : '#475569';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Categoría', startX + 10, startY + 23);

        ctx.textAlign = 'center';
        visualCats.forEach((cat, colIdx) => {
            const x = startX + labelWidth + colIdx * colWidth;
            const code = (cat.code || cat.name).slice(0, 6);
            ctx.fillText(code, x + colWidth / 2, startY + 23);
        });

        const visualIds = new Set(visualCats.map(c => c.id));
        const visualEdges = (analytics.edges || []).filter(e => visualIds.has(e.sourceId) && visualIds.has(e.targetId));
        const maxValue = Math.max(0.0001, ...visualEdges.map(e => e.metricValue));

        let currentY = startY + headerHeight;

        visualCats.forEach((catA, rowIdx) => {
            ctx.fillStyle = (rowIdx % 2 === 0) 
                ? (state.theme === 'dark' ? '#0f172a' : '#ffffff') 
                : (state.theme === 'dark' ? '#1e293b' : '#f8fafc');
            ctx.fillRect(startX, currentY, availableWidth, rowHeight);

            ctx.beginPath();
            ctx.arc(startX + 12, currentY + rowHeight / 2, 5, 0, Math.PI * 2);
            ctx.fillStyle = safeColor(catA.color);
            ctx.fill();

            ctx.fillStyle = state.theme === 'dark' ? '#f8fafc' : '#0f172a';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'left';
            const catName = catA.name.length > 25 ? catA.name.slice(0, 23) + '...' : catA.name;
            ctx.fillText(catName, startX + 24, currentY + 20);

            ctx.textAlign = 'center';
            visualCats.forEach((catB, colIdx) => {
                const cellX = startX + labelWidth + colIdx * colWidth;
                if (catA.id === catB.id) {
                    const stat = analytics.statsMap.get(catA.id) || { count: 0 };
                    ctx.fillStyle = state.theme === 'dark' ? '#334155' : '#e2e8f0';
                    ctx.fillRect(cellX + 2, currentY + 2, colWidth - 4, rowHeight - 4);
                    ctx.fillStyle = state.theme === 'dark' ? '#ffffff' : '#000000';
                    ctx.font = 'bold 11px sans-serif';
                    ctx.fillText(String(stat.count), cellX + colWidth / 2, currentY + 20);
                } else {
                    const edge = analytics.matrix[catA.id] && analytics.matrix[catA.id][catB.id];
                    const visible = edge && (!state.analyticsHideZeros || edge.count > 0);
                    if (visible) {
                        const alpha = 0.15 + 0.75 * (edge.metricValue / maxValue);
                        ctx.fillStyle = hexToRgba(safeColor(catA.color), alpha);
                        ctx.fillRect(cellX + 2, currentY + 2, colWidth - 4, rowHeight - 4);

                        const textVal = formatMetric(edge);
                        ctx.fillStyle = state.theme === 'dark' ? '#ffffff' : '#0f172a';
                        ctx.font = '10px sans-serif';
                        ctx.fillText(textVal, cellX + colWidth / 2, currentY + 20);
                    } else {
                        ctx.fillStyle = state.theme === 'dark' ? '#64748b' : '#94a3b8';
                        ctx.font = '10px sans-serif';
                        ctx.fillText('·', cellX + colWidth / 2, currentY + 20);
                    }
                }
            });

            currentY += rowHeight;
        });

        ctx.textAlign = 'left';
        return currentY + 20;
    }

    function drawBarsToCanvas(ctx, analytics, startX, startY, availableWidth) {
        const sorted = [...analytics.categories].sort((a, b) => (analytics.statsMap.get(b.id)?.perThousand || 0) - (analytics.statsMap.get(a.id)?.perThousand || 0)).slice(0, MAX_VISUAL_CATEGORIES);
        if (!sorted.length) return startY + 40;

        const visibleStats = sorted.map(c => analytics.statsMap.get(c.id));
        const maxCount = Math.max(1, ...visibleStats.map(s => s.count));
        const maxRate = Math.max(0.001, ...visibleStats.map(s => s.perThousand));

        let currentY = startY;
        const rowHeight = 50;

        sorted.forEach(cat => {
            const stat = analytics.statsMap.get(cat.id);

            ctx.beginPath();
            ctx.arc(startX + 6, currentY + 10, 4, 0, Math.PI * 2);
            ctx.fillStyle = safeColor(cat.color);
            ctx.fill();

            ctx.fillStyle = state.theme === 'dark' ? '#f8fafc' : '#0f172a';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(cat.name, startX + 16, currentY + 14);

            ctx.fillStyle = state.theme === 'dark' ? '#94a3b8' : '#64748b';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'right';
            const infoText = `${stat.count} pasajes · ${stat.perThousand.toFixed(1)}/1k pal. · Docs: ${stat.docCount}/${analytics.documents.length}`;
            ctx.fillText(infoText, startX + availableWidth, currentY + 14);

            ctx.textAlign = 'left';
            const barY = currentY + 22;
            const barWidthMax = availableWidth;
            const absWidth = (stat.count / maxCount) * barWidthMax;
            const rateWidth = (stat.perThousand / maxRate) * barWidthMax;

            ctx.fillStyle = safeColor(cat.color);
            ctx.fillRect(startX, barY, Math.max(4, absWidth), 8);

            ctx.fillStyle = hexToRgba(safeColor(cat.color), 0.45);
            ctx.fillRect(startX, barY + 11, Math.max(4, rateWidth), 8);

            currentY += rowHeight;
        });

        return currentY + 20;
    }

    function drawQualityToCanvas(ctx, report, startX, startY, availableWidth) {
        if (!report) return startY + 40;
        const cards = [
            ['Cobertura', `${(report.coverage * 100).toFixed(1)}%`, `${report.codedChars} / ${report.totalChars} chars`],
            ['Memos faltantes', String((report.missingMemos || []).length), 'pasajes sin interpretación'],
            ['Categorías incompletas', String((report.incompleteCategories || []).length), 'sin código o criterio'],
            ['Documentos sin codificar', String((report.uncodedDocuments || []).length), 'documentos vacíos'],
            ['Duplicados', String((report.duplicates || []).length), 'codificaciones idénticas'],
            ['Solapamientos', String((report.overlaps || []).length), 'pares superpuestos'],
            ['Categorías 1 solo doc', String((report.singleDocumentCategories || []).length), 'revisar transferibilidad'],
            ['Manual / automática', `${report.manual} / ${report.automatic}`, `${report.totalCodings} codificaciones`]
        ];

        const cols = 2;
        const gap = 12;
        const cardWidth = (availableWidth - gap) / cols;
        const cardHeight = 65;

        let currentY = startY;

        cards.forEach((card, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = startX + col * (cardWidth + gap);
            const y = startY + row * (cardHeight + gap);

            ctx.fillStyle = state.theme === 'dark' ? '#1e293b' : '#f8fafc';
            ctx.strokeStyle = state.theme === 'dark' ? '#334155' : '#cbd5e1';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(x, y, cardWidth, cardHeight, 6);
            ctx.fill();
            ctx.stroke();

            ctx.textAlign = 'left';
            ctx.fillStyle = state.theme === 'dark' ? '#3b82f6' : '#2563eb';
            ctx.font = 'bold 18px sans-serif';
            ctx.fillText(card[1], x + 12, y + 26);

            ctx.fillStyle = state.theme === 'dark' ? '#f8fafc' : '#0f172a';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(card[0], x + 12, y + 44);

            ctx.fillStyle = state.theme === 'dark' ? '#94a3b8' : '#64748b';
            ctx.font = '10px sans-serif';
            ctx.fillText(card[2], x + 12, y + 57);

            if (col === cols - 1) {
                currentY = y + cardHeight + gap;
            }
        });

        return currentY + 15;
    }

    function chartTypeTitle(type) {
        if (type === 'network') return 'Red de Coocurrencia Categorial';
        if (type === 'heatmap') return 'Matriz de Coocurrencia (Heatmap)';
        if (type === 'bars') return 'Comparación Proporcional de Categorías';
        return 'Diagnóstico de Calidad de Codificación';
    }

    function exportActiveChartPNG() {
        const type = state.activeChartType || 'network';
        const analytics = getAnalytics();
        const report = window.AnalyticsEngine.quality(state, { documentId: state.analyticsDocumentId, documentGroup: state.analyticsDocumentGroup });

        if (!preflightExport({
            label: `Gráfico: ${chartTypeTitle(type)} (PNG)`,
            documents: analytics.documents,
            categories: analytics.categories,
            codings: analytics.codings,
            scopeDescription: `Alcance actual: ${state.analyticsDocumentId ? 'documento seleccionado' : state.analyticsDocumentGroup ? `grupo "${state.analyticsDocumentGroup}"` : 'todo el corpus'}; ${categoryModeLabel()}.`,
            requireDocument: true,
            requireCategory: true
        })) return;

        const interpretationObj = getActiveChartInterpretation(analytics, report);
        const interpText = interpretationObj.text;

        const canvasWidth = 1000;
        const padding = 35;
        const availableWidth = canvasWidth - padding * 2;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = '12px sans-serif';

        const rawLines = interpText.split('\n');
        const wrappedLines = [];
        rawLines.forEach(line => {
            const words = line.split(' ');
            let currentLine = '';
            words.forEach(word => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                if (tempCtx.measureText(testLine).width > availableWidth - 35) {
                    wrappedLines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            });
            if (currentLine) wrappedLines.push(currentLine);
        });

        const interpBoxHeight = 50 + wrappedLines.length * 18;

        let graphicHeight = 450;
        if (type === 'heatmap') {
            const visualCats = analyticsVisualCategories(analytics);
            graphicHeight = 40 + (visualCats.length + 1) * 32;
        } else if (type === 'bars') {
            const sorted = [...analytics.categories].slice(0, MAX_VISUAL_CATEGORIES);
            graphicHeight = sorted.length * 50 + 20;
        } else if (type === 'quality') {
            graphicHeight = 310;
        }

        const headerHeight = 110;
        const totalHeight = headerHeight + graphicHeight + interpBoxHeight + 50;

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = canvasWidth;
        offscreenCanvas.height = totalHeight;
        const ctx = offscreenCanvas.getContext('2d');

        const bgColor = state.theme === 'dark' ? '#0b1329' : '#ffffff';
        const cardBg = state.theme === 'dark' ? '#1e293b' : '#f8fafc';
        const textColor = state.theme === 'dark' ? '#ffffff' : '#0f172a';
        const mutedColor = state.theme === 'dark' ? '#94a3b8' : '#64748b';
        const accentColor = '#3b82f6';
        const borderColor = state.theme === 'dark' ? '#334155' : '#cbd5e1';

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasWidth, totalHeight);

        ctx.fillStyle = accentColor;
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('AnalizadorCualiUY Pro', padding, 40);

        ctx.fillStyle = textColor;
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(chartTypeTitle(type), padding, 65);

        ctx.fillStyle = mutedColor;
        ctx.font = '11px sans-serif';
        const metadataLine = `Alcance: ${state.analyticsDocumentId ? 'documento seleccionado' : state.analyticsDocumentGroup ? `grupo "${state.analyticsDocumentGroup}"` : 'Todo el corpus'} | Unidad: ${state.analyticsUnit} | Métrica: ${metricLabel()} | Fecha: ${new Date().toLocaleDateString('es-UY')}`;
        ctx.fillText(metadataLine, padding, 85);

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, 98);
        ctx.lineTo(canvasWidth - padding, 98);
        ctx.stroke();

        let currentY = 115;
        if (type === 'network') {
            const networkCanvas = document.getElementById('network-canvas');
            if (networkCanvas) {
                ctx.drawImage(networkCanvas, padding, currentY, availableWidth, graphicHeight);
            }
            currentY += graphicHeight + 20;
        } else if (type === 'heatmap') {
            currentY = drawHeatmapToCanvas(ctx, analytics, padding, currentY, availableWidth);
        } else if (type === 'bars') {
            currentY = drawBarsToCanvas(ctx, analytics, padding, currentY, availableWidth);
        } else if (type === 'quality') {
            currentY = drawQualityToCanvas(ctx, report, padding, currentY, availableWidth);
        }

        const boxY = currentY;
        ctx.fillStyle = cardBg;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(padding, boxY, availableWidth, interpBoxHeight, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = accentColor;
        ctx.fillRect(padding, boxY, 5, interpBoxHeight);

        ctx.fillStyle = accentColor;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('💡 Interpretación Analítica Cualitativa' + (interpretationObj.isCustom ? ' (Nota personalizada)' : ''), padding + 18, boxY + 24);

        ctx.fillStyle = textColor;
        ctx.font = '12px sans-serif';
        wrappedLines.forEach((l, idx) => {
            ctx.fillText(l, padding + 18, boxY + 46 + idx * 18);
        });

        offscreenCanvas.toBlob(function(blob) {
            if (blob) universalSaveFile(blob, `AnalizadorCualiUY_Pro_${type}_${new Date().toISOString().slice(0, 10)}.png`);
        }, 'image/png');
    }

    function exportActiveChartSVG() {
        const type = state.activeChartType || 'network';
        const analytics = getAnalytics();
        const report = window.AnalyticsEngine.quality(state, { documentId: state.analyticsDocumentId, documentGroup: state.analyticsDocumentGroup });

        if (!preflightExport({
            label: `Gráfico: ${chartTypeTitle(type)} (SVG)`,
            documents: analytics.documents,
            categories: analytics.categories,
            codings: analytics.codings,
            scopeDescription: `Alcance actual: ${state.analyticsDocumentId ? 'documento seleccionado' : state.analyticsDocumentGroup ? `grupo "${state.analyticsDocumentGroup}"` : 'todo el corpus'}; ${categoryModeLabel()}.`,
            requireDocument: true,
            requireCategory: true
        })) return;

        const interpretationObj = getActiveChartInterpretation(analytics, report);
        const interpText = interpretationObj.text;
        const w = 900;

        let svgBody = '';
        let graphicHeight = 450;

        if (type === 'network') {
            canvasLinks.forEach(link => {
                const s = canvasNodes.find(n => n.id === link.sourceId);
                const t = canvasNodes.find(n => n.id === link.targetId);
                if (!s || !t) return;
                const strokeColor = state.theme === 'dark' ? '#475569' : '#cbd5e1';
                const normalized = state.analyticsMetric === 'count' ? Math.min(1, link.count / Math.max(1, ...canvasLinks.map(item => item.count))) : link.metricValue;
                svgBody += `  <line x1="${s.x}" y1="${s.y + 110}" x2="${t.x}" y2="${t.y + 110}" stroke="${strokeColor}" stroke-opacity="${0.2 + normalized * 0.75}" stroke-width="${1 + normalized * 7}" />\n`;
            });
            canvasNodes.forEach(node => {
                svgBody += `  <circle cx="${node.x}" cy="${node.y + 110}" r="${node.radius}" fill="${node.color}" stroke="#ffffff" stroke-width="2" />\n`;
                svgBody += `  <text x="${node.x}" y="${node.y + node.radius + 124}" fill="${state.theme === 'dark' ? '#ffffff' : '#000000'}" font-size="12" text-anchor="middle" font-weight="bold">${escapeHtml(node.name)}</text>\n`;
            });
        } else if (type === 'heatmap') {
            const visualCats = analyticsVisualCategories(analytics);
            const colW = (w - 200) / visualCats.length;
            graphicHeight = (visualCats.length + 1) * 32 + 30;

            svgBody += `  <rect x="35" y="115" width="${w - 70}" height="32" fill="${state.theme === 'dark' ? '#1e293b' : '#e2e8f0'}" />\n`;
            svgBody += `  <text x="45" y="136" fill="${state.theme === 'dark' ? '#94a3b8' : '#475569'}" font-size="11" font-weight="bold">Categoría</text>\n`;
            visualCats.forEach((cat, colIdx) => {
                const cx = 200 + colIdx * colW + colW / 2;
                svgBody += `  <text x="${cx}" y="136" fill="${state.theme === 'dark' ? '#94a3b8' : '#475569'}" font-size="11" font-weight="bold" text-anchor="middle">${escapeHtml((cat.code || cat.name).slice(0, 6))}</text>\n`;
            });

            const visualIds = new Set(visualCats.map(c => c.id));
            const visualEdges = (analytics.edges || []).filter(e => visualIds.has(e.sourceId) && visualIds.has(e.targetId));
            const maxValue = Math.max(0.0001, ...visualEdges.map(e => e.metricValue));

            visualCats.forEach((catA, rIdx) => {
                const ry = 147 + rIdx * 32;
                const rowBg = (rIdx % 2 === 0) ? (state.theme === 'dark' ? '#0f172a' : '#ffffff') : (state.theme === 'dark' ? '#1e293b' : '#f8fafc');
                svgBody += `  <rect x="35" y="${ry}" width="${w - 70}" height="32" fill="${rowBg}" />\n`;
                svgBody += `  <circle cx="45" cy="${ry + 16}" r="5" fill="${safeColor(catA.color)}" />\n`;
                svgBody += `  <text x="56" y="${ry + 20}" fill="${state.theme === 'dark' ? '#ffffff' : '#0f172a'}" font-size="11" font-weight="bold">${escapeHtml(catA.name.slice(0, 22))}</text>\n`;

                visualCats.forEach((catB, cIdx) => {
                    const cellX = 200 + cIdx * colW;
                    if (catA.id === catB.id) {
                        const stat = analytics.statsMap.get(catA.id) || { count: 0 };
                        svgBody += `  <rect x="${cellX + 2}" y="${ry + 2}" width="${colW - 4}" height="28" fill="${state.theme === 'dark' ? '#334155' : '#cbd5e1'}" />\n`;
                        svgBody += `  <text x="${cellX + colW / 2}" y="${ry + 20}" fill="${state.theme === 'dark' ? '#ffffff' : '#000000'}" font-size="11" font-weight="bold" text-anchor="middle">${stat.count}</text>\n`;
                    } else {
                        const edge = analytics.matrix[catA.id] && analytics.matrix[catA.id][catB.id];
                        const visible = edge && (!state.analyticsHideZeros || edge.count > 0);
                        if (visible) {
                            const alpha = 0.15 + 0.75 * (edge.metricValue / maxValue);
                            svgBody += `  <rect x="${cellX + 2}" y="${ry + 2}" width="${colW - 4}" height="28" fill="${safeColor(catA.color)}" fill-opacity="${alpha.toFixed(2)}" />\n`;
                            svgBody += `  <text x="${cellX + colW / 2}" y="${ry + 20}" fill="${state.theme === 'dark' ? '#ffffff' : '#0f172a'}" font-size="10" text-anchor="middle">${formatMetric(edge)}</text>\n`;
                        }
                    }
                });
            });
        } else if (type === 'bars') {
            const sorted = [...analytics.categories].sort((a, b) => (analytics.statsMap.get(b.id)?.perThousand || 0) - (analytics.statsMap.get(a.id)?.perThousand || 0)).slice(0, MAX_VISUAL_CATEGORIES);
            const visibleStats = sorted.map(c => analytics.statsMap.get(c.id));
            const maxCount = Math.max(1, ...visibleStats.map(s => s.count));
            graphicHeight = sorted.length * 50 + 20;

            sorted.forEach((cat, rIdx) => {
                const stat = analytics.statsMap.get(cat.id);
                const ry = 115 + rIdx * 50;
                const barW = Math.max(10, (stat.count / maxCount) * (w - 250));

                svgBody += `  <circle cx="45" cy="${ry + 12}" r="5" fill="${safeColor(cat.color)}" />\n`;
                svgBody += `  <text x="56" y="${ry + 16}" fill="${state.theme === 'dark' ? '#ffffff' : '#0f172a'}" font-size="12" font-weight="bold">${escapeHtml(cat.name)}</text>\n`;
                svgBody += `  <text x="${w - 35}" y="${ry + 16}" fill="${state.theme === 'dark' ? '#94a3b8' : '#64748b'}" font-size="11" text-anchor="end">${stat.count} pasajes · ${stat.perThousand.toFixed(1)}/1k pal.</text>\n`;
                svgBody += `  <rect x="35" y="${ry + 24}" width="${barW}" height="10" fill="${safeColor(cat.color)}" rx="3" />\n`;
            });
        } else if (type === 'quality') {
            graphicHeight = 300;
            const cards = [
                ['Cobertura', `${(report.coverage * 100).toFixed(1)}%`, `${report.codedChars} / ${report.totalChars} chars`],
                ['Memos faltantes', String((report.missingMemos || []).length), 'pasajes sin interpretación'],
                ['Categorías incompletas', String((report.incompleteCategories || []).length), 'sin código o criterio'],
                ['Documentos sin codificar', String((report.uncodedDocuments || []).length), 'documentos vacíos'],
                ['Duplicados', String((report.duplicates || []).length), 'codificaciones idénticas'],
                ['Solapamientos', String((report.overlaps || []).length), 'pares superpuestos'],
                ['Categorías 1 solo doc', String((report.singleDocumentCategories || []).length), 'revisar transferibilidad'],
                ['Manual / automática', `${report.manual} / ${report.automatic}`, `${report.totalCodings} codificaciones`]
            ];

            const cardW = (w - 85) / 2;
            cards.forEach((card, idx) => {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                const cx = 35 + col * (cardW + 15);
                const cy = 115 + row * 70;

                svgBody += `  <rect x="${cx}" y="${cy}" width="${cardW}" height="60" fill="${state.theme === 'dark' ? '#1e293b' : '#f8fafc'}" stroke="${state.theme === 'dark' ? '#334155' : '#cbd5e1'}" rx="6" />\n`;
                svgBody += `  <text x="${cx + 12}" y="${cy + 25}" fill="#3b82f6" font-size="18" font-weight="bold">${card[1]}</text>\n`;
                svgBody += `  <text x="${cx + 12}" y="${cy + 42}" fill="${state.theme === 'dark' ? '#ffffff' : '#0f172a'}" font-size="12" font-weight="bold">${card[0]}</text>\n`;
                svgBody += `  <text x="${cx + 12}" y="${cy + 54}" fill="${state.theme === 'dark' ? '#94a3b8' : '#64748b'}" font-size="10">${card[2]}</text>\n`;
            });
        }

        const boxY = 120 + graphicHeight;
        const boxLines = interpText.split('\n');
        const boxHeight = 45 + boxLines.length * 18;
        const totalH = boxY + boxHeight + 40;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${totalH}" viewBox="0 0 ${w} ${totalH}" style="background-color:${state.theme === 'dark' ? '#0b1329' : '#ffffff'}; font-family:sans-serif;">\n`;
        svg += `  <text x="35" y="40" fill="#3b82f6" font-size="20" font-weight="bold">AnalizadorCualiUY Pro</text>\n`;
        svg += `  <text x="35" y="65" fill="${state.theme === 'dark' ? '#ffffff' : '#0f172a'}" font-size="16" font-weight="bold">${chartTypeTitle(type)}</text>\n`;
        svg += `  <text x="35" y="85" fill="${state.theme === 'dark' ? '#94a3b8' : '#64748b'}" font-size="11">Alcance: ${state.analyticsDocumentId ? 'documento' : 'corpus'} | Unidad: ${state.analyticsUnit} | Métrica: ${metricLabel()} | ${new Date().toLocaleDateString('es-UY')}</text>\n`;
        svg += `  <line x1="35" y1="98" x2="${w - 35}" y2="98" stroke="${state.theme === 'dark' ? '#334155' : '#cbd5e1'}" />\n`;

        svg += svgBody;

        svg += `  <rect x="35" y="${boxY}" width="${w - 70}" height="${boxHeight}" fill="${state.theme === 'dark' ? '#1e293b' : '#f8fafc'}" stroke="#3b82f6" stroke-width="2" rx="8" />\n`;
        svg += `  <rect x="35" y="${boxY}" width="5" height="${boxHeight}" fill="#3b82f6" />\n`;
        svg += `  <text x="52" y="${boxY + 24}" fill="#3b82f6" font-size="13" font-weight="bold">💡 Interpretación Analítica Cualitativa${interpretationObj.isCustom ? ' (Nota personalizada)' : ''}</text>\n`;

        boxLines.forEach((line, idx) => {
            svg += `  <text x="52" y="${boxY + 44 + idx * 18}" fill="${state.theme === 'dark' ? '#ffffff' : '#0f172a'}" font-size="11">${escapeHtml(line)}</text>\n`;
        });

        svg += `</svg>`;

        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        universalSaveFile(blob, `AnalizadorCualiUY_Pro_${type}_${new Date().toISOString().slice(0, 10)}.svg`);
    }

    async function exportActiveChartCSV() {
        const analytics = runAnalytics();
        const report = window.AnalyticsEngine.quality(state, { documentId: state.analyticsDocumentId, documentGroup: state.analyticsDocumentGroup });
        const activeInterp = getActiveChartInterpretation(analytics, report);
        const chartType = state.activeChartType || 'network';
        const docLabel = getScopeLabel();

        const rows = [];
        rows.push(['ANALIZADOR CUALIUY PRO - REPORTED DATOS Y SÍNTESIS CUALITATIVA']);
        rows.push(['Fecha y Hora:', new Date().toLocaleString('es-UY')]);
        rows.push(['Tipo de Gráfico:', chartType === 'network' ? 'Red de Coocurrencia' : chartType === 'heatmap' ? 'Matriz Heatmap' : chartType === 'bars' ? 'Barras Proporcionales' : 'Diagnóstico de Calidad']);
        rows.push(['Alcance Analítico:', docLabel]);
        rows.push(['Unidad de Análisis:', state.analyticsUnit]);
        rows.push(['Métrica de Asociación:', state.analyticsMetric]);
        rows.push([]);
        rows.push(['--- INTERPRETACIÓN ANALÍTICA CUALITATIVA ---']);
        rows.push([activeInterp.text]);
        rows.push([]);
        rows.push(['--- DATOS ESTRUCTURADOS DEL GRÁFICO ---']);

        if (chartType === 'network' || chartType === 'heatmap') {
            rows.push(['Categoría Origen', 'Categoría Destino', 'Recuento Coocurrencias', `Métrica (${state.analyticsMetric})`, 'Estado']);
            const edges = (analytics.edges || []).filter(e => !e.unavailable && e.count > 0);
            edges.forEach(e => {
                const src = analytics.categoryMap.get(e.sourceId);
                const tgt = analytics.categoryMap.get(e.targetId);
                if (src && tgt) {
                    rows.push([
                        src.name,
                        tgt.name,
                        e.count,
                        e.metricValue.toFixed(4),
                        'Coocurrencia Activa'
                    ]);
                }
            });
        } else if (chartType === 'bars') {
            rows.push(['Categoría', 'Frecuencia (Citas)', 'Tasa por 1.000 palabras', 'Presencia Documental', 'Proporción Corpus (%)']);
            (analytics.stats || []).forEach(st => {
                rows.push([
                    st.name,
                    st.count,
                    st.ratePerThousandWords.toFixed(2),
                    `${st.docCount} docs`,
                    (st.documentShare * 100).toFixed(1) + '%'
                ]);
            });
        } else if (chartType === 'quality') {
            rows.push(['Métrica de Diagnóstico', 'Valor Numérico', 'Estado Metodológico']);
            rows.push(['Texto Codificado (Caracteres)', report.codedChars, `${((report.codedChars / Math.max(1, report.totalChars)) * 100).toFixed(1)}% cobertura`]);
            rows.push(['Citas Totales', report.totalCodings, 'Codificaciones en corpus']);
            rows.push(['Codificaciones Manuales', report.manual, 'Generadas por el investigador']);
            rows.push(['Codificaciones Automáticas', report.automatic, 'Generadas por palabras clave']);
            rows.push(['Citas sin Memo', report.uncodedMemosCount || 0, report.uncodedMemosCount > 0 ? 'Atención: faltan memos' : 'OK']);
            rows.push(['Documentos sin Codificar', report.uncodedDocsCount || 0, report.uncodedDocsCount > 0 ? 'Documentos limpios' : 'OK']);
        }

        const csvContent = rows.map(row => 
            row.map(cell => {
                let text = String(cell ?? '');
                if (text.startsWith('=') || text.startsWith('+') || text.startsWith('-') || text.startsWith('@')) {
                    text = "'" + text;
                }
                if (text.includes('"') || text.includes(',') || text.includes('\n')) {
                    text = '"' + text.replace(/"/g, '""') + '"';
                }
                return text;
            }).join(',')
        ).join('\r\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const fileName = `AnalizadorCualiUY_${chartType}_${new Date().toISOString().slice(0, 10)}.csv`;
        await universalSaveFile(blob, fileName);
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
            openChartDrilldown(`${a.name} ↔ ${b.name}: ${formatMetric(hitLink)}`, hitLink.evidence, hitLink);
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

        if (query.length > MAX_NORMALIZED_SEARCH_TERM_CHARS) {
            resultsEl.innerHTML = `<div class="empty-state-sm">La consulta supera el máximo de ${MAX_NORMALIZED_SEARCH_TERM_CHARS.toLocaleString()} caracteres.</div>`;
            return;
        }
        const normalizedQuery = normalizeText(query);
        if (!normalizedQuery) {
            resultsEl.innerHTML = '<div class="empty-state-sm">Ingresa un término para buscar.</div>';
            return;
        }

        const hits = [];
        let truncated = false;

        for (const doc of state.documents) {
            const remaining = MAX_GLOBAL_SEARCH_RESULTS - hits.length;
            const matches = findNormalizedMatches(doc.content, query, remaining + 1);
            for (const match of matches) {
                if (hits.length >= MAX_GLOBAL_SEARCH_RESULTS) {
                    truncated = true;
                    break;
                }
                const snippetStart = Math.max(0, match.start - 40);
                const snippetEnd = Math.min(doc.content.length, match.end + 40);
                hits.push({
                    docId: doc.id,
                    docTitle: doc.title,
                    snippet: doc.content.slice(snippetStart, snippetEnd),
                    charPos: match.start
                });
            }
            if (truncated) break;
        }

        if (hits.length === 0) {
            resultsEl.innerHTML = `<div class="empty-state-sm">Sin coincidencias para "${escapeHtml(query)}".</div>`;
            return;
        }

        if (truncated) {
            const notice = document.createElement('div');
            notice.className = 'empty-state-sm';
            notice.textContent = `Se muestran las primeras ${MAX_GLOBAL_SEARCH_RESULTS.toLocaleString()} coincidencias. Acota la consulta para buscar las restantes.`;
            resultsEl.appendChild(notice);
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
                performInTextSearch(query, hit.charPos);
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

    function initIntegratedUserManual() {
        const modal = document.getElementById('modal-user-manual');
        const openBtn = document.getElementById('btn-open-manual');
        if (!modal) return;

        const navBtns = modal.querySelectorAll('.manual-nav-btn');
        const contentPane = document.getElementById('manual-content-pane');
        const searchInput = document.getElementById('manual-search-input');
        const downloadPdfBtn = document.getElementById('btn-manual-download-pdf');

        function openManual() {
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
            if (searchInput) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
                searchInput.focus();
            }
        }

        function closeManual() {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        }

        if (openBtn) {
            openBtn.onclick = openManual;
        }

        modal.querySelectorAll('.manual-close-btn').forEach(btn => {
            btn.onclick = closeManual;
        });

        modal.onclick = (e) => {
            if (e.target === modal) closeManual();
        };

        // Navigation clicks
        navBtns.forEach(btn => {
            btn.onclick = () => {
                const targetId = btn.dataset.target;
                const targetSec = document.getElementById(targetId);
                if (targetSec && contentPane) {
                    navBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            };
        });

        // Search filter in manual
        if (searchInput) {
            searchInput.oninput = () => {
                const query = searchInput.value.trim().toLowerCase();
                const sections = modal.querySelectorAll('.manual-section');
                sections.forEach(sec => {
                    if (!query) {
                        sec.style.display = '';
                        return;
                    }
                    const text = sec.textContent.toLowerCase();
                    sec.style.display = text.includes(query) ? '' : 'none';
                });
            };
        }

        // PDF Download
        if (downloadPdfBtn) {
            downloadPdfBtn.onclick = async () => {
                try {
                    const response = await fetch('MANUAL-METODOLOGICO-ANALIZADORCUALIUY-PRO.pdf');
                    if (!response.ok) throw new Error(`Estado ${response.status}`);
                    const blob = await response.blob();
                    universalSaveFile(blob, 'Manual_Metodologico_AnalizadorCualiUY_Pro.pdf');
                } catch (err) {
                    alert('Puedes consultar el manual directamente en esta ventana o abrir el PDF generado en la carpeta del programa.');
                }
            };
        }
    }

    function setupEventListeners() {
        initOperationalGuideWizard();
        initIntegratedUserManual();
        const licenseButton = document.getElementById('btn-view-license-file');
        if (licenseButton) licenseButton.onclick = async () => {
            const content = document.getElementById('eula-content');
            content.textContent = 'Cargando EULA…';
            try {
                const response = await fetch('EULA.txt');
                if (!response.ok) throw new Error(`Estado ${response.status}`);
                content.textContent = await response.text();
            } catch (error) {
                content.textContent = `No se pudo abrir el EULA incluido.\n\n${error.message || error}`;
            }
            document.getElementById('modal-eula').style.display = 'flex';
        };
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
            const project = parseAndValidateProject(raw);
            const canonical = ProjectIntegrity.createProjectEnvelope(project, 'pro', APP_VERSION);
            if (utf8ByteLength(JSON.stringify(canonical)) > runtimeCapabilities.maxStateBytes) {
                throw new Error(`El proyecto validado supera el máximo de ${Math.floor(runtimeCapabilities.maxStateBytes / 1024 / 1024)} MiB y no puede guardarse.`);
            }
            applyValidatedProject(project);
            storageWritesBlocked = false;
            storageRecoveryMessage = '';
            recoverySaveWarningShown = false;
            resetTransientControls();
            syncAnalyticsControlsFromState();
            if (!saveToStorage()) {
                throw new Error('El proyecto importado no pudo persistirse; se restauró el proyecto anterior.');
            }
            checkNoticeBanner();
            renderDocumentList();
            refreshAnalyticsDocumentFilter();
            renderCodebookList();
            setActiveDocument(state.documents.length > 0 ? state.documents[0].id : null);
            renderDecoderList();
            updateQualitativeCharts();
            alert(`✨ ¡Proyecto "${fileName}" cargado exitosamente!`);
        }

        async function processSelectedFiles(files) {
            if (!files || files.length === 0) return;
            const selected = Array.from(files);
            let importedDocuments = 0;
            if (selected.length > runtimeCapabilities.maxFilesPerSelection) {
                throw new Error(`El máximo por selección es de ${runtimeCapabilities.maxFilesPerSelection} archivos.`);
            }
            const extensionOf = file => (file.extension || (file.name || '').split('.').pop() || '').toLowerCase();
            const projectFiles = selected.filter(file => extensionOf(file) === 'json');
            if (projectFiles.length && selected.length !== 1) {
                throw new Error('Un proyecto JSON debe abrirse solo. No puede mezclarse con documentos en la misma selección.');
            }
            if (storageWritesBlocked && projectFiles.length === 0) {
                throw new Error('El guardado está detenido para proteger las copias existentes. Abre un proyecto JSON válido, crea uno nuevo o carga la muestra antes de importar documentos.');
            }
            const browserFiles = selected.filter(file => Number.isFinite(file.size));
            const totalBrowserBytes = browserFiles.reduce((sum, file) => sum + file.size, 0);
            if (browserFiles.some(file => file.size > runtimeCapabilities.maxFileBytes) || totalBrowserBytes > runtimeCapabilities.maxSelectionBytes) {
                throw new Error(`La selección supera los límites de ${Math.floor(runtimeCapabilities.maxFileBytes / 1024 / 1024)} MiB por archivo o ${Math.floor(runtimeCapabilities.maxSelectionBytes / 1024 / 1024)} MiB en total.`);
            }

            let nativeSelectionBytes = 0;

            for (const file of selected) {
                const fileName = file.name || 'Documento';
                const ext = extensionOf(file);
                // Los resultados del comando Tauri siempre incluyen extension/content/path.
                // No dependemos de que Vec<u8> llegue como Array o Uint8Array.
                const isNativeFile = typeof file.extension === 'string'
                    && typeof file.content === 'string'
                    && typeof file.path === 'string';
                try {
                    if (isNativeFile) {
                        const contentBytes = utf8ByteLength(file.content);
                        nativeSelectionBytes += contentBytes;
                        if (contentBytes > runtimeCapabilities.maxExtractedTextBytes || nativeSelectionBytes > runtimeCapabilities.maxSelectionBytes) {
                            throw new Error('El texto extraído supera los límites de importación configurados.');
                        }
                    }
                    if (ext === 'json') {
                        loadProjectJson(isNativeFile ? file.content : await file.text(), fileName);
                    } else if (ext === 'txt') {
                        if (addDocumentToState(fileName, isNativeFile ? file.content : await file.text())) importedDocuments++;
                    } else if (ext === 'docx') {
                        if (isNativeFile) {
                            if (addDocumentToState(fileName, file.content)) importedDocuments++;
                        } else if (window.mammoth) {
                            const arrayBuffer = await file.arrayBuffer();
                            validateDocxArchiveSafety(arrayBuffer);
                            const result = await window.mammoth.extractRawText({ arrayBuffer });
                            const extracted = String(result.value || '').trim();
                            if (!extracted) throw new Error('El DOCX no contiene texto extraíble.');
                            if (addDocumentToState(fileName, extracted)) importedDocuments++;
                        } else {
                            throw new Error('El lector DOCX no está disponible.');
                        }
                    } else if (ext === 'pdf') {
                        if (isNativeFile) {
                            if (!file.content.trim()) throw new Error('El PDF no contiene texto extraíble. Si es un documento escaneado, aplícale OCR antes de importarlo.');
                            if (addDocumentToState(fileName, file.content)) importedDocuments++;
                        } else {
                            const pdfjs = window.pdfjsLib || (window.pdfjsReady ? await window.pdfjsReady : null);
                            if (!pdfjs) throw new Error(`El lector PDF no está disponible${window.pdfjsLoadError ? `: ${window.pdfjsLoadError.message || window.pdfjsLoadError}` : '.'}`);
                            const bytes = new Uint8Array(await file.arrayBuffer());
                            const vendorBase = new URL('./public/vendor/', window.location.href);
                            let loadingTask = null;
                            let pdf = null;
                            let fullText = '';
                            try {
                                loadingTask = pdfjs.getDocument({
                                    data: bytes,
                                    cMapUrl: new URL('cmaps/', vendorBase).href,
                                    cMapPacked: true,
                                    standardFontDataUrl: new URL('standard_fonts/', vendorBase).href,
                                    wasmUrl: new URL('wasm/', vendorBase).href
                                });
                                pdf = await loadingTask.promise;
                                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                                    const page = await pdf.getPage(pageNum);
                                    const textContent = await page.getTextContent();
                                    fullText += textContent.items.map(item => item.str).join(' ') + '\n\n';
                                    if (utf8ByteLength(fullText) > runtimeCapabilities.maxExtractedTextBytes) {
                                        throw new Error('El texto extraído del PDF supera el límite permitido.');
                                    }
                                }
                                fullText = fullText.trim();
                                if (!fullText) throw new Error('El PDF no contiene texto extraíble. Si es un documento escaneado, aplícale OCR antes de importarlo.');
                                if (addDocumentToState(fileName, fullText)) importedDocuments++;
                            } finally {
                                if (pdf && typeof pdf.cleanup === 'function') {
                                    try { pdf.cleanup(); } catch (_) { /* sin acción */ }
                                }
                                if (loadingTask && typeof loadingTask.destroy === 'function') {
                                    try { await loadingTask.destroy(); } catch (_) { /* sin acción */ }
                                }
                            }
                        }
                    } else {
                        throw new Error(`Formato no compatible: .${ext}`);
                    }
                } catch (err) {
                    console.error(`Error importing ${fileName}:`, err);
                    alert(`Error al importar "${fileName}": ${err.message || err}`);
                }
            }

            if (importedDocuments > 0) {
                renderDecoderList();
                updateQualitativeCharts();
                alert(`Se incorporaron ${importedDocuments} ${importedDocuments === 1 ? 'documento' : 'documentos'} al proyecto.`);
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
                const files = await invoke('native_open_files', { filterType: 'documents' });
                await processSelectedFiles(files);
            } catch (error) {
                alert(`No se pudieron importar los documentos: ${error.message || error}`);
            }
        };
        if (btnImportFiles) btnImportFiles.onclick = openImportDialog;
        if (btnImportEmpty) btnImportEmpty.onclick = openImportDialog;
        if (btnAddDocument) btnAddDocument.onclick = openImportDialog;

        const btnOpenProject = document.getElementById('btn-open-project');
        if (btnOpenProject && projectInput && getTauriInvoke()) {
            projectInput.style.pointerEvents = 'none';
            btnOpenProject.onclick = async () => {
                try {
                    const files = await getTauriInvoke()('native_open_files', { filterType: 'json' });
                    await processSelectedFiles(files);
                } catch (error) {
                    alert(`No se pudo abrir el proyecto: ${error.message || error}`);
                }
            };
        }


        document.getElementById('btn-open-matrix').onclick = () => {
            renderCategoricalMatrixModal();
        };
        document.getElementById('btn-export-matrix-csv').onclick = exportCategoricalMatrixCSV;
        document.getElementById('btn-open-summary-matrix').onclick = openSummaryMatrixModal;
        document.getElementById('btn-export-summary-csv').onclick = exportSummaryMatrixCSV;
        document.getElementById('btn-open-advanced-query').onclick = openAdvancedQueryModal;
        document.getElementById('btn-run-advanced-query').onclick = runAdvancedQuery;
        document.getElementById('btn-export-codebook').onclick = exportCodebookCSV;
        document.getElementById('btn-export-audit-log').onclick = exportAuditLogCSV;
        document.getElementById('btn-open-project-templates').onclick = openProjectTemplatesModal;
        document.getElementById('btn-export-executive-report').onclick = openReportBuilder;
        document.getElementById('btn-export-report-docx').onclick = () => exportAnalyticalReport('docx');
        document.getElementById('btn-export-report-pdf').onclick = () => exportAnalyticalReport('pdf');
        document.querySelectorAll('#modal-report-builder input, #modal-report-builder textarea').forEach(control => {
            control.addEventListener('input', updateReportPreview);
            control.addEventListener('change', updateReportPreview);
        });

        // PDF & DOCX Export Buttons
        document.getElementById('btn-export-doc-pdf').onclick = openExportPdfModal;
        document.getElementById('btn-confirm-pdf-export').onclick = generateCodedDocumentPDF;
        if (document.getElementById('btn-export-docx')) {
            document.getElementById('btn-export-docx').onclick = openExportDocxModal;
        }
        if (document.getElementById('btn-confirm-docx-export')) {
            document.getElementById('btn-confirm-docx-export').onclick = generateCodedDocumentDOCX;
        }

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
            'analytics-category-mode': { key: 'analyticsCategoryMode', parse: value => value },
            'analytics-node-size': { key: 'analyticsNodeSize', parse: value => value },
            'cooccurrence-unit': { key: 'analyticsUnit', parse: value => value },
            'association-metric': { key: 'analyticsMetric', parse: value => value },
            'cooccurrence-window': { key: 'analyticsWindow', parse: value => Number(value) },
            'analytics-document-filter': { key: 'analyticsDocumentId', parse: value => value },
            'analytics-group-filter': { key: 'analyticsDocumentGroup', parse: value => value },
            'analytics-threshold': { key: 'analyticsThreshold', parse: value => Number(value) }
        };
        Object.entries(analyticsControls).forEach(([id, config]) => {
            const control = document.getElementById(id);
            control.onchange = () => {
                const overrides = { [config.key]: config.parse(control.value) };
                const nextMetric = overrides.analyticsMetric || state.analyticsMetric;
                const nextThreshold = config.key === 'analyticsThreshold' ? overrides.analyticsThreshold : state.analyticsThreshold;
                overrides.analyticsThreshold = normalizedAnalyticsThreshold(nextThreshold, nextMetric);
                if (!commitProjectMutation(overrides, 'No se pudo actualizar la configuración analítica')) {
                    syncAnalyticsControlsFromState();
                    return;
                }
                syncAnalyticsControlsFromState();
                recalculateGraphLayout();
                updateQualitativeCharts();
                closeChartDrilldown();
            };
        });
        document.getElementById('cooccurrence-unit').value = state.analyticsUnit;
        document.getElementById('analytics-category-mode').value = state.analyticsCategoryMode;
        document.getElementById('analytics-node-size').value = state.analyticsNodeSize;
        document.getElementById('association-metric').value = state.analyticsMetric;
        document.getElementById('cooccurrence-window').value = String(state.analyticsWindow);
        document.getElementById('analytics-threshold').value = String(state.analyticsThreshold);
        document.getElementById('analytics-hide-zeros').checked = state.analyticsHideZeros;
        document.getElementById('analytics-hide-zeros').onchange = event => {
            const checked = event.target.checked;
            if (!commitProjectMutation({ analyticsHideZeros: checked }, 'No se pudo actualizar la configuración analítica')) {
                event.target.checked = state.analyticsHideZeros;
                return;
            }
            updateQualitativeCharts();
        };
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
            const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
            if (!commitProjectMutation({ theme: nextTheme }, 'No se pudo cambiar el tema')) return;
            applyTheme();
            updateQualitativeCharts();
        };

        function addDocumentToState(title, content) {
            const safeTitle = requireString(String(title || '').trim(), 'Título del documento', FIELD_LIMITS.documentTitle);
            const safeContent = requireString(content, 'Contenido del documento', projectLimits().maxDocumentChars, true);
            const contentBytes = utf8ByteLength(safeContent);
            if (contentBytes > runtimeCapabilities.maxExtractedTextBytes) {
                throw new Error(`El texto extraído supera el máximo de ${Math.floor(runtimeCapabilities.maxExtractedTextBytes / 1024 / 1024)} MiB.`);
            }
            if (state.documents.length >= projectLimits().maxDocuments) {
                throw new Error(`El proyecto alcanzó el máximo de ${projectLimits().maxDocuments.toLocaleString()} documentos.`);
            }
            const newDoc = {
                id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                title: safeTitle,
                content: safeContent,
                wordCount: countWords(safeContent),
                profile: normalizeDocumentProfile({}, 'profile')
            };
            const proposedDocuments = [...state.documents, newDoc];
            const proposedAuditLog = auditLogWith('Documento incorporado', safeTitle);
            if (!commitProjectMutation({ documents: proposedDocuments, auditLog: proposedAuditLog }, 'No se pudo incorporar el documento')) return false;
            renderDocumentList();
            if (!state.activeDocId) setActiveDocument(newDoc.id);

            const autoCodeResult = autoCodeBatch([newDoc], state.categories, `${safeTitle} · importación`);
            if (autoCodeResult.truncated) {
                alert(`El documento se revisó automáticamente en ${autoCodeResult.processedPairs.toLocaleString()} combinaciones por el límite de escala. Puedes analizar las restantes desde el libro de códigos.`);
            }
            setActiveDocument(newDoc.id);
            renderCodebookList();
            return true;
        }

        // Load Sample Button
        document.getElementById('btn-load-sample').onclick = () => {
            if (!confirm('¿Deseas reemplazar el proyecto actual por la muestra precargada? Los cambios no exportados del espacio de trabajo actual se perderán.')) return;
            loadSampleData({ persist: true });
            renderDocumentList();
            refreshAnalyticsDocumentFilter();
            renderCodebookList();
            setActiveDocument(state.documents.length > 0 ? state.documents[0].id : null);
            renderDecoderList();
            updateQualitativeCharts();
        };

        // Save Project (JSON)
        document.getElementById('btn-save-project').onclick = async () => {
            try {
                const projectJson = serializeProjectForStorage(true);
                const blob = new Blob([projectJson], { type: 'application/json;charset=utf-8;' });
                await universalSaveFile(blob, `AnalizadorCualiUY_Pro_Proyecto_${new Date().toISOString().slice(0, 10)}.json`);
            } catch (error) {
                alert(`No se pudo exportar el proyecto: ${error.message || error}`);
            }
        };

        // Export CSV
        document.getElementById('btn-export-csv').onclick = exportToCSV;

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
        document.getElementById('btn-export-png').onclick = exportActiveChartPNG;
        document.getElementById('btn-export-svg').onclick = exportActiveChartSVG;
        const btnExportChartCsv = document.getElementById('btn-export-chart-csv');
        if (btnExportChartCsv) btnExportChartCsv.onclick = exportActiveChartCSV;
        document.getElementById('btn-reset-network').onclick = () => {
            recalculateGraphLayout();
            updateNetworkCanvas();
        };

        // Chart Interpretation Editor Event Handlers
        const btnEditInterp = document.getElementById('btn-edit-interpretation');
        if (btnEditInterp) {
            btnEditInterp.onclick = () => {
                const editorEl = document.getElementById('chart-interpretation-editor');
                const textareaEl = document.getElementById('chart-interpretation-textarea');
                if (!editorEl || !textareaEl) return;
                const isHidden = editorEl.style.display === 'none';
                if (isHidden) {
                    const analytics = getAnalytics();
                    const activeInterp = getActiveChartInterpretation(analytics);
                    textareaEl.value = activeInterp.text;
                    editorEl.style.display = 'block';
                } else {
                    editorEl.style.display = 'none';
                }
            };
        }

        const btnSaveInterp = document.getElementById('btn-save-interpretation');
        if (btnSaveInterp) {
            btnSaveInterp.onclick = () => {
                const editorEl = document.getElementById('chart-interpretation-editor');
                const textareaEl = document.getElementById('chart-interpretation-textarea');
                if (!textareaEl) return;
                const type = state.activeChartType || 'network';
                if (!state.customChartInterpretations) state.customChartInterpretations = {};
                state.customChartInterpretations[type] = textareaEl.value.trim();
                if (editorEl) editorEl.style.display = 'none';
                saveToStorage();
                updateQualitativeCharts();
            };
        }

        const btnResetInterp = document.getElementById('btn-reset-interpretation');
        if (btnResetInterp) {
            btnResetInterp.onclick = () => {
                const editorEl = document.getElementById('chart-interpretation-editor');
                const type = state.activeChartType || 'network';
                if (state.customChartInterpretations) {
                    state.customChartInterpretations[type] = '';
                }
                if (editorEl) editorEl.style.display = 'none';
                saveToStorage();
                updateQualitativeCharts();
            };
        }

        const btnToggleInterp = document.getElementById('btn-toggle-interpretation');
        const btnCloseInterp = document.getElementById('btn-close-interpretation');
        const contentWrapper = document.getElementById('chart-interpretation-content-wrapper');

        if (btnToggleInterp && contentWrapper) {
            btnToggleInterp.onclick = () => {
                const isHidden = contentWrapper.style.display === 'none';
                contentWrapper.style.display = isHidden ? 'block' : 'none';
                btnToggleInterp.textContent = isHidden ? '👁️ Ocultar' : '💡 Mostrar interpretación';
            };
        }

        if (btnCloseInterp && contentWrapper) {
            btnCloseInterp.onclick = () => {
                contentWrapper.style.display = 'none';
                if (btnToggleInterp) btnToggleInterp.textContent = '💡 Mostrar interpretación';
            };
        }

        // Methodological Hover Explanations for Analytics Controls
        function setupAnalyticsOptionHoverHelp() {
            const helpTextEl = document.getElementById('analytics-option-help-text');
            if (!helpTextEl) return;

            const defaultText = 'Pasa el cursor sobre cualquier opción (unidad, métrica, nivel, umbral) para ver qué implica metodológicamente y qué aporta a tu análisis.';

            const optionDescriptions = {
                // Unidades
                'paragraph': 'Párrafo | Qué implica: Agrupa citas dentro del mismo párrafo. Qué aporta: Evalúa convergencia cualitativa en bloques narrativos continuos (unidad estándar recomendada).',
                'sentence': 'Oración | Qué implica: Limita la asociación a la misma frase u oración. Qué aporta: Mide máxima proximidad lingüística e inmediatez sintáctica.',
                'window': 'Ventana de palabras | Qué implica: Evalúa contigüidad en ±N palabras consecutivas. Qué aporta: Analiza fluidez temática sin depender de los saltos de párrafo del autor.',
                'overlap': 'Solapamiento directo | Qué implica: Exige coincidencia exacta de caracteres o citas superpuestas. Qué aporta: Revela pasajes donde dos categorías fueron codificadas simultáneamente.',
                'document': 'Documento completo | Qué implica: Evalúa co-presencia en todo el caso o entrevista. Qué aporta: Mide coexistencia temática global sin requerir cercanía física estricta.',
                
                // Métricas
                'jaccard': 'Índice Jaccard (0 a 1) | Qué implica: Mide la proporción de solapamiento respecto al total combinado. Qué aporta: Normaliza la asociación eliminando el sesgo de categorías ultra frecuentes.',
                'count': 'Recuento | Qué implica: Frecuencia absoluta de pasajes compartidos. Qué aporta: Muestra el volumen bruto directo de evidencia cualitativa entre dos conceptos.',
                'documentShare': '% Documentos | Qué implica: Porcentaje de documentos donde coexisten ambas categorías. Qué aporta: Mide la representatividad y saturación de la relación en el corpus.',

                // Nivel categorial
                'main': 'Categorías principales | Qué implica: Agrupa subcategorías en sus padres. Qué aporta: Genera un mapa conceptual macro y sintético ideal para informes ejecutivos o finales.',
                'all': 'Árbol completo | Qué implica: Muestra todas las subcategorías individualmente. Qué aporta: Permite un análisis cualitativo micro de alta resolución discursiva.',

                // Tamaño de nodos
                'node-documentShare': 'Presencia documental | Qué implica: El tamaño del nodo refleja el % de casos en que aparece. Qué aporta: Identifica categorías transversales a la muestra.',
                'node-count': 'Frecuencia absoluta | Qué implica: El tamaño del nodo refleja el número total de pasajes. Qué aporta: Destaca categorías con mayor riqueza discursiva citada.',
                'node-perThousand': 'Por 1.000 palabras | Qué implica: Frecuencia ajustada por la longitud total. Qué aporta: Elimina el sesgo de extensión entre documentos largos y cortos.',

                // Ventana
                'win-50': 'Ventana ±50 palabras | Qué implica: Proximidad estrecha de ~3 oraciones. Qué aporta: Captura asociación cualitativa de alta inmediatez.',
                'win-100': 'Ventana ±100 palabras | Qué implica: Proximidad media de ~1 párrafo corto. Qué aporta: Equilibrio ideal entre contexto discursivo y relevancia temática.',
                'win-250': 'Ventana ±250 palabras | Qué implica: Proximidad amplia de ~1 página. Qué aporta: Captura relaciones temáticas en discusiones extensas.',

                // Diseños de grafo
                'layout-circular': 'Circular Radial | Qué implica: Distribuye los nodos en una circunferencia. Qué aporta: Facilita comparar la densidad de conexiones entre todas las categorías.',
                'layout-grid': 'Distribución Grilla | Qué implica: Organiza las categorías en cuadrícula uniforme. Qué aporta: Ideal para inspección visual estructurada sin solapamientos.',
                'layout-force': 'Red Libre (Fuerza) | Qué implica: Algoritmo de atracción/repulsión física. Qué aporta: Atrae categorías con alta coocurrencia formando clusters temáticos visuales.',

                // Pestañas
                'chart-type-network': 'Red / Grafo | Qué implica: Red relacional interactiva. Qué aporta: Visualiza la estructura del sistema categorial y núcleos cualitativos centrales.',
                'chart-type-heatmap': 'Coocurrencias (Heatmap) | Qué implica: Matriz cruzada de intensidad. Qué aporta: Permite auditar cuantitativamente cada par de categorías.',
                'chart-type-bars': 'Comparación de Barras | Qué implica: Gráfico de barras normalizadas. Qué aporta: Muestra densidad por 1.000 palabras y presencia documental.',
                'chart-type-quality': 'Calidad de Codificación | Qué implica: Tablero de auditoría metodológica. Qué aporta: Garantiza la validez cualitativa (cobertura, memos, duplicados).'
            };

            function setHelpText(key) {
                if (optionDescriptions[key]) {
                    helpTextEl.textContent = optionDescriptions[key];
                } else {
                    helpTextEl.textContent = defaultText;
                }
            }

            document.querySelectorAll('.analytics-toolbar select, .analytics-toolbar input, .btn-chart-type, #graph-layout-select').forEach(element => {
                element.addEventListener('mouseenter', () => {
                    let key = element.value || element.id;
                    if (element.id === 'analytics-node-size') key = 'node-' + element.value;
                    if (element.id === 'cooccurrence-window') key = 'win-' + element.value;
                    if (element.id === 'graph-layout-select') key = 'layout-' + element.value;
                    setHelpText(key);
                });
                element.addEventListener('change', () => {
                    let key = element.value || element.id;
                    if (element.id === 'analytics-node-size') key = 'node-' + element.value;
                    if (element.id === 'cooccurrence-window') key = 'win-' + element.value;
                    if (element.id === 'graph-layout-select') key = 'layout-' + element.value;
                    setHelpText(key);
                });
                element.addEventListener('mouseleave', () => {
                    helpTextEl.textContent = defaultText;
                });
            });

            document.querySelectorAll('.analytics-toolbar option').forEach(opt => {
                opt.addEventListener('mouseenter', () => {
                    let key = opt.value;
                    const parent = opt.parentElement;
                    if (parent && parent.id === 'analytics-node-size') key = 'node-' + opt.value;
                    if (parent && parent.id === 'cooccurrence-window') key = 'win-' + opt.value;
                    setHelpText(key);
                });
            });
        }
        setupAnalyticsOptionHoverHelp();

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
        const btnQuickExclude = document.getElementById('btn-quick-exclude');
        if (btnQuickExclude) btnQuickExclude.onclick = excludeSelectedRange;
        const btnQuickLift = document.getElementById('btn-quick-lift-exclude');
        if (btnQuickLift) btnQuickLift.onclick = liftExclusionForSelectedRange;

        // Corpus Global Exclusion Modal Buttons
        const btnOpenCorpusEx = document.getElementById('btn-open-corpus-exclusion');
        if (btnOpenCorpusEx) btnOpenCorpusEx.onclick = openCorpusExclusionModal;

        const btnCloseCorpusEx = document.getElementById('btn-close-corpus-exclusion');
        if (btnCloseCorpusEx) btnCloseCorpusEx.onclick = () => {
            const m = document.getElementById('modal-corpus-exclusion');
            if (m) m.style.display = 'none';
        };

        const btnApplyCorpusEx = document.getElementById('btn-apply-corpus-exclusion');
        if (btnApplyCorpusEx) {
            btnApplyCorpusEx.onclick = () => {
                const termsInput = document.getElementById('corpus-exclusion-terms');
                const scopeRadio = document.querySelector('input[name="corpus-exclusion-scope"]:checked');
                const terms = termsInput ? termsInput.value : '';
                const scope = scopeRadio ? scopeRadio.value : 'all';
                applyGlobalCorpusExclusion(terms, scope);
            };
        }

        const btnClearAllEx = document.getElementById('btn-clear-all-exclusions');
        if (btnClearAllEx) btnClearAllEx.onclick = clearAllCorpusExclusions;

        document.querySelectorAll('.preset-exclusion').forEach(btn => {
            btn.onclick = () => {
                const termsInput = document.getElementById('corpus-exclusion-terms');
                if (!termsInput) return;
                const termsToAdd = btn.dataset.terms || '';
                if (termsInput.value.trim()) {
                    termsInput.value = `${termsInput.value.trim()}, ${termsToAdd}`;
                } else {
                    termsInput.value = termsToAdd;
                }
            };
        });

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

        document.getElementById('btn-edit-document-profile').onclick = openDocumentProfileModal;
        document.getElementById('btn-save-document-profile').onclick = saveDocumentProfile;
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.onclick = () => {
                document.getElementById('modal-category').style.display = 'none';
                document.getElementById('modal-memo').style.display = 'none';
                document.getElementById('modal-credits').style.display = 'none';
                document.getElementById('modal-eula').style.display = 'none';
                document.getElementById('modal-matrix').style.display = 'none';
                document.getElementById('modal-export-pdf').style.display = 'none';
                document.getElementById('modal-export-docx').style.display = 'none';
                document.getElementById('modal-report-builder').style.display = 'none';
                document.getElementById('modal-document-profile').style.display = 'none';
                document.getElementById('modal-summary-matrix').style.display = 'none';
                document.getElementById('modal-advanced-query').style.display = 'none';
                document.getElementById('modal-project-templates').style.display = 'none';
                document.getElementById('modal-import-codebook').style.display = 'none';
                const corpusExModal = document.getElementById('modal-corpus-exclusion');
                if (corpusExModal) corpusExModal.style.display = 'none';
                const citationModal = document.getElementById('modal-citation');
                if (citationModal) citationModal.style.display = 'none';
                memoEditingCodingId = null;
            };
        });

        // Citation Modal Handlers
        let activeCitationFormat = 'apa7';

        function getProductCitationInfo() {
            let editionName = 'Pro';
            if (typeof window !== 'undefined' && window.location && window.location.href.includes('educativa')) {
                editionName = 'Educativa';
            } else if (typeof document !== 'undefined' && document.title && document.title.includes('Educativa')) {
                editionName = 'Educativa';
            } else if (typeof document !== 'undefined' && document.title && document.title.includes('Beta')) {
                editionName = 'Beta';
            }

            const fullProductName = `AnalizadorCualiUY ${editionName}`;
            const year = '2026';
            const version = '1.0.4';
            const url = 'https://analizadorcuali.uy';

            return {
                apa7: `Hernández, S. (${year}). ${fullProductName} (Versión ${version}) [Software de computación]. ${url}`,
                bibtex: `@software{Hernandez_${fullProductName.replace(/\s+/g, '_')}_${year},\n  author = {Hernández, Santiago},\n  title = {${fullProductName}: Software de Análisis Cualitativo Local y Confidencial},\n  version = {${version}},\n  year = {${year}},\n  url = {${url}}\n}`,
                chicago: `Hernández, Santiago. ${year}. ${fullProductName}. Versión ${version}. Software de computación. ${url}.`,
                mla9: `Hernández, Santiago. ${fullProductName}. Versión ${version}, ${year}, ${url}.`,
                iso690: `HERNÁNDEZ, Santiago, ${year}. ${fullProductName} [software]. Versión ${version}. Disponible en: ${url}`
            };
        }

        function updateCitationTextBox() {
            const box = document.getElementById('citation-text-box');
            if (!box) return;
            const info = getProductCitationInfo();
            box.value = info[activeCitationFormat] || info.apa7;
        }

        function openCitationModal() {
            updateCitationTextBox();
            const citationModal = document.getElementById('modal-citation');
            if (citationModal) citationModal.style.display = 'flex';
        }

        const btnCiteSoftware = document.getElementById('btn-cite-software');
        if (btnCiteSoftware) btnCiteSoftware.onclick = openCitationModal;

        const btnCiteFromCredits = document.getElementById('btn-open-citation-from-credits');
        if (btnCiteFromCredits) btnCiteFromCredits.onclick = openCitationModal;

        document.querySelectorAll('.btn-citation-format').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.btn-citation-format').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeCitationFormat = btn.dataset.format || 'apa7';
                updateCitationTextBox();
            };
        });

        const btnCopyCitation = document.getElementById('btn-copy-citation');
        if (btnCopyCitation) {
            btnCopyCitation.onclick = () => {
                const box = document.getElementById('citation-text-box');
                const toast = document.getElementById('citation-copied-toast');
                if (!box) return;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(box.value);
                } else {
                    box.select();
                    document.execCommand('copy');
                }
                if (toast) {
                    toast.style.opacity = '1';
                    setTimeout(() => { toast.style.opacity = '0'; }, 2500);
                }
            };
        }

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
            const excludeKeywordsRaw = document.getElementById('cat-exclude-keywords') ? document.getElementById('cat-exclude-keywords').value.trim() : '';
            const color = document.getElementById('cat-color').value;
            const desc = document.getElementById('cat-desc').value.trim();
            const criteria = document.getElementById('cat-criteria').value.trim();

            if (!code) {
                code = generateSuggestedCode(name, parentIdVal);
            }

            const keywordsArr = keywordsRaw ? keywordsRaw.split(',').map(k => k.trim()).filter(Boolean) : [];
            const excludeKeywordsArr = excludeKeywordsRaw ? excludeKeywordsRaw.split(',').map(k => k.trim()).filter(Boolean) : [];
            const proposedParentId = parentIdVal === 'NONE' ? null : parentIdVal;
            const proposedId = editId || `cat-${Date.now()}`;
            const proposedCategory = {
                id: proposedId,
                parentId: proposedParentId,
                code,
                name,
                color,
                keywords: keywordsArr,
                excludeKeywords: excludeKeywordsArr,
                description: desc,
                criteria
            };
            const proposedCategories = editId
                ? state.categories.map(category => category.id === editId ? proposedCategory : category)
                : [...state.categories, proposedCategory];
            try {
                requireString(name, 'Nombre de categoría', FIELD_LIMITS.categoryName);
                requireString(code, 'Código de categoría', FIELD_LIMITS.categoryCode, true);
                requireString(keywordsRaw, 'Términos de búsqueda', FIELD_LIMITS.categoryKeywordsText, true);
                requireString(excludeKeywordsRaw, 'Términos de exclusión', FIELD_LIMITS.categoryExcludeKeywordsText, true);
                requireString(desc, 'Descripción de categoría', FIELD_LIMITS.categoryDescription, true);
                requireString(criteria, 'Criterios de categoría', FIELD_LIMITS.categoryCriteria, true);
                if (keywordsArr.length > 10000) throw new Error('La categoría supera el máximo de 10.000 términos de búsqueda.');
                if (excludeKeywordsArr.length > 10000) throw new Error('La categoría supera el máximo de 10.000 términos de exclusión.');
                keywordsArr.forEach((keyword, index) => requireString(keyword, `Término ${index + 1}`, FIELD_LIMITS.categoryKeyword, true));
                excludeKeywordsArr.forEach((keyword, index) => requireString(keyword, `Término de exclusión ${index + 1}`, FIELD_LIMITS.categoryExcludeKeyword, true));
                if (editId && ProjectIntegrity.wouldCreateCycle(state.categories, editId, proposedParentId)) {
                    throw new Error('La categoría no puede depender de sí misma ni de una descendiente.');
                }
                ProjectIntegrity.validateHierarchy(proposedCategories);
                const candidatePayload = createProjectPayload({ categories: proposedCategories });
                validateProjectObject(candidatePayload);
                if (utf8ByteLength(JSON.stringify(candidatePayload)) > runtimeCapabilities.maxStateBytes) {
                    throw new Error('La categoría haría que el proyecto superara el límite de estado guardable.');
                }
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
                    cat.excludeKeywords = excludeKeywordsArr;
                    cat.description = desc;
                    cat.criteria = criteria;
                }
            } else {
                const newCat = proposedCategory;
                state.categories.push(newCat);
                state.activeCategoryId = newCat.id;
            }

            recordAudit(editId ? 'Categoría actualizada' : 'Categoría creada', `${name} [${code}]`);

            // El audit también forma parte del estado persistido. Si ese último
            // incremento rebasa el límite, saveToStorage restaura el proyecto
            // anterior y este flujo debe detenerse: continuar usaría por error
            // la última categoría previa como si fuera la recién creada.
            if (!saveToStorage()) {
                renderCodebookList();
                updateQualitativeCharts();
                return;
            }

            const targetCatId = editId || state.categories[state.categories.length - 1].id;
            const targetCategory = state.categories.find(category => category.id === targetCatId);
            const autoCodeResult = targetCategory && state.documents.length
                ? autoCodeBatch(state.documents, [targetCategory], `${targetCategory.name} · lote de documentos`)
                : { addedCount: 0, processedPairs: 0, truncated: false };
            const autoCount = autoCodeResult.addedCount;

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
            if (autoCodeResult.truncated) {
                alert(`La búsqueda automática de la categoría revisó ${autoCodeResult.processedPairs.toLocaleString()} combinaciones de ${state.documents.length.toLocaleString()} documentos posibles. Analiza los restantes de forma individual.`);
            }
        };

        // Save Memo Form
        document.getElementById('btn-save-memo').onclick = () => {
            const catId = document.getElementById('memo-category-select').value;
            let memoText;
            try {
                memoText = requireString(document.getElementById('memo-text').value.trim(), 'Nota analítica', FIELD_LIMITS.memo, true);
            } catch (error) {
                alert(`No se pudo guardar la nota: ${error.message || error}`);
                return;
            }

            if (!catId) {
                alert('Selecciona una categoría.');
                return;
            }

            const editingCoding = memoEditingCodingId && state.codings.find(coding => coding.id === memoEditingCodingId);
            if (editingCoding) {
                editingCoding.memo = memoText;
                recordAudit('Nota analítica actualizada', editingCoding.id);
                if (!saveToStorage()) {
                    setActiveDocument(editingCoding.docId);
                    renderDecoderList();
                    return;
                }
                setActiveDocument(editingCoding.docId);
                renderDecoderList();
                updateQualitativeCharts();
                memoEditingCodingId = null;
            } else {
                applyCodeToSelectedRange(catId, memoText);
            }
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
            if (document.getElementById('cat-exclude-keywords')) {
                document.getElementById('cat-exclude-keywords').value = existingCat.excludeKeywords ? existingCat.excludeKeywords.join(', ') : '';
            }
            document.getElementById('cat-desc').value = existingCat.description || '';
            document.getElementById('cat-criteria').value = existingCat.criteria || '';
            document.getElementById('cat-parent-select').value = existingCat.parentId || 'NONE';
            document.getElementById('cat-color').value = existingCat.color || '#3b82f6';
        } else {
            document.getElementById('modal-cat-title').textContent = 'Nueva categoría / subcategoría';
            document.getElementById('edit-cat-id').value = '';
            document.getElementById('cat-name').value = '';
            document.getElementById('cat-code').value = '';
            document.getElementById('cat-keywords').value = '';
            if (document.getElementById('cat-exclude-keywords')) {
                document.getElementById('cat-exclude-keywords').value = '';
            }
            document.getElementById('cat-desc').value = '';
            document.getElementById('cat-criteria').value = '';
            document.getElementById('cat-parent-select').value = 'NONE';
            document.getElementById('cat-color').value = getNextDistinctCategoryColor();
        }
        document.getElementById('modal-category').style.display = 'flex';
    }

    function openDocumentProfileModal() {
        const doc = state.documents.find(item => item.id === state.activeDocId);
        if (!doc) { alert('Abre primero un documento para completar su ficha.'); return; }
        const profile = doc.profile || {};
        document.getElementById('document-profile-title').textContent = doc.title;
        document.getElementById('doc-profile-group').value = profile.group || '';
        document.getElementById('doc-profile-case').value = profile.caseLabel || '';
        document.getElementById('doc-profile-period').value = profile.period || '';
        document.getElementById('doc-profile-notes').value = profile.notes || '';
        document.getElementById('modal-document-profile').style.display = 'flex';
    }

    function saveDocumentProfile() {
        const doc = state.documents.find(item => item.id === state.activeDocId);
        if (!doc) return;
        try {
            doc.profile = normalizeDocumentProfile({
                group: document.getElementById('doc-profile-group').value.trim(),
                caseLabel: document.getElementById('doc-profile-case').value.trim(),
                period: document.getElementById('doc-profile-period').value.trim(),
                notes: document.getElementById('doc-profile-notes').value.trim()
            }, 'profile');
        } catch (error) {
            alert(`No se pudo guardar la ficha: ${error.message || error}`);
            return;
        }
        recordAudit('Ficha de documento actualizada', doc.title);
        if (!saveToStorage()) {
            renderDocumentList();
            return;
        }
        renderDocumentList();
        document.getElementById('modal-document-profile').style.display = 'none';
    }

    function openMemoModal(range) {
        memoEditingCodingId = null;
        document.getElementById('modal-memo-title').textContent = 'Decodificar Significado / Nota Analítica';
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
        select.disabled = false;
        document.getElementById('modal-memo').style.display = 'flex';
    }

    function openCodingMemoModal(coding) {
        const category = state.categories.find(item => item.id === coding.categoryId);
        memoEditingCodingId = coding.id;
        document.getElementById('modal-memo-title').textContent = `Nota analítica · ${category ? category.name : 'Pasaje codificado'}`;
        document.getElementById('memo-quote-text').textContent = `"${coding.quoteText}"`;
        const select = document.getElementById('memo-category-select');
        select.innerHTML = `<option value="${coding.categoryId}">${category ? `${category.parentId ? '└─ ' : ''}${escapeHtml(category.name)}` : 'Categoría'}</option>`;
        select.value = coding.categoryId;
        select.disabled = true;
        document.getElementById('memo-text').value = coding.memo || '';
        document.getElementById('modal-memo').style.display = 'flex';
    }

    function exportToCSV() {
        exportCategoricalMatrixCSV();
    }

    function countWords(text) {
        if (!text) return 0;
        const source = String(text);
        const wordPattern = /\S+/g;
        let count = 0;
        while (wordPattern.exec(source)) count++;
        return count;
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
