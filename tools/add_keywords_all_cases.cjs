const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'web-beta', 'educational.js');
let code = fs.readFileSync(targetPath, 'utf8');

// Extract educationalCases
const caseMatch = code.match(/const educationalCases = (\{[\s\S]*?\n\};)/);
if (!caseMatch) {
    console.error('No se pudo encontrar educationalCases');
    process.exit(1);
}

const fn = new Function('return ' + caseMatch[1]);
const cases = fn();

// 1. Jornadas IPES
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

// 2. Primer Año
cases.primer_anio.categories = [
    [
        'cat-adaptacion',
        null,
        'CAT-ADAP',
        'Adaptación al aprendizaje',
        '#0f766e',
        'Estrategias y dificultades para organizar el estudio y comprender exigencias.',
        ['ritmo', 'lectura', 'exigencia', 'estudiar', 'organizar', 'materias', 'carrera', 'universidad', 'facultad']
    ],
    [
        'sub-autonomia',
        'cat-adaptacion',
        'SUB-AUT',
        'Autonomía para estudiar',
        '#14b8a6',
        'Métodos propios, gestión del tiempo e iniciativa personal.',
        ['autónoma', 'autonomía', 'iniciativa', 'fichar', 'resúmenes', 'planificación', 'método', 'tiempo']
    ],
    [
        'cat-apoyo',
        null,
        'CAT-APO',
        'Redes de apoyo y tutorías',
        '#2563eb',
        'Pares, grupos de estudio, tutorías y contención familiar.',
        ['compañera', 'grupo de estudio', 'tutoría', 'tutores', 'pares', 'familia', 'apoyo', 'redes']
    ],
    [
        'cat-incertidumbre',
        null,
        'CAT-INC',
        'Incertidumbre y vivencias emocionales',
        '#b45309',
        'Dudas vocacionales, temor al fracaso, estrés y desorientación.',
        ['shock', 'desorientación', 'miedo', 'vergüenza', 'crisis', 'abandonar', 'presión', 'inseguridad']
    ]
];

// 3. Retroalimentación
cases.retroalimentacion.categories = [
    [
        'cat-clara',
        null,
        'CAT-CLA',
        'Orientación formativa clara',
        '#0f766e',
        'Devoluciones que explican logros y orientan la mejora.',
        ['orienta', 'criterios', 'claridad', 'mejora', 'comentario', 'específico', 'devolución', 'formativa']
    ],
    [
        'sub-criterios',
        'cat-clara',
        'SUB-CRI',
        'Criterios explícitos y rúbricas',
        '#14b8a6',
        'Uso de matrices y pautas previas conocidas.',
        ['rúbrica', 'pautas', 'criterios', 'objetivos', 'matriz', 'explícitos']
    ],
    [
        'cat-emocion',
        null,
        'CAT-EMO',
        'Impacto emocional y afectivo',
        '#9333ea',
        'Reacciones emocionales: frustración, ansiedad, alivio o motivación.',
        ['frustración', 'bronca', 'bloquea', 'angustia', 'miedo', 'emocional', 'inseguridad', 'desánimo']
    ],
    [
        'cat-dialogo',
        null,
        'CAT-DIA',
        'Diálogo pedagógico y reescritura',
        '#2563eb',
        'Intercambio presencial, repreguntas y reentregas.',
        ['diálogo', 'conversar', 'reescribir', 'borradores', 'consulta', 'reentrega', 'intercambio']
    ]
];

// 4. Participación
cases.participacion.categories = [
    [
        'cat-desinteres',
        null,
        'CAT-DES',
        'Desinterés y barreras participativas',
        '#dc2626',
        'Obstáculos para involucrarse: desinformación, apatía o falta de tiempo.',
        ['falta de interés', 'desinterés', 'no van', 'no asisten', 'apatía', 'quejas', 'tiempo', 'desconectados', 'barreras']
    ],
    [
        'sub-formatos',
        'cat-desinteres',
        'SUB-FOR',
        'Formatos rígidos de comunicación',
        '#f97316',
        'Canales que no convocan a las juventudes o resultan burocráticos.',
        ['cartelera', 'whatsapp', 'asambleas', 'reunión', 'formatos', 'plataforma', 'canales', 'rígidos']
    ],
    [
        'cat-apropiacion',
        null,
        'CAT-APR',
        'Apropiación estudiantil de espacios',
        '#059669',
        'Iniciativas autónomas: asambleas, proyectos artísticos y gremio.',
        ['asamblea', 'comisiones', 'propuestas', 'votación', 'proyectos', 'participar', 'gremio', 'iniciativa']
    ],
    [
        'cat-escucha',
        null,
        'CAT-ESC',
        'Receptividad y escucha directiva',
        '#2563eb',
        'Respuesta y apertura de los equipos de gestión ante demandas estudiantiles.',
        ['escucha', 'decisiones', 'directores', 'opinión', 'cambios', 'tomar en cuenta', 'receptividad', 'gestión']
    ]
];

