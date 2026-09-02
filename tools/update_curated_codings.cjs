const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'web-beta', 'educational.js');
let code = fs.readFileSync(targetPath, 'utf8');

const newCreateProjectFunc = `    function createProject(caseId) {
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
        
        const codings = [];

        // Para Jornadas IPES: proveer exactamente 5 codificaciones modelo en testimonios de docentes (excluyendo moderador)
        if (caseId === 'jornadas_ipes' && documents[0]) {
            const doc = documents[0];
            const content = doc.content;

            const models = [
                {
                    catId: 'cat-usos-eval',
                    match: 'Yo he usado mucho Kahoot, por ejemplo, donde ellos mismos… elaborar pensando en aplicarle a los compañeros.',
                    memo: 'Ejemplo modelo: El docente no utiliza la tecnología como test pasivo, sino que delega el diseño evaluativo a los propios alumnos, activando procesos metacognitivos.'
                },
                {
                    catId: 'sub-ia-gen',
                    match: 'También hay una página que yo he usado que se llama Suno que es para crear canciones y que ellos se enganchan y crean historias. También escriben la historia y después con la inteligencia artificial crean toda la historieta con imágenes. Está bueno.',
                    memo: 'Ejemplo modelo: Integración multimodal de IA generativa (audio e imágenes) articulada con la escritura creativa en el aula de lenguas.'
                },
                {
                    catId: 'cat-beneficios',
                    match: 'Creo que los estudiantes se ven más motivados usando las tecnologías digitales.',
                    memo: 'Ejemplo modelo: Evaluación auténtica situada en prácticas juveniles (influencers) que despierta mayor involucramiento e interés frente a la prueba tradicional.'
                },
                {
                    catId: 'cat-desafios',
                    match: 'El mayor problema es que tenemos que terminar usando los celulares porque ellos no traen las máquinas, no tienen los cargadores.',
                    memo: 'Ejemplo modelo: Brecha material y logística cotidiana: la carencia de cargadores y olvido de correos obliga a improvisar con dispositivos móviles.'
                },
                {
                    catId: 'cat-desafios',
                    match: 'La conectividad también es un problema, los equipos que no funcionan o no se puede conectar con alguna otra cosa.',
                    memo: 'Ejemplo modelo: La inestabilidad de la infraestructura de red en el centro interrumpe la continuidad pedagógica de las actividades planificadas.'
                }
            ];

            models.forEach((m, idx) => {
                const idxPos = content.indexOf(m.match);
                if (idxPos !== -1) {
                    let start = Math.max(0, content.lastIndexOf('\\n\\n', idxPos));
                    if (start > 0) start += 2;
                    let end = content.indexOf('\\n\\n', idxPos + m.match.length);
                    if (end === -1) end = content.length;
                    const quoteText = content.slice(start, end).trim();

                    codings.push({
                        id: \`code-model-\${doc.id}-\${m.catId}-\${idx + 1}\`,
                        docId: doc.id,
                        categoryId: m.catId,
                        startChar: start,
                        endChar: end,
                        quoteText,
                        memo: m.memo,
                        source: 'manual',
                        createdAt: Date.now()
                    });
                }
            });
        } else {
            // Para los demás casos educativos: máximo 1 ejemplo por categoría, EXCLUYENDO siempre preguntas del moderador/entrevistador
            categories.forEach(cat => {
                if (!cat.keywords || !cat.keywords.length) return;
                let foundForCat = false;
                documents.forEach(doc => {
                    if (foundForCat) return;
                    const docText = doc.content;
                    const lowerText = docText.toLowerCase();
                    for (const kw of cat.keywords) {
                        if (foundForCat) break;
                        const term = kw.toLowerCase().trim();
                        if (term.length < 4) continue;
                        let pos = 0;
                        while ((pos = lowerText.indexOf(term, pos)) !== -1) {
                            let start = Math.max(0, docText.lastIndexOf('\\n\\n', pos));
                            if (start > 0) start += 2;
                            let end = docText.indexOf('\\n\\n', pos + term.length);
                            if (end === -1) end = docText.length;
                            
                            const turnHeader = docText.slice(start, start + 70).trim();
                            const isInterviewer = /^(moderador|moderadora|entrevistador|entrevistadora|investigador|investigadora)\\b/i.test(turnHeader);
                            if (!isInterviewer) {
                                const quoteText = docText.slice(start, end).trim();
                                if (quoteText.length > 30 && quoteText.length < 500) {
                                    codings.push({
                                        id: \`code-model-\${doc.id}-\${cat.id}-1\`,
                                        docId: doc.id,
                                        categoryId: cat.id,
                                        startChar: start,
                                        endChar: end,
                                        quoteText,
                                        memo: \`Ejemplo modelo: Pasaje empírico del informante vinculado a \${cat.name} (Término: "\${kw}")\`,
                                        source: 'manual',
                                        createdAt: Date.now()
                                    });
                                    foundForCat = true;
                                    break;
                                }
                            }
                            pos += term.length + 20;
                        }
                    }
                });
            });
        }

        return { documents, categories, codings, isSampleLoaded: true, theme: 'dark' };
    }`;

code = code.replace(/function createProject\(caseId\) \{[\s\S]*?\n    \}/, newCreateProjectFunc);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('createProject reemplazado con codificaciones modelo exclusivas de informantes.');
