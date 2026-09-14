import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

async function generateManual() {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const regularFontBytes = fs.readFileSync(path.join(root, 'public/vendor/LiberationSans-Regular.ttf'));
    const boldFontBytes = fs.readFileSync(path.join(root, 'public/vendor/LiberationSans-Bold.ttf'));

    const regularFont = await pdfDoc.embedFont(regularFontBytes);
    const boldFont = await pdfDoc.embedFont(boldFontBytes);

    const PAGE_WIDTH = 595.28;  // A4
    const PAGE_HEIGHT = 841.89; // A4
    const MARGIN_LEFT = 48;
    const MARGIN_RIGHT = 48;
    const MARGIN_TOP = 50;
    const MARGIN_BOTTOM = 50;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

    // Palette
    const NAVY = rgb(15/255, 30/255, 60/255);
    const BLUE_PRIMARY = rgb(37/255, 99/255, 235/255);
    const BLUE_LIGHT = rgb(239/255, 246/255, 255/255);
    const BLUE_BORDER = rgb(191/255, 219/255, 254/255);
    const TEXT_DARK = rgb(30/255, 41/255, 59/255);
    const TEXT_MUTED = rgb(100/255, 116/255, 139/255);
    const GREEN = rgb(16/255, 149/255, 100/255);
    const GREEN_BG = rgb(240/255, 253/255, 244/255);
    const GREEN_BORDER = rgb(187/255, 247/255, 208/255);
    const AMBER = rgb(180/255, 83/255, 9/255);
    const AMBER_BG = rgb(254/255, 243/255, 199/255);
    const AMBER_BORDER = rgb(253/255, 230/255, 138/255);
    const GRAY_BG = rgb(248/255, 250/255, 252/255);
    const GRAY_BORDER = rgb(226/255, 232/255, 240/255);
    const WHITE = rgb(1, 1, 1);

    let pages = [];
    let currentPage = null;
    let y = 0;

    function addPage() {
        currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        pages.push(currentPage);
        y = PAGE_HEIGHT - MARGIN_TOP;
        return currentPage;
    }

    function checkSpace(neededHeight) {
        if (!currentPage || y - neededHeight < MARGIN_BOTTOM) {
            addPage();
            drawHeader();
        }
    }

    function wrapText(text, font, size, maxWidth) {
        const words = String(text || '').replace(/\r\n/g, '\n').split(/\s+/);
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            if (!word) continue;
            const candidate = currentLine ? `${currentLine} ${word}` : word;
            if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
                currentLine = candidate;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines.length ? lines : [''];
    }

    function drawHeader() {
        if (!currentPage) addPage();
        currentPage.drawRectangle({
            x: MARGIN_LEFT,
            y: PAGE_HEIGHT - 28,
            width: CONTENT_WIDTH,
            height: 1.5,
            color: BLUE_PRIMARY
        });
        currentPage.drawText('ANALIZADORCUALIUY PRO · MANUAL DE USUARIO Y REFERENCIA METODOLÓGICA', {
            x: MARGIN_LEFT,
            y: PAGE_HEIGHT - 22,
            size: 7.5,
            font: boldFont,
            color: TEXT_MUTED
        });
    }

    function drawCoverPage() {
        addPage();
        
        // Background banner
        currentPage.drawRectangle({
            x: 0,
            y: PAGE_HEIGHT - 250,
            width: PAGE_WIDTH,
            height: 250,
            color: NAVY
        });

        // Accent line
        currentPage.drawRectangle({
            x: 0,
            y: PAGE_HEIGHT - 255,
            width: PAGE_WIDTH,
            height: 5,
            color: BLUE_PRIMARY
        });

        // App badge
        currentPage.drawRectangle({
            x: MARGIN_LEFT,
            y: PAGE_HEIGHT - 70,
            width: 140,
            height: 20,
            color: BLUE_PRIMARY
        });
        currentPage.drawText('EDICIÓN PROFESIONAL', {
            x: MARGIN_LEFT + 12,
            y: PAGE_HEIGHT - 65,
            size: 8.5,
            font: boldFont,
            color: WHITE
        });

        // Main Title
        currentPage.drawText('AnalizadorCualiUY Pro', {
            x: MARGIN_LEFT,
            y: PAGE_HEIGHT - 110,
            size: 26,
            font: boldFont,
            color: WHITE
        });

        currentPage.drawText('Manual de Usuario y Referencia Metodológica', {
            x: MARGIN_LEFT,
            y: PAGE_HEIGHT - 140,
            size: 15,
            font: regularFont,
            color: rgb(220/255, 230/255, 245/255)
        });

        currentPage.drawText('Guía técnica y analítica integral para equipos de investigación cualitativa', {
            x: MARGIN_LEFT,
            y: PAGE_HEIGHT - 165,
            size: 10.5,
            font: regularFont,
            color: rgb(180/255, 200/255, 230/255)
        });

        // Metadata box inside banner
        currentPage.drawText('Arquitectura 100% Local · Confidencialidad Rigurosa · Cruce de Matrices · Co-ocurrencias · Trazabilidad de Evidencia', {
            x: MARGIN_LEFT,
            y: PAGE_HEIGHT - 225,
            size: 8,
            font: boldFont,
            color: rgb(147/255, 197/255, 253/255)
        });

        y = PAGE_HEIGHT - 280;

        // Intro box on cover
        drawCalloutBox(
            'Propósito de este documento',
            'Este manual está dirigido a investigadoras e investigadores que dominan los fundamentos del análisis cualitativo y necesitan una guía exhaustiva sobre la operativa del software AnalizadorCualiUY Pro. Explica en detalle cada panel, término, métrica de coocurrencia (Jaccard, frecuencias, densidad), matrices de cruce, visualizaciones en red y opciones de exportación académica con trazabilidad completa.',
            'blue'
        );

        y -= 10;

        // Table of contents summary
        drawSectionTitle('Estructura del Manual');
        
        const indexItems = [
            ['Sección 1', 'Filosofía, Privacidad Local y Principios del Sistema', 'Pág. 2'],
            ['Sección 2', 'Arquitectura del Espacio de Trabajo (Paneles 1, 2 y 3)', 'Pág. 2'],
            ['Sección 3', 'Codificación: Deductiva, Inductiva, Memos y Franjas Marginales', 'Pág. 3'],
            ['Sección 4', 'Módulo Analítico: Gráficos Cualitativos y Cruce de Datos', 'Pág. 4'],
            ['Sección 5', 'Glosario Metodológico: Unidades, Métricas y Fórmulas', 'Pág. 5'],
            ['Sección 6', 'Matrices Avanzadas: Frecuencias, Síntesis y Consultas', 'Pág. 6'],
            ['Sección 7', 'Control de Calidad, Auditoría y Exportación Académica', 'Pág. 7']
        ];

        drawTable(['Sección', 'Contenido Temático', 'Ubicación'], indexItems, [75, 340, 60]);

        y -= 15;
        currentPage.drawText('Autor: Prof. Esp. Santiago Hernández · AnalizadorCualiUY Pro v1.0.4', {
            x: MARGIN_LEFT,
            y: 35,
            size: 8.5,
            font: boldFont,
            color: TEXT_MUTED
        });
    }

    function drawSectionTitle(title, tag = '') {
        checkSpace(40);
        y -= 6;
        currentPage.drawRectangle({
            x: MARGIN_LEFT,
            y: y - 2,
            width: 4,
            height: 16,
            color: BLUE_PRIMARY
        });
        currentPage.drawText(title, {
            x: MARGIN_LEFT + 10,
            y: y,
            size: 12,
            font: boldFont,
            color: NAVY
        });
        if (tag) {
            const tagWidth = boldFont.widthOfTextAtSize(tag, 7.5) + 10;
            currentPage.drawRectangle({
                x: PAGE_WIDTH - MARGIN_RIGHT - tagWidth,
                y: y - 1,
                width: tagWidth,
                height: 14,
                color: BLUE_LIGHT,
                borderColor: BLUE_BORDER,
                borderWidth: 1
            });
            currentPage.drawText(tag, {
                x: PAGE_WIDTH - MARGIN_RIGHT - tagWidth + 5,
                y: y + 2.5,
                size: 7.5,
                font: boldFont,
                color: BLUE_PRIMARY
            });
        }
        y -= 16;
    }

    function drawSubSectionTitle(title) {
        checkSpace(28);
        y -= 4;
        currentPage.drawText(title, {
            x: MARGIN_LEFT,
            y: y,
            size: 10,
            font: boldFont,
            color: BLUE_PRIMARY
        });
        y -= 13;
    }

    function drawParagraph(text, font = regularFont, size = 8.5, color = TEXT_DARK, lineHeight = 12) {
        const lines = wrapText(text, font, size, CONTENT_WIDTH);
        checkSpace(lines.length * lineHeight + 4);
        for (const line of lines) {
            currentPage.drawText(line, {
                x: MARGIN_LEFT,
                y: y,
                size: size,
                font: font,
                color: color
            });
            y -= lineHeight;
        }
        y -= 3;
    }

    function drawBulletPoint(title, text) {
        const bulletPrefix = '• ';
        const titleText = title ? `${title}: ` : '';
        const fullText = `${titleText}${text}`;
        const lines = wrapText(fullText, regularFont, 8.2, CONTENT_WIDTH - 14);
        checkSpace(lines.length * 11.5 + 4);

        currentPage.drawText('•', {
            x: MARGIN_LEFT + 2,
            y: y,
            size: 9,
            font: boldFont,
            color: BLUE_PRIMARY
        });

        let firstLine = lines[0];
        if (title) {
            const titleWithColon = `${title}: `;
            const titleWidth = boldFont.widthOfTextAtSize(titleWithColon, 8.2);
            currentPage.drawText(titleWithColon, {
                x: MARGIN_LEFT + 12,
                y: y,
                size: 8.2,
                font: boldFont,
                color: NAVY
            });
            const remainingFirstLine = firstLine.startsWith(titleWithColon) ? firstLine.slice(titleWithColon.length) : firstLine;
            currentPage.drawText(remainingFirstLine, {
                x: MARGIN_LEFT + 12 + titleWidth,
                y: y,
                size: 8.2,
                font: regularFont,
                color: TEXT_DARK
            });
        } else {
            currentPage.drawText(firstLine, {
                x: MARGIN_LEFT + 12,
                y: y,
                size: 8.2,
                font: regularFont,
                color: TEXT_DARK
            });
        }
        y -= 11.5;

        for (let i = 1; i < lines.length; i++) {
            currentPage.drawText(lines[i], {
                x: MARGIN_LEFT + 12,
                y: y,
                size: 8.2,
                font: regularFont,
                color: TEXT_DARK
            });
            y -= 11.5;
        }
        y -= 2;
    }

    function drawCalloutBox(title, body, type = 'blue') {
        const bg = type === 'green' ? GREEN_BG : type === 'amber' ? AMBER_BG : BLUE_LIGHT;
        const border = type === 'green' ? GREEN_BORDER : type === 'amber' ? AMBER_BORDER : BLUE_BORDER;
        const iconColor = type === 'green' ? GREEN : type === 'amber' ? AMBER : BLUE_PRIMARY;

        const lines = wrapText(body, regularFont, 8.2, CONTENT_WIDTH - 20);
        const boxHeight = 18 + lines.length * 11.5 + 6;
        checkSpace(boxHeight + 6);

        currentPage.drawRectangle({
            x: MARGIN_LEFT,
            y: y - boxHeight,
            width: CONTENT_WIDTH,
            height: boxHeight,
            color: bg,
            borderColor: border,
            borderWidth: 1
        });

        currentPage.drawRectangle({
            x: MARGIN_LEFT,
            y: y - boxHeight,
            width: 3.5,
            height: boxHeight,
            color: iconColor
        });

        currentPage.drawText(title, {
            x: MARGIN_LEFT + 10,
            y: y - 12,
            size: 8.5,
            font: boldFont,
            color: iconColor
        });

        let textY = y - 24;
        for (const line of lines) {
            currentPage.drawText(line, {
                x: MARGIN_LEFT + 10,
                y: textY,
                size: 8.2,
                font: regularFont,
                color: TEXT_DARK
            });
            textY -= 11.5;
        }

        y -= (boxHeight + 6);
    }

    function drawTable(headers, rows, colWidths) {
        const rowHeight = 16.5;
        const headerHeight = 18;
        const totalHeight = headerHeight + rows.length * rowHeight;
        checkSpace(totalHeight + 8);

        let currentY = y;

        // Header Background
        currentPage.drawRectangle({
            x: MARGIN_LEFT,
            y: currentY - headerHeight,
            width: CONTENT_WIDTH,
            height: headerHeight,
            color: NAVY
        });

        // Header text
        let curX = MARGIN_LEFT;
        headers.forEach((h, idx) => {
            currentPage.drawText(h, {
                x: curX + 5,
                y: currentY - 12.5,
                size: 7.8,
                font: boldFont,
                color: WHITE
            });
            curX += colWidths[idx];
        });

        currentY -= headerHeight;

        // Rows
        rows.forEach((row, rIdx) => {
            const isEven = rIdx % 2 === 0;
            currentPage.drawRectangle({
                x: MARGIN_LEFT,
                y: currentY - rowHeight,
                width: CONTENT_WIDTH,
                height: rowHeight,
                color: isEven ? WHITE : GRAY_BG,
                borderColor: GRAY_BORDER,
                borderWidth: 0.5
            });

            let cellX = MARGIN_LEFT;
            row.forEach((cell, cIdx) => {
                const cellLines = wrapText(cell, cIdx === 0 ? boldFont : regularFont, 7.6, colWidths[cIdx] - 8);
                currentPage.drawText(cellLines[0] || '', {
                    x: cellX + 5,
                    y: currentY - 12,
                    size: 7.6,
                    font: cIdx === 0 ? boldFont : regularFont,
                    color: cIdx === 0 ? NAVY : TEXT_DARK
                });
                cellX += colWidths[cIdx];
            });

            currentY -= rowHeight;
        });

        y = currentY - 6;
    }

    // ==========================================
    // PAGE 1: COVER
    // ==========================================
    drawCoverPage();

    // ==========================================
    // PAGE 2: FILOSOFÍA Y ARQUITECTURA
    // ==========================================
    addPage();
    drawHeader();

    drawSectionTitle('1. Filosofía, Confidencialidad y Principios del Sistema', 'FUNDAMENTOS');
    drawParagraph('AnalizadorCualiUY Pro está concebido como una plataforma de análisis cualitativo asistido por computadora (CAQDAS) de segunda generación, diseñada con un principio arquitectónico no negociable: procesamiento local absoluto y estricta confidencialidad investigativa.');

    drawBulletPoint('Cero transmisión de datos', 'A diferencia de soluciones basadas en la nube, ningún fragmento, entrevista, transcripción ni categoría sale jamás de la computadora del investigador. No existen llamadas a APIs remotas ni servidores intermedios.');
    drawBulletPoint('Integridad de la cadena de custodia', 'Cada codificación guarda de forma inmutable el identificador de documento, las posiciones de carácter exactas (startChar y endChar) y la cita original. Esto permite auditoría metodológica reproducible y trazabilidad total.');
    drawBulletPoint('Enfoque epistémico no reduccionista', 'La herramienta no reemplaza el juicio hermenéutico. Las estadísticas de co-ocurrencia y grafos no son un fin en sí mismos, sino disparadores reflexivos para descubrir patrones, paradojas y temas emergentes.');

    y -= 3;
    drawSectionTitle('2. Arquitectura del Espacio de Trabajo (Interfaz de 3 Paneles)', 'INTERFAZ');
    drawParagraph('La interfaz central se distribuye en tres paneles ergonómicos con barras divisorias redimensionables mediante arrastre con el ratón:');

    drawBulletPoint('Panel 1 (Izquierdo) - Gestión de Documentos y Libro de Códigos', 'Alberga la lista de archivos del corpus (.txt, .docx, .pdf) con contador de palabras y fichas contextuales. En la parte inferior se encuentra el Codebook jerárquico donde se administran dimensiones, categorías principales y subcategorías, con códigos alfanuméricos, colores personalizados y palabras clave para autocodificación.');
    drawBulletPoint('Panel 2 (Central) - Lector de Texto y Taller de Codificación', 'Espacio de lectura continua con renderizado fluido. Incorpora franjas marginales interactivas (estilo ATLAS.ti) que reflejan visualmente el alcance de cada código, barra flotante de asignación rápida al seleccionar texto, buscador in-text con tecla F3 y modos de visualización Estándar vs. Capas (Tiers).');
    drawBulletPoint('Panel 3 (Derecho) - Síntesis Analítica y Visualizaciones', 'Contiene tres solapas operativas: 1) Decodificador (redacción y filtrado de memos interpretativos asociados a cada cita); 2) Gráficos Cualitativos (red de co-ocurrencias, mapa térmico, barras normalizadas y panel de calidad); 3) Buscador Global (exploración booleana de términos en todo el corpus).');

    drawCalloutBox(
        'Formatos de entrada y exportación',
        'AnalizadorCualiUY Pro soporta la importación simultánea de archivos TXT, DOCX de Microsoft Word y PDF (procesados mediante motor nativo aislado). Los proyectos completos se guardan en un único archivo maestro .json cifrable y portable, mientras que los reportes pueden exportarse en DOCX formateado, PDF con leyendas de color y CSV para matrices tabulares.',
        'blue'
    );

    // ==========================================
    // PAGE 3: CODIFICACIÓN Y MEMOS
    // ==========================================
    addPage();
    drawHeader();

    drawSectionTitle('3. Proceso de Codificación: Deductiva, Inductiva y Memos', 'MÉTODO');
    drawParagraph('El software permite alternar de forma natural entre enfoques deductivos (a priori) e inductivos (emergentes / teoría fundamentada):');

    drawSubSectionTitle('3.1 Creación y Estructura del Libro de Categorías (Codebook)');
    drawParagraph('Cada categoría o subcategoría en AnalizadorCualiUY Pro incluye los siguientes atributos formales:');
    
    const catProps = [
        ['Nombre y Código', 'Identificador semántico y etiqueta breve alfanumérica (ej. CAT-USO, SUB-IAG) para tablas y gráficos.'],
        ['Jerarquía Padre/Hijo', 'Permite anidar subcategorías bajo una dimensión madre, facilitando análisis a nivel macro o micro.'],
        ['Criterio de Inclusión', 'Definición operativa explícita que delimita qué tipo de evidencia discursiva debe asignarse.'],
        ['Criterio de Exclusión', 'Aclaración de fronteras metodológicas para evitar solapamientos ambiguos y guiar al equipo.'],
        ['Palabras Clave (Keywords)', 'Términos y variantes lematizadas que habilitan la búsqueda y sugerencia de ocurrencias automáticas.'],
        ['Color Identificador', 'Color hexadecimal que tiñe los pasajes en el texto, las franjas marginales y los nodos del grafo.']
    ];
    drawTable(['Campo / Propiedad', 'Función Metodológica'], catProps, [120, 379]);

    drawSubSectionTitle('3.2 Técnicas de Asignación y Codificación en el Texto');
    drawBulletPoint('Codificación Manual Directa', 'Seleccione cualquier fragmento con el ratón; aparecerá la barra flotante con las categorías disponibles o use los atajos de teclado rápido (Ctrl+1 al Ctrl+9).');
    drawBulletPoint('Codificación Múltiple y Solapada', 'Un mismo fragmento puede recibir varias categorías simultáneas. El sistema preserva la intersección exacta sin duplicar el texto fuente.');
    drawBulletPoint('Autocodificación Asistida (Buscar Todo)', 'El botón "Buscar Todo" explora las palabras clave en el documento activo o corpus. Las codificaciones automáticas quedan identificadas y auditadas para su posterior revisión humana.');

    drawSubSectionTitle('3.3 Memos Analíticos y Decodificación de Significados');
    drawParagraph('Siguiendo las pautas de Glaser, Strauss y Charmaz, un memo no es un resumen del texto, sino un registro del pensamiento reflexivo del investigador. Al hacer clic en "+ Añadir nota / decodificación", el sistema abre un editor vinculado a la cita exacta para documentar: hipótesis emergentes, contradicciones discursivas, tono afectivo o conexiones teóricas.');

    drawCalloutBox(
        'Regla metodológica para la sesión',
        'Se recomienda que el equipo comience creando 3 a 5 categorías deductivas iniciales con sus criterios de inclusión bien redactados. Durante la lectura del primer documento, motívelos a crear al menos una categoría inductiva emergente y redactar memos analíticos en los pasajes más densos.',
        'green'
    );

    // ==========================================
    // PAGE 4: EL CRUCE DE DATOS Y GRÁFICOS
    // ==========================================
    addPage();
    drawHeader();

    drawSectionTitle('4. Módulo Analítico: Gráficos Cualitativos y Cruce de Datos', 'ANÁLISIS');
    drawParagraph('En el panel derecho, la solapa "Gráficos Cuali" constituye el núcleo cuantitativo-cualitativo del programa. Permite explorar cómo se relacionan los conceptos a través de cuatro visualizaciones complementarias:');

    drawSubSectionTitle('4.1 Las 4 Vistas de Visualización');

    drawBulletPoint('1. 🕸️ Red / Grafo de Co-ocurrencias', 'Modela las categorías como nodos y sus relaciones de co-presencia como aristas (enlaces). El tamaño de cada nodo refleja su prominencia (frecuencia o presencia) y el grosor del enlace indica la fuerza de asociación calculada.');
    drawBulletPoint('2. 🔥 Co-ocurrencias (Heatmap / Matriz Térmica)', 'Matriz bidimensional simétrica que cruza todas las categorías entre sí. Las celdas se colorean en un gradiente térmico (Cero, Baja, Media, Alta) según el valor de la métrica seleccionada, permitiendo detectar clústeres conceptuales de un vistazo.');
    drawBulletPoint('3. 📊 Comparación de Categorías (Barras Proporcionales)', 'Gráfico de barras horizontales comparativas que muestra simultáneamente el volumen bruto de citas y la densidad normalizada (tasa por cada 1.000 palabras) para evitar sesgos de extensión textual.');
    drawBulletPoint('4. ✅ Control de Calidad Metodológica (Auditoría)', 'Panel diagnóstico que evalúa la madurez del proyecto: porcentaje de cobertura del corpus, pasajes sin memo interpretativo, proporción de codificación manual vs. automática y advertencia de categorías vacías.');

    drawSubSectionTitle('4.2 Barra de Herramientas Analítica: Controles y Filtros');
    
    const toolbarOptions = [
        ['Nivel Categorial', 'Categorías principales (sintetiza subcategorías en sus padres) vs. Árbol completo (desagregación total).'],
        ['Tamaño de Nodos', 'Presencia documental (% de archivos donde aparece), Frecuencia (citas totales) o Tasa por 1.000 palabras.'],
        ['Unidad de Análisis', 'Determina la proximidad textual requerida para computar coocurrencia (Párrafo, Oración, Ventana, Solapamiento, Documento).'],
        ['Métrica de Asociación', 'Algoritmo de cálculo: Índice de Jaccard (0 a 1), Recuento bruto absoluto o Porcentaje de documentos compartidos.'],
        ['Ventana de Contexto', 'Extensión en palabras a cada lado cuando se utiliza la unidad Ventana (±50, ±100 o ±250 palabras).'],
        ['Filtros de Corpus', 'Permite filtrar el cálculo por un Documento específico o por un Grupo/Conjunto de informantes (ej. Directores vs. Docentes).'],
        ['Umbral de Ruido', 'Valor numérico mínimo requerido para trazar una arista en el grafo, eliminando asociaciones espurias o irrelevantes.']
    ];
    drawTable(['Control / Selector', 'Significado y Función en el Análisis'], toolbarOptions, [110, 389]);

    drawCalloutBox(
        'Interpretación Asistida y Edición de Notas',
        'Debajo de cada gráfico, el sistema genera automáticamente una síntesis cualitativa en lenguaje natural destacando los hallazgos principales (categoría dominante, par más asociado, densidad promedio). El investigador puede hacer clic en "✏️ Editar nota" para redactar su propia interpretación académica y guardarla en las exportaciones.',
        'blue'
    );

    // ==========================================
    // PAGE 5: GLOSARIO METODOLÓGICO Y FÓRMULAS
    // ==========================================
    addPage();
    drawHeader();

    drawSectionTitle('5. Glosario Metodológico: Unidades, Métricas y Fórmulas', 'GLOSARIO');
    drawParagraph('Para fundamentar rigurosamente los resultados en publicaciones, tesis o informes, a continuación se detallan las definiciones operativas y matemáticas de cada término:');

    drawSubSectionTitle('5.1 Unidades de Análisis (¿Dónde se busca la co-ocurrencia?)');
    drawBulletPoint('Párrafo (Recomendada)', 'Se considera co-ocurrencia si dos codificaciones coinciden en el mismo bloque narrativo o intervención. Es la unidad cualitativa por excelencia, ya que un párrafo delimita un argumento o idea completa.');
    drawBulletPoint('Oración (Inmediatez Sintáctica)', 'Exige que ambas categorías aparezcan dentro de la misma frase delimitada por puntos. Refleja una asociación conceptual directa y explícita en el discurso del hablante.');
    drawBulletPoint('Ventana (Contigüidad Flotante)', 'Evalúa si dos categorías se encuentran a una distancia menor o igual a N palabras (±50, ±100, ±250). Es ideal para textos continuos o desgrabaciones sin puntuación estricta.');
    drawBulletPoint('Solapamiento (Overlap Estricto)', 'Exige que ambas categorías compartan caracteres en común en el mismo pasaje resaltado (intersección positiva).');
    drawBulletPoint('Documento (Co-presencia Global)', 'Mide si ambas categorías emergen en el mismo archivo/entrevista, independientemente de la distancia entre sus párrafos.');

    drawSubSectionTitle('5.2 Métricas de Fuerza de Asociación');
    
    const metricsDef = [
        ['Índice de Jaccard (J)', 'J = |A ∩ B| / |A ∪ B|. Mide la proporción de solapamiento relativo entre 0 (independientes) y 1 (coincidencia perfecta). Es la métrica estándar porque no se distorsiona si una categoría tiene una frecuencia marginal desproporcionada.'],
        ['Recuento Bruto (Count)', 'Número entero total de unidades (párrafos, oraciones o ventanas) donde coexisten ambas categorías. Muestra el volumen empírico absoluto de evidencia compartida.'],
        ['% Documentos (Document Share)', 'Porcentaje de entrevistas o casos del corpus donde se registran ambas categorías. Indica si la relación es un fenómeno generalizado o exclusivo de un solo participante.'],
        ['Densidad por 1.000 palabras', 'Tasa = (Ocurrencias / Total de palabras del documento) × 1.000. Permite comparar la intensidad de un tema entre documentos de diferente longitud.']
    ];
    drawTable(['Métrica Analítica', 'Fórmula y Significado Metodológico'], metricsDef, [130, 369]);

    drawCalloutBox(
        '¿Por qué usar Jaccard en lugar de correlación tradicional?',
        'En datos cualitativos textuales, la correlación de Pearson se ve fuertemente sesgada por las frecuencias marginales altas. El Índice de Jaccard evalúa estrictamente los segmentos donde hay evidencia afirmativa compartida, descartando los ceros conjuntos que carecen de significado interpretativo.',
        'amber'
    );

    // ==========================================
    // PAGE 6: MATRICES AVANZADAS Y CONSULTAS
    // ==========================================
    addPage();
    drawHeader();

    drawSectionTitle('6. Matrices Avanzadas: Frecuencias, Síntesis y Consultas', 'HERRAMIENTAS');
    drawParagraph('En la barra superior de la aplicación, el botón "📊 Matriz Categorial y Estadísticas" abre el centro de operaciones tabulares del proyecto:');

    drawSubSectionTitle('6.1 Tabla de Ponderación Categorial y Porcentajes');
    drawParagraph('Muestra el resumen cuantitativo de todas las categorías del libro de códigos:');
    drawBulletPoint('Código y Nombre', 'Identificación de la categoría y su posición jerárquica en el árbol.');
    drawBulletPoint('Términos / Palabras Clave', 'Listado de términos lematizados asociados a la categoría.');
    drawBulletPoint('Ocurrencias y Evidencia Ponderada', 'Recuento de pasajes codificados y peso relativo sobre el total de citas del proyecto.');
    drawBulletPoint('Ponderación (%) y Barra Visual', 'Distribución porcentual sobre el 100% del corpus codificado con barra gráfica proporcional.');

    drawSubSectionTitle('6.2 Matriz de Síntesis Documento × Categoría (Framework Analysis)');
    drawParagraph('Inspirada en el método de *Framework Analysis* (Ritchie & Spencer), esta matriz organiza las filas por Documentos/Casos y las columnas por Categorías. En cada celda, el investigador puede redactar una síntesis interpretativa cruzada, visualizando al instante las citas empíricas que sustentan dicho cruce.');

    drawSubSectionTitle('6.3 Consultas Avanzadas con Operadores Booleanos');
    drawParagraph('El modal de Consultas Avanzadas permite interrogar al corpus mediante lógica booleana y de proximidad:');
    
    const queryOps = [
        ['Operador "Y" (AND)', 'Encuentra pasajes donde la Categoría A y la Categoría B coexisten en el mismo párrafo.'],
        ['Operador "SIN" (NOT)', 'Aisla evidencias de la Categoría A donde NO interviene la Categoría B (casos puros o contraejemplos).'],
        ['Operador "CERCA DE" (NEAR)', 'Localiza apariciones de la Categoría A a una distancia configurable (en caracteres) de la Categoría B.']
    ];
    drawTable(['Tipo de Consulta', 'Propósito de Investigación'], queryOps, [125, 374]);

    drawCalloutBox(
        'Exportación de Tablas a CSV',
        'Tanto la matriz de frecuencias, como la matriz de síntesis y los reportes de co-ocurrencia pueden exportarse inmediatamente a archivos .csv compatibles con Excel, SPSS, R o Jamovi para análisis estadísticos complementarios.',
        'blue'
    );

    // ==========================================
    // PAGE 7: CONTROL DE CALIDAD Y EXPORTACIÓN
    // ==========================================
    addPage();
    drawHeader();

    drawSectionTitle('7. Auditoría, Control de Calidad y Exportación Académica', 'ENTREGABLES');
    drawParagraph('AnalizadorCualiUY Pro incorpora herramientas para asegurar la validez, fiabilidad y comunicabilidad de los hallazgos:');

    drawSubSectionTitle('7.1 Panel de Control de Calidad y Registro Metodológico');
    drawBulletPoint('Auditoría de Acciones (Audit Log)', 'El sistema registra automáticamente cada creación de categoría, edición de límites y evento de autocodificación con marca de tiempo, garantizando la trazabilidad exigida por los comités de ética.');
    drawBulletPoint('Detección de Brechas Analíticas', 'Alerta sobre documentos con baja densidad de codificación, categorías creadas sin evidencia asignada y citas que aún carecen de memo interpretativo.');

    drawSubSectionTitle('7.2 Opciones de Exportación Profesional');
    
    const exportModes = [
        ['Documento DOCX Sombreado', 'Genera un archivo Word con todo el texto original donde cada pasaje aparece resaltado en el color exacto de su categoría, con notas al pie o comentarios.'],
        ['DOCX de Pasajes Clasificados', 'Crea un dossier estructurado por Categorías con todas las citas textuales, documento de procedencia, número de párrafo y memos analíticos.'],
        ['Informe Analítico Integrado', 'Documento formal (Word o PDF) con portada, objetivos, metodología, matriz de frecuencias, gráficos de red y conclusiones.'],
        ['PDF de Documento Codificado', 'Exportación visual en PDF de alta fidelidad con leyenda cromática de categorías y márgenes analíticos preservados.']
    ];
    drawTable(['Modalidad de Exportación', 'Contenido y Formato del Entregable'], exportModes, [130, 369]);

    drawSubSectionTitle('7.3 Cita Académica Oficial del Software');
    drawParagraph('La aplicación incluye un generador de citas en la barra superior (botón "📖 Citar este software") con formatos estándar listos para copiar con un solo clic:');
    
    drawCalloutBox(
        'Formato APA 7ª Edición para Publicaciones',
        'Hernández, S. (2026). AnalizadorCualiUY Pro: Software local para análisis cualitativo y visualización categorial (Versión 1.0.4) [Software de computación]. https://analizadorcualiuy.com',
        'green'
    );

    // Page numbers on all pages
    const totalPages = pages.length;
    pages.forEach((page, index) => {
        page.drawText(`Página ${index + 1} de ${totalPages}`, {
            x: PAGE_WIDTH - MARGIN_RIGHT - 70,
            y: 20,
            size: 8,
            font: regularFont,
            color: TEXT_MUTED
        });
        page.drawText('AnalizadorCualiUY Pro · Documento confidencial para equipos de investigación', {
            x: MARGIN_LEFT,
            y: 20,
            size: 7.5,
            font: regularFont,
            color: TEXT_MUTED
        });
    });

    const pdfBytes = await pdfDoc.save();
    
    // Save to Pro folder
    const outputPath1 = path.join(root, 'MANUAL-METODOLOGICO-ANALIZADORCUALIUY-PRO.pdf');
    fs.writeFileSync(outputPath1, pdfBytes);

    // Also copy to parent project directory for immediate convenience
    const parentRoot = path.resolve(root, '..');
    const outputPath2 = path.join(parentRoot, 'MANUAL-METODOLOGICO-ANALIZADORCUALIUY-PRO.pdf');
    fs.writeFileSync(outputPath2, pdfBytes);

    console.log(`✅ PDF generado exitosamente:`);
    console.log(`  -> ${outputPath1}`);
    console.log(`  -> ${outputPath2}`);
    console.log(`Total páginas: ${totalPages}`);
}

generateManual().catch(err => {
    console.error('Error generando manual:', err);
    process.exit(1);
});
