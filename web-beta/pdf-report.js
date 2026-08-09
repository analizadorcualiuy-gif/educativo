/* Offline PDF report generator with embedded Unicode fonts. */
(function (global) {
    'use strict';

    const A4 = [595.28, 841.89];
    const MARGIN = 48;
    const RTL_PATTERN = /[\u0590-\u08ff\ufb1d-\ufefc]/u;
    const FONT_PATHS = {
        regular: 'public/vendor/LiberationSans-Regular.ttf',
        bold: 'public/vendor/LiberationSans-Bold.ttf'
    };

    function requireLibraries() {
        if (!global.PDFLib || !global.fontkit) {
            throw new Error('No se pudieron cargar las bibliotecas locales de exportación PDF. Reinstale la aplicación.');
        }
        return { PDFLib: global.PDFLib, fontkit: global.fontkit };
    }

    async function loadBytes(value, fallbackPath) {
        if (value) return value instanceof Uint8Array ? value : new Uint8Array(value);
        if (typeof global.fetch !== 'function') throw new Error('No se pudo leer la fuente Unicode para exportar el PDF.');
        const url = global.location ? new URL(fallbackPath, global.location.href) : fallbackPath;
        const response = await global.fetch(url);
        if (!response.ok) throw new Error(`No se pudo cargar la fuente Unicode (${response.status}).`);
        return new Uint8Array(await response.arrayBuffer());
    }

    function validateText(value, supported) {
        const text = String(value == null ? '' : value).normalize('NFC');
        if (RTL_PATTERN.test(text)) {
            throw new Error('El PDF no admite aún escritura bidireccional (árabe o hebreo). Exporte a DOCX para conservarla correctamente.');
        }
        const missing = [];
        for (const character of text) {
            const codePoint = character.codePointAt(0);
            if (codePoint === 9 || codePoint === 10 || codePoint === 13) continue;
            if (!supported.has(codePoint) && !missing.includes(character)) missing.push(character);
            if (missing.length >= 8) break;
        }
        if (missing.length) {
            throw new Error(`El PDF no puede representar estos caracteres con la fuente incluida: ${missing.join(' ')}. Exporte a DOCX o quite esos caracteres.`);
        }
        return text;
    }

    function makeWrapper(font, supported) {
        function width(text, size) { return font.widthOfTextAtSize(text, size); }
        function splitWord(word, maxWidth, size) {
            const parts = [];
            let part = '';
            for (const character of word) {
                if (part && width(part + character, size) > maxWidth) {
                    parts.push(part);
                    part = character;
                } else part += character;
            }
            if (part) parts.push(part);
            return parts.length ? parts : [''];
        }
        return function wrap(value, maxWidth, size) {
            const source = validateText(value, supported).replace(/\s+/gu, ' ').trim();
            if (!source) return [''];
            const lines = [];
            let line = '';
            for (const word of source.split(' ')) {
                const candidate = line ? `${line} ${word}` : word;
                if (width(candidate, size) <= maxWidth) {
                    line = candidate;
                    continue;
                }
                if (line) lines.push(line);
                const chunks = splitWord(word, maxWidth, size);
                line = chunks.pop() || '';
                lines.push(...chunks);
            }
            if (line) lines.push(line);
            return lines.length ? lines : [''];
        };
    }

    async function createAnalyticalReport(rawOptions) {
        const options = rawOptions || {};
        const { PDFLib, fontkit } = requireLibraries();
        const pdfDoc = await PDFLib.PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);
        const regularBytes = await loadBytes(options.fontBytes, FONT_PATHS.regular);
        const boldBytes = await loadBytes(options.boldFontBytes, FONT_PATHS.bold);
        const regular = await pdfDoc.embedFont(regularBytes, { subset: false });
        const bold = await pdfDoc.embedFont(boldBytes, { subset: false });
        const supported = new Set(regular.getCharacterSet().filter(codePoint => bold.getCharacterSet().includes(codePoint)));
        const wrapRegular = makeWrapper(regular, supported);
        const wrapBold = makeWrapper(bold, supported);
        const analytics = options.analytics || { stats: [], edges: [], documents: [], totalWords: 0 };
        const quality = options.quality || {};
        const categories = options.categories || [];
        const categoryMap = new Map(categories.map(category => [category.id, category]));
        const documentMap = new Map((options.documents || []).map(document => [document.id, document]));
        const pages = [];
        let page;
        let y;

        const colors = {
            body: PDFLib.rgb(0.08, 0.12, 0.20),
            muted: PDFLib.rgb(0.35, 0.40, 0.47),
            primary: PDFLib.rgb(0.18, 0.45, 0.71),
            dark: PDFLib.rgb(0.04, 0.15, 0.27),
            secondary: PDFLib.rgb(0.12, 0.30, 0.47),
            line: PDFLib.rgb(0.82, 0.85, 0.89)
        };

        function newPage() {
            page = pdfDoc.addPage(A4);
            pages.push(page);
            y = A4[1] - MARGIN;
        }
        function ensure(height) { if (y - height < MARGIN + 18) newPage(); }
        function text(value, size = 10, isBold = false, indent = 0, color = colors.body) {
            const font = isBold ? bold : regular;
            const wrapper = isBold ? wrapBold : wrapRegular;
            const lineHeight = size * 1.38;
            const maxWidth = A4[0] - (MARGIN * 2) - indent;
            for (const line of wrapper(value, maxWidth, size)) {
                ensure(lineHeight);
                page.drawText(line, { x: MARGIN + indent, y, size, font, color });
                y -= lineHeight;
            }
        }
        function heading(value, level = 1) {
            ensure(level === 1 ? 38 : 28);
            y -= level === 1 ? 10 : 5;
            text(value, level === 1 ? 15 : 12, true, 0, level === 1 ? colors.primary : colors.secondary);
            y -= 4;
        }
        function fixed(value, digits = 1) {
            const number = Number(value);
            return Number.isFinite(number) ? number.toFixed(digits) : (0).toFixed(digits);
        }

        newPage();
        text(options.title || 'Informe de análisis cualitativo', 22, true, 0, colors.dark);
        text(`${options.author || 'Equipo investigador'} | ${options.date || ''}`, 10, false, 0, colors.muted);
        y -= 10;
        page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness: 1, color: colors.line });
        y -= 16;
        text(`Corpus: ${(analytics.documents || []).length} documentos | ${categories.length} categorías | ${(options.codings || []).length} pasajes | ${analytics.totalWords || 0} palabras`, 10, true);

        heading('1. Resumen ejecutivo');
        text(options.objective || 'Objetivo no especificado.');
        const ranked = [...(analytics.stats || [])].sort((a, b) => Number(b.perThousand || 0) - Number(a.perThousand || 0));
        if (ranked.length) {
            const leader = categoryMap.get(ranked[0].id) || {};
            text(`La mayor tasa normalizada corresponde a ${leader.name || ranked[0].id}: ${fixed(ranked[0].perThousand)} pasajes por 1.000 palabras, presente en ${fixed(Number(ranked[0].documentShare || 0) * 100)}% de los documentos.`);
        }
        heading('2. Corpus y metodología');
        text(options.methodology || `Codificación categorial. Unidad de coocurrencia: ${analytics.options ? analytics.options.unit : 'párrafo'}; métrica: ${analytics.options ? analytics.options.metric : 'Jaccard'}.`);
        text(`Cobertura: ${fixed(Number(quality.coverage || 0) * 100)}% | Manual: ${quality.manual || 0} | Automática: ${quality.automatic || 0}`, 10, true);

        heading('3. Distribución categorial');
        const maxRate = Math.max(0.001, ...ranked.map(stat => Number(stat.perThousand || 0)));
        for (const stat of ranked) {
            ensure(34);
            const category = categoryMap.get(stat.id) || {};
            text(`${category.name || stat.id}: ${stat.count || 0} pasajes | ${fixed(stat.perThousand)}/1.000 | ${fixed(Number(stat.documentShare || 0) * 100)}% documentos`, 9, true);
            const width = Math.max(0, (A4[0] - MARGIN * 2) * Number(stat.perThousand || 0) / maxRate);
            page.drawRectangle({ x: MARGIN, y: y + 2, width, height: 7, color: colors.primary });
            y -= 12;
        }

        if (options.includeRelations !== false) {
            heading('4. Relaciones principales');
            for (const edge of [...(analytics.edges || [])].sort((a, b) => Number(b.metricValue || 0) - Number(a.metricValue || 0)).slice(0, options.detail === 'full' ? 25 : 10)) {
                const a = categoryMap.get(edge.sourceId) || {};
                const b = categoryMap.get(edge.targetId) || {};
                text(`${a.name || edge.sourceId} ↔ ${b.name || edge.targetId}: ${edge.count || 0} coincidencias; Jaccard ${fixed(Number(edge.jaccard || 0) * 100)}%; documentos ${fixed(Number(edge.documentShare || 0) * 100)}%.`, 9, false, 8);
            }
        }
        if (options.includeQuality !== false) {
            heading('5. Control de calidad');
            text(`Memos faltantes: ${(quality.missingMemos || []).length}. Categorías incompletas: ${(quality.incompleteCategories || []).length}. Documentos sin codificar: ${(quality.uncodedDocuments || []).length}. Duplicados: ${(quality.duplicates || []).length}. Solapamientos: ${(quality.overlaps || []).length}.`);
        }
        if (options.includeEvidence !== false) {
            heading('6. Evidencias y memos');
            for (const category of categories) {
                const matches = (options.codings || []).filter(coding => coding.categoryId === category.id);
                if (!matches.length) continue;
                heading(`${category.name} [${category.code || 'SIN CÓDIGO'}]`, 2);
                for (const coding of matches.slice(0, options.detail === 'full' ? matches.length : 3)) {
                    const source = documentMap.get(coding.docId);
                    text(`${source ? source.title : 'Documento'}: “${coding.quoteText || ''}”`, 9, false, 8);
                    if (coding.memo) text(`Memo: ${coding.memo}`, 9, false, 16, colors.muted);
                }
            }
        }
        heading('7. Conclusiones');
        text(options.conclusions || 'Conclusiones no especificadas.');
        heading('Apéndice metodológico');
        text('Las asociaciones describen proximidad dentro del corpus y no implican causalidad. Deben interpretarse junto con las citas, los memos y la búsqueda de casos negativos.', 9);

        const evaluationTitle = 'VERSIÓN BETA — INFORME DE EVALUACIÓN';
        const evaluationFooter = 'AnalizadorCualiUY Beta | Uso de evaluación | Desarrollador: S. Hernández';
        for (let index = 0; index < pages.length; index += 1) {
            const target = pages[index];
            if (options.evaluation) {
                target.drawText(evaluationTitle, { x: MARGIN, y: A4[1] - 25, size: 8, font: bold, color: PDFLib.rgb(0.72, 0.18, 0.18), opacity: 0.85 });
                target.drawText(evaluationFooter, { x: MARGIN, y: 24, size: 8, font: regular, color: colors.muted });
            }
            const pageNumber = `${index + 1}/${pages.length}`;
            target.drawText(pageNumber, { x: A4[0] - MARGIN - regular.widthOfTextAtSize(pageNumber, 8), y: 24, size: 8, font: regular, color: colors.muted });
        }

        pdfDoc.setTitle(validateText(options.title || 'Informe de análisis cualitativo', supported));
        pdfDoc.setAuthor(validateText(options.author || 'AnalizadorCualiUY', supported));
        pdfDoc.setCreator('AnalizadorCualiUY 1.0.0');
        pdfDoc.setProducer('pdf-lib 1.17.1');
        pdfDoc.setCreationDate(new Date());
        const bytes = await pdfDoc.save({ useObjectStreams: false, addDefaultPage: false });
        return new Blob([bytes], { type: 'application/pdf' });
    }

    global.PdfReportExporter = { createAnalyticalReport };
})(typeof window !== 'undefined' ? window : globalThis);
