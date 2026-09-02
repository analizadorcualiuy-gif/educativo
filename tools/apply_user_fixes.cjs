const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'web-beta', 'educational.js');
let code = fs.readFileSync(targetPath, 'utf8');

// Load our normalized text from fix_transcript_and_keywords.cjs
const fixScript = fs.readFileSync(path.join(__dirname, 'fix_transcript_and_keywords.cjs'), 'utf8');
const docMatch = fixScript.match(/const docIpesNormalized = `([\s\S]*?)`;/);
if (!docMatch) {
    console.error('No se pudo extraer docIpesNormalized');
    process.exit(1);
}
const docIpesNormalized = docMatch[1];

// Update createProject to map keywords and auto-code matches
const newCreateProject = `    function createProject(caseId) {
        const selected = educationalCases[caseId];
        if (!selected) return null;
        const categories = selected.categories.map(([id, parentId, code, name, color, description, keywords]) => ({
            id,
            parentId,
            code,
            name,
            color,
            keywords: Array.isArray(keywords) ? keywords : [],
            description
        }));
        const documents = selected.documents.map(([title, content], index) => ({ id: \`doc-edu-\${caseId}-\${index + 1}\`, title, content }));
        
        // Generar codificaciones automáticas de muestra a partir de las palabras clave para que las categorías teóricas tengan ocurrencias inmediatas
        const codings = [];
        categories.forEach(cat => {
            if (!cat.keywords || !cat.keywords.length) return;
            documents.forEach(doc => {
                const docText = doc.content;
                const lowerText = docText.toLowerCase();
                cat.keywords.forEach(kw => {
                    const term = kw.toLowerCase().trim();
                    if (term.length < 3) return;
                    let pos = 0;
                    while ((pos = lowerText.indexOf(term, pos)) !== -1) {
                        let start = Math.max(0, docText.lastIndexOf('\\n\\n', pos));
                        if (start > 0) start += 2;
                        let end = docText.indexOf('\\n\\n', pos + term.length);
                        if (end === -1) end = docText.length;
                        const quoteText = docText.slice(start, end).trim();
                        if (quoteText.length > 25 && quoteText.length < 500) {
                            const exists = codings.some(c => c.docId === doc.id && c.categoryId === cat.id && Math.abs(c.startOffset - start) < 35);
                            if (!exists) {
                                codings.push({
                                    id: \`code-\${doc.id}-\${cat.id}-\${codings.length + 1}\`,
                                    docId: doc.id,
                                    categoryId: cat.id,
                                    startOffset: start,
                                    endOffset: end,
                                    quoteText,
                                    memo: \`Evidencia deductiva asociada a: \${cat.name} (Término clave: "\${kw}")\`,
                                    createdAt: new Date().toISOString()
                                });
                            }
                        }
                        pos += term.length + 15;
                    }
                });
            });
        });

        return { documents, categories, codings, isSampleLoaded: true, theme: 'dark' };
    }`;

// Replace createProject
code = code.replace(/function createProject\(caseId\) \{[\s\S]*?\n    \}/, newCreateProject);

// Now let's update educationalCases with keywords and normalized text
// Extract educationalCases
const caseMatch = code.match(/const educationalCases = (\{[\s\S]*?\n\};)/);
if (!caseMatch) {
    console.error('No se pudo encontrar educationalCases');
    process.exit(1);
}

const fn = new Function('return ' + caseMatch[1]);
const cases = fn();

// Update jornadas_ipes text and categories
cases.jornadas_ipes.documents[0][1] = docIpesNormalized;
cases.jornadas_ipes.categories = [
    [
        'cat-usos-eval',
        null,
        'CAT-USO',
        'Usos pedagógicos y evaluación',
        '#2563eb',
        'Herramientas, plataformas y dinámicas utilizadas en clase y evaluación: Kahoot, CREA, rúbricas, videos, presentaciones, etc.',
        ['evaluación', 'evaluar', 'Kahoot', 'CREA', 'rúbricas', 'retroalimentación', 'cotejos', 'actividades', 'presentación', 'Canva', 'herramientas digitales']
    ],
    [
        'sub-ia-gen',
        'cat-usos-eval',
        'SUB-IAG',
        'Aplicaciones de IA generativa',
        '#0284c7',
        'Generación de imágenes, canciones, historias, prompts para planificación y actividades con ChatGPT, Suno, Canva, etc.',
        ['inteligencia artificial', 'IA', 'chat gpt', 'chatgpt', 'Suno', 'Taipo', 'prompt', 'prompts', 'generativa', 'generativas', '3D']
    ],
    [
        'cat-beneficios',
        null,
        'CAT-BEN',
        'Beneficios y motivación',
        '#059669',
        'Ventajas percibidas: mayor motivación e interés estudiantil, diversidad de formatos y optimización de tiempos docentes.',
        ['motivados', 'motivación', 'entusiasmados', 'beneficio', 'ventaja', 'ventajas', 'optimiza', 'tiempo', 'recursos', 'facilidades']
    ],
    [
        'cat-desafios',
        null,
        'CAT-DES',
        'Desafíos y limitaciones técnicas',
        '#dc2626',
        'Obstáculos materiales y organizativos: conectividad, falta de dispositivos/cargadores, sobrecarga horaria y demandas de capacitación.',
        ['obstáculo', 'obstáculos', 'obstaculizan', 'celulares', 'cargadores', 'conectividad', 'conexión', 'equipos', 'problema', 'dispositivos', 'sobrecarga']
    ]
];