// 5. Estudio de Caso
cases.estudio_caso.categories = [
    [
        'cat-innovacion',
        null,
        'CAT-INN',
        'Innovación pedagógica institucional',
        '#0284c7',
        'Proyectos interdisciplinarios, integración de sensores y plataformas digitales.',
        ['innovación', 'proyectos', 'sensores', 'podcasts', 'comisión', 'interdisciplinaria', 'avances', 'radio']
    ],
    [
        'sub-pares',
        'cat-innovacion',
        'SUB-PAR',
        'Acompañamiento entre pares',
        '#0ea5e9',
        'Tutorías docentes, repositorios compartidos y solidaridad profesional.',
        ['coordinación', 'pares', 'apoyo', 'comparten', 'tutoriales', 'tutorías', 'ayudan', 'Drive']
    ],
    [
        'cat-resistencias',
        null,
        'CAT-RES',
        'Sobrecarga docente y resistencias',
        '#dc2626',
        'Quejas por duplicación burocrática, falta de tiempo pago y fatiga.',
        ['sobrecarga', 'cansancio', 'papel', 'burocráticas', 'horas', 'resistencia', 'antigüedad', 'libreta']
    ],
    [
        'cat-brechas',
        null,
        'CAT-BRE',
        'Brechas de infraestructura y conectividad',
        '#b45309',
        'Cortes de internet, lentitud de servidores y carencia de adaptadores.',
        ['conectividad', 'servidor', 'cargadores', 'adaptadores', 'dispositivos', 'cae', 'internet', 'lento']
    ]
];

// 6. Teoría Fundamentada (salud)
cases.teoria_fundamentada.categories = [
    [
        'cat-desgaste',
        null,
        'CAT-DES',
        'Fatiga laboral y desgaste',
        '#b91c1c',
        'Sobrecarga horaria, turnos rotativos, agotamiento psicofísico y precarización de las condiciones de atención.',
        ['exigencia', 'presión', 'urgencia', 'guardias', 'insomnio', 'cansancio físico', 'sobrecarga', 'agotamiento', 'turnos', 'tensión', 'desgaste']
    ],
    [
        'sub-emocional',
        'cat-desgaste',
        'SUB-EMO',
        'Carga emocional y sufrimiento vicario',
        '#ef4444',
        'Impacto subjetivo del contacto cotidiano con el dolor ajeno, la muerte, la incertidumbre clínica y la impotencia institucional.',
        ['carga emocional', 'sufrimiento', 'despersonalización', 'cinismo', 'impotencia', 'angustia', 'muerte', 'dolor', 'quebrarte', 'invisible']
    ],
    [
        'cat-autocuidado',
        null,
        'CAT-AUT',
        'Estrategias individuales de autocuidado',
        '#0f766e',
        'Prácticas deliberadas para preservar la salud: límites entre trabajo y vida personal, desconexión digital, actividad física y terapia.',
        ['límites', 'natación', 'terapia', 'desconexión', 'ancla', 'cuidar', 'salud mental', 'psicológica']
    ],
    [
        'cat-soporte',
        null,
        'CAT-SOP',
        'Soporte grupal y ateneos reflexivos',
        '#2563eb',
        'Espacios sistemáticos de diálogo interdisciplinario, escucha mutua, desahogo emocional y contención entre colegas de equipo.',
        ['ateneo', 'equipo', 'interdisciplinario', 'contener', 'colegas', 'cuidar al que cuida', 'reflexivo', 'café', 'llorar']
    ]
];

// 7. Etnografía
cases.etnografia.categories = [
    [
        'cat-apropiacion',
        null,
        'CAT-APR',
        'Apropiación comunitaria del espacio',
        '#059669',
        'Prácticas vecinales de recuperación, cuidado ambiental y memoria colectiva.',
        ['asambleas', 'firmas', 'limpiar', 'ceibos', 'plantaron', 'árbol', 'dignidad', 'historia', 'vecinos', 'plaza']
    ],
    [
        'sub-intergen',
        'cat-apropiacion',
        'SUB-INT',
        'Convivencia y tensiones intergeneracionales',
        '#10b981',
        'Encuentros, roces y acuerdos entre adultos mayores y juventudes.',
        ['chiquilines', 'gurises', 'patineta', 'rapear', 'música', 'viejos', 'bochinche', 'tensiones', 'ruido']
    ],
    [
        'cat-democratica',
        null,
        'CAT-DEM',
        'Espacio público como bien democrático',
        '#2563eb',
        'La plaza como territorio de encuentro gratuito, universal y no mercantilizado.',
        ['democrático', 'espacio público', 'sin pagar', 'encerrados', 'comunidad', 'todos', 'gratuito', 'corazón']
    ],
    [
        'cat-solidaridad',
        null,
        'CAT-SOL',
        'Redes de solidaridad y ayuda mutua',
        '#9333ea',
        'Organización vecinal ante emergencias de salud, rifas y apoyo mutuo.',
        ['solidaria', 'rifa', 'enferma', 'unido', 'corazón', 'ayuda', 'apoyo', 'organizamos']
    ]
];

// Replace educationalCases in code
code = code.replace(/const educationalCases = \{[\s\S]*?\n\};/, 'const educationalCases = ' + JSON.stringify(cases, null, 4) + ';');

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Todas las categorías de los 7 casos actualizadas con keywords exhaustivas.');
