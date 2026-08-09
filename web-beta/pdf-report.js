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

    async function createStudentAssignmentReport(state, options = {}) {
        const { PDFLib, fontkit } = requireLibraries();
        const pdfDoc = await PDFLib.PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);

        const fontRegularBytes = await loadBytes(options.fontRegularBytes, FONT_PATHS.regular);
        const fontBoldBytes = await loadBytes(options.fontBoldBytes, FONT_PATHS.bold);

        const regular = await pdfDoc.embedFont(fontRegularBytes, { subset: true });
        const bold = await pdfDoc.embedFont(fontBoldBytes, { subset: true });
        const supported = new Set([...regular.getCharacterSet(), ...bold.getCharacterSet()]);

        const wrapRegular = makeWrapper(regular, supported);
        const wrapBold = makeWrapper(bold, supported);

        const colors = {
            primary: PDFLib.rgb(0.06, 0.46, 0.43),
            text: PDFLib.rgb(0.12, 0.16, 0.23),
            muted: PDFLib.rgb(0.38, 0.45, 0.55),
            border: PDFLib.rgb(0.85, 0.88, 0.92)
        };

        const pages = [];
        let currentPage = pdfDoc.addPage(A4);
        pages.push(currentPage);
        let cursorY = A4[1] - MARGIN;

        function addPage() {
            currentPage = pdfDoc.addPage(A4);
            pages.push(currentPage);
            cursorY = A4[1] - MARGIN;
            return currentPage;
        }

        function ensureSpace(needed) {
            if (cursorY - needed < MARGIN + 24) addPage();
        }

        function heading(text, level = 1) {
            const size = level === 1 ? 14 : 11;
            const font = bold;
            const lines = (level === 1 ? wrapBold : wrapRegular).wrap(text, size, A4[0] - MARGIN * 2);
            const height = lines.length * (size + 4) + (level === 1 ? 12 : 6);
            ensureSpace(height);

            if (level === 1) {
                currentPage.drawRectangle({
                    x: MARGIN,
                    y: cursorY - (lines.length * (size + 4)) - 2,
                    width: A4[0] - MARGIN * 2,
                    height: lines.length * (size + 4) + 4,
                    color: PDFLib.rgb(0.94, 0.97, 0.97)
                });
            }

            for (const line of lines) {
                cursorY -= size + 4;
                currentPage.drawText(line, {
                    x: MARGIN + (level === 1 ? 6 : 0),
                    y: cursorY + 2,
                    size,
                    font,
                    color: level === 1 ? colors.primary : colors.text
                });
            }
            cursorY -= level === 1 ? 8 : 4;
        }

        function paragraph(text, size = 9.5, isBold = false, spacing = 8, color = colors.text) {
            const wrapper = isBold ? wrapBold : wrapRegular;
            const lines = wrapper.wrap(text, size, A4[0] - MARGIN * 2);
            ensureSpace(lines.length * (size + 3.5) + spacing);

            for (const line of lines) {
                cursorY -= size + 3.5;
                currentPage.drawText(line, {
                    x: MARGIN,
                    y: cursorY,
                    size,
                    font: isBold ? bold : regular,
                    color
                });
            }
            cursorY -= spacing;
        }

        // Header / Cover Block
        heading('EDICIÓN EDUCATIVA — FICHA DE TRABAJO PRÁCTICO');
        paragraph(`Estudiante / Equipo: ${options.studentName || 'Sin especificar'}`, 10, true, 4);
        paragraph(`Cátedra / Asignatura: ${options.courseName || 'Metodología de la Investigación Cualitativa'}`, 9.5, false, 4);
        paragraph(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}`, 9, false, 12, colors.muted);

        // Section 1: Pregunta & Corpus
        heading('1. Pregunta de Investigación y Corpus');
        paragraph(`Pregunta / Objetivo: ${options.researchQuestion || 'No especificada.'}`, 9.5, true, 6);
        paragraph(`Documentos analizados (${(state.documents || []).length}):`, 9, true, 4);
        for (const doc of (state.documents || [])) {
            paragraph(`• ${doc.title} (${(doc.content || '').split(/\s+/).length.toLocaleString()} palabras)`, 8.5, false, 3);
        }
        cursorY -= 8;

        // Section 2: Libro de Códigos
        heading('2. Libro de Códigos y Criterios de Inclusión');
        for (const cat of (state.categories || [])) {
            const codeLabel = cat.code ? ` [${cat.code}]` : '';
            const parentLabel = cat.parentId ? ' (Subcategoría)' : '';
            heading(`${cat.name}${codeLabel}${parentLabel}`, 2);
            paragraph(`Criterio de Inclusión: ${cat.description || 'Sin criterio redactado.'}`, 9, false, 6, colors.muted);
        }

        // Section 3: Citas y Memos
        heading('3. Evidencias Codificadas y Memos Interpretativos');
        const docMap = new Map((state.documents || []).map(d => [d.id, d.title]));
        const codings = state.codings || [];
        if (codings.length === 0) {
            paragraph('No se han registrado pasajes codificados aún.', 9, false, 8, colors.muted);
        } else {
            for (const cat of (state.categories || [])) {
                const matches = codings.filter(c => c.categoryId === cat.id);
                if (!matches.length) continue;
                heading(`Categoría: ${cat.name}`, 2);
                for (const coding of matches) {
                    const docTitle = docMap.get(coding.docId) || 'Documento';
                    paragraph(`${docTitle}: “${coding.quoteText || ''}”`, 9, false, 4);
                    if (coding.memo) {
                        paragraph(`Memo interpretativo: ${coding.memo}`, 8.5, false, 8, colors.primary);
                    } else {
                        paragraph('Memo: [Pendiente de redactar por el estudiante]', 8.5, false, 8, colors.muted);
                    }
                }
            }
        }

        // Section 4: Apéndice Metodológico
        heading('4. Apéndice y Autoevaluación Metodológica');
        paragraph('Esta ficha documenta el proceso cualitativo desde la evidencia textual hasta la interpretación analítica. La codificación abre la vía a la conceptualización; los memos fundamentan las inferencias.', 8.5, false, 12, colors.muted);

        // Watermarks & Page Numbers
        const eduHeader = 'ANALIZADORCUALIUY EDUCATIVA — TRABAJO PRÁCTICO ESTUDIANTIL';
        const eduFooter = 'Uso formativo y docente | Desarrollador: S. Hernández';
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            page.drawText(eduHeader, { x: MARGIN, y: A4[1] - 25, size: 7.5, font: bold, color: colors.primary, opacity: 0.8 });
            page.drawText(eduFooter, { x: MARGIN, y: 24, size: 7.5, font: regular, color: colors.muted });
            const pNum = `${i + 1}/${pages.length}`;
            page.drawText(pNum, { x: A4[0] - MARGIN - regular.widthOfTextAtSize(pNum, 7.5), y: 24, size: 7.5, font: regular, color: colors.muted });
        }

        pdfDoc.setTitle(validateText(`Ficha de Trabajo Práctico - ${options.studentName || 'Estudiante'}`, supported));
        pdfDoc.setAuthor(validateText(options.studentName || 'Estudiante', supported));
        pdfDoc.setCreator('AnalizadorCualiUY Educativa');
        pdfDoc.setCreationDate(new Date());

        const bytes = await pdfDoc.save({ useObjectStreams: false, addDefaultPage: false });
        return new Blob([bytes], { type: 'application/pdf' });
    }

    global.PdfReportExporter = { createAnalyticalReport, createStudentAssignmentReport };
})(typeof window !== 'undefined' ? window : globalThis);
