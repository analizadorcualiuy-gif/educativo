/* Shared project-integrity primitives. Browser and Node compatible. */
(function (global) {
    'use strict';

    const DEFAULT_MAX_DEPTH = 2;
    const PROJECT_FORMAT = 'AnalizadorCualiUY.Project';
    const CURRENT_SCHEMA_VERSION = 7;
    const PROJECT_PACKAGE_FORMAT = 'AnalizadorCualiUY.ProjectPackage';
    const PROJECT_PACKAGE_VERSION = 1;
    const DOCUMENT_KINDS = Object.freeze(['text', 'image']);
    const CODING_ANCHOR_KINDS = Object.freeze(['text', 'image-rect']);
    const IMAGE_MEDIA_TYPES = Object.freeze(['image/png', 'image/jpeg', 'image/webp']);
    const MAX_MEDIA_ASSETS = 1000;
    const MAX_MEDIA_ASSET_BYTES = 128 * 1024 * 1024;
    const MAX_MEDIA_TOTAL_BYTES = 2 * 1024 * 1024 * 1024;
    const MAX_IMAGE_DIMENSION = 32768;
    const MAX_IMAGE_PIXELS = 100_000_000;
    const MAX_OCR_TRANSCRIPTIONS = 100_000;
    const MAX_OCR_WORDS_PER_TRANSCRIPTION = 20_000;
    const MAX_OCR_TEXT_LENGTH = 1024 * 1024;
    const MAX_VISUAL_RELATIONS = 100_000;
    const METHODOLOGY_APPROACHES = Object.freeze([
        'unspecified', 'thematic', 'grounded-theory', 'content-analysis',
        'framework-analysis', 'case-study', 'narrative-discourse', 'visual',
        'mixed', 'other'
    ]);
    const CODING_ORIENTATIONS = Object.freeze(['unspecified', 'inductive', 'deductive', 'hybrid']);
    const VISUAL_RELATION_TYPES = Object.freeze([
        'association', 'sequence', 'influence', 'dependence',
        'part-of', 'contrast', 'flow', 'custom'
    ]);
    const VISUAL_RELATION_STATUSES = Object.freeze(['accepted', 'pending', 'rejected']);
    const CODING_SOURCES = Object.freeze(['manual', 'search', 'import', 'model', 'legacy']);
    const CODING_REVIEW_STATUSES = Object.freeze(['proposed', 'accepted', 'rejected', 'pending', 'legacy_unverified']);
    const ANALYTICS_REVIEW_SCOPES = Object.freeze(['accepted', 'open', 'all']);
    const SEMANTIC_RUN_STATUSES = Object.freeze(['complete', 'cancelled', 'failed', 'legacy_unverified']);
    const SEMANTIC_OUTCOME_STATUSES = Object.freeze(['complete', 'abstained', 'omitted', 'failed']);
    const SEMANTIC_VECTOR_ORIGINS = Object.freeze(['deductive', 'emergent', 'free']);
    const MAX_SEMANTIC_VECTORS_PER_CATEGORY = 20;

    function semanticText(value, field, maxLength, { allowEmpty = false, nullable = false } = {}) {
        if (value == null && nullable) return null;
        if (typeof value !== 'string') throw new Error(`${field} debe ser texto.`);
        if ((!allowEmpty && !value.trim()) || value.length > maxLength) throw new Error(`${field} no es válido.`);
        return value;
    }

    function semanticId(value, field) {
        const id = semanticText(value, field, 160);
        if (!/^[A-Za-z0-9._:-]+$/u.test(id)) throw new Error(`${field} contiene un identificador inválido.`);
        return id;
    }

    function semanticInteger(value, field, minimum, maximum) {
        if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
            throw new Error(`${field} no es un entero válido.`);
        }
        return value;
    }

    function semanticNumber(value, field, minimum, maximum) {
        if (!Number.isFinite(value) || value < minimum || value > maximum) {
            throw new Error(`${field} no es un número válido.`);
        }
        return value;
    }

    function semanticIdList(value, field, maximum) {
        if (!Array.isArray(value) || value.length > maximum) throw new Error(`${field} debe ser una lista válida.`);
        const seen = new Set();
        return value.map((entry, index) => {
            const id = semanticId(entry, `${field}[${index}]`);
            if (seen.has(id)) throw new Error(`${field} contiene el ID duplicado ${id}.`);
            seen.add(id);
            return id;
        });
    }

    function semanticReason(value, field, required) {
        if (value == null && !required) return null;
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${field} debe ser un objeto.`);
        return {
            code: semanticText(value.code, `${field}.code`, 128),
            message: semanticText(value.message, `${field}.message`, 2048)
        };
    }

    function normalizeSemanticVector(value, index, categoryId, field = 'semanticVectors') {
        const vectorField = `${field}[${index}]`;
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${vectorField} debe ser un objeto.`);
        const normalizedCategoryId = semanticId(categoryId, `${vectorField}.categoryId`);
        if (!SEMANTIC_VECTOR_ORIGINS.includes(value.origin)) throw new Error(`${vectorField}.origin no es válido.`);
        const text = semanticText(value.text, `${vectorField}.text`, 4000);
        if (text.trim().length < 12) throw new Error(`${vectorField}.text debe contener al menos 12 caracteres.`);
        return {
            id: semanticId(value.id, `${vectorField}.id`),
            categoryId: normalizedCategoryId,
            name: semanticText(value.name, `${vectorField}.name`, 160),
            text,
            origin: value.origin,
            createdAt: semanticInteger(value.createdAt, `${vectorField}.createdAt`, 0, Number.MAX_SAFE_INTEGER)
        };
    }

    function normalizeSemanticVectors(value, categoryId, { required = false, field = 'semanticVectors' } = {}) {
        if (value == null && !required) return [];
        if (!Array.isArray(value) || value.length > MAX_SEMANTIC_VECTORS_PER_CATEGORY) {
            throw new Error(`${field} debe ser una lista de hasta ${MAX_SEMANTIC_VECTORS_PER_CATEGORY} vectores.`);
        }
        const ids = new Set();
        return value.map((vector, index) => {
            const normalized = normalizeSemanticVector(vector, index, categoryId, field);
            if (ids.has(normalized.id)) throw new Error(`${field} contiene el ID duplicado ${normalized.id}.`);
            ids.add(normalized.id);
            const { categoryId: _categoryId, ...stored } = normalized;
            return stored;
        });
    }

    function normalizeSemanticRun(run, index) {
        const field = `semanticRuns[${index}]`;
        if (!run || typeof run !== 'object' || Array.isArray(run)) throw new Error(`${field} debe ser un objeto.`);
        const id = semanticId(run.id, `${field}.id`);
        if (!SEMANTIC_RUN_STATUSES.includes(run.status)) throw new Error(`${field}.status no es válido.`);

        if (run.status === 'legacy_unverified') {
            if (run.contractVersion !== 0) throw new Error(`${field}.contractVersion debe ser 0 para legado no verificado.`);
            const scope = run.scope && typeof run.scope === 'object' && !Array.isArray(run.scope) ? run.scope : {};
            return {
                id,
                contractVersion: 0,
                status: 'legacy_unverified',
                startedAt: null,
                completedAt: null,
                durationMs: null,
                projectFingerprint: null,
                codebookFingerprint: null,
                engine: { provider: null, modelId: null, revision: null, runtime: null, execution: 'unknown' },
                configuration: null,
                scope: {
                    documentIds: semanticIdList(scope.documentIds || [], `${field}.scope.documentIds`, 500),
                    categoryIds: semanticIdList(scope.categoryIds || [], `${field}.scope.categoryIds`, 100),
                    sourceChars: null,
                    passages: null,
                    processedDocuments: null,
                    omittedDocuments: null,
                    failedDocuments: null
                },
                outcomes: []
            };
        }

        if (run.contractVersion !== 1) throw new Error(`${field}.contractVersion no es compatible.`);
        const startedAt = semanticInteger(run.startedAt, `${field}.startedAt`, 0, Number.MAX_SAFE_INTEGER);
        const completedAt = semanticInteger(run.completedAt, `${field}.completedAt`, startedAt, Number.MAX_SAFE_INTEGER);
        const durationMs = semanticNumber(run.durationMs, `${field}.durationMs`, 0, 7 * 24 * 60 * 60 * 1000);
        const engine = run.engine;
        if (!engine || typeof engine !== 'object' || Array.isArray(engine)) throw new Error(`${field}.engine debe ser un objeto.`);
        if (!['local-worker', 'local-native', 'external'].includes(engine.execution)) {
            throw new Error(`${field}.engine.execution no es válido.`);
        }
        const configuration = run.configuration;
        if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) throw new Error(`${field}.configuration debe ser un objeto.`);
        if (!['positive_only'].includes(configuration.queryStrategy)) throw new Error(`${field}.configuration.queryStrategy no es válido.`);
        const segmentation = configuration.segmentation;
        if (!segmentation || typeof segmentation !== 'object' || Array.isArray(segmentation)) throw new Error(`${field}.configuration.segmentation debe ser un objeto.`);
        const scope = run.scope;
        if (!scope || typeof scope !== 'object' || Array.isArray(scope)) throw new Error(`${field}.scope debe ser un objeto.`);
        const documentIds = semanticIdList(scope.documentIds, `${field}.scope.documentIds`, 500);
        const categoryIds = semanticIdList(scope.categoryIds, `${field}.scope.categoryIds`, 100);
        if (!documentIds.length || !categoryIds.length) throw new Error(`${field}.scope debe incluir documentos y categorías.`);
        let semanticVector = null;
        if (run.semanticVector != null) {
            if (!run.semanticVector || typeof run.semanticVector !== 'object' || Array.isArray(run.semanticVector)) {
                throw new Error(`${field}.semanticVector debe ser un objeto.`);
            }
            const vectorCategoryId = semanticId(run.semanticVector.categoryId, `${field}.semanticVector.categoryId`);
            if (!categoryIds.includes(vectorCategoryId)) throw new Error(`${field}.semanticVector queda fuera del alcance categorial.`);
            const normalizedVector = normalizeSemanticVector(run.semanticVector, 0, vectorCategoryId, `${field}.semanticVectorSnapshot`);
            const { categoryId, ...vector } = normalizedVector;
            semanticVector = { categoryId, ...vector };
        }
        const processedDocuments = semanticInteger(scope.processedDocuments, `${field}.scope.processedDocuments`, 0, 500);
        const omittedDocuments = semanticInteger(scope.omittedDocuments, `${field}.scope.omittedDocuments`, 0, 500);
        const failedDocuments = semanticInteger(scope.failedDocuments, `${field}.scope.failedDocuments`, 0, 500);
        if (processedDocuments + omittedDocuments + failedDocuments !== documentIds.length) {
            throw new Error(`${field}.scope no contabiliza todos los documentos autorizados.`);
        }
        if (!Array.isArray(run.outcomes) || run.outcomes.length > 100) throw new Error(`${field}.outcomes debe ser una lista válida.`);
        const outcomeIds = new Set();
        const outcomes = run.outcomes.map((outcome, outcomeIndex) => {
            const outcomeField = `${field}.outcomes[${outcomeIndex}]`;
            if (!outcome || typeof outcome !== 'object' || Array.isArray(outcome)) throw new Error(`${outcomeField} debe ser un objeto.`);
            const categoryId = semanticId(outcome.categoryId, `${outcomeField}.categoryId`);
            if (!categoryIds.includes(categoryId)) throw new Error(`${outcomeField}.categoryId queda fuera del alcance.`);
            if (outcomeIds.has(categoryId)) throw new Error(`${field}.outcomes repite la categoría ${categoryId}.`);
            outcomeIds.add(categoryId);
            if (!SEMANTIC_OUTCOME_STATUSES.includes(outcome.status)) throw new Error(`${outcomeField}.status no es válido.`);
            const candidateCount = semanticInteger(outcome.candidateCount, `${outcomeField}.candidateCount`, 0, 100);
            if (outcome.status === 'complete' && candidateCount < 1) throw new Error(`${outcomeField} completo debe declarar candidatos.`);
            if (outcome.status !== 'complete' && candidateCount !== 0) throw new Error(`${outcomeField} no puede declarar candidatos.`);
            return {
                categoryId,
                status: outcome.status,
                candidateCount,
                reason: semanticReason(outcome.reason, `${outcomeField}.reason`, outcome.status !== 'complete')
            };
        });
        if (run.status === 'complete' && (outcomeIds.size !== categoryIds.length || categoryIds.some(categoryId => !outcomeIds.has(categoryId)))) {
            throw new Error(`${field}.outcomes no cubre todas las categorías autorizadas.`);
        }
        return {
            id,
            contractVersion: 1,
            status: run.status,
            startedAt,
            completedAt,
            durationMs,
            projectFingerprint: semanticText(run.projectFingerprint, `${field}.projectFingerprint`, 256),
            codebookFingerprint: semanticText(run.codebookFingerprint, `${field}.codebookFingerprint`, 256),
            engine: {
                provider: semanticText(engine.provider, `${field}.engine.provider`, 128),
                modelId: semanticText(engine.modelId, `${field}.engine.modelId`, 512),
                revision: semanticText(engine.revision, `${field}.engine.revision`, 512),
                runtime: semanticText(engine.runtime, `${field}.engine.runtime`, 512),
                execution: engine.execution
            },
            configuration: {
                queryStrategy: configuration.queryStrategy,
                threshold: semanticNumber(configuration.threshold, `${field}.configuration.threshold`, -1, 1),
                topK: semanticInteger(configuration.topK, `${field}.configuration.topK`, 1, 100),
                batchSize: semanticInteger(configuration.batchSize, `${field}.configuration.batchSize`, 1, 64),
                segmentation: {
                    maxDocuments: semanticInteger(segmentation.maxDocuments, `${field}.configuration.segmentation.maxDocuments`, 1, 500),
                    maxTotalChars: semanticInteger(segmentation.maxTotalChars, `${field}.configuration.segmentation.maxTotalChars`, 1000, 5_000_000),
                    maxPassages: semanticInteger(segmentation.maxPassages, `${field}.configuration.segmentation.maxPassages`, 1, 5_000),
                    maxPassageChars: semanticInteger(segmentation.maxPassageChars, `${field}.configuration.segmentation.maxPassageChars`, 100, 4_000)
                }
            },
            scope: {
                documentIds,
                categoryIds,
                sourceChars: semanticInteger(scope.sourceChars, `${field}.scope.sourceChars`, 0, 5_000_000),
                passages: semanticInteger(scope.passages, `${field}.scope.passages`, 0, 5_000),
                processedDocuments,
                omittedDocuments,
                failedDocuments
            },
            outcomes,
            ...(semanticVector ? { semanticVector } : {})
        };
    }

    function validateSemanticRuns(value, { required = false } = {}) {
        if (value == null && !required) return [];
        if (!Array.isArray(value)) throw new Error('semanticRuns debe ser una lista.');
        if (value.length > 1000) throw new Error('semanticRuns supera el límite de 1.000 ejecuciones.');
        const ids = new Set();
        return value.map((run, index) => {
            const normalized = normalizeSemanticRun(run, index);
            if (ids.has(normalized.id)) throw new Error(`ID de ejecución semántica duplicado: ${normalized.id}`);
            ids.add(normalized.id);
            return normalized;
        });
    }

    function createLegacySemanticRun(records, existingIds = []) {
        const usedIds = new Set(existingIds);
        let sequence = 1;
        let id = `semantic-run-legacy-${sequence}`;
        while (usedIds.has(id)) id = `semantic-run-legacy-${++sequence}`;
        const documentIds = [];
        const categoryIds = [];
        const seenDocuments = new Set();
        const seenCategories = new Set();
        (records || []).forEach((record, index) => {
            const documentId = semanticId(record.docId, `legacyModelRecords[${index}].docId`);
            const categoryId = semanticId(record.categoryId, `legacyModelRecords[${index}].categoryId`);
            if (!seenDocuments.has(documentId)) {
                seenDocuments.add(documentId);
                documentIds.push(documentId);
            }
            if (!seenCategories.has(categoryId)) {
                seenCategories.add(categoryId);
                categoryIds.push(categoryId);
            }
        });
        return normalizeSemanticRun({
            id,
            contractVersion: 0,
            status: 'legacy_unverified',
            scope: { documentIds, categoryIds }
        }, 0);
    }

    function normalizeModelDetectionMetadata(detection, index, runMap, {
        strict = false,
        legacyRunId = null,
        docId,
        categoryId
    } = {}) {
        const field = `detections[${index}]`;
        const semanticRunId = strict
            ? semanticId(detection.semanticRunId, `${field}.semanticRunId`)
            : semanticId(legacyRunId, `${field}.semanticRunId`);
        const run = runMap.get(semanticRunId);
        if (!run) throw new Error(`${field}.semanticRunId refiere a una ejecución inexistente.`);
        if (run.status === 'legacy_unverified') {
            return { semanticRunId, score: null, rank: null, rationale: '' };
        }
        if (run.status !== 'complete') throw new Error(`${field} no puede depender de una ejecución ${run.status}.`);
        if (!run.scope.documentIds.includes(docId) || !run.scope.categoryIds.includes(categoryId)) {
            throw new Error(`${field} queda fuera del alcance de su ejecución semántica.`);
        }
        const outcome = run.outcomes.find(candidate => candidate.categoryId === categoryId);
        if (!outcome || outcome.status !== 'complete') throw new Error(`${field} no coincide con un resultado completo de su categoría.`);
        const rank = semanticInteger(detection.rank, `${field}.rank`, 1, 100);
        if (rank > outcome.candidateCount) throw new Error(`${field}.rank supera los candidatos declarados por la ejecución.`);
        return {
            semanticRunId,
            score: semanticNumber(detection.score, `${field}.score`, -1, 1),
            rank,
            rationale: semanticText(detection.rationale, `${field}.rationale`, 4096)
        };
    }

    function objectValue(value, field) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${field} debe ser un objeto.`);
        return value;
    }

    function sha256Value(value, field) {
        const hash = semanticText(value, field, 64).toLowerCase();
        if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error(`${field} no es un SHA-256 válido.`);
        return hash;
    }

    function mediaExtension(mediaType) {
        if (mediaType === 'image/png') return 'png';
        if (mediaType === 'image/jpeg') return 'jpg';
        if (mediaType === 'image/webp') return 'webp';
        throw new Error(`Tipo de medio no compatible: ${mediaType}`);
    }

    function validateMediaAssets(value, { required = false } = {}) {
        if (value == null && !required) return [];
        if (!Array.isArray(value)) throw new Error('mediaAssets debe ser una lista.');
        if (value.length > MAX_MEDIA_ASSETS) throw new Error(`mediaAssets supera el límite de ${MAX_MEDIA_ASSETS} activos.`);
        const ids = new Set();
        let totalBytes = 0;
        return value.map((entry, index) => {
            const field = `mediaAssets[${index}]`;
            const asset = objectValue(entry, field);
            const id = semanticId(asset.id, `${field}.id`);
            if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(id)) {
                throw new Error(`${field}.id no es seguro para una ruta de medio.`);
            }
            if (ids.has(id)) throw new Error(`ID de medio duplicado: ${id}`);
            ids.add(id);
            if (asset.kind !== 'image') throw new Error(`${field}.kind no es válido.`);
            if (!IMAGE_MEDIA_TYPES.includes(asset.mediaType)) throw new Error(`${field}.mediaType no es válido.`);
            const byteLength = semanticInteger(asset.byteLength, `${field}.byteLength`, 1, MAX_MEDIA_ASSET_BYTES);
            const width = semanticInteger(asset.width, `${field}.width`, 1, MAX_IMAGE_DIMENSION);
            const height = semanticInteger(asset.height, `${field}.height`, 1, MAX_IMAGE_DIMENSION);
            if (width * height > MAX_IMAGE_PIXELS) throw new Error(`${field} supera el máximo de ${MAX_IMAGE_PIXELS.toLocaleString()} píxeles.`);
            totalBytes += byteLength;
            if (!Number.isSafeInteger(totalBytes) || totalBytes > MAX_MEDIA_TOTAL_BYTES) {
                throw new Error(`mediaAssets supera el presupuesto total de ${MAX_MEDIA_TOTAL_BYTES / 1024 / 1024} MiB.`);
            }
            if (asset.metadataPolicy !== 'stripped') throw new Error(`${field}.metadataPolicy debe indicar stripped.`);
            return {
                id,
                kind: 'image',
                mediaType: asset.mediaType,
                byteLength,
                width,
                height,
                sha256: sha256Value(asset.sha256, `${field}.sha256`),
                originalName: semanticText(asset.originalName, `${field}.originalName`, 4096),
                metadataPolicy: 'stripped'
            };
        });
    }

    function normalizeDocumentKind(document, schemaVersion = 0, field = 'document') {
        const value = objectValue(document, field);
        if (schemaVersion < 5 && value.kind == null) return 'text';
        if (!DOCUMENT_KINDS.includes(value.kind)) throw new Error(`${field}.kind no es válido.`);
        return value.kind;
    }

    function normalizeCodingAnchor(document, coding, { schemaVersion = 0, field = 'coding' } = {}) {
        const source = objectValue(coding, field);
        const documentKind = normalizeDocumentKind(document, schemaVersion, `${field}.document`);
        const rawAnchor = source.anchor == null ? null : objectValue(source.anchor, `${field}.anchor`);
        if (schemaVersion >= 5 && !rawAnchor) throw new Error(`${field}.anchor es obligatorio en el esquema ${schemaVersion}.`);

        if (documentKind === 'text') {
            if (rawAnchor && rawAnchor.kind !== 'text') throw new Error(`${field}.anchor no corresponde a un documento textual.`);
            const startChar = rawAnchor ? rawAnchor.startChar : source.startChar;
            const endChar = rawAnchor ? rawAnchor.endChar : source.endChar;
            const contentLength = String(document.content || '').length;
            if (!Number.isSafeInteger(startChar) || !Number.isSafeInteger(endChar)
                || startChar < 0 || endChar <= startChar || endChar > contentLength) {
                throw new Error(`${field} contiene posiciones de texto inválidas.`);
            }
            if (rawAnchor && ((source.startChar != null && source.startChar !== startChar)
                || (source.endChar != null && source.endChar !== endChar))) {
                throw new Error(`${field}.anchor no coincide con sus posiciones de compatibilidad.`);
            }
            return { kind: 'text', startChar, endChar };
        }

        if (!rawAnchor || rawAnchor.kind !== 'image-rect') throw new Error(`${field}.anchor debe ser una región rectangular de imagen.`);
        if (source.startChar != null || source.endChar != null) throw new Error(`${field} mezcla posiciones textuales con una región de imagen.`);
        const x = semanticNumber(rawAnchor.x, `${field}.anchor.x`, 0, 1);
        const y = semanticNumber(rawAnchor.y, `${field}.anchor.y`, 0, 1);
        const width = semanticNumber(rawAnchor.width, `${field}.anchor.width`, 0, 1);
        const height = semanticNumber(rawAnchor.height, `${field}.anchor.height`, 0, 1);
        if (width <= 0 || height <= 0 || x + width > 1 || y + height > 1) {
            throw new Error(`${field}.anchor queda fuera de los límites normalizados de la imagen.`);
        }
        return { kind: 'image-rect', x, y, width, height };
    }

    function normalizeOcrTranscriptions(value, documents, mediaAssets, { required = false } = {}) {
        if (value == null && !required) return [];
        if (!Array.isArray(value) || value.length > MAX_OCR_TRANSCRIPTIONS) {
            throw new Error(`ocrTranscriptions debe ser una lista de hasta ${MAX_OCR_TRANSCRIPTIONS.toLocaleString()} entradas.`);
        }
        const documentMap = new Map((documents || []).map(document => [document.id, document]));
        const mediaMap = new Map((mediaAssets || []).map(asset => [asset.id, asset]));
        const ids = new Set();
        return value.map((entry, index) => {
            const field = `ocrTranscriptions[${index}]`;
            const source = objectValue(entry, field);
            const id = semanticId(source.id, `${field}.id`);
            if (ids.has(id)) throw new Error(`ID de transcripción OCR duplicado: ${id}`);
            ids.add(id);
            const docId = semanticId(source.docId, `${field}.docId`);
            const document = documentMap.get(docId);
            if (!document || normalizeDocumentKind(document, CURRENT_SCHEMA_VERSION, `${field}.document`) !== 'image') {
                throw new Error(`${field}.docId debe referir a un documento visual.`);
            }
            const asset = mediaMap.get(document.mediaAssetId);
            if (!asset) throw new Error(`${field} refiere a un medio inexistente.`);
            const mediaSha256 = sha256Value(source.mediaSha256, `${field}.mediaSha256`);
            if (mediaSha256 !== asset.sha256) throw new Error(`${field}.mediaSha256 no coincide con la imagen vinculada.`);
            const anchor = normalizeCodingAnchor(document, { anchor: source.anchor }, {
                schemaVersion: CURRENT_SCHEMA_VERSION,
                field
            });
            const engine = objectValue(source.engine, `${field}.engine`);
            const provider = semanticText(engine.provider, `${field}.engine.provider`, 128);
            if (engine.execution !== 'local-native') throw new Error(`${field}.engine.execution debe ser local-native.`);
            const languageTag = semanticText(source.languageTag, `${field}.languageTag`, 64);
            if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/u.test(languageTag)) throw new Error(`${field}.languageTag no es válido.`);
            if (source.status !== 'confirmed') throw new Error(`${field}.status debe ser confirmed.`);
            const rawText = semanticText(source.rawText, `${field}.rawText`, MAX_OCR_TEXT_LENGTH, { allowEmpty: true });
            const text = semanticText(source.text, `${field}.text`, MAX_OCR_TEXT_LENGTH, { allowEmpty: true });
            if (!rawText.trim() && !text.trim()) throw new Error(`${field} no contiene texto reconocido ni corregido.`);
            const confidence = source.confidence == null
                ? null
                : semanticNumber(source.confidence, `${field}.confidence`, 0, 1);
            const textAngle = source.textAngle == null
                ? null
                : semanticNumber(source.textAngle, `${field}.textAngle`, -360, 360);
            if (!Array.isArray(source.words) || source.words.length > MAX_OCR_WORDS_PER_TRANSCRIPTION) {
                throw new Error(`${field}.words supera el límite permitido.`);
            }
            const words = source.words.map((word, wordIndex) => {
                const wordField = `${field}.words[${wordIndex}]`;
                const wordValue = objectValue(word, wordField);
                const rectangle = normalizeCodingAnchor(document, {
                    anchor: {
                        kind: 'image-rect',
                        x: wordValue.x,
                        y: wordValue.y,
                        width: wordValue.width,
                        height: wordValue.height
                    }
                }, { schemaVersion: CURRENT_SCHEMA_VERSION, field: wordField });
                return {
                    text: semanticText(wordValue.text, `${wordField}.text`, 1024),
                    x: rectangle.x,
                    y: rectangle.y,
                    width: rectangle.width,
                    height: rectangle.height,
                    confidence: wordValue.confidence == null
                        ? null
                        : semanticNumber(wordValue.confidence, `${wordField}.confidence`, 0, 1)
                };
            });
            const createdAt = semanticInteger(source.createdAt, `${field}.createdAt`, 0, Number.MAX_SAFE_INTEGER);
            const updatedAt = semanticInteger(source.updatedAt, `${field}.updatedAt`, createdAt, Number.MAX_SAFE_INTEGER);
            const confirmedAt = semanticInteger(source.confirmedAt, `${field}.confirmedAt`, createdAt, Number.MAX_SAFE_INTEGER);
            return {
                id,
                docId,
                mediaSha256,
                anchor,
                engine: { provider, execution: 'local-native' },
                languageTag,
                status: 'confirmed',
                rawText,
                text,
                confidence,
                textAngle,
                words,
                createdAt,
                updatedAt,
                confirmedAt
            };
        });
    }

    function emptyMethodologyProfile() {
        return {
            approach: 'unspecified',
            customApproach: '',
            orientation: 'unspecified',
            purpose: '',
            researchQuestions: '',
            unitOfAnalysis: '',
            samplingStrategy: '',
            qualityCriteria: '',
            notes: '',
            updatedAt: 0
        };
    }

    function normalizeMethodologyProfile(value, { required = false } = {}) {
        if (value == null && !required) return emptyMethodologyProfile();
        const source = objectValue(value, 'methodologyProfile');
        if (!METHODOLOGY_APPROACHES.includes(source.approach)) {
            throw new Error('methodologyProfile.approach no es válido.');
        }
        if (!CODING_ORIENTATIONS.includes(source.orientation)) {
            throw new Error('methodologyProfile.orientation no es válida.');
        }
        const profile = {
            approach: source.approach,
            customApproach: semanticText(source.customApproach || '', 'methodologyProfile.customApproach', 256, { allowEmpty: true }),
            orientation: source.orientation,
            purpose: semanticText(source.purpose || '', 'methodologyProfile.purpose', 16_384, { allowEmpty: true }),
            researchQuestions: semanticText(source.researchQuestions || '', 'methodologyProfile.researchQuestions', 65_536, { allowEmpty: true }),
            unitOfAnalysis: semanticText(source.unitOfAnalysis || '', 'methodologyProfile.unitOfAnalysis', 4_096, { allowEmpty: true }),
            samplingStrategy: semanticText(source.samplingStrategy || '', 'methodologyProfile.samplingStrategy', 16_384, { allowEmpty: true }),
            qualityCriteria: semanticText(source.qualityCriteria || '', 'methodologyProfile.qualityCriteria', 16_384, { allowEmpty: true }),
            notes: semanticText(source.notes || '', 'methodologyProfile.notes', 65_536, { allowEmpty: true }),
            updatedAt: semanticInteger(source.updatedAt == null ? 0 : source.updatedAt, 'methodologyProfile.updatedAt', 0, Number.MAX_SAFE_INTEGER)
        };
        if (profile.approach === 'other' && !profile.customApproach.trim()) {
            throw new Error('methodologyProfile.customApproach es obligatorio cuando el enfoque es otro.');
        }
        if (profile.approach !== 'other') profile.customApproach = '';
        return profile;
    }

    function methodologyProfileHasContent(value) {
        const profile = normalizeMethodologyProfile(value);
        return profile.approach !== 'unspecified'
            || profile.orientation !== 'unspecified'
            || ['purpose', 'researchQuestions', 'unitOfAnalysis', 'samplingStrategy', 'qualityCriteria', 'notes']
                .some(field => profile[field].trim());
    }

    function normalizeVisualRelations(value, documents, codings, { required = false } = {}) {
        if (value == null && !required) return [];
        if (!Array.isArray(value) || value.length > MAX_VISUAL_RELATIONS) {
            throw new Error(`visualRelations debe ser una lista de hasta ${MAX_VISUAL_RELATIONS.toLocaleString()} entradas.`);
        }
        const documentMap = new Map((documents || []).map(document => [document.id, document]));
        const codingMap = new Map((codings || []).map(coding => [coding.id, coding]));
        const ids = new Set();
        const signatures = new Set();
        return value.map((entry, index) => {
            const field = `visualRelations[${index}]`;
            const source = objectValue(entry, field);
            const id = semanticId(source.id, `${field}.id`);
            if (ids.has(id)) throw new Error(`ID de relación visual duplicado: ${id}`);
            ids.add(id);
            const docId = semanticId(source.docId, `${field}.docId`);
            const document = documentMap.get(docId);
            if (!document || normalizeDocumentKind(document, CURRENT_SCHEMA_VERSION, `${field}.document`) !== 'image') {
                throw new Error(`${field}.docId debe referir a un documento visual.`);
            }
            const sourceCodingId = semanticId(source.sourceCodingId, `${field}.sourceCodingId`);
            const targetCodingId = semanticId(source.targetCodingId, `${field}.targetCodingId`);
            if (sourceCodingId === targetCodingId) throw new Error(`${field} debe vincular dos regiones diferentes.`);
            const sourceCoding = codingMap.get(sourceCodingId);
            const targetCoding = codingMap.get(targetCodingId);
            if (!sourceCoding || !targetCoding
                || sourceCoding.docId !== docId || targetCoding.docId !== docId
                || normalizeCodingAnchor(document, sourceCoding, { schemaVersion: CURRENT_SCHEMA_VERSION, field: `${field}.source` }).kind !== 'image-rect'
                || normalizeCodingAnchor(document, targetCoding, { schemaVersion: CURRENT_SCHEMA_VERSION, field: `${field}.target` }).kind !== 'image-rect') {
                throw new Error(`${field} debe vincular dos codificaciones visuales del mismo documento.`);
            }
            if (!VISUAL_RELATION_TYPES.includes(source.type)) throw new Error(`${field}.type no es válido.`);
            if (typeof source.directed !== 'boolean') throw new Error(`${field}.directed debe ser booleano.`);
            if (!VISUAL_RELATION_STATUSES.includes(source.reviewStatus)) throw new Error(`${field}.reviewStatus no es válido.`);
            let customType = semanticText(source.customType || '', `${field}.customType`, 256, { allowEmpty: true });
            if (source.type === 'custom' && !customType.trim()) throw new Error(`${field}.customType es obligatorio para una relación personalizada.`);
            if (source.type !== 'custom') customType = '';
            const canonicalPair = source.directed || sourceCodingId < targetCodingId
                ? `${sourceCodingId}\u0000${targetCodingId}`
                : `${targetCodingId}\u0000${sourceCodingId}`;
            const signature = `${docId}\u0000${canonicalPair}\u0000${source.type}\u0000${customType.toLocaleLowerCase()}\u0000${source.directed}`;
            if (signatures.has(signature)) throw new Error(`${field} duplica una relación visual existente.`);
            signatures.add(signature);
            const createdAt = semanticInteger(source.createdAt, `${field}.createdAt`, 0, Number.MAX_SAFE_INTEGER);
            const updatedAt = semanticInteger(source.updatedAt, `${field}.updatedAt`, createdAt, Number.MAX_SAFE_INTEGER);
            return {
                id,
                docId,
                sourceCodingId,
                targetCodingId,
                type: source.type,
                customType,
                directed: source.directed,
                memo: semanticText(source.memo || '', `${field}.memo`, 1024 * 1024, { allowEmpty: true }),
                reviewStatus: source.reviewStatus,
                createdAt,
                updatedAt
            };
        });
    }

    function upgradeProjectShape(project) {
        const source = objectValue(project || {}, 'project');
        if (Number.isSafeInteger(source.schemaVersion) && source.schemaVersion > CURRENT_SCHEMA_VERSION) {
            throw new Error(`El proyecto usa el esquema ${source.schemaVersion}, posterior al máximo compatible ${CURRENT_SCHEMA_VERSION}.`);
        }
        const documents = Array.isArray(source.documents)
            ? source.documents.map(document => ({ ...document, kind: document.kind || 'text' }))
            : source.documents;
        const documentMap = new Map((documents || []).map(document => [document.id, document]));
        const codings = Array.isArray(source.codings) ? source.codings.map(coding => {
            if (coding.anchor != null) return { ...coding, anchor: { ...coding.anchor } };
            const document = documentMap.get(coding.docId);
            if (!document || document.kind !== 'text') return { ...coding };
            return {
                ...coding,
                anchor: { kind: 'text', startChar: coding.startChar, endChar: coding.endChar }
            };
        }) : source.codings;
        return { ...source, documents, codings };
    }

    function normalizeProjectMediaContract(project) {
        const source = objectValue(project, 'project');
        const mediaAssets = validateMediaAssets(source.mediaAssets, { required: true });
        if (!Array.isArray(source.documents) || !Array.isArray(source.codings)) {
            throw new Error('El proyecto debe contener documents y codings como listas.');
        }
        const assetIds = new Set(mediaAssets.map(asset => asset.id));
        const documentIds = new Set();
        const documents = source.documents.map((document, index) => {
            const field = `documents[${index}]`;
            const value = objectValue(document, field);
            const id = semanticId(value.id, `${field}.id`);
            if (documentIds.has(id)) throw new Error(`ID de documento duplicado: ${id}`);
            documentIds.add(id);
            const kind = normalizeDocumentKind(value, CURRENT_SCHEMA_VERSION, field);
            if (kind === 'image') {
                const mediaAssetId = semanticId(value.mediaAssetId, `${field}.mediaAssetId`);
                if (!assetIds.has(mediaAssetId)) throw new Error(`${field}.mediaAssetId refiere a un medio inexistente.`);
                return { ...value, id, kind, mediaAssetId };
            }
            if (value.mediaAssetId != null) throw new Error(`${field} es textual y no puede referir a un medio.`);
            return { ...value, id, kind: 'text' };
        });
        const documentMap = new Map(documents.map(document => [document.id, document]));
        const ocrTranscriptions = normalizeOcrTranscriptions(
            source.ocrTranscriptions || [],
            documents,
            mediaAssets,
            { required: true }
        );
        const ocrMap = new Map(ocrTranscriptions.map(entry => [entry.id, entry]));
        const codings = source.codings.map((coding, index) => {
            const field = `codings[${index}]`;
            const value = objectValue(coding, field);
            const document = documentMap.get(value.docId);
            if (!document) throw new Error(`${field} refiere a un documento inexistente.`);
            const anchor = normalizeCodingAnchor(document, value, {
                schemaVersion: CURRENT_SCHEMA_VERSION,
                field
            });
            const ocrTranscriptId = value.ocrTranscriptId == null
                ? null
                : semanticId(value.ocrTranscriptId, `${field}.ocrTranscriptId`);
            if (ocrTranscriptId) {
                const transcript = ocrMap.get(ocrTranscriptId);
                if (anchor.kind !== 'image-rect' || !transcript || transcript.docId !== value.docId) {
                    throw new Error(`${field}.ocrTranscriptId no corresponde a su evidencia visual.`);
                }
            }
            return {
                ...value,
                anchor,
                ...(ocrTranscriptId ? { ocrTranscriptId } : {})
            };
        });
        return { documents, codings, mediaAssets, ocrTranscriptions };
    }

    function downgradeProjectToSchema5(project, { discardOcr = false } = {}) {
        const metadata = validateProjectMetadata(project);
        const source = upgradeProjectShape(project);
        const mediaAssets = validateMediaAssets(source.mediaAssets, { required: metadata.schemaVersion >= 5 });
        const ocrTranscriptions = normalizeOcrTranscriptions(source.ocrTranscriptions, source.documents || [], mediaAssets, {
            required: metadata.schemaVersion >= 6
        });
        if (ocrTranscriptions.length && !discardOcr) {
            throw new Error('El proyecto contiene transcripciones OCR; confirma su descarte para revertirlo al esquema 5.');
        }
        const methodologyProfile = normalizeMethodologyProfile(source.methodologyProfile, { required: metadata.schemaVersion >= 7 });
        const visualRelations = normalizeVisualRelations(source.visualRelations, source.documents || [], source.codings || [], {
            required: metadata.schemaVersion >= 7
        });
        if (methodologyProfileHasContent(methodologyProfile) || visualRelations.length) {
            throw new Error('El proyecto contiene perfil metodológico o relaciones visuales y no puede revertirse al esquema 5 sin perder datos. Reviértelo primero al esquema 6 con descarte explícito.');
        }
        const codings = (source.codings || []).map(coding => {
            const { ocrTranscriptId: _ocrTranscriptId, ...legacyCoding } = coding;
            return legacyCoding;
        });
        const {
            ocrTranscriptions: _ocrTranscriptions,
            methodologyProfile: _methodologyProfile,
            visualRelations: _visualRelations,
            ...legacyProject
        } = source;
        return {
            ...legacyProject,
            format: PROJECT_FORMAT,
            schemaVersion: 5,
            mediaAssets,
            codings
        };
    }

    function downgradeProjectToSchema6(project, { discardMethodology = false, discardVisualRelations = false } = {}) {
        const metadata = validateProjectMetadata(project);
        const source = upgradeProjectShape(project);
        const mediaAssets = validateMediaAssets(source.mediaAssets, { required: metadata.schemaVersion >= 5 });
        const multimodal = normalizeProjectMediaContract({ ...source, mediaAssets });
        const methodologyProfile = normalizeMethodologyProfile(source.methodologyProfile, { required: metadata.schemaVersion >= 7 });
        const visualRelations = normalizeVisualRelations(source.visualRelations, multimodal.documents, multimodal.codings, {
            required: metadata.schemaVersion >= 7
        });
        if (methodologyProfileHasContent(methodologyProfile) && !discardMethodology) {
            throw new Error('El proyecto contiene un perfil metodológico; confirma su descarte para revertirlo al esquema 6.');
        }
        if (visualRelations.length && !discardVisualRelations) {
            throw new Error('El proyecto contiene relaciones visuales; confirma su descarte para revertirlo al esquema 6.');
        }
        const {
            methodologyProfile: _methodologyProfile,
            visualRelations: _visualRelations,
            ...legacyProject
        } = source;
        return {
            ...legacyProject,
            format: PROJECT_FORMAT,
            schemaVersion: 6,
            documents: multimodal.documents,
            codings: multimodal.codings,
            mediaAssets: multimodal.mediaAssets,
            ocrTranscriptions: multimodal.ocrTranscriptions
        };
    }

    function downgradeProjectToSchema4(project) {
        const metadata = validateProjectMetadata(project);
        const source = upgradeProjectShape(project);
        const mediaAssets = validateMediaAssets(source.mediaAssets, { required: metadata.schemaVersion >= 5 });
        if (mediaAssets.length) throw new Error('El proyecto contiene medios y no puede revertirse al esquema 4 sin perder datos.');
        const documents = (source.documents || []).map((document, index) => {
            const kind = normalizeDocumentKind(document, 5, `documents[${index}]`);
            if (kind !== 'text') throw new Error('El proyecto contiene documentos visuales y no puede revertirse al esquema 4.');
            const { kind: _kind, mediaAssetId: _mediaAssetId, ...textDocument } = document;
            return textDocument;
        });
        const documentMap = new Map(documents.map(document => [document.id, document]));
        const codings = (source.codings || []).map((coding, index) => {
            const document = documentMap.get(coding.docId);
            if (!document) throw new Error(`codings[${index}] refiere a un documento inexistente.`);
            const anchor = normalizeCodingAnchor({ ...document, kind: 'text' }, coding, {
                schemaVersion: 5,
                field: `codings[${index}]`
            });
            const { anchor: _anchor, ...legacyCoding } = coding;
            return { ...legacyCoding, startChar: anchor.startChar, endChar: anchor.endChar };
        });
        const {
            mediaAssets: _mediaAssets,
            ocrTranscriptions: _ocrTranscriptions,
            methodologyProfile: _methodologyProfile,
            visualRelations: _visualRelations,
            ...legacyProject
        } = source;
        return {
            ...legacyProject,
            format: PROJECT_FORMAT,
            schemaVersion: 4,
            documents,
            codings
        };
    }

    function createProjectPackageManifest(projectDescriptor, mediaAssets) {
        const project = objectValue(projectDescriptor, 'projectDescriptor');
        const normalizedAssets = validateMediaAssets(mediaAssets, { required: true });
        return {
            format: PROJECT_PACKAGE_FORMAT,
            packageVersion: PROJECT_PACKAGE_VERSION,
            project: {
                path: 'project.json',
                byteLength: semanticInteger(project.byteLength, 'projectDescriptor.byteLength', 1, Number.MAX_SAFE_INTEGER),
                sha256: sha256Value(project.sha256, 'projectDescriptor.sha256')
            },
            assets: normalizedAssets.map(asset => ({
                id: asset.id,
                path: `media/${asset.id}.${mediaExtension(asset.mediaType)}`,
                mediaType: asset.mediaType,
                byteLength: asset.byteLength,
                sha256: asset.sha256,
                width: asset.width,
                height: asset.height
            }))
        };
    }

    function validateProjectPackageManifest(value, mediaAssets) {
        const manifest = objectValue(value, 'packageManifest');
        if (manifest.format !== PROJECT_PACKAGE_FORMAT || manifest.packageVersion !== PROJECT_PACKAGE_VERSION) {
            throw new Error('El manifiesto del paquete de proyecto no es compatible.');
        }
        const expected = createProjectPackageManifest(manifest.project, mediaAssets);
        Object.keys(expected.project).forEach(field => {
            if (manifest.project[field] !== expected.project[field]) throw new Error(`packageManifest.project.${field} no coincide con el proyecto declarado.`);
        });
        if (!Array.isArray(manifest.assets) || manifest.assets.length !== expected.assets.length) {
            throw new Error('El manifiesto no contabiliza todos los medios del proyecto.');
        }
        manifest.assets.forEach((entry, index) => {
            const actual = objectValue(entry, `packageManifest.assets[${index}]`);
            const canonical = expected.assets[index];
            Object.keys(canonical).forEach(field => {
                if (actual[field] !== canonical[field]) throw new Error(`packageManifest.assets[${index}].${field} no coincide con el medio declarado.`);
            });
        });
        return expected;
    }

    function validateProjectMetadata(project) {
        if (project && project.visualAnalytics != null) {
            throw new Error('Este proyecto contiene exploración visual Pro. Ábralo en Pro para conservar sus vistas y decisiones.');
        }
        if (!project || typeof project !== 'object' || Array.isArray(project)) {
            throw new Error('El proyecto debe ser un objeto JSON.');
        }
        if (project.schemaVersion == null && project.format == null) {
            return { schemaVersion: 0, legacy: true, edition: null, createdWith: null };
        }
        if (project.format !== PROJECT_FORMAT) throw new Error('El archivo no pertenece al formato de proyecto AnalizadorCualiUY.');
        if (!Number.isSafeInteger(project.schemaVersion) || project.schemaVersion < 1) {
            throw new Error('La versión del esquema de proyecto es inválida.');
        }
        if (project.schemaVersion > CURRENT_SCHEMA_VERSION) {
            throw new Error(`El proyecto usa el esquema ${project.schemaVersion}, posterior al máximo compatible ${CURRENT_SCHEMA_VERSION}.`);
        }
        if (!['beta', 'pro'].includes(project.edition)) throw new Error('La edición creadora del proyecto es inválida.');
        return {
            schemaVersion: project.schemaVersion,
            legacy: false,
            edition: project.edition,
            createdWith: typeof project.createdWith === 'string' ? project.createdWith : null
        };
    }

    function createProjectEnvelope(project, edition, createdWith) {
        if (!['beta', 'pro'].includes(edition)) throw new Error('La edición del proyecto es inválida.');
        const upgraded = upgradeProjectShape(project || {});
        const multimodal = normalizeProjectMediaContract({
            ...upgraded,
            mediaAssets: upgraded.mediaAssets || []
        });
        const methodologyProfile = normalizeMethodologyProfile(upgraded.methodologyProfile);
        const visualRelations = normalizeVisualRelations(
            upgraded.visualRelations,
            multimodal.documents,
            multimodal.codings
        );
        return Object.assign({}, upgraded, {
            format: PROJECT_FORMAT,
            schemaVersion: CURRENT_SCHEMA_VERSION,
            edition,
            createdWith: String(createdWith || ''),
            documents: multimodal.documents,
            codings: multimodal.codings,
            semanticRuns: Array.isArray(upgraded.semanticRuns) ? upgraded.semanticRuns : [],
            mediaAssets: multimodal.mediaAssets,
            ocrTranscriptions: multimodal.ocrTranscriptions,
            methodologyProfile,
            visualRelations
        });
    }

    function normalizeCodingSource(coding) {
        const value = String(coding && coding.source || '').toLowerCase();
        if (CODING_SOURCES.includes(value)) return value;
        if (value === 'automatic' || (coding && coding.automated === true) || String(coding && coding.id || '').startsWith('cod-auto-')) {
            return 'search';
        }
        if (value === 'manual') return 'manual';
        return 'legacy';
    }

    function inferCodingReviewStatus(coding, source) {
        const explicit = String(coding && (coding.reviewStatus || coding.status) || '').toLowerCase();
        if (CODING_REVIEW_STATUSES.includes(explicit)) return explicit;
        if (coding && coding.dismissed === true) return 'rejected';
        return source === 'manual' ? 'accepted' : 'legacy_unverified';
    }

    function normalizeCodingReview(coding) {
        const source = normalizeCodingSource(coding);
        const reviewStatus = inferCodingReviewStatus(coding, source);
        return {
            source,
            reviewStatus,
            dismissed: reviewStatus === 'rejected'
        };
    }

    function codingReviewStatus(coding) {
        return normalizeCodingReview(coding).reviewStatus;
    }

    function codingIncludedInReviewScope(coding, scope = 'accepted') {
        const normalizedScope = ANALYTICS_REVIEW_SCOPES.includes(scope) ? scope : 'accepted';
        const status = codingReviewStatus(coding);
        if (normalizedScope === 'all') return true;
        if (normalizedScope === 'open') return status !== 'rejected';
        return status === 'accepted';
    }

    function isRejectedCoding(coding) {
        return codingReviewStatus(coding) === 'rejected';
    }

    function categoryMap(categories) {
        return new Map((categories || []).map(category => [category.id, category]));
    }

    function validateHierarchy(categories, maxDepth = DEFAULT_MAX_DEPTH) {
        const items = categories || [];
        const byId = categoryMap(items);
        const visiting = new Set();
        const visited = new Set();
        const depths = new Map();

        function visit(category) {
            if (visited.has(category.id)) return depths.get(category.id);
            if (visiting.has(category.id)) {
                throw new Error(`La jerarquía contiene un ciclo que incluye la categoría ${category.id}.`);
            }
            visiting.add(category.id);
            let depth = 1;
            if (category.parentId != null) {
                const parent = byId.get(category.parentId);
                if (!parent) throw new Error(`La categoría ${category.id} referencia un padre inexistente.`);
                if (parent.id === category.id) throw new Error(`La categoría ${category.id} no puede ser su propio padre.`);
                depth = visit(parent) + 1;
            }
            if (depth > maxDepth) {
                throw new Error(`La categoría ${category.id} supera la profundidad máxima de ${maxDepth} niveles.`);
            }
            visiting.delete(category.id);
            visited.add(category.id);
            depths.set(category.id, depth);
            return depth;
        }

        items.forEach(visit);
        return depths;
    }

    function descendantCategoryIds(categories, rootId) {
        const children = new Map();
        (categories || []).forEach(category => {
            if (category.parentId == null) return;
            if (!children.has(category.parentId)) children.set(category.parentId, []);
            children.get(category.parentId).push(category.id);
        });
        const result = new Set();
        const pending = [rootId];
        while (pending.length) {
            const id = pending.pop();
            if (result.has(id)) continue;
            result.add(id);
            (children.get(id) || []).forEach(childId => pending.push(childId));
        }
        return result;
    }

    function wouldCreateCycle(categories, categoryId, candidateParentId) {
        if (candidateParentId == null) return false;
        if (categoryId === candidateParentId) return true;
        const byId = categoryMap(categories);
        const visited = new Set();
        let currentId = candidateParentId;
        while (currentId != null && !visited.has(currentId)) {
            if (currentId === categoryId) return true;
            visited.add(currentId);
            const current = byId.get(currentId);
            currentId = current ? current.parentId : null;
        }
        return false;
    }

    function canonicalQuote(document, coding) {
        const content = String(document && document.content || '');
        if ((document && document.kind === 'image') || (coding && coding.anchor && coding.anchor.kind === 'image-rect')) {
            throw new Error(`La codificación ${coding && coding.id || ''} no contiene una cita textual.`);
        }
        const start = Number(coding && coding.anchor && coding.anchor.kind === 'text' ? coding.anchor.startChar : coding && coding.startChar);
        const end = Number(coding && coding.anchor && coding.anchor.kind === 'text' ? coding.anchor.endChar : coding && coding.endChar);
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start || end > content.length) {
            throw new Error(`La codificación ${coding && coding.id || ''} contiene posiciones de texto inválidas.`);
        }
        return content.slice(start, end);
    }

    function buildTextSegments(content, codings) {
        const text = String(content || '');
        const valid = (codings || []).filter(coding => Number.isSafeInteger(coding.startChar)
            && Number.isSafeInteger(coding.endChar)
            && coding.startChar >= 0
            && coding.endChar > coding.startChar
            && coding.endChar <= text.length);
        const boundaries = new Set([0, text.length]);
        const starts = new Map();
        const ends = new Map();
        valid.forEach((coding, codingIndex) => {
            boundaries.add(coding.startChar);
            boundaries.add(coding.endChar);
            if (!starts.has(coding.startChar)) starts.set(coding.startChar, []);
            if (!ends.has(coding.endChar)) ends.set(coding.endChar, []);
            const entry = { coding, codingIndex };
            starts.get(coding.startChar).push(entry);
            ends.get(coding.endChar).push(entry);
        });
        const points = [...boundaries].sort((a, b) => a - b);
        const segments = [];
        const active = new Map();
        for (let index = 0; index < points.length - 1; index++) {
            const start = points[index];
            const end = points[index + 1];
            (ends.get(start) || []).forEach(entry => active.delete(entry.codingIndex));
            (starts.get(start) || []).forEach(entry => active.set(entry.codingIndex, entry.coding));
            if (end <= start) continue;
            const activeCodings = [...active.values()]
                .sort((a, b) => a.startChar - b.startChar || a.endChar - b.endChar || String(a.id).localeCompare(String(b.id)));
            segments.push({
                start,
                end,
                text: text.slice(start, end),
                codingIds: activeCodings.map(coding => coding.id)
            });
        }
        return segments;
    }

    function trimSelectionOffsets(content, start, end) {
        const text = String(content || '');
        let safeStart = Math.max(0, Math.min(Number(start) || 0, text.length));
        let safeEnd = Math.max(safeStart, Math.min(Number(end) || 0, text.length));
        const selected = text.slice(safeStart, safeEnd);
        const leading = (selected.match(/^\s+/) || [''])[0].length;
        const trailing = (selected.match(/\s+$/) || [''])[0].length;
        safeStart += leading;
        safeEnd = Math.max(safeStart, safeEnd - trailing);
        return { start: safeStart, end: safeEnd, text: text.slice(safeStart, safeEnd) };
    }

    function segmentElement(root, node) {
        let element = node && node.nodeType === 1 ? node : node && node.parentElement;
        while (element && element !== root) {
            if (element.dataset && element.dataset.textStart != null && element.dataset.textEnd != null) return element;
            element = element.parentElement;
        }
        return null;
    }

    function nodeTextLength(node) {
        if (!node) return 0;
        if (node.nodeType === 3) return String(node.textContent || '').length;
        if (node.childNodes) return Array.from(node.childNodes).reduce((sum, child) => sum + nodeTextLength(child), 0);
        return String(node.textContent || '').length;
    }

    function offsetWithinSegment(segment, target, offset) {
        if (target === segment && segment.childNodes) {
            return Array.from(segment.childNodes).slice(0, Math.max(0, offset)).reduce((sum, child) => sum + nodeTextLength(child), 0);
        }
        let total = 0;
        let found = false;
        function walk(node) {
            if (!node || found) return;
            if (node === target) {
                if (node.nodeType === 3) total += Math.max(0, offset);
                else if (node.childNodes) total += Array.from(node.childNodes).slice(0, Math.max(0, offset)).reduce((sum, child) => sum + nodeTextLength(child), 0);
                found = true;
                return;
            }
            if (node.nodeType === 3) {
                total += nodeTextLength(node);
                return;
            }
            if (node.childNodes) Array.from(node.childNodes).forEach(walk);
        }
        walk(segment);
        return found ? total : Math.max(0, offset);
    }

    function boundaryOffset(root, container, offset, isEnd) {
        const segment = segmentElement(root, container);
        if (segment) {
            const start = Number(segment.dataset.textStart);
            const end = Number(segment.dataset.textEnd);
            const local = offsetWithinSegment(segment, container, offset);
            return Math.max(start, Math.min(start + local, end));
        }
        if (container === root && root.children) {
            if (offset <= 0) return 0;
            if (offset >= root.children.length) {
                const last = root.children[root.children.length - 1];
                return last && last.dataset ? Number(last.dataset.textEnd) : 0;
            }
            const child = root.children[isEnd ? offset - 1 : offset];
            return Number(child.dataset[isEnd ? 'textEnd' : 'textStart']);
        }
        return null;
    }

    function rangeToOffsets(root, range, content) {
        if (!root || !range) return null;
        const start = boundaryOffset(root, range.startContainer, range.startOffset, false);
        const end = boundaryOffset(root, range.endContainer, range.endOffset, true);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
        return trimSelectionOffsets(content, Math.min(start, end), Math.max(start, end));
    }

    function findTextDiffBounds(oldContent, newContent) {
        const oldText = String(oldContent ?? '');
        const newText = String(newContent ?? '');
        const minLen = Math.min(oldText.length, newText.length);
        let prefixLen = 0;
        while (prefixLen < minLen && oldText.charCodeAt(prefixLen) === newText.charCodeAt(prefixLen)) {
            prefixLen += 1;
        }
        let suffixLen = 0;
        const maxSuffix = minLen - prefixLen;
        while (
            suffixLen < maxSuffix &&
            oldText.charCodeAt(oldText.length - 1 - suffixLen) === newText.charCodeAt(newText.length - 1 - suffixLen)
        ) {
            suffixLen += 1;
        }
        return {
            prefixLen,
            suffixLen,
            oldChangeEnd: oldText.length - suffixLen,
            newChangeEnd: newText.length - suffixLen,
            delta: newText.length - oldText.length
        };
    }

    function findBestContextMatch(newText, needle, expectedPos, windowRadius = 400) {
        if (!needle) return -1;
        const searchStart = Math.max(0, Math.floor(expectedPos - windowRadius));
        const searchEnd = Math.min(newText.length, Math.ceil(expectedPos + windowRadius + needle.length));
        const slice = newText.slice(searchStart, searchEnd);
        let bestIdx = -1;
        let bestDist = Infinity;
        let pos = slice.indexOf(needle);
        while (pos !== -1) {
            const absIdx = searchStart + pos;
            const dist = Math.abs(absIdx - expectedPos);
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = absIdx;
            }
            pos = slice.indexOf(needle, pos + 1);
        }
        return bestIdx;
    }

    function realignBoundaryOffset(oldText, newText, offset, isEnd, bounds) {
        if (offset <= bounds.prefixLen) return offset;
        if (offset >= bounds.oldChangeEnd) return offset + bounds.delta;

        const oldRegionLen = Math.max(1, bounds.oldChangeEnd - bounds.prefixLen);
        const newRegionLen = Math.max(0, bounds.newChangeEnd - bounds.prefixLen);
        const relativeRatio = (offset - bounds.prefixLen) / oldRegionLen;
        const expectedPos = bounds.prefixLen + relativeRatio * newRegionLen;
        const windowRadius = Math.max(250, Math.abs(bounds.delta) * 4 + 120);

        const contextLengths = [32, 20, 12, 6, 4];
        for (const len of contextLengths) {
            const leftCtx = oldText.slice(Math.max(0, offset - len), offset);
            const rightCtx = oldText.slice(offset, Math.min(oldText.length, offset + len));
            if (leftCtx.length >= 4 && rightCtx.length >= 4) {
                const combinedIdx = findBestContextMatch(newText, leftCtx + rightCtx, expectedPos - leftCtx.length, windowRadius);
                if (combinedIdx !== -1) {
                    return combinedIdx + leftCtx.length;
                }
            }
            if (!isEnd && rightCtx.length >= len) {
                const rightIdx = findBestContextMatch(newText, rightCtx, expectedPos, windowRadius);
                if (rightIdx !== -1) return rightIdx;
            }
            if (isEnd && leftCtx.length >= len) {
                const leftIdx = findBestContextMatch(newText, leftCtx, expectedPos - leftCtx.length, windowRadius);
                if (leftIdx !== -1) return leftIdx + leftCtx.length;
            }
            if (!isEnd && leftCtx.length >= len) {
                const leftIdx = findBestContextMatch(newText, leftCtx, expectedPos - leftCtx.length, windowRadius);
                if (leftIdx !== -1) return leftIdx + leftCtx.length;
            }
            if (isEnd && rightCtx.length >= len) {
                const rightIdx = findBestContextMatch(newText, rightCtx, expectedPos, windowRadius);
                if (rightIdx !== -1) return rightIdx;
            }
        }

        return null;
    }

    function correctionTextKey(value) {
        return String(value ?? '')
            .normalize('NFD')
            .replace(/\p{M}+/gu, '')
            .replace(/\s+/gu, ' ')
            .trim()
            .toLocaleLowerCase('es');
    }

    function isPlausibleTextCorrection(oldSlice, newSlice) {
        if (oldSlice === newSlice) return true;
        const oldKey = correctionTextKey(oldSlice);
        const newKey = correctionTextKey(newSlice);
        if (oldKey && oldKey === newKey) return true;
        if (!oldSlice.trim() || !newSlice.trim()) return false;

        const localBounds = findTextDiffBounds(oldSlice, newSlice);
        const unchanged = localBounds.prefixLen + localBounds.suffixLen;
        const maxLength = Math.max(oldSlice.length, newSlice.length);
        const minimumContext = maxLength <= 8 ? 2 : 4;
        const changedLength = Math.max(oldSlice.length - unchanged, newSlice.length - unchanged);
        return unchanged >= minimumContext
            && unchanged / maxLength >= 0.55
            && changedLength <= Math.max(12, Math.floor(maxLength * 0.45));
    }

    function realignTextSpanDetailed(oldContent, newContent, startChar, endChar, options = {}) {
        const oldText = String(oldContent ?? '');
        const newText = String(newContent ?? '');
        if (!Number.isInteger(startChar) || !Number.isInteger(endChar) || startChar < 0 || endChar <= startChar || endChar > oldText.length) {
            return { status: 'invalid', reason: 'invalid-source-range' };
        }
        if (newText.length === 0) return { status: 'deleted', reason: 'empty-document' };
        if (oldText === newText) {
            return { status: 'aligned', method: 'unchanged', start: startChar, end: endChar, text: newText.slice(startChar, endChar) };
        }

        const bounds = options.bounds || findTextDiffBounds(oldText, newText);
        const shouldTrim = options.trim !== false;
        const oldSlice = oldText.slice(startChar, endChar);
        let newStart = -1;
        let newEnd = -1;
        let method = 'shifted';
        let validateCorrection = false;

        if (endChar <= bounds.prefixLen) {
            newStart = startChar;
            newEnd = endChar;
        } else if (startChar >= bounds.oldChangeEnd) {
            newStart = startChar + bounds.delta;
            newEnd = endChar + bounds.delta;
        } else if (startChar <= bounds.prefixLen && endChar >= bounds.oldChangeEnd) {
            newStart = startChar;
            newEnd = endChar + bounds.delta;
            method = 'bounded-correction';
            validateCorrection = true;
        } else {
            if (oldText.indexOf(oldSlice) !== oldText.lastIndexOf(oldSlice)) {
                return { status: 'unresolved', reason: 'repeated-passage-in-edit' };
            }
            const oldRegionLen = Math.max(1, bounds.oldChangeEnd - bounds.prefixLen);
            const newRegionLen = Math.max(0, bounds.newChangeEnd - bounds.prefixLen);
            const expectedStart = startChar <= bounds.prefixLen
                ? startChar
                : bounds.prefixLen + ((startChar - bounds.prefixLen) / oldRegionLen) * newRegionLen;
            const windowRadius = Math.max(300, Math.abs(bounds.delta) * 4 + 150);
            const exactIdx = oldSlice.length >= 3
                ? findBestContextMatch(newText, oldSlice, expectedStart, windowRadius)
                : -1;

            // A surviving identical phrase outside the edited region can belong to a
            // different occurrence. Keep only a match within the replacement itself.
            if (exactIdx >= bounds.prefixLen && exactIdx + oldSlice.length <= bounds.newChangeEnd) {
                newStart = exactIdx;
                newEnd = exactIdx + oldSlice.length;
                method = 'exact-text';
            } else {
                newStart = realignBoundaryOffset(oldText, newText, startChar, false, bounds);
                newEnd = realignBoundaryOffset(oldText, newText, endChar, true, bounds);
                method = 'context-correction';
                validateCorrection = true;
            }
        }

        if (!Number.isFinite(newStart) || !Number.isFinite(newEnd)) {
            return { status: 'unresolved', reason: 'missing-context' };
        }
        if (method === 'context-correction' && (
            (startChar > bounds.prefixLen && newStart < bounds.prefixLen)
            || (endChar < bounds.oldChangeEnd && newEnd > bounds.newChangeEnd)
        )) {
            return { status: 'unresolved', reason: 'context-outside-edit' };
        }
        newStart = Math.max(0, Math.min(newText.length, newStart));
        newEnd = Math.max(0, Math.min(newText.length, newEnd));
        if (newEnd <= newStart) {
            return { status: 'deleted', reason: 'empty-target-range' };
        }

        let result;
        if (shouldTrim) {
            const trimmed = trimSelectionOffsets(newText, newStart, newEnd);
            if (!trimmed) return { status: 'deleted', reason: 'blank-target-range' };
            result = {
                start: trimmed.start,
                end: trimmed.end,
                text: newText.slice(trimmed.start, trimmed.end)
            };
        } else {
            const slice = newText.slice(newStart, newEnd);
            if (!slice.length) return { status: 'deleted', reason: 'empty-target-range' };
            result = { start: newStart, end: newEnd, text: slice };
        }

        if (validateCorrection && result.text !== oldSlice && !isPlausibleTextCorrection(oldSlice, result.text)) {
            return { status: 'unresolved', reason: 'ambiguous-replacement' };
        }
        if (result.text === oldSlice && oldText.indexOf(oldSlice) !== oldText.lastIndexOf(oldSlice)) {
            const occurrenceIndex = (text, offset) => {
                let count = 0;
                let position = text.indexOf(oldSlice);
                while (position !== -1 && position < offset) {
                    count += 1;
                    position = text.indexOf(oldSlice, position + 1);
                }
                return count;
            };
            if (occurrenceIndex(oldText, startChar) !== occurrenceIndex(newText, result.start)) {
                return { status: 'unresolved', reason: 'repeated-passage-moved' };
            }
        }
        return { status: 'aligned', method, ...result };
    }

    function realignTextSpan(oldContent, newContent, startChar, endChar, options = {}) {
        const result = realignTextSpanDetailed(oldContent, newContent, startChar, endChar, options);
        if (result.status !== 'aligned') return null;
        return { start: result.start, end: result.end, text: result.text };
    }

    function realignDocumentTextRecords(oldContent, newContent, {
        docId,
        codings = [],
        detections = [],
        corpusExclusions = []
    } = {}) {
        const oldText = String(oldContent ?? '');
        const newText = String(newContent ?? '');
        const bounds = findTextDiffBounds(oldText, newText);
        let preservedCodings = 0;
        let adjustedCodings = 0;
        let changedTextCodings = 0;
        let droppedCodings = 0;
        let unresolvedCodings = 0;
        let droppedDetections = 0;
        let unresolvedDetections = 0;
        let droppedExclusions = 0;
        let unresolvedExclusions = 0;
        let reclassifiedCodings = 0;
        const codingSpanByDetectionId = new Map();

        const nextCodings = [];
        for (const coding of (Array.isArray(codings) ? codings : [])) {
            if (!coding || coding.docId !== docId) {
                nextCodings.push(coding);
                continue;
            }
            const anchorKind = coding.anchor && typeof coding.anchor === 'object' ? coding.anchor.kind : 'text';
            if (anchorKind && anchorKind !== 'text') {
                nextCodings.push(coding);
                continue;
            }
            const startChar = Number.isInteger(coding.startChar)
                ? coding.startChar
                : (coding.anchor && Number.isInteger(coding.anchor.startChar) ? coding.anchor.startChar : -1);
            const endChar = Number.isInteger(coding.endChar)
                ? coding.endChar
                : (coding.anchor && Number.isInteger(coding.anchor.endChar) ? coding.anchor.endChar : -1);

            const alignment = realignTextSpanDetailed(oldText, newText, startChar, endChar, { bounds, trim: true });
            if (alignment.status !== 'aligned' || !alignment.text.trim()) {
                droppedCodings += 1;
                if (alignment.status === 'unresolved') unresolvedCodings += 1;
                continue;
            }
            const realigned = alignment;

            preservedCodings += 1;
            if (realigned.start !== startChar || realigned.end !== endChar || realigned.text !== coding.quoteText) {
                adjustedCodings += 1;
            }
            if (realigned.text !== oldText.slice(startChar, endChar)) changedTextCodings += 1;

            const updatedCoding = {
                ...coding,
                startChar: realigned.start,
                endChar: realigned.end,
                quoteText: realigned.text,
                anchor: {
                    kind: 'text',
                    startChar: realigned.start,
                    endChar: realigned.end
                }
            };
            if (Array.isArray(updatedCoding.detectionIds)) {
                updatedCoding.detectionIds.forEach(detId => {
                    if (detId && !codingSpanByDetectionId.has(detId)) {
                        codingSpanByDetectionId.set(detId, realigned);
                    }
                });
            }
            nextCodings.push(updatedCoding);
        }

        const survivingDetectionIds = new Set();
        const nextDetections = [];
        for (const detection of (Array.isArray(detections) ? detections : [])) {
            if (!detection || detection.docId !== docId) {
                if (detection && detection.id) survivingDetectionIds.add(detection.id);
                nextDetections.push(detection);
                continue;
            }
            let passageAlignment = realignTextSpanDetailed(oldText, newText, detection.startChar, detection.endChar, { bounds, trim: true });
            let passageSpan = passageAlignment.status === 'aligned' ? passageAlignment : null;
            if ((!passageSpan || !passageSpan.text.trim()) && detection.id && codingSpanByDetectionId.has(detection.id)) {
                passageSpan = codingSpanByDetectionId.get(detection.id);
                passageAlignment = { status: 'aligned', method: 'coding-anchor' };
            }
            if (!passageSpan || !passageSpan.text.trim()) {
                droppedDetections += 1;
                if (passageAlignment.status === 'unresolved') unresolvedDetections += 1;
                continue;
            }

            const matchAlignment = realignTextSpanDetailed(
                oldText,
                newText,
                Number.isInteger(detection.matchStart) ? detection.matchStart : detection.startChar,
                Number.isInteger(detection.matchEnd) ? detection.matchEnd : detection.endChar,
                { bounds, trim: false }
            );
            if (matchAlignment.status !== 'aligned') {
                droppedDetections += 1;
                if (matchAlignment.status === 'unresolved') unresolvedDetections += 1;
                continue;
            }
            const matchSpan = matchAlignment;
            let matchStart = matchSpan ? Math.max(passageSpan.start, Math.min(passageSpan.end - 1, matchSpan.start)) : passageSpan.start;
            let matchEnd = matchSpan ? Math.max(matchStart + 1, Math.min(passageSpan.end, matchSpan.end)) : passageSpan.end;
            let matchedText = newText.slice(matchStart, matchEnd);
            if (!matchedText.trim()) {
                matchStart = passageSpan.start;
                matchEnd = passageSpan.end;
                matchedText = passageSpan.text;
            }

            survivingDetectionIds.add(detection.id);
            nextDetections.push({
                ...detection,
                startChar: passageSpan.start,
                endChar: passageSpan.end,
                passageText: passageSpan.text,
                matchStart,
                matchEnd,
                matchedText
            });
        }

        const sanitizedCodings = nextCodings.map(coding => {
            if (!coding || coding.docId !== docId || !Array.isArray(coding.detectionIds) || coding.detectionIds.length === 0) {
                return coding;
            }
            const validDetectionIds = coding.detectionIds.filter(id => survivingDetectionIds.has(id));
            if (validDetectionIds.length === coding.detectionIds.length) {
                return coding;
            }
            if (validDetectionIds.length === 0 && (coding.source === 'search' || coding.source === 'model')) {
                reclassifiedCodings += 1;
                return {
                    ...coding,
                    source: 'manual',
                    detectionIds: []
                };
            }
            return {
                ...coding,
                detectionIds: validDetectionIds
            };
        });

        const nextCorpusExclusions = [];
        for (const ex of (Array.isArray(corpusExclusions) ? corpusExclusions : [])) {
            if (!ex || ex.docId !== docId) {
                nextCorpusExclusions.push(ex);
                continue;
            }
            const alignment = realignTextSpanDetailed(oldText, newText, ex.startChar, ex.endChar, { bounds, trim: false });
            if (alignment.status !== 'aligned' || !alignment.text.trim()) {
                droppedExclusions += 1;
                if (alignment.status === 'unresolved') unresolvedExclusions += 1;
                continue;
            }
            const span = alignment;
            nextCorpusExclusions.push({
                ...ex,
                startChar: span.start,
                endChar: span.end,
                text: span.text
            });
        }

        return {
            codings: sanitizedCodings,
            detections: nextDetections,
            corpusExclusions: nextCorpusExclusions,
            stats: {
                preservedCodings,
                adjustedCodings,
                changedTextCodings,
                droppedCodings,
                unresolvedCodings,
                droppedDetections,
                unresolvedDetections,
                droppedExclusions,
                unresolvedExclusions,
                reclassifiedCodings
            }
        };
    }

    global.ProjectIntegrity = {
        DEFAULT_MAX_DEPTH,
        PROJECT_FORMAT,
        CURRENT_SCHEMA_VERSION,
        PROJECT_PACKAGE_FORMAT,
        PROJECT_PACKAGE_VERSION,
        DOCUMENT_KINDS,
        CODING_ANCHOR_KINDS,
        IMAGE_MEDIA_TYPES,
        METHODOLOGY_APPROACHES,
        CODING_ORIENTATIONS,
        VISUAL_RELATION_TYPES,
        VISUAL_RELATION_STATUSES,
        CODING_SOURCES,
        CODING_REVIEW_STATUSES,
        ANALYTICS_REVIEW_SCOPES,
        SEMANTIC_RUN_STATUSES,
        SEMANTIC_OUTCOME_STATUSES,
        SEMANTIC_VECTOR_ORIGINS,
        validateProjectMetadata,
        createProjectEnvelope,
        validateMediaAssets,
        normalizeDocumentKind,
        normalizeCodingAnchor,
        normalizeOcrTranscriptions,
        emptyMethodologyProfile,
        normalizeMethodologyProfile,
        methodologyProfileHasContent,
        normalizeVisualRelations,
        normalizeProjectMediaContract,
        downgradeProjectToSchema6,
        downgradeProjectToSchema5,
        downgradeProjectToSchema4,
        createProjectPackageManifest,
        validateProjectPackageManifest,
        validateSemanticRuns,
        normalizeSemanticVectors,
        createLegacySemanticRun,
        normalizeModelDetectionMetadata,
        normalizeCodingSource,
        normalizeCodingReview,
        codingReviewStatus,
        codingIncludedInReviewScope,
        isRejectedCoding,
        validateHierarchy,
        descendantCategoryIds,
        wouldCreateCycle,
        canonicalQuote,
        buildTextSegments,
        trimSelectionOffsets,
        rangeToOffsets,
        realignTextSpan,
        realignDocumentTextRecords
    };
})(typeof window !== 'undefined' ? window : globalThis);