// Add keywords to primer_anio
cases.primer_anio.categories = [
    ['cat-adaptacion', null, 'CAT-ADAP', 'Adaptación al aprendizaje', '#0f766e', 'Estrategias y dificultades para organizar el estudio y comprender exigencias.', ['ritmo', 'lectura', 'exigencia', 'estudiar', 'organizar', 'materias']],
    ['sub-autonomia', 'cat-adaptacion', 'SUB-AUT', 'Autonomía para estudiar', '#14b8a6', 'Métodos propios, gestión del tiempo e iniciativa personal.', ['autónoma', 'autonomía', 'iniciativa', 'fichar', 'resúmenes', 'planificación']],
    ['cat-apoyo', null, 'CAT-APO', 'Redes de apoyo y tutorías', '#2563eb', 'Pares, grupos de estudio, tutorías y contención familiar.', ['compañera', 'grupo de estudio', 'tutoría', 'tutores', 'pares', 'familia']],
    ['cat-incertidumbre', null, 'CAT-INC', 'Incertidumbre y vivencias emocionales', '#b45309', 'Dudas vocacionales, temor al fracaso, estrés y desorientación.', ['shock', 'desorientación', 'miedo', 'vergüenza', 'crisis', 'abandonar']]
];

// Add keywords to retroalimentacion
cases.retroalimentacion.categories = [
    ['cat-clara', null, 'CAT-CLA', 'Orientación formativa clara', '#0f766e', 'Devoluciones que explican logros y orientan la mejora.', ['orienta', 'criterios', 'claridad', 'mejora', 'comentario', 'específico']],
    ['sub-criterios', 'cat-clara', 'SUB-CRI', 'Criterios explícitos y rúbricas', '#14b8a6', 'Uso de matrices y pautas previas conocidas.', ['rúbrica', 'pautas', 'criterios', 'objetivos']],
    ['cat-emocion', null, 'CAT-EMO', 'Impacto emocional y afectivo', '#9333ea', 'Reacciones emocionales: frustración, ansiedad, alivio o motivación.', ['frustración', 'bronca', 'bloquea', 'angustia', 'miedo', 'emocional']],
    ['cat-dialogo', null, 'CAT-DIA', 'Diálogo pedagógico y reescritura', '#2563eb', 'Intercambio presencial, repreguntas y reentregas.', ['diálogo', 'conversar', 'reescribir', 'borradores', 'consulta']]
];

// Replace educationalCases in code
code = code.replace(/const educationalCases = \{[\s\S]*?\n\};/, 'const educationalCases = ' + JSON.stringify(cases, null, 4) + ';');

// 3. Highlight John W. Creswell & Vicki L. Plano Clark in makeGuide() and modal-inductive-guide
const creswellPlanoQuote = `<p style="margin-bottom:0.4rem; padding:0.4rem; background:rgba(20,184,166,0.12); border-left:3px solid #14b8a6; border-radius:4px;"><strong>J. W. Creswell & V. L. Plano Clark (2018):</strong> "El análisis cualitativo es interactivo y espiralado: combina <em>códigos esperados o a priori</em> (deductivos) con <em>códigos emergentes y sorprendentes</em> (inductivos). Las categorías nunca deben clausurar los significados vivos del texto; el investigador refina la teoría a medida que los datos empíricos desbordan lo previsto."</p>`;

// Replace author section
code = code.replace(
    /<p style="margin-bottom:0\.4rem;"><strong>J\. Creswell & V\. Plano Clark:<\/strong>[\s\S]*?<\/p>/,
    creswellPlanoQuote
);

// Add Creswell & Plano Clark explicitly to the Inductive Guide Modal
const creswellInductiveCallout = `
                        <div style="background:#ecfdf5; border-left:4px solid #059669; border-radius:6px; padding:0.75rem 0.9rem; margin-bottom:0.6rem;">
                            <strong style="color:#065f46; display:block; margin-bottom:0.25rem;">Fundamentación: J. W. Creswell & V. L. Plano Clark (2018)</strong>
                            <span style="font-size:0.83rem; color:#064e3b; line-height:1.45; display:block;">
                                En su clásica obra metodológica, Creswell y Plano Clark distinguen entre <strong>códigos iniciales/esperados</strong> (aquellos derivados del marco teórico previo) y <strong>códigos emergentes/sorprendentes</strong> (ideas que surgen del discurso libre de los actores sociales). La codificación inductiva es el puente que permite que la voz de los informantes transforme las preguntas del investigador en nuevo conocimiento pedagógico.
                            </span>
                        </div>
`;

code = code.replace(
    '<div style="background:#f0fdfa; border:1px solid #99f6e4;',
    creswellInductiveCallout + '\n                        <div style="background:#f0fdfa; border:1px solid #99f6e4;'
);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('web-beta/educational.js actualizado exitosamente con texto fluido, keywords, ocurrencias automáticas y Creswell & Plano Clark.');
