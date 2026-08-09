/* Offline PDF report generator with embedded Unicode fonts. */
(function (global) {
    'use strict';

    const A4 = [595.28, 841.89];
    const MARGIN = 48;
    const MAX_HIGHLIGHT_BANDS = 8;
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

    function normalizePdfWhitespace(value) {
        return String(value == null ? '' : value)
            .replace(/\r\n?/gu, '\n')
            .replace(/[\u2028\u2029]/gu, '\n')
            .replace(/\t/gu, '    ')
            .replace(/[\f\v]/gu, ' ')
            .replace(/\p{Zs}/gu, ' ');
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
            const source = validateText(normalizePdfWhitespace(value), supported);
            if (!source) return [''];
            const lines = [];
            source.split('\n').forEach(sourceLine => {
                const normalizedLine = sourceLine;
                if (!normalizedLine) {
                    lines.push('');
                    return;
                }
                let line = '';
                for (const token of normalizedLine.match(/ +|[^ ]+/gu) || []) {
                    const candidate = line + token;
                    if (width(candidate, size) <= maxWidth) {
                        line = candidate;
                        continue;
                    }
                    if (line) lines.push(line);
                    const chunks = splitWord(token, maxWidth, size);
                    line = chunks.pop() || '';
                    lines.push(...chunks);
                }
                lines.push(line);
            });
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
                if (line) page.drawText(line, { x: MARGIN + indent, y, size, font, color });
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
            const relationDiagnostics = analytics.diagnostics || {};
            if (relationDiagnostics.pairScanTruncated) {
                text('Aviso: el barrido alcanzó su límite de seguridad; algunas relaciones y sus recuentos pueden ser parciales.', 9, true, 8, colors.muted);
            } else if (relationDiagnostics.pairRecordLimitReached) {
                text('Aviso: se omitieron relaciones adicionales por el límite de seguridad; las relaciones mostradas conservan sus recuentos completos.', 9, true, 8, colors.muted);
            }
            if (relationDiagnostics.evidenceTruncated) {
                text(`Las muestras de evidencia por relación fueron acotadas; se omitieron ${relationDiagnostics.omittedEvidence || 0} evidencias sin alterar las métricas.`, 9, false, 8, colors.muted);
            }
        }
        if (options.includeQuality !== false) {
            heading('5. Control de calidad');
            const overlapDiagnostics = quality.overlapDiagnostics || {};
            const overlapTotal = Number.isFinite(Number(overlapDiagnostics.totalDetected))
                ? Number(overlapDiagnostics.totalDetected)
                : (quality.overlaps || []).length;
            const duplicateDiagnostics = quality.duplicateDiagnostics || {};
            const duplicateTotal = Number.isFinite(Number(duplicateDiagnostics.totalDetected))
                ? Number(duplicateDiagnostics.totalDetected)
                : (quality.duplicates || []).length;
            text(`Memos faltantes: ${(quality.missingMemos || []).length}. Categorías incompletas: ${(quality.incompleteCategories || []).length}. Documentos sin codificar: ${(quality.uncodedDocuments || []).length}. Duplicados: ${duplicateTotal}. Solapamientos: ${overlapTotal}.`);
            if (duplicateDiagnostics.truncated) {
                text(`Detalle acotado: se conservaron ${duplicateDiagnostics.returned || 0} de ${duplicateTotal} duplicados; el total informado sí es exacto.`, 9, false, 8, colors.muted);
            }
            if (overlapDiagnostics.truncated) {
                text(`Detalle acotado: se conservaron ${overlapDiagnostics.returned || 0} de ${overlapTotal} pares solapados; el total informado sí es exacto.`, 9, false, 8, colors.muted);
            }
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
        const evaluationFooter = 'AnalizadorCualiUY Beta | Uso de evaluación';
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
        pdfDoc.setCreator('AnalizadorCualiUY 1.0.4');
        pdfDoc.setProducer('pdf-lib 1.17.1');
        pdfDoc.setCreationDate(new Date());
        const bytes = await pdfDoc.save({ useObjectStreams: false, addDefaultPage: false });
        return new Blob([bytes], { type: 'application/pdf' });
    }

    function* codedSegments(content, codings, validCategoryIds) {
        const text = String(content || '');
        const valid = (codings || []).filter(coding => Number.isSafeInteger(coding.startChar)
            && Number.isSafeInteger(coding.endChar)
            && coding.startChar >= 0
            && coding.endChar > coding.startChar
            && coding.endChar <= text.length
            && validCategoryIds.has(coding.categoryId));
        const boundaries = new Set([0, text.length]);
        const starts = new Map();
        const ends = new Map();
        valid.forEach(coding => {
            boundaries.add(coding.startChar);
            boundaries.add(coding.endChar);
            if (!starts.has(coding.startChar)) starts.set(coding.startChar, []);
            if (!ends.has(coding.endChar)) ends.set(coding.endChar, []);
            starts.get(coding.startChar).push(coding.categoryId);
            ends.get(coding.endChar).push(coding.categoryId);
        });
        const points = [...boundaries].sort((a, b) => a - b);
        const activeCategories = new Map();
        for (let index = 0; index < points.length - 1; index += 1) {
            const start = points[index];
            const end = points[index + 1];
            (ends.get(start) || []).forEach(categoryId => {
                const remaining = (activeCategories.get(categoryId) || 0) - 1;
                if (remaining > 0) activeCategories.set(categoryId, remaining);
                else activeCategories.delete(categoryId);
            });
            (starts.get(start) || []).forEach(categoryId => {
                activeCategories.set(categoryId, (activeCategories.get(categoryId) || 0) + 1);
            });
            if (end <= start) continue;
            const categoryIds = [];
            for (const categoryId of activeCategories.keys()) {
                categoryIds.push(categoryId);
                if (categoryIds.length === MAX_HIGHLIGHT_BANDS) break;
            }
            yield {
                text: text.slice(start, end),
                categoryIds,
                hiddenCategoryCount: Math.max(0, activeCategories.size - categoryIds.length)
            };
        }
    }

    function parseHexColor(PDFLib, value) {
        const match = /^#([0-9a-f]{6})$/iu.exec(String(value || ''));
        if (!match) return PDFLib.rgb(0.23, 0.51, 0.96);
        const number = Number.parseInt(match[1], 16);
        return PDFLib.rgb(((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255);
    }

    async function createCodedDocument(rawOptions) {
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
        const documents = Array.isArray(options.documents) ? options.documents : [];
        const categories = Array.isArray(options.categories) ? options.categories : [];
        const codings = Array.isArray(options.codings) ? options.codings.filter(coding => !coding.dismissed) : [];
        const categoryMap = new Map(categories.map(category => [category.id, category]));
        const documentMap = new Map(documents.map(document => [document.id, document]));
        const validCategoryIds = new Set(categoryMap.keys());
        const pages = [];
        const bodyColor = PDFLib.rgb(0.08, 0.12, 0.20);
        const mutedColor = PDFLib.rgb(0.35, 0.40, 0.47);
        const headingColor = PDFLib.rgb(0.08, 0.30, 0.55);
        const ruleColor = PDFLib.rgb(0.82, 0.85, 0.89);
        let page;
        let y;

        function newPage() {
            page = pdfDoc.addPage(A4);
            pages.push(page);
            y = A4[1] - MARGIN;
        }
        function ensure(height) {
            if (!page || y - height < MARGIN + 16) newPage();
        }
        function write(value, size = 10, isBold = false, indent = 0, color = bodyColor) {
            const font = isBold ? bold : regular;
            const wrapper = isBold ? wrapBold : wrapRegular;
            const lineHeight = size * 1.38;
            const width = A4[0] - (MARGIN * 2) - indent;
            for (const line of wrapper(value, width, size)) {
                ensure(lineHeight);
                if (line) page.drawText(line, { x: MARGIN + indent, y, size, font, color });
                y -= lineHeight;
            }
        }
        function heading(value, level = 1, keepNextHeight = 0) {
            const size = level === 1 ? 15 : 11;
            const topSpacing = level === 1 ? 8 : 4;
            const lines = wrapBold(value, A4[0] - (MARGIN * 2), size);
            ensure(topSpacing + (lines.length * size * 1.38) + 3 + keepNextHeight);
            y -= topSpacing;
            write(value, size, true, 0, headingColor);
            y -= 3;
        }
        function drawLegend() {
            heading('Leyenda de categorías', 2);
            categories.forEach(category => {
                const label = `${category.parentId ? '- ' : ''}${category.name}${category.code ? ` [${category.code}]` : ''}`;
                const entryHeight = Math.max(18, wrapRegular(label, A4[0] - (MARGIN * 2) - 16, 9).length * 9 * 1.38);
                ensure(entryHeight);
                const paint = backgroundColors([category.id], 0)[0];
                page.drawRectangle({
                    x: MARGIN,
                    y: y - 1,
                    width: 10,
                    height: 10,
                    color: paint.fill,
                    borderColor: paint.border,
                    borderWidth: 0.5,
                    borderOpacity: 0.75
                });
                write(label, 9, false, 16);
            });
            if (categories.length > MAX_HIGHLIGHT_BANDS) {
                write(`En solapamientos de más de ${MAX_HIGHLIGHT_BANDS} categorías, una franja gris representa las categorías adicionales.`, 8, false, 16, mutedColor);
            }
        }
        function backgroundColors(categoryIds, hiddenCategoryCount) {
            const paints = categoryIds.map(categoryId => {
                const category = categoryMap.get(categoryId);
                const match = /^#([0-9a-f]{6})$/iu.exec(String(category && category.color || ''));
                const value = match ? Number.parseInt(match[1], 16) : 0x3b82f6;
                const red = (value >> 16) & 255;
                const green = (value >> 8) & 255;
                const blue = value & 255;
                const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
                return {
                    fill: parseHexColor(PDFLib, category && category.color),
                    border: luminance > 0.86 ? PDFLib.rgb(0.38, 0.43, 0.49) : parseHexColor(PDFLib, category && category.color)
                };
            });
            if (hiddenCategoryCount > 0) {
                paints.push({ fill: PDFLib.rgb(0.45, 0.49, 0.55), border: PDFLib.rgb(0.25, 0.29, 0.34) });
            }
            return paints;
        }
        function drawStyledDocument(content, documentCodings) {
            const size = 10;
            const lineHeight = 15;
            const left = MARGIN;
            const right = A4[0] - MARGIN;
            let x = left;

            function ensureLine() {
                if (!page || y - lineHeight < MARGIN + 16) {
                    newPage();
                    x = left;
                }
            }
            function nextLine() {
                x = left;
                y -= lineHeight;
                ensureLine();
            }
            function drawPiece(piece, colors) {
                if (!piece) return;
                const width = regular.widthOfTextAtSize(piece, size);
                if (colors.length && width > 0) {
                    const bandHeight = (lineHeight - 3) / colors.length;
                    colors.forEach((paint, index) => {
                        page.drawRectangle({
                            x,
                            y: y - 3 + (index * bandHeight),
                            width,
                            height: bandHeight,
                            color: paint.fill,
                            opacity: colors.length === 1 ? 0.30 : 0.24,
                            borderColor: paint.border,
                            borderWidth: 0.25,
                            borderOpacity: 0.55
                        });
                    });
                }
                if (/\S/u.test(piece)) page.drawText(piece, { x, y, size, font: regular, color: bodyColor });
                x += width;
            }
            function drawToken(token, colors) {
                let remaining = token;
                while (remaining) {
                    ensureLine();
                    const available = right - x;
                    if (x > left && regular.widthOfTextAtSize(remaining, size) > available) {
                        nextLine();
                        continue;
                    }
                    let piece = '';
                    for (const character of remaining) {
                        const candidate = piece + character;
                        if (piece && regular.widthOfTextAtSize(candidate, size) > right - x) break;
                        piece = candidate;
                    }
                    if (!piece) {
                        nextLine();
                        continue;
                    }
                    drawPiece(piece, colors);
                    remaining = remaining.slice(piece.length);
                    if (remaining) nextLine();
                }
            }

            ensureLine();
            for (const segment of codedSegments(content, documentCodings, validCategoryIds)) {
                const colors = backgroundColors(segment.categoryIds, segment.hiddenCategoryCount);
                const normalizedText = normalizePdfWhitespace(segment.text);
                const safeText = validateText(normalizedText, supported);
                const tokens = safeText.match(/\n|[^\S\n]+|[^\s\n]+/gu) || [];
                for (const token of tokens) {
                    if (token === '\n') {
                        nextLine();
                    } else {
                        drawToken(token, colors);
                    }
                }
            }
            y -= lineHeight;
        }

        newPage();
        write(options.title || 'Documento codificado', 20, true, 0, PDFLib.rgb(0.04, 0.15, 0.27));
        write(`${options.author || 'AnalizadorCualiUY Pro'} | ${options.date || ''}`, 9, false, 0, mutedColor);
        y -= 6;
        page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness: 1, color: ruleColor });
        y -= 14;
        write(`${documents.length} documento(s) | ${categories.length} categoría(s) | ${codings.length} pasaje(s)`, 10, true);
        drawLegend();

        if (options.mode === 'passages') {
            heading('Pasajes clasificados');
            categories.forEach(category => {
                const matches = codings.filter(coding => coding.categoryId === category.id);
                if (!matches.length) return;
                heading(`${category.name}${category.code ? ` [${category.code}]` : ''}`, 2, 34);
                matches.forEach(coding => {
                    const source = documentMap.get(coding.docId);
                    ensure(34);
                    write(source ? source.title : 'Documento', 9, true, 6, mutedColor);
                    write(`“${coding.quoteText || ''}”`, 9, false, 12);
                    if (options.includeMemos !== false && coding.memo) write(`Memo: ${coding.memo}`, 9, false, 18, mutedColor);
                    y -= 4;
                });
            });
        } else {
            documents.forEach((document, index) => {
                if (index > 0) newPage();
                heading(document.title || `Documento ${index + 1}`, 1, 15);
                const documentCodings = codings.filter(coding => coding.docId === document.id);
                drawStyledDocument(String(document.content || ''), documentCodings);
                if (options.includeMemos !== false && documentCodings.some(coding => String(coding.memo || '').trim())) {
                    heading('Notas analíticas del documento', 1, 28);
                    documentCodings.forEach(coding => {
                        if (!String(coding.memo || '').trim()) return;
                        const category = categoryMap.get(coding.categoryId);
                        write(`${category ? category.name : coding.categoryId}: “${coding.quoteText || ''}”`, 9, true, 6);
                        write(`Memo: ${coding.memo}`, 9, false, 12, mutedColor);
                    });
                }
            });
        }

        const analytics = options.analytics;
        if (analytics && Array.isArray(analytics.stats)) {
            heading('Resumen analítico', 1, 15);
            analytics.stats.forEach(stat => {
                const category = categoryMap.get(stat.id);
                if (!category) return;
                write(`${category.name}: ${stat.count || 0} pasajes; ${Number(stat.perThousand || 0).toFixed(1)}/1.000 palabras; ${(Number(stat.documentShare || 0) * 100).toFixed(1)}% de documentos.`, 9);
            });
            if (Array.isArray(analytics.edges) && analytics.edges.length) {
                heading('Relaciones principales', 2, 15);
                [...analytics.edges]
                    .sort((a, b) => Number(b.metricValue || 0) - Number(a.metricValue || 0))
                    .slice(0, 20)
                    .forEach(edge => {
                        const source = categoryMap.get(edge.sourceId);
                        const target = categoryMap.get(edge.targetId);
                        write(`${source ? source.name : edge.sourceId} ↔ ${target ? target.name : edge.targetId}: ${edge.count || 0} coincidencias.`, 9);
                    });
            }
        }

        for (let index = 0; index < pages.length; index += 1) {
            const target = pages[index];
            const pageNumber = `${index + 1}/${pages.length}`;
            target.drawText('AnalizadorCualiUY Pro', { x: MARGIN, y: 24, size: 8, font: regular, color: mutedColor });
            target.drawText(pageNumber, { x: A4[0] - MARGIN - regular.widthOfTextAtSize(pageNumber, 8), y: 24, size: 8, font: regular, color: mutedColor });
        }

        pdfDoc.setTitle(validateText(options.title || 'Documento codificado', supported));
        pdfDoc.setAuthor(validateText(options.author || 'AnalizadorCualiUY Pro', supported));
        pdfDoc.setCreator('AnalizadorCualiUY 1.0.4');
        pdfDoc.setProducer('pdf-lib 1.17.1');
        pdfDoc.setCreationDate(new Date());
        const bytes = await pdfDoc.save({ useObjectStreams: false, addDefaultPage: false });
        return new Blob([bytes], { type: 'application/pdf' });
    }

    global.PdfReportExporter = { createAnalyticalReport, createCodedDocument };
})(typeof window !== 'undefined' ? window : globalThis);
