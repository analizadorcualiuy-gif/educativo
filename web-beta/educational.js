(function () {
    'use strict';

    const contactUrl = 'mailto:analizadorcualiuy@gmail.com?subject=Consulta%20sobre%20AnalizadorCualiUY%20Pro%20desde%20la%20Edici%C3%B3n%20Educativa&body=Hola%2C%0A%0AEstoy usando la Edici%C3%B3n%20Educativa%20de%20AnalizadorCualiUY%20y%20quisiera%20recibir%20informaci%C3%B3n%20para%20adquirir%20la%20versi%C3%B3n%20Pro.%0A%0AGracias.';

    const concepts = [
        ['1. Preparar el corpus', 'Incorporá un documento y definí qué pregunta querés comprender. El corpus es el conjunto de textos que analizarás.'],
        ['2. Crear categorías', 'Una categoría reúne una idea relevante para tu pregunta. Por ejemplo: “Barreras para aprender”. Su criterio explica qué pasajes incluye.'],
        ['3. Usar subcategorías', 'Una subcategoría afina una categoría más amplia. Por ejemplo: “Falta de tiempo” puede estar dentro de “Barreras para aprender”.'],
        ['4. Codificar evidencia', 'Codificar es vincular un fragmento concreto del texto con una categoría. No es contar palabras: es marcar evidencia que responde a tu pregunta.'],
        ['5. Escribir memos e interpretar', 'Un memo registra por qué el pasaje importa, qué significa en su contexto y qué dudas o comparaciones abre. Después, la matriz ayuda a revisar patrones sin reemplazar tu interpretación.']
    ];

    const educationalCases = {
    "jornadas_ipes": {
        "title": "Jornadas IPES: Tecnologías e IA en el Aula",
        "prompt": "¿Cómo perciben, integran y tensionan los docentes el uso de tecnologías digitales e inteligencia artificial en sus prácticas formativas y de evaluación?",
        "task": "Taller de análisis cualitativo: 1) Codificá el corpus con las categorías a priori (deductivas). 2) Identificá temas emergentes y creá nuevas categorías inductivas a partir de la evidencia discursiva (ej. mediación humana/vínculo pedagógico, alfabetización crítica/verificación, barreras de infraestructura). 3) Redactá memos interpretativos y contrastá perspectivas en la matriz.",
        "categories": [
            [
                "cat-usos-eval",
                null,
                "CAT-USO",
                "Usos pedagógicos y evaluación",
                "#2563eb",
                "Herramientas, plataformas y dinámicas utilizadas en clase y evaluación: Kahoot, CREA, rúbricas, videos, presentaciones, etc.",
                [
                    "evaluación",
                    "evaluar",
                    "Kahoot",
                    "CREA",
                    "rúbricas",
                    "retroalimentación",
                    "cotejos",
                    "actividades",
                    "presentación",
                    "Canva",
                    "herramientas digitales"
                ]
            ],
            [
                "sub-ia-gen",
                "cat-usos-eval",
                "SUB-IAG",
                "Aplicaciones de IA generativa",
                "#0284c7",
                "Generación de imágenes, canciones, historias, prompts para planificación y actividades con ChatGPT, Suno, Canva, etc.",
                [
                    "inteligencia artificial",
                    "IA",
                    "chat gpt",
                    "chatgpt",
                    "Suno",
                    "Taipo",
                    "prompt",
                    "prompts",
                    "generativa",
                    "generativas",
                    "3D"
                ]
            ],
            [
                "cat-beneficios",
                null,
                "CAT-BEN",
                "Beneficios y motivación",
                "#059669",
                "Ventajas percibidas: mayor motivación e interés estudiantil, diversidad de formatos y optimización de tiempos docentes.",
                [
                    "motivados",
                    "motivación",
                    "entusiasmados",
                    "beneficio",
                    "ventaja",
                    "ventajas",
                    "optimiza",
                    "tiempo",
                    "recursos",
                    "facilidades"
                ]
            ],
            [
                "cat-desafios",
                null,
                "CAT-DES",
                "Desafíos y limitaciones técnicas",
                "#dc2626",
                "Obstáculos materiales y organizativos: conectividad, falta de dispositivos/cargadores, sobrecarga horaria y demandas de capacitación.",
                [
                    "obstáculo",
                    "obstáculos",
                    "obstaculizan",
                    "celulares",
                    "cargadores",
                    "conectividad",
                    "conexión",
                    "equipos",
                    "problema",
                    "dispositivos",
                    "sobrecarga"
                ]
            ]
        ],
        "documents": [
            [
                "Grupo_Focal_Liceo1_Jornadas_IPES.txt",
                "GRUPO FOCAL - LICEO 1 (JORNADAS IPES)\nFecha: 11/11/2025 | Horario: 15:00 - 15:50 | Lugar: L 1\nModeradora: CC (Moderador)\nInformantes / Participantes:\n- Docente 1: Docente de Arte\n- Docente 2: Docente de Tecnología e Innovación\n- Docente 3: Docente de Inglés\n- Docente 4: Docente de Inglés\n- Docente 5: Coordinador de Enseñanza y Docente de Historia\n\nModerador: Bueno, buenas tardes, mi nombre es Moderador. Para nosotros van a ser Liceo uno, Liceo 2, Liceo 3. Obviamente que vamos a decir que son los María Espínola y referidos a tales lugares, pero no va a haber identificación directa. Bien, otra de las cuestiones es el tema ético que, como yo les decía, no vamos a usar los nombres de ustedes ni de la institución, pero sí les tenemos que pedir el consentimiento de que saben que están en el marco de una investigación. De que vinieron voluntariamente y generosamente agregaría yo. Así que lo que les voy a pedir es que si pueden presentarse diciendo su nombre, solo el nombre de pila y cuál es su rol en la institución. No los escucho, pero tampoco me aparecen muteados. Pero hoy sí los escuché cuando dijeron están todos ahí, sí dijimos están todos ahí. ¿Ustedes sí me están escuchando? Sí, bien, ahí parecía que se iba a escuchar algo. Ahora sí, perfecto. Entonces les iba a pedir que pudieran decir su nombre y el rol que desempeñan en la institución.\n\n(Se presentan uno por uno los docentes, señalando su rol en el centro)\n\nModerador: Bien, buenísimo, buenísimo, bien variadito el panorama, así que nos viene espectacular. Bien, entonces empiezo a contarles un poco qué preguntas habíamos pensado, pero son como disparadores para conversar de algunas cosas que están vinculadas a lo que para nosotros es el tema de investigación. ¿Cómo describirían ustedes su nivel de competencia digital docente? ¿Cómo se ubicarían en el grado de desarrollo de competencia digital? Pueden hacerse su propia escala. Capaz que moderados en general, salvo Docente 2. ¿Qué opinan ustedes sobre el uso de las herramientas digitales para la evaluación y la retroalimentación?\n\nDocente 4: Creo que son muy útiles, pero yo todavía tengo como que miedo de usarla, como que me da, no he usado mucho. Bien, tendría que practicar, ponerme a practicar para después ponerla en práctica.\n\nDocente 1: Yo he usado mucho Kahoot, por ejemplo, donde ellos mismos… elaborar pensando en aplicarle a los compañeros. Entonces, desde ahí ellos tienen que pensar en todo lo que se trabajó, cómo hacer las preguntas, qué imágenes utilizar para que sea un poco más complejo a los compañeros y a su vez los compañeros tienen que responder eso.\n\nModerador: Bien, bien interesante. No solamente evaluarlos con Kahoot, sino hacerlos a ellos diseñar el Kahoot como forma de evaluación. Bien.\n\nDocente 3: En mi caso, sí, me parece que me falta más herramientas y eso, aunque en algunas presentaciones, por ejemplo, yo los dejo libres para que ellos elijan, por ejemplo, el formato y a veces aprendo más yo de ellos porque utilizan alguna.\n\nModerador: Bien interesante, bien interesante.\n\nDocente 2: Yo he utilizado más que nada este lista de cotejos y rúbricas, que también las tomo mucho de CREA o de las plataformas que nos permiten este construir rúbricas y lista de cotejos, ¿no? Lo que sirve obviamente para evaluar y los de los alumnos también se autoevalúan.\n\nModerador: Claro, bien interesante, bien interesante. Bien, una pregunta en esto que estás mencionando de CREA. Y de las herramientas es pedirle a ellos que usen esas herramientas en algunos casos y utilizarlas disponibles en Crea para proponer evaluaciones. Por ejemplo, ¿a eso te referís en algunos casos, pedirles a ellos que lo hagan a través de videos o de otras maneras? Y desde Crea lo que decís es utilizar las que vienen, las que se pueden elaborar.\n\nDocente 5: Con CREA.\n\nModerador: Otra de las preguntas que teníamos para ustedes de la evaluación, ustedes me hablaron de las propuestas de evaluación que hacen o de lo que les piden como evaluación a los estudiantes y que ellos usan las tecnologías digitales. Y respecto a la retroalimentación, a esto de devolverles a ellos, ¿no?, después de una evaluación para eso. ¿Han usado algo? ¿Conocen algo?\n\nDocente 5: Generalmente, yo, de mi parte personalmente, si ellos hicieron, no sé, una presentación, luego de la presentación vamos hablando y haciendo puestas en común, pero no una herramienta específica para evaluar, de retroalimentación.\n\nModerador: Bien, lo que podemos decir es que utilizan herramientas y también utilizan instrumentos que pueden haber sido creados con herramientas digitales. Sí, pero no una herramienta específicamente de retroalimentación, aunque las que mencionaste en CREA. ¿Les brinda, verdad? Le brinda retroalimentación. Claro, bien, igual que como decía hoy el compañero de el Kahoot. No de después analizar los resultados que iban teniendo en el Kahoot. Bien, ¿ustedes consideran que sus prácticas pedagógicas, que sus prácticas se han visto transformadas por el uso de la tecnología digital? Igual los veo como bastante jóvenes, capaz que no son este de la era pre tecnología digitales, pero ¿ustedes sienten que este avance de tecnologías digitales ha provocado algún tipo de cambio en sus prácticas?\n\nDocente 1: Sí, yo pienso que sí. Yo utilizo mucho la IA para la parte de imagen y eso, porque yo lo utilizo bastante. Por ejemplo, con Séptimo, al principio del año, ellos tenían que dibujar un personaje y a muchos no les sale. Entonces hicieron el personaje, se lo transformó, en ese sentido que lo inicializará mediante inteligencia artificial, después crearon una historia y de nuevo, con esa historia y el personaje que habían creado, crearon la historieta, utilizamos bastante poco con imágenes, con octavos, que están creando un librillo donde a partir de una investigación que hicieron diferentes artistas nacionales, sacaron fotografías referentes al patrimonio local, como cosas que hacen a la identidad local, y transformaron al estilo de ese artista, las fotos de ellos. Analizando ahí la imagen cómo fue creada, con las pinceladas, cómo quedaron las imágenes creadas, como inteligencias artificiales, yo utilizo bastante. Y en eso, o también en diseño en 3D y en maquetas puntuales.\n\nModerador: Bien, súper interesante, a la inteligencia artificial ya vamos a ir en preguntas más adelante, pero me fuiste adelantando información muy pero muy valiosa. ¿Los demás sienten que sus prácticas se han visto este impactadas por la inclusión de tecnologías digitales?\n\nDocente 2: Yo creo que si este comparamos el momento que nosotros éramos estudiantes a ahora. Hubo una transformación muy grande, porque nosotros por ejemplo ahora para hacer propuestas de evaluación tenemos que pensar la evaluación que vamos a poner, aquello que nos ponían nosotros de pregunta y respuesta, eso ya no funciona. Eso no es un tipo de evaluación posible porque sabemos bien que ellos toman las herramientas digitales y hacen la actividad. Hay que pensar cada evaluación que se le va a poner al chiquilín, hay que razonarla, hay que ver todas las posibilidades. En realidad, a nosotros yo creo que este nos exige estar en formación permanente también este cambio que se viene dando con respecto a la inclusión de la tecnología y la educación.\n\nModerador: ¿Y qué beneficios han encontrado en las experiencias que han tenido de evaluar, incluyendo tecnologías digitales? ¿Cuáles podrían decir que son las ventajas que tiene utilizar tecnologías digitales para evaluar?\n\nDocente 4: Creo que los estudiantes se ven más motivados usando las tecnologías digitales. Yo, por ejemplo, la semana que viene tengo una evaluación que los chiquilines de noveno tendrán que filmarse, van a filmar un video de 2 o 3 minutos siendo influencer por un día. Muchos van a elegir, eligen la temática que quieran, ya sea música, cocina, deportes. Y uno, por ejemplo, le gusta la pesca y va a hacer sobre la pesca. Y va a ser influencer por un día. Video cortito, pero esa va a ser la evaluación final de la unidad temática que justamente son las redes sociales y el impacto que tienen los jóvenes. Y bueno, ellos están entusiasmados con eso, están entusiasmados con si fuera una evaluación tradicional, no estarían entusiasmados. Y más en inglés, entonces me parece que se motivan bastante.\n\nDocente 2: El tema de diálogo hoy en el almuerzo era ese.\n\nModerador: Bien, qué interesante, qué interesante. ¿Algún otro aporte que hayan visto como beneficio del uso de las tecnologías digitales para evaluar?\n\nDocente 5: Pienso que, como decía la compañera, que te da un abanico más grande de recursos para ser enfocado a cosas que a ellos les guste más. Puede ser redes sociales, algo de virtud, películas...\n\nDocente 4: Puedes enfocar a canciones. También hay una página que yo he usado que se llama Suno que es para crear canciones y que ellos se enganchan y crean historias. También escriben la historia y después con la inteligencia artificial crean toda la historieta con imágenes. Está bueno.\n\nDocente 1: Yo trabajo mucho con Chroma Key también con la pantalla verde para modificar el fondo.\n\nModerador: Bien, ¿y los desafíos, las dificultades o aquellas cuestiones que de alguna manera obstaculizan la evaluación o se obstaculizan por el uso de las tecnologías digitales?\n\nDocente 1: El mayor problema es que tenemos que terminar usando los celulares porque ellos no traen las máquinas, no tienen los cargadores. Entonces usamos los celulares. Hoy no saben los correos electrónicos, entonces por ejemplo ahora con octavos estamos trabajando y entramos a Canva. Y yo voy mirando y me dicen: \"a ver, fíjese, esta página del librillo\", yo miro acá y están todos conectados en el mismo librillo, completando con las imágenes, con efecto, todo. Pero fue todo un trabajo porque claro, no se acordaban de los correos para que todos ingresaran, enviar y poder ingresar todos con Canva, el mismo archivo.\n\nModerador: Bien, ese es un obstáculo claro, los dispositivos, el tema de los correos. ¿Algo más que les parezca que puede obstaculizar el trabajo, la inclusión de tecnologías digitales en sus aulas?\n\nDocente 4: La conectividad también es un problema, los equipos que no funcionan o no se puede conectar con alguna otra cosa.\n\nDocente 2: Y a veces los hogares no cuentan con dispositivos, con conexión.\n\nModerador: Claro, claro, claramente, no es solo en la institución, sino después cuando se van a la casa.\n\nDocente 4: Sí, aunque muchos vienen y están ahí de tarde a veces.\n\nModerador: Bien, que hacen las tareas ahí mismo. La conexión del liceo. Bien, otra de las preguntas es ¿qué apoyo creen que necesitan para mejorar su competencia digital? Hoy se ubicaban en un nivel medio. Bueno, ¿qué apoyos creen que pueden necesitar para mejorar ese desarrollo de competencia digital?\n\nDocente 1: Capacitaciones concretas, con ejemplos claros, específicos que sean realmente aplicables.\n\nModerador: Bien, a eso vamos con el tema de la capacitación o de la formación. ¿Cómo perciben ustedes la formación que hay?\n\nDocente 4: Yo la sigo a una docente de inglés que tiene una maestría o algo en tecnología y que la sigo en Instagram y prácticamente todos los días se está publicando tips y páginas y te enseña ahí rapidito porque te enseña más o menos a usar y de ahí voy sacando. Es mucha cosa lo que sube, pero algo trato de rescatar porque sube muchas cosas y están buenas, aplicables al aula y ella al ser una docente de inglés son súper útiles todas las cosas que muestra.\n\nModerador: Bien por lo aterrizado decían hoy, por lo concreto. Claro, bien, se valoraría como esto de la presencialidad.\n\nDocente 1: Yo pienso que una buena forma de aprender y aprender más rápido, serían cursos, charlas que sean para aprender de forma práctica y presencial. Tener a alguien que te esté ayudando, que te muestre práctica.\n\nModerador: ¿Y ustedes en el centro han tenido algún tipo de oportunidad de formación?\n\nDocente 3: Hablando de formación me gustaría agregar una idea, que es un tema que no hemos hablado, que es el tema de que a mí me gustaría, por ejemplo, formarme más en la parte de tecnología, pero enfocado a los estudiantes con discapacidad, con problemas de aprendizaje. Me parece que falta un montón, no solamente la formación de nosotros en las instituciones que nos dan como pantallazo de lo que significa cada uno, pero no nos enseñan cómo. Y yo he comprobado que con la tecnología uno logra hacer algo, pero no logra abarcarlo bien o trabajarlo de manera mejor o profunda con ese estudiante.\n\nModerador: Bien, el tema de la inclusión es todo un tema. Por ahí necesitamos formación y quizás ver cómo usar la tecnología para favorecer esa inclusión. En cuanto a la formación, ¿ustedes cómo perciben la oferta que hay a nivel país de formación en tecnologías digitales? ¿Qué identifican como instituciones o desde dónde se ofrece formación en tecnologías digitales?\n\nDocente 2: Yo creo que formación hay, o sea, oferta hay, el tema es el tiempo. Tiempo, los horarios coinciden con el trabajo, generalmente. Entonces la sobrecarga que a veces se tiene es difícil poder destinar, y si se destinan horarios, después, para cumplir con las tareas, que a veces son bastante complejas, se complica. Generalmente te piden horas en la plataforma.\n\nDocente 5: Hay docentes que están todo el día en el centro y salen a sus casas derecho a hacer un curso.\n\nModerador: Claro, no es fácil de sobrellevar, claramente. ¿Y la oferta la han recibido desde dónde, por ejemplo? ¿Cuándo ustedes dicen cursos hay?\n\n[Varios: hablan a la vez]: Ceibal, sí Ceibal aparece un montón o en las redes también.\n\nModerador: Bien, Ceibal o en las redes también.\n\n(Se corta y no se escucha bien lo que dicen)\n\nDocente 1: Sí, de repente, como decía Docente 2, presencial, aprovechando la instancia esta de la coordinación de centro, y que sea presencial, algo que sea apuntado a esas horas, que es mucho más productivo que algunas cosas más complejas que al final no se terminan haciendo.\n\nDocente 2: La red también tiene varios cursos, lo que era la Red Global de Aprendizajes. Hay también una oferta importante de cursos.\n\nModerador: Ahora entraríamos como más en la inteligencia artificial. Ya estuvieron adelantando algunos ejemplos bien interesantes. Respecto a inteligencia artificial, ¿todos han usado inteligencia artificial con fines pedagógicos?\n\n[Varios dicen: Sí, algo.]\n\nModerador: En distinta medida, pero todos, no hay nadie que no haya usado. Bien, todos usaron. Ya tuvimos algunos ejemplos que nos fue haciendo el compañero. ¿Qué otros ejemplos de herramientas que hayan usado?\n\nDocente 1: El famoso ChatGPT, creo que se utiliza bastante. Muchas IA generativas que te ayudan.\n\nModerador: Bien, ¿cómo por ejemplo?\n\nDocente 1: Como de video, de audio, de imagen, hay para todo. Si no la inventan. Ahora nomás con Segundo EMS, que estamos haciendo en conjunto con Historia y Sociología o Formación Ciudadana, es una murga, porque acá la murga no llega, acá es carnaval. Entonces acá se hicieron toda la investigación para hacer la letra y eso con inteligencia artificial para armar bien la letra, el sonido también.\n\nModerador: ¿Y de inteligencia artificial generativa? ChatGPT, no sé si alguna otra herramienta que recuerden.\n\nDocente 4: Suno fue usado para crear canciones, después otro para crear historias a partir... le ponés el cuento y te crea toda la imagen, creo que se llama story.com o algo así me parece... Después hay otro que se llama Taipo, a partir de una imagen te genera una historia. Esto es lo que he utilizado.\n\nModerador: Bien, y esto capaz que viene ligado un poco a lo que ya han estado diciendo, pero ¿qué ventajas le han visto al uso de la inteligencia artificial para sus clases, para la enseñanza, para la evaluación? ¿Sienten que les ha servido? ¿Qué resultado les ha dado?\n\nDocente 1: En mi caso del arte, que a veces es un poco complejo para algunos estudiantes, no tienen facilidad, se abre un poco más el abanico al tener la posibilidad de trabajar la tecnología. Se va intercalando a lo largo del año frente a actividades dando opciones, como decía Docente 3, de darle la opción de este tipo de presentación que pueden hacer si son más facilidades todo lo digital o con lo manual, que bueno, tienen la posibilidad de presentarlo de una manera u otra y aplicando los contenidos desarrollando las competencias.\n\nModerador: ¿Alguien más que haya visto algún tipo de ventajas?\n\nDocente 4: En el caso de inglés es más práctico porque ellos usan mucho el chat para traducir, utilizan el audio también para cuando presentan, de ahí estudian en base a lo que escucha para las presentaciones orales y eso es bastante práctico. Para ellos y en la elaboración de textos y todo eso usan el chat continuamente.\n\nDocente 2: Y la importancia también de... yo por ejemplo tengo Segundo EMS bachillerato y la importancia de que luego que ellos hacen una tarea utilizando el chat, que sabemos que lo usan, que ellos puedan leerlo y ver si realmente el chat dijo lo que era la intención de ellos decir, si realmente refleja su pensamiento. Entonces eso es importante, porque a veces lo que hacen es hacer la tarea y entregarte, sin embargo no es lo que ellos pensaban realmente. Entonces por eso pido que expliquen, que lo lean y lo expliquen, y a veces dicen: \"pero no era esto lo que quería decir, me cambió la palabra\". Sí, cambió la palabra, cambió la terminología. Entonces, cómo hay que guiar también al chat para que diga lo que usted quiere que diga. Eso también es parte de enseñarles a ellos la utilización de la tecnología, ¿no?\n\nDocente 4: El prompt que usan tiene que ser muy específico. Lo que yo veo que con el chat, por ejemplo, yo siempre les digo a ellos: \"Ustedes tienen que leer lo que les da el chat\". Porque lo que me pasa es que siempre el chat le cambia los pronombres, por ejemplo en inglés si están hablando de un varón le pone ella, empieza hablando de él y después en el medio del texto empieza hablando de ella, después vuelve a él y después sigue con ella. Tienen que prestar atención porque el chat acá les está cambiando los pronombres a las personas y generalmente les cambia. En la mayoría de los textos les cambia el pronombre. Y eso me he dado cuenta que siempre sucede.\n\nDocente 5: Yo pienso que otra ventaja también que tiene es ayuda a los docentes, ayuda a elaborar actividades, a planificar, optimiza mucho tiempo a veces. Si tiene una cosa y otra, le ponés un prompt que vaya medio directo a lo que querés hacer y te tira muchas ideas.\n\nModerador: Bien, ¿y esas ideas que les tiran como para que puedas pensar creativamente tu clase, también lo ven que lo haga para la evaluación, por ejemplo, también lo han probado para la evaluación?\n\nDocente 1: Sí, sí, también tira para la evaluación. Permite. Te ayuda en eso también. Hay que orientarlo.\n\nModerador: Sí, claramente la estructura del prompt, que como decía la compañera, es importante. ¿Ustedes creen que la inteligencia artificial puede ayudar en brindarle retroalimentación a los estudiantes en la corrección de las tareas de los estudiantes?\n\n[Varios dicen: Sí, sí creo que sí. Pienso que sí.]\n\nModerador: Piensan que sí, pero ¿no la han usado con ese fin?\n\n[Varios dicen: No, no]\n\nDocente 2: Yo intento que ellos hagan la corrección, cuando aparece algún tipo de tecnología o de análisis que no se adapta a lo que se está pidiendo, siempre es un trabajo que no es el trabajo que se pidió. No se adapta a la consigna. Y también el tema de la consigna también hay que tener cuidado con el chat, porque a veces la consigna tampoco refleja lo que el docente quiere, ¿no? La consigna que te ayuda el chat, lo que te plantea el chat. También está... hay que razonar muy bien, digo, tanto la actividad utilizando la inteligencia artificial como utilizando la clase en general.\n\nModerador: Bien, y lo que me estás queriendo decir es que lo que intentás hacer es que ellos analicen lo que da. Otra de estas cuestiones que ya algunas fueron manifestando, pero ¿qué barreras han encontrado? ¿Qué obstáculos han encontrado con el uso de la inteligencia artificial? ¿Cuáles creen que son los principales obstáculos de usarlas en la enseñanza y en la evaluación?\n\nDocente 1: A veces hacen todo con IA. En mi caso yo trabajo demasiado con la parte de texto... Hacen todo y después le hacen la misma actividad sin eso y totalmente diferente.\n\nDocente 5: Debe ser buen uso de la inteligencia, ¿no? Si bien es algo que está ya, no vamos a ir contra la corriente, sino hay que darle un buen uso. Y a veces es eso, entonces bueno, es muy dependiente de la IA, todo. Todo ChatGPT. Le duele la cabeza, un remedio para...\n\nModerador: Claro, claro, esta dependencia que se ha generado.\n\nDocente 4: Sí, no siempre la información que teoriza es la correcta. Nos pasó en una presentación que hicimos interdisciplinaria con Inglés, Historia y Computacional y tenían que presentar sobre un personaje de historia y los chiquilines hablaron pero de un personaje que existió en otro tiempo que no tenía nada que ver con los personajes que el profesor les había pedido. O sea que también no sé si no leen o se confiaron en la información que les dio el chat, pero también hay que fomentar eso, tienen que leer y no confiarse, ¿no? Porque no siempre es precisa la información. Que antes nos pasaba con Wikipedia. Por ahí te copiaban y pegaban algo y en la mitad del texto tenía cualquier disparate. Y ellos no leían, te traían tal cual copiaban y pegaban. Y traían esa información.\n\nModerador: Vivimos la etapa de Wikipedia y la lucha con algunas de esas cuestiones. Bien, no sé si quieren agregar algo más respecto a las barreras en el uso de la inteligencia artificial para la enseñanza o para la evaluación o desafíos.\n\nDocente 3: Yo me acordé de una frase, que decía que el docente ya no tiene tanto el rol de ser el que enseña, sino más el que guía por ese mismo tema. Como que hoy en día, si tenemos esa gran herramienta, pero tenemos que enseñarles qué buscar, cómo usarlo, porque ellos en realidad cualquier cosita que vos le estés enseñando de clase, sea de la materia que sea, van a encontrar ahí las respuestas. Uno ya no tiene que brindarle eso, sino enseñarle a usarla. Es un trabajo más pesado.\n\nModerador: Si ustedes fueran a hacer recomendaciones para mejorar la formación y recibir apoyo en las competencias digitales, ya hay algunas cosas que me fueron diciendo. Me dijeron: queremos que sea presencial, queremos que sea aterrizado. Queremos que se usen los espacios ya previstos en el centro, como la coordinación. ¿Alguna otra recomendación que ustedes quisieran sugerir? Ya fueron aportando muchas cuestiones de esto que estaba mencionando. No sé si querían agregar algo de la formación que necesitan, si ustedes fueran a hacer alguna sugerencia para que les dieran algo que realmente les sirva para aprender a evaluar con tecnologías digitales.\n\nDocente 2: Yo creo que volveríamos a lo mismo, que los subsistemas den tiempo para eso, volvemos a lo mismo.\n\nModerador: Bien, como tratar esas debilidades que habíamos nombrado hoy, poder apuntar a mejorarlas, a mejorar esas condiciones. Bien, y ahora voy a la imaginación y acá sí les prometo que cerramos la entrevista: a la imaginación. ¿Cómo se imaginan ustedes el futuro? ¿Qué herramientas se imaginan? ¿Qué posibilidades se imaginan en un futuro para evaluar con tecnologías digitales? Hace un tiempo atrás ni nos imaginábamos esto de la IA.\n\nDocente 2: No, pero no todo negativo. El otro día nosotros fuimos a un curso donde nos estaban contando una historia donde una chiquilina presentaba grandes problemas de autoestima y dice que los compañeros pusieron sus características en la inteligencia artificial y la describió todo lo contrario: que era una persona hermosa, que era una persona que tenía gran valor, emotiva, que era bondadosa. O sea, encontró una cantidad de aspectos positivos y entonces a partir de ahí ella empezó a ver aspectos en su persona y su autoestima mejoró. O sea, yo creo que, capaz sabiéndola usar, o no sé, acá fue una trampa que hicieron los compañeros para hacerla pasar, para que ella se viera mejor. Pero también es una herramienta que tiene sus pro y sus contra como todo.\n\nModerador: Bien, no está fácil de imaginarse, capaz, porque han habido tantos cambios, que no sé si quieren agregar algo más, algo que se les ocurra que pueda aportar a esta temática que estuvimos reflexionando.\n\n(Intervención breve)\n\nModerador: Bien, te imaginas eso y con la inteligencia artificial cada vez impactando en más espacios, en más lugares, bien.\n\nDocente 1: No creo que sustituya a la inteligencia humana.\n\nDocente 3: Si estás triste, si ves a los estudiantes tristes porque pasa algo, hablas, eso no hace esto. No capta emociones.\n\nDocente 2: No. En el contacto con el otro, eso la Inteligencia Artificial jamás va a poder, o sea, hay cosas que no. El humano no se pierde, no se debería perder. Porque le quitaríamos lo educativo. Estaríamos al frente de una computadora, sentaríamos a las personas y nada. No sé, yo pienso que no, no es posible. No sé.\n\nModerador: Bueno, gente, les agradezco infinitamente. Gracias."
            ]
        ]
    },
    "primer_anio": {
        "title": "Adaptación a una nueva trayectoria formativa",
        "prompt": "¿Qué factores facilitan u obstaculizan la adaptación académica y emocional de los estudiantes al ingresar a la educación superior?",
        "task": "Codificá los testimonios distinguiendo entre dificultades iniciales, redes de sostén y estrategias autónomas. Redactá un memo que compare los procesos de Ana y Mateo.",
        "categories": [
            [
                "cat-adaptacion",
                null,
                "CAT-ADAP",
                "Adaptación al aprendizaje",
                "#0f766e",
                "Estrategias y dificultades para organizar el estudio y comprender exigencias.",
                [
                    "ritmo",
                    "lectura",
                    "exigencia",
                    "estudiar",
                    "organizar",
                    "materias",
                    "carrera",
                    "universidad",
                    "facultad"
                ]
            ],
            [
                "sub-autonomia",
                "cat-adaptacion",
                "SUB-AUT",
                "Autonomía para estudiar",
                "#14b8a6",
                "Métodos propios, gestión del tiempo e iniciativa personal.",
                [
                    "autónoma",
                    "autonomía",
                    "iniciativa",
                    "fichar",
                    "resúmenes",
                    "planificación",
                    "método",
                    "tiempo"
                ]
            ],
            [
                "cat-apoyo",
                null,
                "CAT-APO",
                "Redes de apoyo y tutorías",
                "#2563eb",
                "Pares, grupos de estudio, tutorías y contención familiar.",
                [
                    "compañera",
                    "grupo de estudio",
                    "tutoría",
                    "tutores",
                    "pares",
                    "familia",
                    "apoyo",
                    "redes"
                ]
            ],
            [
                "cat-incertidumbre",
                null,
                "CAT-INC",
                "Incertidumbre y vivencias emocionales",
                "#b45309",
                "Dudas vocacionales, temor al fracaso, estrés y desorientación.",
                [
                    "shock",
                    "desorientación",
                    "miedo",
                    "vergüenza",
                    "crisis",
                    "abandonar",
                    "presión",
                    "inseguridad"
                ]
            ]
        ],
        "documents": [
            [
                "Entrevista_Ana_Trayectoria_Educativa.txt",
                "ENTREVISTA EN PROFUNDIDAD - CASO ANA\nInformante: Ana (19 años, estudiante de primer año de Profesorado, primera generación en estudios terciarios)\nLugar: Biblioteca del Instituto | Fecha: 24/04/2025\n\nEntrevistadora: Buenas tardes, Ana. Quería consultarte cómo viviste la transición entre la secundaria y el ingreso a esta carrera docente. ¿Qué fue lo que más te impactó al comienzo?\n\nAna: Al principio fue un shock bastante fuerte. En el liceo yo estaba acostumbrada a que los profesores te daban resúmenes breves y te iban recordando las fechas clase a clase. Acá, el primer día de Pedagogía nos dieron un programa con cinco libros y textos de 40 páginas para la semana siguiente. Sentí una desorientación total. Me pasaba las tardes intentando leer sin entender bien qué era lo importante y qué no. Pensaba: \"esto no es para mí, no voy a dar abasto\". Me daba muchísima vergüenza levantar la mano para preguntar porque veía que otros compañeros intervenían usando palabras técnicas y sentía que si no entendía era una falla exclusivamente mía.\n\nEntrevistadora: ¿Y en qué momento sentiste que esa situación empezó a cambiar o qué te ayudó a encontrar un ritmo?\n\nAna: Lo que me salvó fue una compañera que me vio angustiada en el patio y me invitó a sumarme a su grupo de estudio en la biblioteca. Éramos cuatro. Empezamos a juntarnos dos veces por semana, nos dividíamos los capítulos, hacíamos puestas en común y ahí me di cuenta de que todos estábamos con las mismas dudas y miedos. El grupo de pares fue fundamental; dejó de ser una experiencia solitaria. Además, la profesora de Lengua organizó talleres de lectura académica y nos enseñó a fichar textos y armar redes conceptuales.\n\nEntrevistadora: Mirando hacia atrás, ¿qué cambios notas en tu forma de estudiar hoy?\n\nAna: Aprendí a ser mucho más autónoma. Ahora tengo mi propio cuaderno de síntesis, me armo una planificación semanal con horarios fijos y si no comprendo un concepto busco artículos complementarios o voy directamente a los horarios de consulta de los docentes. Ya no espero que me digan qué hacer; tomo la iniciativa. Todavía me pongo nerviosa antes de los parciales orales, pero sé que tengo herramientas para prepararme y que puedo apoyarme en mis compañeros."
            ],
            [
                "Entrevista_Mateo_Trayectoria_Educativa.txt",
                "ENTREVISTA EN PROFUNDIDAD - CASO MATEO\nInformante: Mateo (20 años, estudiante de primer año proveniente de una localidad rural del interior)\nLugar: Sala de Tutorías | Fecha: 28/04/2025\n\nEntrevistador: Hola Mateo, gracias por participar. Contanos cómo fue tu llegada a la institución y cómo viviste las primeras semanas de cursada.\n\nMateo: Para mí el cambio fue doble: por un lado el nivel de exigencia y por otro el desarraigo de dejar mi pueblo y venirme a vivir solo a la capital. Llegué con mucho entusiasmo pero también con un nudo en la garganta. No conocía a nadie, los pasillos estaban llenos de gente y los salones eran gigantescos. En las primeras clases de Filosofía me sentía invisible. La forma de evaluar acá no tiene nada que ver con lo que yo conocía: te piden argumentar, fundamentar con autores, tomar una postura crítica, y yo venía de un sistema donde memorizaba definiciones para la prueba. En el primer trabajo escrito me saqué una nota baja y me agarró una crisis terrible, pensé seriamente en abandonar y volverme.\n\nEntrevistador: ¿Qué factores intervinieron para que decidieras quedarte y cómo fuiste resolviendo esas dificultades?\n\nMateo: Fueron clave dos cosas. Primero, mi familia que todos los días me llamaba por videollamada para darme ánimo, y segundo, el sistema de tutorías entre pares que tiene el instituto. Me asignaron un tutor de cuarto año que me dedicó dos horas por semana para explicarme cómo encarar la bibliografía, cómo citar en normas APA y cómo organizar los tiempos entre el estudio y las tareas de la casa. Ese acompañamiento me devolvió la seguridad. \n\nEntrevistador: ¿Cómo describirías tu desempeño y tu relación con el estudio en la actualidad?\n\nMateo: Siento que fui construyendo mi propia autonomía. Empecé a usar aplicaciones de calendario para no retrasarme, armé resúmenes por autor y me animé a participar activamente en los debates en clase. Me di cuenta de que equivocarse en una intervención no es un drama sino parte del aprendizaje. Sigue habiendo semanas agotadoras donde la incertidumbre reaparece, especialmente cuando se juntan entregas, pero aprendí a confiar en mis capacidades y a pedir ayuda a tiempo cuando la necesito."
            ]
        ]
    },
    "retroalimentacion": {
        "title": "Devoluciones docentes y evaluación formativa",
        "prompt": "¿Cómo perciben y significan los estudiantes las devoluciones docentes y qué condiciones transforman la retroalimentación en una experiencia formativa?",
        "task": "Identificá en los testimonios qué características hacen que una devolución sea clara o frustrante, el impacto emocional asociado y las oportunidades de diálogo pedagógico.",
        "categories": [
            [
                "cat-clara",
                null,
                "CAT-CLA",
                "Orientación formativa clara",
                "#0f766e",
                "Devoluciones que explican logros y orientan la mejora.",
                [
                    "orienta",
                    "criterios",
                    "claridad",
                    "mejora",
                    "comentario",
                    "específico",
                    "devolución",
                    "formativa"
                ]
            ],
            [
                "sub-criterios",
                "cat-clara",
                "SUB-CRI",
                "Criterios explícitos y rúbricas",
                "#14b8a6",
                "Uso de matrices y pautas previas conocidas.",
                [
                    "rúbrica",
                    "pautas",
                    "criterios",
                    "objetivos",
                    "matriz",
                    "explícitos"
                ]
            ],
            [
                "cat-emocion",
                null,
                "CAT-EMO",
                "Impacto emocional y afectivo",
                "#9333ea",
                "Reacciones emocionales: frustración, ansiedad, alivio o motivación.",
                [
                    "frustración",
                    "bronca",
                    "bloquea",
                    "angustia",
                    "miedo",
                    "emocional",
                    "inseguridad",
                    "desánimo"
                ]
            ],
            [
                "cat-dialogo",
                null,
                "CAT-DIA",
                "Diálogo pedagógico y reescritura",
                "#2563eb",
                "Intercambio presencial, repreguntas y reentregas.",
                [
                    "diálogo",
                    "conversar",
                    "reescribir",
                    "borradores",
                    "consulta",
                    "reentrega",
                    "intercambio"
                ]
            ]
        ],
        "documents": [
            [
                "Grupo_focal_Devoluciones_Estudiantes.txt",
                "GRUPO FOCAL - DEVOLUCIONES DOCENTES Y APRENDIZAJE\nParticipantes: Estudiante 1 (Martín), Estudiante 2 (Camila), Estudiante 3 (Sofía)\nModerador: Profesor del área pedagógica | Duración: 45 minutos\n\nModerador: Bienvenidos. La intención de este encuentro es conversar sobre cómo experimentan las correcciones y devoluciones que reciben de sus docentes en las distintas asignaturas. ¿Qué sienten cuando reciben un trabajo corregido?\n\nEstudiante 1 (Martín): Para mí depende totalmente del docente. Hay profesores que te devuelven una hoja con una nota numérica encerrada en un círculo rojo y la palabra \"incompleto\" o signos de interrogación al margen. Eso te genera una frustración bárbara y mucha bronca, porque le dedicaste días a escribir y no tenés ni la menor idea de qué está mal o qué esperaba que pusieras. No aprendés nada, te quedás con una sensación de impotencia.\n\nEstudiante 2 (Camila): Coincido con Martín. Lo que a mí me sirve es cuando el docente utiliza una rúbrica que nos entregó antes de empezar la tarea. Cuando veo los criterios desglosados —por ejemplo, \"uso de fuentes\", \"claridad en la hipótesis\", \"coherencia global\"— y al lado hay un comentario específico diciendo: \"Tu planteo es sólido, pero en el tercer párrafo falta contrastar con el autor X\", ahí sí entiendo. Me da tranquilidad y me orienta sobre el paso a seguir. Deja de ser un misterio personal del profesor.\n\nEstudiante 3 (Sofía): El impacto emocional es muy fuerte. Cuando una devolución es puramente destructiva o sarcástica, te bloquea; sentís que te están juzgando como persona y no a tu producción. En cambio, cuando el profesor abre un espacio de diálogo en el aula y nos dice: \"Tómense diez minutos para leer los comentarios y el que tenga dudas se acerca al escritorio\", la dinámica cambia por completo. Poder conversar la corrección, explicar lo que quisiste decir y que te den la chance de reescribir el trabajo transforma el error en algo valioso."
            ],
            [
                "Entrevista_Valentina_Devoluciones.txt",
                "ENTREVISTA EN PROFUNDIDAD - CASO VALENTINA\nInformante: Valentina (21 años, estudiante de formación terciaria)\nLugar: Salón de reuniones | Fecha: 12/05/2025\n\nEntrevistadora: Valentina, ¿podrías describir alguna experiencia de evaluación que haya sido especialmente significativa para tu aprendizaje, ya sea positiva o negativa?\n\nValentina: Recuerdo dos experiencias totalmente opuestas. En primer año entregué una monografía en Historia de la Educación. La docente me la devolvió llena de tachaduras rojas y escribió al final: \"Nivel insuficiente, rehacer\". Me dio tanta angustia que estuve a punto de no presentarme al examen. Sentí que no servía para esto. Fui a pedirle una explicación y me contestó que \"las pautas ya estaban dadas en clase\". No hubo diálogo posible.\n\nEntrevistadora: ¿Y la experiencia positiva cómo fue?\n\nValentina: Fue al año siguiente en Didáctica. El profesor nos propuso diseñar una secuencia de enseñanza con entregas parciales de borradores. En cada entrega nos hacía devoluciones cualitativas en Google Docs usando comentarios contextualizados. No ponía nota numérica en las etapas intermedias; nos hacía preguntas disparadoras: \"¿Cómo se relaciona este objetivo con la actividad que propusiste?\", \"¿Qué alternativas le darías a un estudiante que no comprende la consigna?\". \n\nEntrevistadora: ¿Qué impacto tuvo esa forma de trabajo en tu aprendizaje?\n\nValentina: Fue transformador. Me enseñó a autorregularme y a revisar críticamente mis propias producciones. Sentí que el docente confiaba en mi capacidad de superación. Ya no estudiaba para \"zafar\" de una nota, sino para comprender en profundidad. La retroalimentación dejó de ser una sentencia final y pasó a ser un puente pedagógico."
            ]
        ]
    },
    "participacion": {
        "title": "Dinámicas y barreras de participación en el aula",
        "prompt": "¿Qué factores inhiben o facilitan la participación activa y la expresión oral de los estudiantes en los espacios de clase?",
        "task": "Marcá evidencias de barreras subjetivas e interactivas, factores del clima escolar y estrategias docentes que favorecen la inclusión comunicativa.",
        "categories": [
            [
                "cat-desinteres",
                null,
                "CAT-DES",
                "Desinterés y barreras participativas",
                "#dc2626",
                "Obstáculos para involucrarse: desinformación, apatía o falta de tiempo.",
                [
                    "falta de interés",
                    "desinterés",
                    "no van",
                    "no asisten",
                    "apatía",
                    "quejas",
                    "tiempo",
                    "desconectados",
                    "barreras"
                ]
            ],
            [
                "sub-formatos",
                "cat-desinteres",
                "SUB-FOR",
                "Formatos rígidos de comunicación",
                "#f97316",
                "Canales que no convocan a las juventudes o resultan burocráticos.",
                [
                    "cartelera",
                    "whatsapp",
                    "asambleas",
                    "reunión",
                    "formatos",
                    "plataforma",
                    "canales",
                    "rígidos"
                ]
            ],
            [
                "cat-apropiacion",
                null,
                "CAT-APR",
                "Apropiación estudiantil de espacios",
                "#059669",
                "Iniciativas autónomas: asambleas, proyectos artísticos y gremio.",
                [
                    "asamblea",
                    "comisiones",
                    "propuestas",
                    "votación",
                    "proyectos",
                    "participar",
                    "gremio",
                    "iniciativa"
                ]
            ],
            [
                "cat-escucha",
                null,
                "CAT-ESC",
                "Receptividad y escucha directiva",
                "#2563eb",
                "Respuesta y apertura de los equipos de gestión ante demandas estudiantiles.",
                [
                    "escucha",
                    "decisiones",
                    "directores",
                    "opinión",
                    "cambios",
                    "tomar en cuenta",
                    "receptividad",
                    "gestión"
                ]
            ]
        ],
        "documents": [
            [
                "Entrevista_Lucia_Participacion.txt",
                "ENTREVISTA EN PROFUNDIDAD - CASO LUCÍA\nInformante: Lucía (16 años, estudiante de educación media superior)\nLugar: Sala de orientación | Fecha: 08/06/2025\n\nEntrevistadora: Hola Lucía. Queremos conversar sobre cómo te sentís en las clases a la hora de intervenir, opinar o responder preguntas. ¿Participás habitualmente de forma oral?\n\nLucía: La verdad es que la mayoría de las veces prefiero quedarme callada. Muchas veces sé la respuesta exacta a lo que el profesor está preguntando o tengo una idea que me parece buena, pero me gana el miedo a que me trabe al hablar o diga una tontería y los demás se rían. En mi grupo hay dos o tres compañeros que siempre hablan primero, opinan de todo y a veces hacen comentarios burlones por lo bajo si alguien se equivoca. Entonces preferís no exponerte; el silencio es como un escudo.\n\nEntrevistadora: ¿Hay alguna materia o docente con quien te sientas más cómoda para participar? ¿Qué hace diferente ese docente?\n\nLucía: Sí, con la profesora de Filosofía. Ella implementó una regla desde el principio: nadie puede interrumpir ni reírse de la opinión de otro. Además, no tira preguntas al aire para que responda el más rápido. Nos dice: \"Piensen dos minutos en silencio, escriban una frase en su cuaderno y conversen con el compañero de banco\". Cuando trabajamos de a dos, yo me animo a discutir mi idea con mi compañera. Y después la profesora nos dice: \"¿Qué conversaron en este banco?\". Al hablar en nombre de las dos, ya no siento tanta presión individual.\n\nEntrevistadora: ¿Qué otras cosas sentís que ayudan a que todo el salón participe más?\n\nLucía: Que los profesores valoren las preguntas y no solo las respuestas perfectas. Cuando un profesor te dice: \"Esa duda que planteaste es excelente porque nos permite pensar otra cosa\", te sentís respetada. También usamos a veces pizarras digitales o papelitos anónimos pegados en el pizarrón; eso ayuda a que participen los que nunca se animan a levantar la mano."
            ],
            [
                "Observacion_Clase_Participacion.txt",
                "REGISTRO ETNOGRÁFICO DE OBSERVACIÓN DE CLASE\nMateria: Ciencias Sociales | Duración: 80 minutos | Grupo: 28 estudiantes\nObservador: Investigador de campo | Fecha: 15/06/2025\n\n09:00 - Inicio de la sesión. El docente expone en el pizarrón el tema \"Transformaciones urbanas y desigualdad social\". El docente mantiene un tono enérgico y realiza preguntas abiertas al plenario: \"¿Quién puede explicar qué consecuencias tuvo la migración campo-ciudad?\".\n09:12 - Se observa que tres estudiantes sentados en la primera fila monopolizan las respuestas de inmediato. En el sector posterior y lateral, la gran mayoría de los alumnos permanece con la mirada baja, dibujando en sus cuadernos o manipulando disimuladamente el celular. No se registran pedidos de palabra espontáneos por fuera del subgrupo dominante.\n09:25 - El docente detecta la desconexión del grupo y decide cambiar la dinámica didáctica. Introduce una consigna estructurada: \"Vamos a detenernos cinco minutos. Cada uno va a leer el fragmento del testimonio en la fotocopia y va a escribir en una ficha dos preguntas que le surjan. Luego, se agrupan en duplas para comparar sus fichas\".\n09:30 - El clima sonoro del aula cambia radicalmente: disminuye el murmullo disperso y se activan conversaciones intensas en parejas. Se observa a estudiantes que antes estaban retraídos debatiendo activamente con sus pares, señalando párrafos con el dedo y tomando notas compartidas.\n09:45 - Puesta en común guiada. El docente no pide voluntarios al azar sino que recorre las mesas: \"El equipo de Sofía y Mateo planteó una pregunta muy potente sobre el acceso a la vivienda; cuéntennos qué debatieron\". Sofía expone con fluidez la conclusión alcanzada con su par.\n10:05 - Un estudiante comete un error conceptual al interpretar un gráfico estadístico. El docente interviene inmediatamente con tono empático: \"Es muy común esa confusión; justamente ese dato parece indicar otra cosa a primera vista. Vamos a analizarlo juntos entre todos\". El grupo escucha con atención, sin registrarse burlas ni descalificaciones.\n10:15 - Cierre de la clase con un balance generalizado donde intervinieron 18 de los 28 estudiantes."
            ]
        ]
    },
    "estudio_caso": {
        "title": "Estudio de Caso: Tecnologías en la Gestión Escolar",
        "prompt": "¿Cómo incide la integración de tecnologías digitales en la cultura institucional y en las prácticas de enseñanza y gestión de un centro educativo?",
        "task": "Analizá las tensiones entre liderazgo directivo, disponibilidad de recursos técnicos, resistencias docentes y prácticas de innovación pedagógica.",
        "categories": [
            [
                "cat-innovacion",
                null,
                "CAT-INN",
                "Innovación pedagógica institucional",
                "#0284c7",
                "Proyectos interdisciplinarios, integración de sensores y plataformas digitales.",
                [
                    "innovación",
                    "proyectos",
                    "sensores",
                    "podcasts",
                    "comisión",
                    "interdisciplinaria",
                    "avances",
                    "radio"
                ]
            ],
            [
                "sub-pares",
                "cat-innovacion",
                "SUB-PAR",
                "Acompañamiento entre pares",
                "#0ea5e9",
                "Tutorías docentes, repositorios compartidos y solidaridad profesional.",
                [
                    "coordinación",
                    "pares",
                    "apoyo",
                    "comparten",
                    "tutoriales",
                    "tutorías",
                    "ayudan",
                    "Drive"
                ]
            ],
            [
                "cat-resistencias",
                null,
                "CAT-RES",
                "Sobrecarga docente y resistencias",
                "#dc2626",
                "Quejas por duplicación burocrática, falta de tiempo pago y fatiga.",
                [
                    "sobrecarga",
                    "cansancio",
                    "papel",
                    "burocráticas",
                    "horas",
                    "resistencia",
                    "antigüedad",
                    "libreta"
                ]
            ],
            [
                "cat-brechas",
                null,
                "CAT-BRE",
                "Brechas de infraestructura y conectividad",
                "#b45309",
                "Cortes de internet, lentitud de servidores y carencia de adaptadores.",
                [
                    "conectividad",
                    "servidor",
                    "cargadores",
                    "adaptadores",
                    "dispositivos",
                    "cae",
                    "internet",
                    "lento"
                ]
            ]
        ],
        "documents": [
            [
                "Entrevista_Director_Escuela.txt",
                "ENTREVISTA A EQUIPO DIRECTIVO - CASO LICEO COMUNITARIO\nInformante: Director del centro (15 años en la docencia, 4 en la gestión directiva)\nLugar: Dirección del centro | Fecha: 10/05/2025\n\nEntrevistadora: ¿Cómo ha sido el proceso de adopción de tecnologías digitales en el centro educativo durante los últimos años?\n\nDirector: Ha sido un camino con avances significativos pero no exento de contradicciones. Desde la dirección entendemos que la tecnología no es un fin en sí mismo, sino una herramienta para democratizar el acceso al conocimiento y diversificar la enseñanza. Por eso impulsamos la creación de una comisión de innovación pedagógica integrada por docentes de distintas áreas y el docente dinamizador de Ceibal. El principal facilitador ha sido habilitar los espacios de coordinación semanal para que los profesores que tienen más destrezas compartan sus planificaciones y ayuden a los que están más rezagados. Cuando el apoyo viene de un par, la resistencia baja notablemente.\n\nEntrevistadora: ¿Cuáles han sido los principales obstáculos o resistencias con los que se han encontrado?\n\nDirector: La brecha más dura no es la de los estudiantes, sino la sobrecarga y el cansancio de los docentes. Muchos profesores argumentan con razón que planificar secuencias digitales complejas o corregir foros en plataformas insume horas que no están remuneradas. A eso se suma la frustración cuando la conectividad se cae en pleno desarrollo de la clase o cuando los estudiantes olvidan sus cargadores. Hay un sector docente que todavía ve a la tecnología como una distracción o una amenaza a su autoridad en el aula.\n\nEntrevistadora: ¿Qué proyectos o cambios concretos destacaría como logros institucionales?\n\nDirector: Logramos que varias materias trabajen de forma interdisciplinaria a través de proyectos basados en problemas reales del barrio. Por ejemplo, los grupos de tercer año combinaron Biología, Geografía e Informática para mapear la calidad del agua en el arroyo cercano utilizando sensores digitales y produciendo podcasts informativos para la radio comunitaria. Eso demuestra que cuando la tecnología se conecta con la vida real de los jóvenes, el aprendizaje cobra un sentido totalmente nuevo."
            ],
            [
                "Informe_Observacion_Institucional.txt",
                "INFORME DE OBSERVACIÓN INSTITUCIONAL\nContexto: Sala de Coordinación Docente y Pasillos del Centro Educativo\nFecha: 22/05/2025 | Observador: Equipo de Investigación Evaluativa\n\nDurante la jornada de coordinación institucional de las 14:00 hs, se observa un debate intenso en torno al uso obligatorio de la plataforma institucional para el registro de calificaciones y actividades formativas.\n- Dimensión de resistencias y quejas técnicas: Tres docentes con más de 20 años de antigüedad manifiestan su disconformidad ante la duplicación de tareas administrativas: \"Tenemos que llenar la libreta papel y además cargar todo en la plataforma; se nos va la mitad del tiempo de coordinación en tareas burocráticas en lugar de discutir pedagogía\". Se señalan problemas recurrentes con la lentitud del servidor y la falta de adaptadores en las aulas.\n- Dimensión de colaboración entre pares: Dos docentes noveles del área de Ciencias toman la palabra y proyectan un repositorio compartido en Google Drive donde subieron plantillas editables, rúbricas automatizadas y tutoriales en video de cinco minutos. Se ofrecen para realizar tutorías personalizadas durante los recreos para quienes no logren configurar sus aulas virtuales. Se observa una distensión en el clima de la sala; los docentes más reticentes aceptan la propuesta de apoyo mutuo.\n- Prácticas emergentes registradas en cartelera: En el hall central se exhiben códigos QR generados por estudiantes de primer año que vinculan a narrativas transmedia sobre historia nacional, videominutos de concientización ambiental y muestras de arte digital, evidenciando una apropiación creativa de las tecnologías por parte del estudiantado."
            ]
        ]
    },
    "teoria_fundamentada": {
        "title": "Teoría Fundamentada: Bienestar y Cuidado en Salud",
        "prompt": "¿Cómo experimentan y gestionan el desgaste profesional y el cuidado subjetivo los trabajadores en servicios de salud de alta exigencia?",
        "task": "Aplicá codificación abierta y axial: vinculá las evidencias de sobrecarga y sufrimiento vicario con las estrategias personales de autocuidado y los dispositivos colectivos de soporte.",
        "categories": [
            [
                "cat-desgaste",
                null,
                "CAT-DES",
                "Fatiga laboral y desgaste",
                "#b91c1c",
                "Sobrecarga horaria, turnos rotativos, agotamiento psicofísico y precarización de las condiciones de atención.",
                [
                    "exigencia",
                    "presión",
                    "urgencia",
                    "guardias",
                    "insomnio",
                    "cansancio físico",
                    "sobrecarga",
                    "agotamiento",
                    "turnos",
                    "tensión",
                    "desgaste"
                ]
            ],
            [
                "sub-emocional",
                "cat-desgaste",
                "SUB-EMO",
                "Carga emocional y sufrimiento vicario",
                "#ef4444",
                "Impacto subjetivo del contacto cotidiano con el dolor ajeno, la muerte, la incertidumbre clínica y la impotencia institucional.",
                [
                    "carga emocional",
                    "sufrimiento",
                    "despersonalización",
                    "cinismo",
                    "impotencia",
                    "angustia",
                    "muerte",
                    "dolor",
                    "quebrarte",
                    "invisible"
                ]
            ],
            [
                "cat-autocuidado",
                null,
                "CAT-AUT",
                "Estrategias individuales de autocuidado",
                "#0f766e",
                "Prácticas deliberadas para preservar la salud: límites entre trabajo y vida personal, desconexión digital, actividad física y terapia.",
                [
                    "límites",
                    "natación",
                    "terapia",
                    "desconexión",
                    "ancla",
                    "cuidar",
                    "salud mental",
                    "psicológica"
                ]
            ],
            [
                "cat-soporte",
                null,
                "CAT-SOP",
                "Soporte grupal y ateneos reflexivos",
                "#2563eb",
                "Espacios sistemáticos de diálogo interdisciplinario, escucha mutua, desahogo emocional y contención entre colegas de equipo.",
                [
                    "ateneo",
                    "equipo",
                    "interdisciplinario",
                    "contener",
                    "colegas",
                    "cuidar al que cuida",
                    "reflexivo",
                    "café",
                    "llorar"
                ]
            ]
        ],
        "documents": [
            [
                "Entrevista_Dra_Elena_Salud.txt",
                "ENTREVISTA EN PROFUNDIDAD - PERSPECTIVA CLÍNICA\nInformante: Dra. Elena (Médica intensivista y de urgencias, 12 años de ejercicio profesional)\nLugar: Hospital General | Fecha: 18/06/2025\n\nEntrevistadora: Doctora Elena, ¿cómo impacta la cotidianeidad de las guardias de emergencia en su bienestar físico y emocional?\n\nElena: La exigencia en la puerta de urgencia es abrumadora y sostenida. Estás tomando decisiones de vida o muerte bajo presión constante, con escasez de camas y muchas veces con familiares angustiados o enojados. El cuerpo te va pasando factura: insomnio crónico, contracturas, taquicardia cuando suena el teléfono de guardia. Pero lo más duro no es el cansancio físico, sino la carga emocional invisible. Cuando despedís a un paciente joven o tenés que comunicar una mala noticia a una familia, absorbés ese sufrimiento. Si no hacés un trabajo consciente para procesarlo, te vas apagando; entrás en lo que llamamos despersonalización o cinismo defensivo para no quebrarte.\n\nEntrevistadora: ¿Qué herramientas o estrategias ha desarrollado para proteger su salud mental y no llegar al colapso?\n\nElena: Tuve que aprender a ponerme límites muy claros. Antes me llevaba las historias clínicas a casa y contestaba mensajes de WhatsApp a la medianoche. Hoy tengo un teléfono exclusivo para el trabajo que se apaga en cuanto cruzo la puerta de salida. Hago natación tres veces por semana y sostengo mi propio espacio de terapia psicológica. Esas cosas son mi ancla.\n\nEntrevistadora: A nivel del equipo de trabajo, ¿qué dispositivos existen para sostenerse mutuamente?\n\nElena: Lo más valioso que logramos consolidar es el espacio de ateneo clínico-emocional de los viernes a la mañana. Nos juntamos médicos, enfermeros y psicólogos durante una hora con un café. No discutimos dosis farmacológicas, sino cómo nos sentimos frente a los casos más difíciles de la semana. Poder llorar, reírse o decir abiertamente \"este caso me superó y no supe qué hacer\" sin sentirte juzgado por tus colegas es lo que te permite seguir adelante con vocación y humanidad."
            ],
            [
                "Registro_Ateneo_Equipo_Salud.txt",
                "REGISTRO TRANSCRIPTO DE ATENEO REFLEXIVO INTERDISCIPLINARIO\nServicio de Cuidados Paliativos y Medicina Interna\nParticipantes: Lic. Andrea (Enfermera jefa), Dr. Pablo (Médico de planta), Lic. Marcela (Trabajadora Social), Enf. Carlos (Enfermero novel)\nFecha: 27/06/2025 | Duración: 60 minutos\n\nLic. Andrea: Quería que abriéramos el ateneo de hoy retomando lo que pasó esta semana con el paciente de la sala 4. Sé que todo el equipo quedó muy conmovido por el desenlace y que hubo situaciones de mucha tensión con la familia.\n\nEnf. Carlos: Para mí fue mi primera experiencia en este servicio. Cuando el paciente entró en paro y los familiares empezaron a desesperarse, me quedé paralizado por unos segundos. Sentí una impotencia atroz. Llegué a mi casa esa noche y no pude cenar ni dormir, sentía que había fallado en algo.\n\nDr. Pablo: Es totalmente comprensible, Carlos. A todos los que estamos acá nos pasó lo mismo en nuestras primeras guardias. Lo peor que podemos hacer es guardarnos esa angustia y fingir que somos de piedra. En este servicio trabajamos con el límite de la vida; la muerte no es un error médico ni una falla de enfermería, es parte del proceso, pero acompañar con dignidad tiene un costo psíquico que tenemos que repartir entre todos.\n\nLic. Marcela: Desde el área social vimos que la familia demandaba información de manera agresiva porque estaban en una fase de negación absoluta. Como equipo logramos contenerlos y habilitar la despedida. Para cuidarnos entre nosotros, propongo que cuando tengamos situaciones de esta intensidad, rotemos a los profesionales a cargo de la habitación cada dos horas para no quemar a un solo compañero.\n\nLic. Andrea: Totalmente de acuerdo. Institucionalicemos esa pauta. Y recordemos nuestro pequeño ritual de cierre: al terminar el pase de guardia, nos tomamos dos minutos para respirar juntos y dejar el hospital en el hospital. Cuidar al que cuida no es un lujo, es una condición ética para que el servicio funcione."
            ]
        ]
    },
    "etnografia": {
        "title": "Etnografía: Convivencia y Espacio Público Barrial",
        "prompt": "¿Cómo significan, disputan y negocian los vecinos el uso del espacio público y la convivencia comunitaria en la plaza del barrio?",
        "task": "Codificá los registros de campo y entrevistas identificando prácticas de apropiación, tensiones intergeneracionales, acuerdos tácitos y construcción de memoria barrial.",
        "categories": [
            [
                "cat-apropiacion",
                null,
                "CAT-APR",
                "Apropiación comunitaria del espacio",
                "#059669",
                "Prácticas vecinales de recuperación, cuidado ambiental y memoria colectiva.",
                [
                    "asambleas",
                    "firmas",
                    "limpiar",
                    "ceibos",
                    "plantaron",
                    "árbol",
                    "dignidad",
                    "historia",
                    "vecinos",
                    "plaza"
                ]
            ],
            [
                "sub-intergen",
                "cat-apropiacion",
                "SUB-INT",
                "Convivencia y tensiones intergeneracionales",
                "#10b981",
                "Encuentros, roces y acuerdos entre adultos mayores y juventudes.",
                [
                    "chiquilines",
                    "gurises",
                    "patineta",
                    "rapear",
                    "música",
                    "viejos",
                    "bochinche",
                    "tensiones",
                    "ruido"
                ]
            ],
            [
                "cat-democratica",
                null,
                "CAT-DEM",
                "Espacio público como bien democrático",
                "#2563eb",
                "La plaza como territorio de encuentro gratuito, universal y no mercantilizado.",
                [
                    "democrático",
                    "espacio público",
                    "sin pagar",
                    "encerrados",
                    "comunidad",
                    "todos",
                    "gratuito",
                    "corazón"
                ]
            ],
            [
                "cat-solidaridad",
                null,
                "CAT-SOL",
                "Redes de solidaridad y ayuda mutua",
                "#9333ea",
                "Organización vecinal ante emergencias de salud, rifas y apoyo mutuo.",
                [
                    "solidaria",
                    "rifa",
                    "enferma",
                    "unido",
                    "corazón",
                    "ayuda",
                    "apoyo",
                    "organizamos"
                ]
            ]
        ],
        "documents": [
            [
                "Diario_de_Campo_Plaza_Central.txt",
                "DIARIO DE CAMPO ETNOGRÁFICO - PLAZA DEL SOL\nObservadora: Investigadora antropóloga | Fecha: Sábado 17/05/2025 | Horario: 16:00 - 19:30 hs\n\n16:00 - La plaza presenta una ocupación heterogénea y dinámica. En el sector norte, alrededor del arenero y los juegos infantiles, se concentran familias con niños pequeños; madres y padres comparten rondas de mate sentados en mantas sobre el césped. En el sector de las mesas de hormigón, un grupo de diez adultos mayores juega al truco y al dominó bajo la sombra de los paraísos.\n17:15 - Ingresan a la zona del anfiteatro unos quince adolescentes con parlantes portátiles, bicicletas y skates. Comienzan a poner bases instrumentales de trap y a practicar competencias de freestyle (rimas improvisadas). El volumen de la música se eleva notablemente.\n17:40 - Emergencia de micro-tensiones: Dos vecinas mayores que caminaban por el sendero perimetral se detienen y hacen gestos de desagrado hacia el anfiteatro. Una de ellas se acerca al grupo de jóvenes y les recrimina en tono elevado: \"Esta plaza es para todos, no tienen por qué aturdir con esa música\". Se genera un intercambio tenso. Uno de los jóvenes responde: \"Estamos acá haciendo arte en el anfiteatro, no le estamos haciendo daño a nadie\".\n18:10 - Mecanismos de negociación y mediación barrial: Don Carlos, puestero de la feria vecinal y referente del barrio, interviene de manera amigable: se acerca a los muchachos, los saluda por su nombre y les propone orientar el parlante hacia el muro del fondo y moderar los graves para no interferir con las mesas de los abuelos. Los jóvenes aceptan la sugerencia y reacomodan el equipo. La vecina retoma su caminata. La tensión se disipa mediante este acuerdo tácito de coexistencia.\n19:00 - Al caer la tarde, la iluminación led de la plaza se enciende. Los feriantes comienzan a guardar sus puestos, mientras vecinos pasean sus perros con correa por los canteros. Se constata una densa trama de relaciones cara a cara que sostiene el uso vivo del espacio público."
            ],
            [
                "Entrevista_Vecino_Don_Carlos.txt",
                "ENTREVISTA EN PROFUNDIDAD - MEMORIA E IDENTIDAD BARRIAL\nInformante: Don Carlos (68 años, jubilado ferroviario, residente del barrio desde hace 45 años y miembro de la Comisión de Vecinos)\nLugar: Banco de la Plaza del Sol | Fecha: 20/05/2025\n\nEntrevistadora: Don Carlos, cuéntenos cómo era este lugar hace unos años y cómo llegó la plaza a ser lo que vemos hoy.\n\nDon Carlos: Mire, en los años noventa esto era un baldío abandonado, un basurero clandestino donde no se podía ni pasar después de las seis de la tarde. Daba pena y miedo. En el 2004, en plena crisis, un grupo de vecinos nos organizamos: armamos asambleas los domingos, juntamos firmas, fuimos a la Intendencia y empezamos a limpiar el terreno con palas y carretillas nuestras. Plantamos los primeros ceibos y tipas con los gurises de la escuela. Cada árbol que usted ve acá tiene el nombre de un vecino que puso el cuerpo. Por eso para nosotros la plaza no es cuatro pedazos de pasto: es la dignidad del barrio, es nuestra historia viva.\n\nEntrevistadora: ¿Cómo ve la convivencia hoy entre los distintos grupos que usan la plaza?\n\nDon Carlos: Hay tensiones, como en cualquier familia grande. A veces los vecinos más viejos se quejan del bochinche de los gurises que vienen a rapear o de los que andan en patineta. Pero yo siempre les digo: \"Prefiero mil veces tener a los chiquilines en la plaza haciendo música, riéndose y ocupando el espacio público, que tenerlos encerrados frente a una pantalla o en esquinas peligrosas\". La plaza tiene que ser de todos. Lo único que les pedimos es que no rompan las plantas y que levanten las botellas y los papeles antes de irse.\n\nEntrevistadora: ¿Qué representa la plaza para la vida cotidiana de la comunidad?\n\nDon Carlos: Es el único lugar democrático que nos queda donde no hay que pagar entrada ni consumir para existir. Acá se cruza el médico del sanatorio con el albañil, la señora que viene a tomar sol con el pibe que anda en bici. Cuando alguien del barrio tiene un problema o se enferma, la rifa solidaria se organiza acá en la plaza. Es el corazón que mantiene al barrio unido."
            ]
        ]
    }
};

            function createProject(caseId) {
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
        const documents = selected.documents.map(([title, content], index) => ({ id: `doc-edu-${caseId}-${index + 1}`, title, content }));
        
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
                    let start = Math.max(0, content.lastIndexOf('\n\n', idxPos));
                    if (start > 0) start += 2;
                    let end = content.indexOf('\n\n', idxPos + m.match.length);
                    if (end === -1) end = content.length;
                    const quoteText = content.slice(start, end).trim();

                    codings.push({
                        id: `code-model-${doc.id}-${m.catId}-${idx + 1}`,
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
                            let start = Math.max(0, docText.lastIndexOf('\n\n', pos));
                            if (start > 0) start += 2;
                            let end = docText.indexOf('\n\n', pos + term.length);
                            if (end === -1) end = docText.length;
                            
                            const turnHeader = docText.slice(start, start + 70).trim();
                            const isInterviewer = /^(moderador|moderadora|entrevistador|entrevistadora|investigador|investigadora)\b/i.test(turnHeader);
                            if (!isInterviewer) {
                                const quoteText = docText.slice(start, end).trim();
                                if (quoteText.length > 30 && quoteText.length < 500) {
                                    codings.push({
                                        id: `code-model-${doc.id}-${cat.id}-1`,
                                        docId: doc.id,
                                        categoryId: cat.id,
                                        startChar: start,
                                        endChar: end,
                                        quoteText,
                                        memo: `Ejemplo modelo: Pasaje empírico del informante vinculado a ${cat.name} (Término: "${kw}")`,
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
    }

    function loadEducationalCase(caseId, skipConfirm = false) {
        const selected = educationalCases[caseId];
        const project = createProject(caseId);
        const input = document.getElementById('project-input');
        if (!selected || !project || !input || !window.DataTransfer || !window.File) return;
        if (!skipConfirm && !window.confirm(`Cargar el caso “${selected.title}”? Reemplazará el proyecto actual.`)) return;
        const transfer = new DataTransfer();
        transfer.items.add(new File([JSON.stringify(project)], `Caso_educativo_${caseId}.json`, { type: 'application/json' }));
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        if (!skipConfirm) {
            window.alert(`Caso cargado: ${selected.title}\n\nPregunta de análisis: ${selected.prompt}\n\nConsigna: ${selected.task}`);
        }
    }

    function makeGuide() {
        const guide = document.createElement('aside');
        guide.className = 'educational-guide';
        guide.setAttribute('aria-label', 'Guía de análisis cualitativo');
        guide.innerHTML = `
            <button type="button" class="educational-guide-toggle" aria-expanded="true">Guía educativa <span aria-hidden="true">▾</span></button>
            <div class="educational-guide-content">
                <p class="educational-guide-intro"><strong>Así se articula un análisis cualitativo:</strong> vas del texto a la evidencia, de la evidencia a la interpretación y de allí a conclusiones justificadas.</p>
                <button type="button" id="btn-open-student-assignment-modal" class="btn btn-primary" style="width:100%; margin-bottom:0.6rem;">🎓 Exportar Ficha de Trabajo Práctico (PDF)</button>
                <label style="display:flex; align-items:center; gap:0.45rem; margin:0 0 0.85rem; font-size:0.8rem; color:#134e4a; cursor:pointer;" title="Activar o desactivar globos explicativos al pasar el mouse por los elementos">
                    <input type="checkbox" id="chk-toggle-educational-popovers"> Mostrar guías al pasar el mouse
                </label>
                <section class="educational-cases" aria-labelledby="educational-cases-title">
                    <strong id="educational-cases-title">Casos para practicar</strong>
                    <p>Elegí un caso; incluye una pregunta, dos textos y categorías iniciales. Tu tarea es codificar y escribir memos.</p>
                    <div class="educational-case-list">${Object.entries(educationalCases).map(([id, item]) => `<button type="button" class="educational-case-button" data-case-id="${id}"><strong>${item.title}</strong><span>${item.prompt}</span></button>`).join('')}</div>
                </section>
                <ol>${concepts.map(([title, text]) => `<li><strong>${title}</strong><span>${text}</span></li>`).join('')}</ol>
                <div class="educational-glossary">
                    <strong>Glosario rápido</strong>
                    <p><b>Categoría:</b> idea analítica que organiza evidencias.</p>
                    <p><b>Codificación:</b> enlace entre un pasaje y una categoría.</p>
                    <p><b>Memo:</b> nota interpretativa sobre esa evidencia.</p>
                </div>
                <div class="educational-authors" style="margin-top:1rem; padding:0.75rem; background:rgba(255,255,255,0.05); border-radius:6px; font-size:0.78rem;">
                    <strong style="display:block; margin-bottom:0.4rem; color:var(--accent-primary);">Reflexiones de Autores Metodológicos</strong>
                    <p style="margin-bottom:0.4rem;"><strong>R. Hernández Sampieri:</strong> "Codificar cualitativamente es extraer unidades de significado para construir categorías con criterios claros."</p>
                    <p style="margin-bottom:0.4rem;"><strong>J. A. Maxwell:</strong> "El diseño cualitativo es interactivo: las preguntas, métodos y validez se reajustan a medida que se profundiza en los datos."</p>
                    <p style="margin-bottom:0.4rem; padding:0.4rem; background:rgba(20,184,166,0.12); border-left:3px solid #14b8a6; border-radius:4px;"><strong>J. W. Creswell & V. L. Plano Clark (2018):</strong> "El análisis cualitativo es interactivo y espiralado: combina <em>códigos esperados o a priori</em> (deductivos) con <em>códigos emergentes y sorprendentes</em> (inductivos). Las categorías nunca deben clausurar los significados vivos del texto; el investigador refina la teoría a medida que los datos empíricos desbordan lo previsto."</p>
                    <p style="margin-bottom:0.4rem;"><strong>A. Strauss & J. Corbin:</strong> "La codificación abierta parte del texto; la codificación axial relaciona categorías con sus subcategorías."</p>
                    <p style="margin-bottom:0.4rem;"><strong>M. Miles & A. M. Huberman:</strong> "Los memos no son resúmenes; son el espacio donde el investigador conceptualiza la evidencia."</p>
                    <p><strong>U. Flick:</strong> "La triangulación permite comparar perspectivas de informantes para dar rigurosidad al estudio."</p>
                </div>
                <a class="btn educational-pro-cta" href="${contactUrl}">Obtener versión Pro</a>
                <small>Pro elimina los límites educativos y agrega exportaciones profesionales.</small>
            </div>`;
        document.body.append(guide);

        const toggle = guide.querySelector('.educational-guide-toggle');
        const content = guide.querySelector('.educational-guide-content');
        toggle.addEventListener('click', () => {
            const collapsed = guide.classList.toggle('is-collapsed');
            toggle.setAttribute('aria-expanded', String(!collapsed));
            content.hidden = collapsed;
        });
        guide.querySelectorAll('[data-case-id]').forEach(button => button.addEventListener('click', () => loadEducationalCase(button.dataset.caseId)));
    }

    function addContextualHelp() {
        const tips = [
            ['#btn-add-category', 'Categorías: podés usar categorías deductivas (previas) o inductivas (emergentes del texto). Hacé clic en la Guía Inductiva para ver el procedimiento paso a paso.'],
            ['#btn-open-inductive-guide', 'Guía metodológica: procedimiento riguroso para detectar y nombrar categorías inductivas basado en Glaser, Strauss, Miles & Huberman y Saldaña.'],
            ['#btn-add-memo-quick', 'Memo: anotá qué significa este pasaje y por qué aporta a tu análisis; no repitas solamente lo que dice.'],
            ['#btn-open-matrix', 'Matriz: permite comparar categorías, documentos y evidencias. Sirve para revisar patrones; la interpretación sigue siendo tuya.'],
            ['#btn-export-doc-pdf', 'La exportación conserva una marca de agua educativa. Revisá primero que cada hallazgo esté respaldado por citas y memos.']
        ];
        for (const [selector, tip] of tips) {
            const target = document.querySelector(selector);
            if (!target) continue;
            target.classList.add('educational-has-tip');
            target.setAttribute('data-educational-tip', tip);
            target.setAttribute('title', `${target.getAttribute('title') || ''} — ${tip}`.trim());
        }

        const categoryModal = document.querySelector('#modal-category .modal-body');
        if (categoryModal) {
            categoryModal.insertAdjacentHTML('afterbegin', `
                <div class="educational-context-card" style="border-left-color:#0f766e;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom:0.35rem;">
                        <strong>🧭 ¿Construyendo una categoría inductiva?</strong>
                        <button type="button" onclick="window.openInductiveGuideModal && window.openInductiveGuideModal()" style="background:none; border:none; color:#0f766e; font-size:0.78rem; text-decoration:underline; cursor:pointer; font-weight:700; padding:0;">Ver guía metodológica ↗</button>
                    </div>
                    <span>Recordá que una categoría inductiva nace de la evidencia del texto (código in vivo). Definí un <strong>nombre analítico</strong> y redactá en la <em>descripción</em> el <strong>criterio de inclusión</strong> (qué tipo de citas incluye y cuáles quedan excluidas según la metodología cualitativa).</span>
                </div>
            `);
        }
        const memoModal = document.querySelector('#modal-memo .modal-body');
        if (memoModal) memoModal.insertAdjacentHTML('afterbegin', '<div class="educational-context-card"><strong>¿Para qué sirve un memo?</strong> Registrá tu interpretación del pasaje, su contexto, preguntas y vínculos con otras evidencias. El memo convierte la codificación en razonamiento analítico.</div>');
    }

    const sectorHelp = [
        {
            selector: '.sidebar-section:first-child',
            title: 'Corpus de Documentos',
            functional: 'Gestión y lectura del corpus textual cargado (entrevistas, observaciones, grupos focales).',
            theoretical: 'Corpus Empírico: Conjunto de fuentes primarias que sustentan la investigación cualitativa. Garantiza la evidencia discursiva y la validez contextual.'
        },
        {
            selector: '.sidebar-section:nth-child(3)',
            title: 'Libro de Códigos (Categorías y Subcategorías)',
            functional: 'Árbol interactivo para crear conceptos, definir criterios de inclusión y asignar colores visuales.',
            theoretical: 'Codificación Abierta y Axial: Proceso de abstraer significados compartidos. La jerarquía diferencia temas generales de matices específicos.'
        },
        {
            selector: '.doc-info, #active-doc-title, #doc-meta-stats',
            title: 'Documento Activo y Metadatos',
            functional: 'Informa el título del archivo en lectura, su extensión de palabras y la cantidad total de citas codificadas hasta el momento.',
            theoretical: 'Unidad de Análisis Individual: Corresponde a un caso específico o participante dentro del muestreo cualitativo intencional.'
        },
        {
            selector: '#btn-export-doc-pdf',
            title: 'Exportación de Documento Codificado',
            functional: 'Genera un archivo PDF ejecutable que conserva el texto completo con sus pasajes destacados en colores.',
            theoretical: 'Audibilidad y Transparencia: Facilita la revisión por pares e informantes manteniendo las citas contextualizadas con sus marcas originales.'
        },
        {
            selector: '#text-body, mark.coding-mark, .reader-container',
            title: 'Pasajes Codificados en el Texto (Citas)',
            functional: 'Fragmentos discursivos seleccionados vinculados a categorías. Permiten edición directa o desvinculación.',
            theoretical: 'Inscripción y Evidencia Empírica: Extrae unidades de significado preservando el contexto original del relato para justificar las inferencias del estudio.'
        },
        {
            selector: '#margin-bar, .coding-margin-item',
            title: 'Franjas Categoriales en Margen',
            functional: 'Muestra franjas de colores paralelas al texto indicando qué categorías están aplicadas a ese párrafo o fragmento.',
            theoretical: 'Visibilidad de Codificación Cruzada: Permite identificar áreas de alta densidad conceptual y solapamientos temáticos dentro del mismo pasaje.'
        },
        {
            selector: '.analysis-tabs, .analysis-tabs .tab-btn',
            title: 'Solapas de Herramientas Analíticas',
            functional: 'Pestañas para alternar entre la decodificación de significados, los gráficos cualitativos y la búsqueda avanzada multi-archivo.',
            theoretical: 'Triangulación Inter-Métodos: Combina la lectura cualitativa microscópica (memos) con la visualización macroscópica de patrones.'
        },
        {
            selector: '#tab-decoders, #decoder-list, .decoder-card, #pane-memos',
            title: 'Decodificación y Memos de Significado',
            functional: 'Muestra cada pasaje codificado junto con el espacio para redactar la interpretación o significado analítico del investigador.',
            theoretical: 'Memonotación (Memoing): Bisagra entre los datos crudos y la teoría. Registra el razonamiento abstracto y la conceptualización sobre cada evidencia.'
        },
        {
            selector: '#btn-open-matrix',
            title: 'Matriz Categorial y Estadísticas',
            functional: 'Visualización de frecuencias, coocurrencias, matrices de síntesis y gráficos de red de categorías.',
            theoretical: 'Comparación Constante y Triangulación: Permite contrastar patrones discursivos y verificar la convergencia temática entre informantes.'
        }
    ];

    function setupSectorPopovers() {
        const popover = document.createElement('div');
        popover.id = 'educational-sector-popover';
        popover.className = 'educational-sector-popover';
        popover.hidden = true;
        popover.innerHTML = `
            <div class="popover-header">
                <span class="popover-badge">Guía Teórico-Funcional</span>
                <button type="button" id="btn-dismiss-popover" class="btn-popover-dismiss" title="Ocultar explicaciones emergentes">&times; Ocultar</button>
            </div>
            <h4 id="popover-title"></h4>
            <div class="popover-body">
                <div class="popover-box functional-box">
                    <strong>Función Operativa</strong>
                    <p id="popover-functional"></p>
                </div>
                <div class="popover-box theoretical-box">
                    <strong>Sustento Teórico</strong>
                    <p id="popover-theoretical"></p>
                </div>
            </div>`;
        document.body.append(popover);

        const titleEl = popover.querySelector('#popover-title');
        const funcEl = popover.querySelector('#popover-functional');
        const theoEl = popover.querySelector('#popover-theoretical');
        const dismissBtn = popover.querySelector('#btn-dismiss-popover');
        const chkToggle = document.getElementById('chk-toggle-educational-popovers');

        function isPopoversDisabled() {
            return localStorage.getItem('educational_popovers_disabled') === 'true';
        }

        function syncAllControls() {
            if (chkToggle) chkToggle.checked = !isPopoversDisabled();
            const bannerBtn = document.getElementById('btn-toggle-banner-popovers');
            if (bannerBtn) {
                const disabled = isPopoversDisabled();
                bannerBtn.textContent = disabled ? '💡 Guías: Desactivadas' : '💡 Guías: Activas';
                bannerBtn.style.background = disabled ? '#475569' : '#0d9488';
            }
        }

        syncAllControls();

        if (chkToggle) {
            chkToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    localStorage.removeItem('educational_popovers_disabled');
                } else {
                    localStorage.setItem('educational_popovers_disabled', 'true');
                    popover.classList.remove('is-visible');
                    popover.hidden = true;
                }
                syncAllControls();
            });
        }

        let activeTimer = null;
        let isMouseOverPopover = false;

        popover.addEventListener('mouseenter', () => {
            isMouseOverPopover = true;
            clearTimeout(activeTimer);
        });

        popover.addEventListener('mouseleave', () => {
            isMouseOverPopover = false;
            activeTimer = setTimeout(() => {
                if (!isMouseOverPopover) {
                    popover.classList.remove('is-visible');
                    popover.hidden = true;
                }
            }, 300);
        });

        function handleDismiss(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            localStorage.setItem('educational_popovers_disabled', 'true');
            popover.classList.remove('is-visible');
            popover.hidden = true;
            isMouseOverPopover = false;
            syncAllControls();
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', handleDismiss);
            dismissBtn.addEventListener('mousedown', handleDismiss);
        }

        sectorHelp.forEach(item => {
            const targets = document.querySelectorAll(item.selector);
            targets.forEach(target => {
                target.classList.add('educational-sector-target');
                target.setAttribute('data-sector-title', item.title);
                target.addEventListener('mouseenter', () => {
                    if (isPopoversDisabled() || isMouseOverPopover) return;
                    clearTimeout(activeTimer);
                    titleEl.textContent = item.title;
                    funcEl.textContent = item.functional;
                    theoEl.textContent = item.theoretical;

                    const rect = target.getBoundingClientRect();
                    popover.hidden = false;
                    popover.classList.add('is-visible');

                    let top = rect.top + window.scrollY + 10;
                    let left = rect.left + window.scrollX + 20;

                    const popWidth = 340;
                    if (left + popWidth > window.innerWidth) {
                        left = Math.max(10, window.innerWidth - popWidth - 20);
                    }

                    popover.style.top = `${top}px`;
                    popover.style.left = `${left}px`;
                });

                target.addEventListener('mouseleave', () => {
                    activeTimer = setTimeout(() => {
                        if (!isMouseOverPopover) {
                            popover.classList.remove('is-visible');
                            popover.hidden = true;
                        }
                    }, 300);
                });
            });
        });
    }

    function addProCallsToAction() {
        const intro = document.querySelector('#modal-pro-intro .modal-body');
        if (intro) intro.insertAdjacentHTML('afterbegin', '<div class="educational-intro-note"><strong>Edición Educativa:</strong> aprendé el proceso completo con límites formativos y exportaciones identificadas. Si tu proyecto crece, podés pasar a Pro.</div>');
        const exportFooter = document.querySelector('#modal-export-pdf .modal-footer');
        if (exportFooter) exportFooter.insertAdjacentHTML('beforeend', `<a class="btn btn-outline educational-export-pro" href="${contactUrl}">Obtener versión Pro</a>`);
    }

    function setupStudentAssignmentModal() {
        const modal = document.getElementById('modal-student-assignment');
        const openBtn = document.getElementById('btn-open-student-assignment-modal');
        const generateBtn = document.getElementById('btn-generate-student-pdf');
        if (!modal) return;

        if (openBtn) {
            openBtn.addEventListener('click', () => {
                modal.style.display = 'flex';
            });
        }

        modal.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });

        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                const studentName = (document.getElementById('student-name') || {}).value || '';
                const courseName = (document.getElementById('student-course') || {}).value || '';
                const researchQuestion = (document.getElementById('student-prompt') || {}).value || '';

                if (!window.PdfReportExporter || typeof window.PdfReportExporter.createStudentAssignmentReport !== 'function') {
                    alert('El exportador PDF no se encuentra disponible.');
                    return;
                }

                try {
                    const currentState = (typeof window.getAppState === 'function') ? window.getAppState() : (window.appState || {});
                    const blob = await window.PdfReportExporter.createStudentAssignmentReport(currentState, {
                        studentName: studentName.trim(),
                        courseName: courseName.trim(),
                        researchQuestion: researchQuestion.trim()
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Trabajo_Practico_${(studentName.trim() || 'Estudiante').replace(/\s+/g, '_')}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                    modal.style.display = 'none';
                } catch (err) {
                    console.error('Error generando PDF estudiantil:', err);
                    alert(`No se pudo generar el PDF: ${err.message || err}`);
                }
            });
        }
    }

    function addBannerGuideToggle() {
        const banner = document.querySelector('.beta-edition-banner');
        if (!banner) return;
        const btn = document.createElement('button');
        btn.id = 'btn-toggle-banner-popovers';
        btn.type = 'button';
        btn.className = 'btn-banner-action';
        btn.style.marginLeft = '0.5rem';
        btn.style.marginRight = '0.5rem';

        function updateBtn() {
            const disabled = localStorage.getItem('educational_popovers_disabled') === 'true';
            btn.textContent = disabled ? '💡 Guías: Desactivadas' : '💡 Guías: Activas';
            btn.style.background = disabled ? '#475569' : '#0d9488';
        }

        updateBtn();

        btn.addEventListener('click', () => {
            const disabled = localStorage.getItem('educational_popovers_disabled') === 'true';
            if (disabled) {
                localStorage.removeItem('educational_popovers_disabled');
            } else {
                localStorage.setItem('educational_popovers_disabled', 'true');
                const popover = document.getElementById('educational-sector-popover');
                if (popover) {
                    popover.classList.remove('is-visible');
                    popover.hidden = true;
                }
            }
            updateBtn();
            const chkToggle = document.getElementById('chk-toggle-educational-popovers');
            if (chkToggle) chkToggle.checked = (localStorage.getItem('educational_popovers_disabled') !== 'true');
        });

        const contactBtn = document.getElementById('btn-contact-pro');
        const btnLoadIpes = document.createElement('button');
        btnLoadIpes.id = 'btn-load-ipes-case';
        btnLoadIpes.type = 'button';
        btnLoadIpes.className = 'btn-banner-action';
        btnLoadIpes.style.marginLeft = '0.4rem';
        btnLoadIpes.style.marginRight = '0.4rem';
        btnLoadIpes.style.background = '#0284c7';
        btnLoadIpes.innerHTML = '⚡ <strong>Cargar Caso Taller IPES</strong>';
        btnLoadIpes.title = 'Cargar el caso de trabajo para el taller: Grupo focal sobre IA y tecnologías';
        btnLoadIpes.addEventListener('click', () => {
            loadEducationalCase('jornadas_ipes');
        });

        if (contactBtn) {
            banner.insertBefore(btn, contactBtn);
            banner.insertBefore(btnLoadIpes, contactBtn);
        } else {
            banner.appendChild(btn);
            banner.appendChild(btnLoadIpes);
        }
    }

    function setupInductiveGuide() {
        // 1. Inyectar botón destacado en la cabecera del libro de códigos
        const catHeader = document.querySelector('.sidebar-section:nth-child(3) .sidebar-header');
        if (catHeader && !document.getElementById('btn-open-inductive-guide')) {
            const btnGuide = document.createElement('button');
            btnGuide.id = 'btn-open-inductive-guide';
            btnGuide.type = 'button';
            btnGuide.className = 'btn-inductive-guide';
            btnGuide.title = 'Metodología para descubrir categorías inductivas (Glaser, Strauss, Saldaña, Miles & Huberman)';
            btnGuide.innerHTML = '<span>🧭</span> <span>Guía: Categorías Inductivas</span>';
            catHeader.insertAdjacentElement('afterend', btnGuide);
            btnGuide.addEventListener('click', () => openInductiveModal());
        }

        // 2. Inyectar botón adicional en la guía educativa
        const guideContent = document.querySelector('.educational-guide-content');
        if (guideContent && !document.getElementById('btn-open-inductive-guide-panel')) {
            const btnGuidePanel = document.createElement('button');
            btnGuidePanel.id = 'btn-open-inductive-guide-panel';
            btnGuidePanel.type = 'button';
            btnGuidePanel.className = 'btn-inductive-guide';
            btnGuidePanel.style.marginBottom = '0.6rem';
            btnGuidePanel.innerHTML = '<span>🧭</span> <span>Guía Metodológica Inductiva</span>';
            const studentBtn = document.getElementById('btn-open-student-assignment-modal');
            if (studentBtn) {
                studentBtn.insertAdjacentElement('afterend', btnGuidePanel);
            } else {
                guideContent.prepend(btnGuidePanel);
            }
            btnGuidePanel.addEventListener('click', () => openInductiveModal());
        }

        // 3. Crear el modal interactivo
        let modal = document.getElementById('modal-inductive-guide');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-inductive-guide';
            modal.className = 'modal-backdrop';
            modal.style.display = 'none';
            modal.style.zIndex = '9700';
            modal.innerHTML = `
                <div class="modal-card" style="width: min(740px, 95vw); max-height: 88vh; display:flex; flex-direction:column;">
                    <div class="modal-header" style="background:#0f766e; color:#fff; border-radius:12px 12px 0 0; padding: 0.9rem 1.2rem;">
                        <div style="display:flex; align-items:center; gap:0.6rem;">
                            <span style="font-size:1.4rem;">🧭</span>
                            <div>
                                <h3 style="margin:0; font-size:1.1rem; color:#fff;">Guía Metodológica: Creación de Categorías Inductivas</h3>
                                <small style="color:#ccfbf1; font-size:0.78rem;">Procedimiento riguroso para la detección de categorías y subcategorías emergentes</small>
                            </div>
                        </div>
                        <button class="modal-close" style="color:#fff; font-size:1.4rem; background:none; border:none; cursor:pointer;">&times;</button>
                    </div>
                    <div class="modal-body" style="overflow-y:auto; padding:1.2rem; display:flex; flex-direction:column; gap:0.9rem; font-size:0.88rem; line-height:1.5;">
                        
                        <div style="background:#ecfdf5; border-left:4px solid #059669; border-radius:6px; padding:0.75rem 0.9rem; margin-bottom:0.6rem;">
                            <strong style="color:#065f46; display:block; margin-bottom:0.25rem;">Fundamentación: J. W. Creswell & V. L. Plano Clark (2018)</strong>
                            <span style="font-size:0.83rem; color:#064e3b; line-height:1.45; display:block;">
                                En su clásica obra metodológica, Creswell y Plano Clark distinguen entre <strong>códigos iniciales/esperados</strong> (aquellos derivados del marco teórico previo) y <strong>códigos emergentes/sorprendentes</strong> (ideas que surgen del discurso libre de los actores sociales). La codificación inductiva es el puente que permite que la voz de los informantes transforme las preguntas del investigador en nuevo conocimiento pedagógico.
                            </span>
                        </div>

                        <div style="background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px; padding:0.85rem; color:#134e4a;">
                            <strong>📌 El rol irreemplazable del investigador:</strong> En el análisis cualitativo, el software organiza los datos pero nunca sustituye tu razonamiento interpretativo. Las categorías iniciales (deductivas) son tu marco de partida; las categorías inductivas nacen de tu diálogo crítico con el texto al descubrir significados, tensiones y vivencias no previstas.
                        </div>

                        <h4 style="margin:0.4rem 0 0.1rem; color:#0f766e; border-bottom:2px solid #14b8a6; padding-bottom:0.25rem;">Procedimiento en 5 Pasos (Glaser, Strauss, Miles, Huberman & Saldaña)</h4>

                        <div class="inductive-step">
                            <div class="step-num">1</div>
                            <div class="step-content">
                                <strong>Lectura abierta y detección de "quiebres" discursivos <em>(Strauss & Corbin, 1990)</em></strong>
                                <p>Al recorrer las entrevistas o registros, no intentes forzar cada cita para que encaje en las categorías iniciales. Prestá atención a pasajes que te sorprendan, contradigan lo esperado o aporten un matiz nuevo.</p>
                            </div>
                        </div>

                        <div class="inductive-step">
                            <div class="step-num">2</div>
                            <div class="step-content">
                                <strong>Codificación "In Vivo" como primer anclaje <em>(Glaser & Strauss, 1967; Saldaña, 2015)</em></strong>
                                <p>Identificá la frase exacta o metáfora viva que utilizó el informante (ej.: <em>"el humano no se pierde"</em>, <em>"sentaríamos a las personas y nada"</em> o <em>"se confiaron en el chat"</em>). Este código descriptivo preserva la voz empírica del actor social.</p>
                            </div>
                        </div>

                        <div class="inductive-step">
                            <div class="step-num">3</div>
                            <div class="step-content">
                                <strong>Método de Comparación Constante <em>(Glaser, 1965)</em></strong>
                                <p>Compará ese pasaje con otras citas del mismo informante y con los demás docentes. Preguntate: <em>¿Es una vivencia aislada o refleja una pauta compartida? ¿Qué dimensiones o diferencias presenta?</em></p>
                            </div>
                        </div>

                        <div class="inductive-step">
                            <div class="step-num">4</div>
                            <div class="step-content">
                                <strong>Conceptualización analítica y criterio de inclusión <em>(Miles & Huberman, 1994; Maxwell, 2019)</em></strong>
                                <p>Transformá el código descriptivo en una <strong>categoría conceptual</strong>. Asignale un nombre analítico, un código breve (ej. CAT-HUM) y redactá en la descripción un <strong>criterio de inclusión explícito</strong>: qué expresiones pertenecen a esta categoría y cuáles quedan excluidas.</p>
                            </div>
                        </div>

                        <div class="inductive-step">
                            <div class="step-num">5</div>
                            <div class="step-content">
                                <strong>Decisión estructural: ¿Categoría principal o Subcategoría? <em>(Hernández Sampieri & Mendoza, 2018)</em></strong>
                                <ul style="margin:0.25rem 0 0; padding-left:1.2rem;">
                                    <li><strong>Subcategoría:</strong> Si detalla o especifica una modalidad de una categoría que ya tenías (ej.: dentro de <em>Usos pedagógicos y evaluación</em>, crear <em>"Verificación crítica y alucinaciones"</em>).</li>
                                    <li><strong>Categoría Principal:</strong> Si inaugura una dimensión o eje temático autónomo que cruza todo el estudio (ej.: <em>"Dimensión humana y vínculo insustituible"</em> o <em>"Inclusión y adecuaciones"</em>).</li>
                                </ul>
                            </div>
                        </div>

                        <h4 style="margin:0.6rem 0 0.1rem; color:#0f766e; border-bottom:2px solid #14b8a6; padding-bottom:0.25rem;">Ejemplos prácticos a partir del Caso Jornadas IPES</h4>

                        <table class="inductive-examples-table">
                            <thead>
                                <tr>
                                    <th>Cita textual del docente</th>
                                    <th>Código In Vivo</th>
                                    <th>Categoría o Subcategoría Emergente</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><em>"En el contacto con el otro, la IA jamás va a poder... El humano no se pierde, no se debería perder. Que le quitaríamos lo educativo..."</em></td>
                                    <td><strong>"El humano no se pierde"</strong></td>
                                    <td><strong>CAT-HUM</strong> — <em>Dimensión humana y vínculo insustituible</em> (Categoría principal)</td>
                                </tr>
                                <tr>
                                    <td><em>"Se confiaron en la información que les dio el chat... hablaron de un personaje de otro tiempo... hay que fomentar que lean y no se confíen."</em></td>
                                    <td><strong>"No confiarse del chat"</strong></td>
                                    <td><strong>SUB-VERIF</strong> — <em>Verificación crítica y alucinaciones</em> (Subcategoría de Usos/Evaluación)</td>
                                </tr>
                                <tr>
                                    <td><em>"A mí me gustaría formarme en tecnología enfocado a estudiantes con discapacidad o problemas de aprendizaje; falta un montón."</em></td>
                                    <td><strong>"Tecnología y discapacidad"</strong></td>
                                    <td><strong>CAT-INCL</strong> — <em>Inclusión y adecuaciones curriculares</em> (Categoría principal)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="modal-footer" style="padding:0.8rem 1.2rem; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end;">
                        <button type="button" class="btn btn-primary modal-close">¡Comprendido! Continuar codificando</button>
                    </div>
                </div>
            `;
            document.body.append(modal);

            modal.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', () => {
                modal.style.display = 'none';
            }));
        }

        function openInductiveModal() {
            if (modal) modal.style.display = 'flex';
        }

        window.openInductiveGuideModal = openInductiveModal;
    }

    function syncEducationalState() {
        const state = (typeof window.getAppState === 'function') ? window.getAppState() : (window.appState || null);
        if (!state) return;

        // Si el usuario tiene cargado el ejemplo genérico inicial o el caso de salud Elena,
        // cargamos automáticamente el caso de las Jornadas IPES (Liceo 1) como caso por defecto del taller
        const isDefaultSample = state.isSampleLoaded && state.documents && state.documents.some(d => d.title.includes('Elena') || d.title.includes('Entrevista_01_Impacto'));
        const hasIpes = state.documents && state.documents.some(d => d.title.includes('Liceo1_Jornadas_IPES'));

        if (isDefaultSample && !hasIpes) {
            loadEducationalCase('jornadas_ipes', true);
            return;
        }

        if (!state.categories || !state.categories.length || !state.documents || !state.documents.length) return;

        let needsUpdate = false;
        // Restaurar palabras clave si faltan en las categorías del caso actual
        Object.values(educationalCases).forEach(caseData => {
            caseData.categories.forEach(([id, parentId, code, name, color, desc, kws]) => {
                const cat = state.categories.find(c => c.id === id || c.name.toLowerCase() === name.toLowerCase());
                if (cat && (!cat.keywords || cat.keywords.length === 0)) {
                    cat.keywords = Array.isArray(kws) ? [...kws] : [];
                    needsUpdate = true;
                }
            });
        });

        // Si no hay codificaciones en el documento activo, generar las ocurrencias iniciales
        if (state.codings && state.codings.length === 0 && state.activeDocId) {
            state.categories.forEach(cat => {
                if (cat.keywords && cat.keywords.length > 0 && typeof window.autoCodeCategoryInDocument === 'function') {
                    window.autoCodeCategoryInDocument(state.activeDocId, cat.id);
                    needsUpdate = true;
                }
            });
        }

        if (needsUpdate) {
            if (typeof window.saveToStorage === 'function') window.saveToStorage();
            if (typeof window.renderCodebookList === 'function') window.renderCodebookList();
            if (typeof window.renderDecoderList === 'function') window.renderDecoderList();
            if (typeof window.updateQualitativeCharts === 'function') window.updateQualitativeCharts();
            if (state.activeDocId && typeof window.setActiveDocument === 'function') {
                window.setActiveDocument(state.activeDocId);
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.classList.add('edition-educational');
        document.title = 'AnalizadorCualiUY Educativa — Aprender análisis cualitativo';
        makeGuide();
        addContextualHelp();
        setupSectorPopovers();
        addBannerGuideToggle();
        setupInductiveGuide();
        addProCallsToAction();
        setupStudentAssignmentModal();
        setTimeout(syncEducationalState, 250);
        setTimeout(syncEducationalState, 800);
    });
})();

