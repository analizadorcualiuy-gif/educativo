/* Valid OOXML (.docx) export for AnalizadorCualiUY Pro. No network or Office install required. */
(function (global) {
    'use strict';

    const encoder = new TextEncoder();

    function xml(value) {
        return String(value == null ? '' : value)
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function color(value, fallback) {
        const cleaned = String(value || '').replace('#', '').toUpperCase();
        return /^[0-9A-F]{6}$/.test(cleaned) ? cleaned : fallback;
    }

    function run(text, options) {
        const opts = options || {};
        let properties = '';
        if (opts.bold) properties += '<w:b/>';
        if (opts.italic) properties += '<w:i/>';
        if (opts.color) properties += `<w:color w:val="${color(opts.color, '0F172A')}"/>`;
        if (opts.fill) properties += `<w:shd w:val="clear" w:color="auto" w:fill="${color(opts.fill, 'FFF2CC')}"/>`;
        if (opts.size) properties += `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>`;
        return `<w:r>${properties ? `<w:rPr>${properties}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
    }

    function paragraph(runs, style, options) {
        const opts = options || {};
        let props = style ? `<w:pStyle w:val="${style}"/>` : '';
        if (opts.keepNext) props += '<w:keepNext/>';
        if (opts.pageBreakBefore) props += '<w:pageBreakBefore/>';
        if (opts.spacingAfter != null) props += `<w:spacing w:after="${opts.spacingAfter}"/>`;
        return `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ''}${runs || ''}</w:p>`;
    }

    function table(rows, widths) {
        const cellWidths = widths || [4680, 4680];
        const grid = cellWidths.map(width => `<w:gridCol w:w="${width}"/>`).join('');
        const body = rows.map((cells, rowIndex) => `<w:tr>${cells.map((value, index) => {
            const fill = rowIndex === 0 ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F4F7"/>' : '';
            return `<w:tc><w:tcPr><w:tcW w:w="${cellWidths[index]}" w:type="dxa"/>${fill}<w:tcMar><w:top w:w="80" w:type="dxa"/><w:start w:w="120" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:end w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>${paragraph(run(value, { bold: rowIndex === 0, size: rowIndex === 0 ? 20 : 19 }))}</w:tc>`;
        }).join('')}</w:tr>`).join('');
        return `<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D1D5DB"/><w:left w:val="single" w:sz="4" w:color="D1D5DB"/><w:bottom w:val="single" w:sz="4" w:color="D1D5DB"/><w:right w:val="single" w:sz="4" w:color="D1D5DB"/><w:insideH w:val="single" w:sz="4" w:color="D1D5DB"/><w:insideV w:val="single" w:sz="4" w:color="D1D5DB"/></w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>`;
    }

    function textParagraphs(text, options) {
        return String(text == null ? '' : text)
            .replace(/\r\n?/g, '\n')
            .split('\n')
            .map(line => paragraph(run(line, options)))
            .join('');
    }

    function segmentedParagraphs(segments) {
        const paragraphs = [''];
        segments.forEach(segment => {
            const parts = String(segment.text || '').replace(/\r\n?/g, '\n').split('\n');
            parts.forEach((part, index) => {
                if (index > 0) paragraphs.push('');
                if (part) paragraphs[paragraphs.length - 1] += run(part, segment);
            });
        });
        return paragraphs.map(runs => paragraph(runs)).join('');
    }

    function documentXml(body) {
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body>
</w:document>`;
    }

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="es-UY"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="160"/></w:pPr><w:rPr><w:b/><w:color w:val="0B2545"/><w:sz w:val="44"/><w:szCs w:val="44"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="160"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="2E74B5"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="2E74B5"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
</w:styles>`;

    function packageEntries(body, title) {
        const created = new Date().toISOString();
        return [
            ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`],
            ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`],
            ['word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
            ['word/document.xml', documentXml(body)],
            ['word/styles.xml', stylesXml],
            ['docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(title)}</dc:title><dc:creator>Prof. Esp. Santiago Hernandez</dc:creator><cp:lastModifiedBy>AnalizadorCualiUY Pro</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified></cp:coreProperties>`],
            ['docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>AnalizadorCualiUY Pro</Application><AppVersion>1.0</AppVersion></Properties>`]
        ];
    }

    const crcTable = (() => {
        const table = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            table[n] = c >>> 0;
        }
        return table;
    })();

    function crc32(bytes) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function u16(value) {
        return new Uint8Array([value & 255, (value >>> 8) & 255]);
    }

    function u32(value) {
        return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
    }

    function concat(chunks) {
        const length = chunks.reduce((sum, item) => sum + item.length, 0);
        const output = new Uint8Array(length);
        let offset = 0;
        chunks.forEach(item => { output.set(item, offset); offset += item.length; });
        return output;
    }

    function zip(entries) {
        const local = [];
        const central = [];
        let offset = 0;
        entries.forEach(([name, value]) => {
            const nameBytes = encoder.encode(name);
            const data = encoder.encode(value);
            const crc = crc32(data);
            const header = concat([u32(0x04034B50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), nameBytes]);
            local.push(header, data);
            central.push(concat([u32(0x02014B50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes]));
            offset += header.length + data.length;
        });
        const centralBytes = concat(central);
        const end = concat([u32(0x06054B50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(centralBytes.length), u32(offset), u16(0)]);
        return concat([...local, centralBytes, end]);
    }

    function blobFromBody(body, title) {
        return new Blob([zip(packageEntries(body, title))], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
    }

    function createFullDocument(options) {
        const categories = new Map((options.categories || []).map(category => [category.id, category]));
        const content = String(options.content || '');
        const codings = (options.codings || [])
            .filter(coding => Number.isInteger(coding.startChar) && Number.isInteger(coding.endChar) && coding.endChar > coding.startChar)
            .sort((a, b) => a.startChar - b.startChar || a.endChar - b.endChar);
        if (!global.ProjectIntegrity) throw new Error('El módulo de integridad de proyectos no está disponible.');
        const codingMap = new Map(codings.map(coding => [coding.id, coding]));
        const segments = [];
        global.ProjectIntegrity.buildTextSegments(content, codings).forEach(segment => {
            const active = segment.codingIds.map(id => codingMap.get(id)).filter(Boolean);
            if (!active.length) {
                segments.push({ text: segment.text });
                return;
            }
            const activeCategories = active.map(coding => categories.get(coding.categoryId) || {});
            segments.push({ text: segment.text, fill: activeCategories[0].color, bold: true });
            if (active.length > 1) {
                const names = activeCategories.map(category => category.name || 'Categoría').join(' + ');
                segments.push({ text: ` [Solapamiento: ${names}]`, color: '64748B', size: 16 });
            }
            active.filter(coding => coding.endChar === segment.end && coding.memo).forEach(coding => {
                const category = categories.get(coding.categoryId) || {};
                segments.push({ text: ` [Memo ${category.name || 'Categoría'}: ${coding.memo}]`, color: '64748B', size: 16 });
            });
        });

        let body = paragraph(run(options.title, { bold: true }), 'Title');
        body += paragraph(run(`AnalizadorCualiUY Pro | Prof. Esp. Santiago Hernandez | Fecha: ${options.date} | Pasajes codificados: ${codings.length}`, { color: '64748B', size: 18 }));
        body += paragraph(run('Leyenda de categorias', { bold: true, color: '334155' }), 'Heading2');
        (options.categories || []).forEach(category => {
            body += paragraph(run('  ', { fill: category.color }) + run(`  ${category.name} [${category.code || 'SIN CODIGO'}]`));
        });
        body += segmentedParagraphs(segments);
        return blobFromBody(body, options.title);
    }

    function createPassagesDocument(options) {
        const documents = new Map((options.documents || []).map(document => [document.id, document]));
        let body = paragraph(run('AnalizadorCualiUY Pro - Pasajes clasificados por categoria', { bold: true }), 'Title');
        body += paragraph(run(`Prof. Esp. Santiago Hernandez (2026) | Fecha: ${options.date} | Total de pasajes: ${(options.codings || []).length}`, { color: '64748B', size: 18 }));
        (options.categories || []).forEach(category => {
            const parent = (options.allCategories || options.categories || []).find(item => item.id === category.parentId);
            body += paragraph(run(`${category.name} [${category.code || 'SIN CODIGO'}]${parent ? ` - Jerarquia: ${parent.name}` : ''}`, { color: category.color }), 'Heading1', { keepNext: true });
            if (category.description) body += paragraph(run(`Criterio / descripcion: ${category.description}`, { italic: true, color: '475569', size: 19 }));
            const matches = (options.codings || []).filter(coding => coding.categoryId === category.id);
            if (!matches.length) {
                body += paragraph(run('No hay pasajes codificados para esta categoria.', { italic: true, color: '94A3B8' }));
            }
            matches.forEach((coding, index) => {
                const source = documents.get(coding.docId);
                body += paragraph(run(`Cita #${index + 1} | Archivo: ${source ? source.title : 'Documento'} | Caracteres ${coding.startChar}-${coding.endChar}`, { bold: true, color: '64748B', size: 17 }), null, { keepNext: true, spacingAfter: 60 });
                body += textParagraphs(`“${coding.quoteText || ''}”`, { fill: category.color });
                if (coding.memo) body += paragraph(run(`Decodificacion / memo: ${coding.memo}`, { italic: true, color: '334155', size: 19 }));
            });
        });
        return blobFromBody(body, 'Pasajes clasificados por categoria');
    }

    function createAnalyticalReport(options) {
        const analytics = options.analytics || { stats: [], edges: [], totalWords: 0, documents: [] };
        const quality = options.quality || {};
        const categories = options.categories || [];
        const categoryMap = new Map(categories.map(category => [category.id, category]));
        const documents = new Map((options.documents || []).map(document => [document.id, document]));
        const statsMap = new Map((analytics.stats || []).map(stat => [stat.id, stat]));
        let body = paragraph(run(options.title || 'Informe de análisis cualitativo', { bold: true }), 'Title');
        body += paragraph(run(`${options.author || 'Equipo investigador'} | ${options.date || ''}`, { color: '64748B', size: 19 }));
        body += paragraph(run(`Corpus: ${(analytics.documents || options.documents || []).length} documentos | Categorías: ${categories.length} | Pasajes: ${(options.codings || []).length} | Palabras: ${analytics.totalWords || 0}`, { bold: true, color: '334155' }));
        body += paragraph(run('1. Resumen ejecutivo', { bold: true }), 'Heading1');
        body += paragraph(run(options.objective || 'Objetivo no especificado.'));
        const ranked = [...(analytics.stats || [])].sort((a, b) => b.perThousand - a.perThousand);
        if (ranked.length) {
            const leader = categoryMap.get(ranked[0].id);
            body += paragraph(run(`La categoría con mayor tasa normalizada es ${leader ? leader.name : ranked[0].id}, con ${ranked[0].perThousand.toFixed(1)} pasajes por 1.000 palabras y presencia en ${(ranked[0].documentShare * 100).toFixed(1)}% de los documentos.`));
        }
        body += paragraph(run('2. Corpus y metodología', { bold: true }), 'Heading1');
        body += paragraph(run(options.methodology || `Análisis de ${(analytics.documents || []).length} documentos mediante codificación categorial. Unidad de coocurrencia: ${analytics.options ? analytics.options.unit : 'párrafo'}; métrica: ${analytics.options ? analytics.options.metric : 'Jaccard'}.`));
        body += table([
            ['Indicador', 'Resultado'],
            ['Documentos analizados', String((analytics.documents || []).length)],
            ['Palabras del corpus', String(analytics.totalWords || 0)],
            ['Pasajes codificados', String((options.codings || []).length)],
            ['Cobertura del texto', `${((quality.coverage || 0) * 100).toFixed(1)}%`]
        ], [4680, 4680]);
        body += paragraph(run('3. Distribución categorial', { bold: true }), 'Heading1');
        body += table([['Categoría', 'Frecuencia', 'Por 1.000 palabras', 'Presencia documental']].concat(ranked.map(stat => {
            const category = categoryMap.get(stat.id) || {};
            return [category.name || stat.id, String(stat.count), stat.perThousand.toFixed(1), `${(stat.documentShare * 100).toFixed(1)}%`];
        })), [3420, 1620, 1980, 2340]);
        if (options.includeRelations !== false) {
            body += paragraph(run('4. Relaciones entre categorías', { bold: true }), 'Heading1');
            const edges = [...(analytics.edges || [])].sort((a, b) => b.metricValue - a.metricValue).slice(0, options.detail === 'full' ? 25 : 10);
            body += table([['Relación', 'Coincidencias', 'Jaccard', '% documentos']].concat(edges.map(edge => [
                `${(categoryMap.get(edge.sourceId) || {}).name || edge.sourceId} ↔ ${(categoryMap.get(edge.targetId) || {}).name || edge.targetId}`,
                String(edge.count), `${(edge.jaccard * 100).toFixed(1)}%`, `${(edge.documentShare * 100).toFixed(1)}%`
            ])), [4320, 1440, 1800, 1800]);
        }
        if (options.includeQuality !== false) {
            body += paragraph(run('5. Control de calidad', { bold: true }), 'Heading1');
            body += table([
                ['Control', 'Resultado'], ['Memos faltantes', String((quality.missingMemos || []).length)],
                ['Categorías incompletas', String((quality.incompleteCategories || []).length)], ['Documentos sin codificar', String((quality.uncodedDocuments || []).length)],
                ['Duplicados', String((quality.duplicates || []).length)], ['Solapamientos', String((quality.overlaps || []).length)],
                ['Codificación manual / automática', `${quality.manual || 0} / ${quality.automatic || 0}`]
            ], [6240, 3120]);
        }
        if (options.includeEvidence !== false) {
            body += paragraph(run('6. Evidencias y memos', { bold: true }), 'Heading1');
            categories.forEach(category => {
                const matches = (options.codings || []).filter(coding => coding.categoryId === category.id);
                if (!matches.length) return;
                body += paragraph(run(`${category.name} [${category.code || 'SIN CÓDIGO'}]`, { color: category.color }), 'Heading2');
                matches.slice(0, options.detail === 'full' ? matches.length : 3).forEach(coding => {
                    const source = documents.get(coding.docId);
                    body += paragraph(run(`${source ? source.title : 'Documento'}: “${coding.quoteText || ''}”`, { fill: category.color }));
                    if (coding.memo) body += paragraph(run(`Memo: ${coding.memo}`, { italic: true, color: '475569', size: 19 }));
                });
            });
        }
        body += paragraph(run('7. Conclusiones', { bold: true }), 'Heading1');
        body += textParagraphs(options.conclusions || 'Conclusiones no especificadas.');
        body += paragraph(run('Apéndice metodológico', { bold: true }), 'Heading1');
        body += paragraph(run('Los recuentos describen el corpus cargado. Las asociaciones no implican causalidad y deben interpretarse junto con las evidencias textuales y los memos analíticos.', { italic: true, color: '475569' }));
        return blobFromBody(body, options.title || 'Informe de análisis cualitativo');
    }

    global.DocxExporter = { createFullDocument, createPassagesDocument, createAnalyticalReport };
})(typeof window !== 'undefined' ? window : globalThis);
