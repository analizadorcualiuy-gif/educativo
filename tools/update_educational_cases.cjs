const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'web-beta', 'educational.js');
let code = fs.readFileSync(targetPath, 'utf8');

const educationalCases = {
    jornadas_ipes: {
        title: 'Jornadas IPES: Tecnologías e IA en el Aula',
        prompt: '¿Cómo perciben, integran y tensionan los docentes el uso de tecnologías digitales e inteligencia artificial en sus prácticas formativas y de evaluación?',
        task: 'Taller de análisis cualitativo: 1) Codificá el corpus con las categorías a priori (deductivas). 2) Identificá temas emergentes y creá nuevas categorías inductivas a partir de la evidencia discursiva (ej. mediación humana/vínculo pedagógico, alfabetización crítica/verificación, barreras de infraestructura). 3) Redactá memos interpretativos y contrastá perspectivas en la matriz.',
        categories: [
            ['cat-usos-eval', null, 'CAT-USO', 'Usos pedagógicos y evaluación', '#2563eb', 'Herramientas y dinámicas utilizadas en clase y evaluación: Kahoot, CREA, rúbricas, videos, IA generativa, etc.'],
            ['sub-ia-gen', 'cat-usos-eval', 'SUB-IAG', 'Aplicaciones de IA generativa', '#0284c7', 'Generación de imágenes, canciones, historias, prompts para planificación docente y actividades con ChatGPT, Suno, Canva.'],
            ['cat-beneficios', null, 'CAT-BEN', 'Beneficios y motivación', '#059669', 'Ventajas percibidas: motivación estudiantil, formatos diversos, personalización de tareas y optimización de tiempo.'],
            ['cat-desafios', null, 'CAT-DES', 'Desafíos y limitaciones técnicas', '#dc2626', 'Obstáculos materiales y organizativos: conectividad, falta de dispositivos/cargadores, sobrecarga horaria y necesidad de capacitación práctica.']
        ],
        documents: [
            ['Grupo_Focal_Liceo1_Jornadas_IPES.txt', `GRUPO FOCAL - LICEO 1 (JORNADAS IPES)
Fecha: 11/11/2025 | Horario: 15:00 - 15:50 | Lugar: L 1
Moderadora: CC (Moderador)
Informantes / Participantes:
- Docente 1: Docente de Arte
- Docente 2: Docente de Tecnología e Innovación
- Docente 3: Docente de Inglés
- Docente 4: Docente de Inglés
- Docente 5: Coordinador de Enseñanza y Docente de Historia

Moderador: Bueno, buenas tardes, mi nombre es Moderador. Para nosotros van a ser Liceo uno, Liceo 2, Liceo 3. Obviamente que vamos a decir que son los María Espinola y referidos a tales lugares, pero no va a haber identificación directa. Bien, otra de las cuestiones es el tema ético que, como yo les decía, no vamos a usar los nombres de ustedes ni de la institución, pero sí les tenemos que pedir el consentimiento de que saben que están en el marco de una investigación. De que vinieron voluntariamente y generosamente agregaría yo. Así que lo que les voy a pedir es que si pueden presentarse diciendo su nombre, solo el nombre de pila y cuál es su rol en la institución. No los escucho, pero tampoco me aparecen muteados. Pero hoy sí los escuché cuando dijeron están todos ahí, sí dijimos están todos ahí. ¿Ustedes sí me están escuchando? Sí, bien, ahí parecía que se iba a escuchar algo. Ahora sí, perfecto. Entonces les iba a pedir que pudieran decir su nombre y el rol que desempeñan en la institución.

(Se presentan uno por uno los docentes, señalando su rol en el centro)

Moderador: Bien, buenísimo, buenísimo, bien variadito el panorama, así que nos viene espectacular. Bien, entonces empiezo a contarles un poco qué preguntas habíamos pensado, pero son como disparadores para conversar de algunas cosas que están vinculadas a lo que para nosotros es el tema de investigación. ¿Cómo describirían ustedes su nivel de competencia digital docente? ¿Cómo se ubicarían en el grado de desarrollo de competencia digital? Pueden hacerse su propia escala. Capaz que moderados en general, salvo Docente 2. ¿Qué opinan ustedes sobre el uso de las herramientas digitales para la evaluación y la retroalimentación?

Docente 4: Creo que son muy útiles, pero yo todavía tengo como que miedo de usarla, como que me da, no he usado mucho. Bien, tendría que practicar, ponerme a practicar para después ponerla en práctica.

Docente 1: Yo he usado mucho Kahoot, por ejemplo, donde ellos mismos… elaborar pensando en aplicarle a los compañeros. Entonces, desde ahí ellos tienen que pensar en todo lo que se trabajó, cómo hacer las preguntas, qué imágenes utilizar para que sea un poco más complejo a los compañeros y a su vez los compañeros tienen que responder eso.

Moderador: Bien, bien interesante. No solamente evaluarlos con Kahoot, sino hacerlos a ellos diseñar el Kahoot como forma de evaluación. Bien.

Docente 3: En mi caso, sí, me parece que me falta más herramientas y eso, aunque en algunas presentaciones, por ejemplo, yo los dejo libres para que ellos elijan, por ejemplo, el formato y a veces aprendo más yo de ellos porque utilizan alguna.

Moderador: Bien interesante, bien interesante.

Docente 2: Yo he utilizado más que nada este lista de cotejos y rúbricas, que también las tomo mucho de CREA o de las plataformas que nos permiten este construir rúbricas y lista de cotejos, ¿no? Lo que sirve obviamente para evaluar y los de los alumnos también se autoevalúan.

Moderador: Claro, bien interesante, bien interesante. Bien, una pregunta en esto que estás mencionando de CREA. Y de las herramientas es pedirle a ellos que usen esas herramientas en algunos casos y utilizarlas disponibles en Crea para proponer evaluaciones. Por ejemplo, ¿a eso te referís en algunos casos, pedirles a ellos que lo hagan a través de videos o de otras maneras? Y desde Crea lo que decís es utilizar las que vienen, las que se pueden elaborar.

Docente 5: Con CREA.

Moderador: Otra de las preguntas que teníamos para ustedes de la evaluación, ustedes me hablaron de las propuestas de evaluación que hacen o de lo que les piden como evaluación a los estudiantes y que ellos usan las tecnologías digitales. Y respecto a la retroalimentación, a esto de devolverles a ellos, ¿no?, después de una evaluación para eso. ¿Han usado algo? ¿Conocen algo?

Docente 5: Generalmente, yo, de mi parte personalmente, si ellos hicieron, no sé, una presentación, luego de la presentación vamos hablando y haciendo puestas en común, pero no una herramienta específica para evaluar, de retroalimentación.

Moderador: Bien, lo que podemos decir es que utilizan herramientas y también utilizan instrumentos que pueden haber sido creados con herramientas digitales. Sí, pero no una herramienta específicamente de retroalimentación, aunque las que mencionaste en CREA. ¿Les brinda, verdad? Le brinda retroalimentación. Claro, bien, igual que como decía hoy el compañero de el Kahoot. No de después analizar los resultados que iban teniendo en el Kahoot. Bien, ¿ustedes consideran que sus prácticas pedagógicas, que sus prácticas se han visto transformadas por el uso de la tecnología digital? Igual los veo como bastante jóvenes, capaz que no son este de la era pre tecnología digitales, pero ¿ustedes sienten que este avance de tecnologías digitales ha provocado algún tipo de cambio en sus prácticas?

Docente 1: Sí, yo pienso que sí. Yo utilizo mucho la IA para la parte de imagen y eso, porque yo lo utilizo bastante. Por ejemplo, con Séptimo, al principio del año, ellos tenían que dibujar un personaje y a muchos no les sale. Entonces hicieron el personaje, se lo transformó, en ese sentido que lo inicializará mediante inteligencia artificial, después crearon una historia y de nuevo, con esa historia y el personaje que habían creado, crearon la historieta, utilizamos bastante poco con imágenes, con octavos, que están creando un librillo donde a partir de una investigación que hicieron diferentes artistas nacionales, sacaron fotografías referentes al patrimonio local, como cosas que hacen a la identidad local, y transformaron al estilo de ese artista, las fotos de ellos. Analizando ahí la imagen cómo fue creada, con las pinceladas, cómo quedaron las imágenes creadas, como inteligencias artificiales, yo utilizo bastante. Y en eso, o también en diseño en 3D y en maquetas puntuales.

Moderador: Bien, súper interesante, a la inteligencia artificial ya vamos a ir en preguntas más adelante, pero me fuiste adelantando información muy pero muy valiosa. ¿Los demás sienten que sus prácticas se han visto este impactadas por la inclusión de tecnologías digitales?

Docente 2: Yo creo que si este comparamos el momento que nosotros éramos estudiantes a ahora. Hubo una transformación muy grande, porque nosotros por ejemplo ahora para hacer propuestas de evaluación tenemos que pensar la evaluación que vamos a poner, aquello que nos ponían nosotros de pregunta y respuesta, eso ya no funciona. Eso no es un tipo de evaluación posible porque sabemos bien que ellos toman las herramientas digitales y hacen la actividad. Hay que pensar cada evaluación que se le va a poner al chiquilín, hay que razonarla, hay que ver todas las posibilidades. En realidad, a nosotros yo creo que este nos exige estar en formación permanente también este cambio que se viene dando con respecto a la inclusión de la tecnología y la educación.

Moderador: ¿Y qué beneficios han encontrado en las experiencias que han tenido de evaluar, incluyendo tecnologías digitales? ¿Cuáles podrían decir que son las ventajas que tiene utilizar tecnologías digitales para evaluar?

Docente 4: Creo que los estudiantes se ven más motivados usando las tecnologías digitales. Yo, por ejemplo, la semana que viene tengo una evaluación que los chiquilines de noveno tendrán que filmarse, van a filmar un video de 2 o 3 minutos siendo influencer por un día. Muchos van a elegir, eligen la temática que quieran, ya sea música, cocina, deportes. Y uno, por ejemplo, le gusta la pesca y va a hacer sobre la pesca. Y va a ser influencer por un día. Video cortito, pero esa va a ser la evaluación final de la unidad temática que justamente son las redes sociales y el impacto que tienen los jóvenes. Y bueno, ellos están entusiasmados con eso, están entusiasmados con si fuera una evaluación tradicional, no estarían entusiasmados. Y más en inglés, entonces me parece que se motivan bastante.

Docente 2: El tema de diálogo hoy en el almuerzo era ese.

Moderador: Bien, qué interesante, qué interesante. ¿Algún otro aporte que hayan visto como beneficio del uso de las tecnologías digitales para evaluar?

Docente 5: Pienso que, como decía la compañera, que te da un abanico más grande de recursos para ser enfocado a cosas que a ellos les guste más. Puede ser redes sociales, algo de virtud, películas...

Docente 4: Puedes enfocar a canciones. También hay una página que yo he usado que se llama Suno que es para crear canciones y que ellos se enganchan y crean historias. También escriben la historia y después con la inteligencia artificial crean toda la historieta con imágenes. Está bueno.

Docente 1: Yo trabajo mucho con Chroma Key también con la pantalla verde para modificar el fondo.

Moderador: Bien, ¿y los desafíos, las dificultades o aquellas cuestiones que de alguna manera obstaculizan la evaluación o se obstaculizan por el uso de las tecnologías digitales?

Docente 1: El mayor problema es que tenemos que terminar usando los celulares porque ellos no traen las máquinas, no tienen los cargadores. Entonces usamos los celulares. Hoy no saben los correos electrónicos, entonces por ejemplo ahora con octavos estamos trabajando y entramos a Canva. Y yo voy mirando y me dicen: "a ver, fíjese, esta página del librillo", yo miro acá y están todos conectados en el mismo librillo, completando con las imágenes, con efecto, todo. Pero fue todo un trabajo porque claro, no se acordaban de los correos para que todos ingresaran, enviar y poder ingresar todos con Canva, el mismo archivo.

Moderador: Bien, ese es un obstáculo claro, los dispositivos, el tema de los correos. ¿Algo más que les parezca que puede obstaculizar el trabajo, la inclusión de tecnologías digitales en sus aulas?

Docente 4: La conectividad también es un problema, los equipos que no funcionan o no se puede conectar con alguna otra cosa.

Docente 2: Y a veces los hogares no cuentan con dispositivos, con conexión.

Moderador: Claro, claro, claramente, no es solo en la institución, sino después cuando se van a la casa.

Docente 4: Sí, aunque muchos vienen y están ahí de tarde a veces.

Moderador: Bien, que hacen las tareas ahí mismo. La conexión del liceo. Bien, otra de las preguntas es ¿qué apoyo creen que necesitan para mejorar su competencia digital? Hoy se ubicaban en un nivel medio. Bueno, ¿qué apoyos creen que pueden necesitar para mejorar ese desarrollo de competencia digital?

Docente 1: Capacitaciones concretas, con ejemplos claros, específicos que sean realmente aplicables.

Moderador: Bien, a eso vamos con el tema de la capacitación o de la formación. ¿Cómo perciben ustedes la formación que hay?

Docente 4: Yo la sigo a una docente de inglés que tiene una maestría o algo en tecnología y que la sigo en Instagram y prácticamente todos los días se está publicando tips y páginas y te enseña ahí rapidito porque te enseña más o menos a usar y de ahí voy sacando. Es mucha cosa lo que sube, pero algo trato de rescatar porque sube muchas cosas y están buenas, aplicables al aula y ella al ser una docente de inglés son súper útiles todas las cosas que muestra.

Moderador: Bien por lo aterrizado decían hoy, por lo concreto. Claro, bien, se valoraría como esto de la presencialidad.

Docente 1: Yo pienso que una buena forma de aprender y aprender más rápido, serían cursos, charlas que sean para aprender de forma práctica y presencial. Tener a alguien que te esté ayudando, que te muestre práctica.

Moderador: ¿Y ustedes en el centro han tenido algún tipo de oportunidad de formación?

Docente 3: Hablando de formación me gustaría agregar una idea, que es un tema que no hemos hablado, que es el tema de que a mí me gustaría, por ejemplo, formarme más en la parte de tecnología, pero enfocado a los estudiantes con discapacidad, con problemas de aprendizaje. Me parece que falta un montón, no solamente la formación de nosotros en las instituciones que nos dan como pantallazo de lo que significa cada uno, pero no nos enseñan cómo. Y yo he comprobado que con la tecnología uno logra hacer algo, pero no logra abarcarlo bien o trabajarlo de manera mejor o profunda con ese estudiante.

Moderador: Bien, el tema de la inclusión es todo un tema. Por ahí necesitamos formación y quizás ver cómo usar la tecnología para favorecer esa inclusión. En cuanto a la formación, ¿ustedes cómo perciben la oferta que hay a nivel país de formación en tecnologías digitales? ¿Qué identifican como instituciones o desde dónde se ofrece formación en tecnologías digitales?

Docente 2: Yo creo que formación hay, o sea, oferta hay, el tema es el tiempo. Tiempo, los horarios coinciden con el trabajo, generalmente. Entonces la sobrecarga que a veces se tiene es difícil poder destinar, y si se destinan horarios, después, para cumplir con las tareas, que a veces son bastante complejas, se complica. Generalmente te piden horas en la plataforma.

Docente 5: Hay docentes que están todo el día en el centro y salen a sus casas derecho a hacer un curso.

Moderador: Claro, no es fácil de sobrellevar, claramente. ¿Y la oferta la han recibido desde dónde, por ejemplo? ¿Cuándo ustedes dicen cursos hay?

[Varios: hablan a la vez]: Ceibal, sí Ceibal aparece un montón o en las redes también.

Moderador: Bien, Ceibal o en las redes también.

(Se corta y no se escucha bien lo que dicen)

Docente 1: Sí, de repente, como decía Docente 2, presencial, aprovechando la instancia esta de la coordinación de centro, y que sea presencial, algo que sea apuntado a esas horas, que es mucho más productivo que algunas cosas más complejas que al final no se terminan haciendo.

Docente 2: La red también tiene varios cursos, lo que era la Red Global de Aprendizajes. Hay también una oferta importante de cursos.

Moderador: Ahora entraríamos como más en la inteligencia artificial. Ya estuvieron adelantando algunos ejemplos bien interesantes. Respecto a inteligencia artificial, ¿todos han usado inteligencia artificial con fines pedagógicos?

[Varios dicen: Sí, algo.]

Moderador: En distinta medida, pero todos, no hay nadie que no haya usado. Bien, todos usaron. Ya tuvimos algunos ejemplos que nos fue haciendo el compañero. ¿Qué otros ejemplos de herramientas que hayan usado?

Docente 1: El famoso ChatGPT, creo que se utiliza bastante. Muchas IA generativas que te ayudan.

Moderador: Bien, ¿cómo por ejemplo?

Docente 1: Como de video, de audio, de imagen, hay para todo. Si no la inventan. Ahora nomás con Segundo EMS, que estamos haciendo en conjunto con Historia y Sociología o Formación Ciudadana, es una murga, porque acá la murga no llega, acá es carnaval. Entonces acá se hicieron toda la investigación para hacer la letra y eso con inteligencia artificial para armar bien la letra, el sonido también.

Moderador: ¿Y de inteligencia artificial generativa? ChatGPT, no sé si alguna otra herramienta que recuerden.

Docente 4: Suno fue usado para crear canciones, después otro para crear historias a partir... le ponés el cuento y te crea toda la imagen, creo que se llama story.com o algo así me parece... Después hay otro que se llama Taipo, a partir de una imagen te genera una historia. Esto es lo que he utilizado.

Moderador: Bien, y esto capaz que viene ligado un poco a lo que ya han estado diciendo, pero ¿qué ventajas le han visto al uso de la inteligencia artificial para sus clases, para la enseñanza, para la evaluación? ¿Sienten que les ha servido? ¿Qué resultado les ha dado?

Docente 1: En mi caso del arte, que a veces es un poco complejo para algunos estudiantes, no tienen facilidad, se abre un poco más el abanico al tener la posibilidad de trabajar la tecnología. Se va intercalando a lo largo del año frente a actividades dando opciones, como decía Docente 3, de darle la opción de este tipo de presentación que pueden hacer si son más facilidades todo lo digital o con lo manual, que bueno, tienen la posibilidad de presentarlo de una manera u otra y aplicando los contenidos desarrollando las competencias.

Moderador: ¿Alguien más que haya visto algún tipo de ventajas?

Docente 4: En el caso de inglés es más práctico porque ellos usan mucho el chat para traducir, utilizan el audio también para cuando presentan, de ahí estudian en base a lo que escucha para las presentaciones orales y eso es bastante práctico. Para ellos y en la elaboración de textos y todo eso usan el chat continuamente.

Docente 2: Y la importancia también de... yo por ejemplo tengo Segundo EMS bachillerato y la importancia de que luego que ellos hacen una tarea utilizando el chat, que sabemos que lo usan, que ellos puedan leerlo y ver si realmente el chat dijo lo que era la intención de ellos decir, si realmente refleja su pensamiento. Entonces eso es importante, porque a veces lo que hacen es hacer la tarea y entregarte, sin embargo no es lo que ellos pensaban realmente. Entonces por eso pido que expliquen, que lo lean y lo expliquen, y a veces dicen: "pero no era esto lo que quería decir, me cambió la palabra". Sí, cambió la palabra, cambió la terminología. Entonces, cómo hay que guiar también al chat para que diga lo que usted quiere que diga. Eso también es parte de enseñarles a ellos la utilización de la tecnología, ¿no?

Docente 4: El prompt que usan tiene que ser muy específico. Lo que yo veo que con el chat, por ejemplo, yo siempre les digo a ellos: "Ustedes tienen que leer lo que les da el chat". Porque lo que me pasa es que siempre el chat le cambia los pronombres, por ejemplo en inglés si están hablando de un varón le pone ella, empieza hablando de él y después en el medio del texto empieza hablando de ella, después vuelve a él y después sigue con ella. Tienen que prestar atención porque el chat acá les está cambiando los pronombres a las personas y generalmente les cambia. En la mayoría de los textos les cambia el pronombre. Y eso me he dado cuenta que siempre sucede.

Docente 5: Yo pienso que otra ventaja también que tiene es ayuda a los docentes, ayuda a elaborar actividades, a planificar, optimiza mucho tiempo a veces. Si tiene una cosa y otra, le ponés un prompt que vaya medio directo a lo que querés hacer y te tira muchas ideas.

Moderador: Bien, ¿y esas ideas que les tiran como para que puedas pensar creativamente tu clase, también lo ven que lo haga para la evaluación, por ejemplo, también lo han probado para la evaluación?

Docente 1: Sí, sí, también tira para la evaluación. Permite. Te ayuda en eso también. Hay que orientarlo.

Moderador: Sí, claramente la estructura del prompt, que como decía la compañera, es importante. ¿Ustedes creen que la inteligencia artificial puede ayudar en brindarle retroalimentación a los estudiantes en la corrección de las tareas de los estudiantes?

[Varios dicen: Sí, sí creo que sí. Pienso que sí.]

Moderador: Piensan que sí, pero ¿no la han usado con ese fin?

[Varios dicen: No, no]

Docente 2: Yo intento que ellos hagan la corrección, cuando aparece algún tipo de tecnología o de análisis que no se adapta a lo que se está pidiendo, siempre es un trabajo que no es el trabajo que se pidió. No se adapta a la consigna. Y también el tema de la consigna también hay que tener cuidado con el chat, porque a veces la consigna tampoco refleja lo que el docente quiere, ¿no? La consigna que te ayuda el chat, lo que te plantea el chat. También está... hay que razonar muy bien, digo, tanto la actividad utilizando la inteligencia artificial como utilizando la clase en general.

Moderador: Bien, y lo que me estás queriendo decir es que lo que intentás hacer es que ellos analicen lo que da. Otra de estas cuestiones que ya algunas fueron manifestando, pero ¿qué barreras han encontrado? ¿Qué obstáculos han encontrado con el uso de la inteligencia artificial? ¿Cuáles creen que son los principales obstáculos de usarlas en la enseñanza y en la evaluación?

Docente 1: A veces hacen todo con IA. En mi caso yo trabajo demasiado con la parte de texto... Hacen todo y después le hacen la misma actividad sin eso y totalmente diferente.

Docente 5: Debe ser buen uso de la inteligencia, ¿no? Si bien es algo que está ya, no vamos a ir contra la corriente, sino hay que darle un buen uso. Y a veces es eso, entonces bueno, es muy dependiente de la IA, todo. Todo ChatGPT. Le duele la cabeza, un remedio para...

Moderador: Claro, claro, esta dependencia que se ha generado.

Docente 4: Sí, no siempre la información que teoriza es la correcta. Nos pasó en una presentación que hicimos interdisciplinaria con Inglés, Historia y Computacional y tenían que presentar sobre un personaje de historia y los chiquilines hablaron pero de un personaje que existió en otro tiempo que no tenía nada que ver con los personajes que el profesor les había pedido. O sea que también no sé si no leen o se confiaron en la información que les dio el chat, pero también hay que fomentar eso, tienen que leer y no confiarse, ¿no? Porque no siempre es precisa la información. Que antes nos pasaba con Wikipedia. Por ahí te copiaban y pegaban algo y en la mitad del texto tenía cualquier disparate. Y ellos no leían, te traían tal cual copiaban y pegaban. Y traían esa información.

Moderador: Vivimos la etapa de Wikipedia y la lucha con algunas de esas cuestiones. Bien, no sé si quieren agregar algo más respecto a las barreras en el uso de la inteligencia artificial para la enseñanza o para la evaluación o desafíos.

Docente 3: Yo me acordé de una frase, que decía que el docente ya no tiene tanto el rol de ser el que enseña, sino más el que guía por ese mismo tema. Como que hoy en día, si tenemos esa gran herramienta, pero tenemos que enseñarles qué buscar, cómo usarlo, porque ellos en realidad cualquier cosita que vos le estés enseñando de clase, sea de la materia que sea, van a encontrar ahí las respuestas. Uno ya no tiene que brindarle eso, sino enseñarle a usarla. Es un trabajo más pesado.

Moderador: Si ustedes fueran a hacer recomendaciones para mejorar la formación y recibir apoyo en las competencias digitales, ya hay algunas cosas que me fueron diciendo. Me dijeron: queremos que sea presencial, queremos que sea aterrizado. Queremos que se usen los espacios ya previstos en el centro, como la coordinación. ¿Alguna otra recomendación que ustedes quisieran sugerir? Ya fueron aportando muchas cuestiones de esto que estaba mencionando. No sé si querían agregar algo de la formación que necesitan, si ustedes fueran a hacer alguna sugerencia para que les dieran algo que realmente les sirva para aprender a evaluar con tecnologías digitales.

Docente 2: Yo creo que volveríamos a lo mismo, que los subsistemas den tiempo para eso, volvemos a lo mismo.

Moderador: Bien, como tratar esas debilidades que habíamos nombrado hoy, poder apuntar a mejorarlas, a mejorar esas condiciones. Bien, y ahora voy a la imaginación y acá sí les prometo que cerramos la entrevista: a la imaginación. ¿Cómo se imaginan ustedes el futuro? ¿Qué herramientas se imaginan? ¿Qué posibilidades se imaginan en un futuro para evaluar con tecnologías digitales? Hace un tiempo atrás ni nos imaginábamos esto de la IA.

Docente 2: No, pero no todo negativo. El otro día nosotros fuimos a un curso donde nos estaban contando una historia donde una chiquilina presentaba grandes problemas de autoestima y dice que los compañeros pusieron sus características en la inteligencia artificial y la describió todo lo contrario: que era una persona hermosa, que era una persona que tenía gran valor, emotiva, que era bondadosa. O sea, encontró una cantidad de aspectos positivos y entonces a partir de ahí ella empezó a ver aspectos en su persona y su autoestima mejoró. O sea, yo creo que, capaz sabiéndola usar, o no sé, acá fue una trampa que hicieron los compañeros para hacerla pasar, para que ella se viera mejor. Pero también es una herramienta que tiene sus pro y sus contra como todo.

Moderador: Bien, no está fácil de imaginarse, capaz, porque han habido tantos cambios, que no sé si quieren agregar algo más, algo que se les ocurra que pueda aportar a esta temática que estuvimos reflexionando.

(Intervención breve)

Moderador: Bien, te imaginas eso y con la inteligencia artificial cada vez impactando en más espacios, en más lugares, bien.

Docente 1: No creo que sustituya a la inteligencia humana.

Docente 3: Si estás triste, si ves a los estudiantes tristes porque pasa algo, hablas, eso no hace esto. No capta emociones.

Docente 2: No. En el contacto con el otro, eso la Inteligencia Artificial jamás va a poder, o sea, hay cosas que no. El humano no se pierde, no se debería perder. Porque le quitaríamos lo educativo. Estaríamos al frente de una computadora, sentaríamos a las personas y nada. No sé, yo pienso que no, no es posible. No sé.

Moderador: Bueno, gente, les agradezco infinitamente. Gracias.`]
        ]
    },
    primer_anio: {
        title: 'Adaptación a una nueva trayectoria formativa',
        prompt: '¿Qué factores facilitan u obstaculizan la adaptación académica y emocional de los estudiantes al ingresar a la educación superior?',
        task: 'Codificá los testimonios distinguiendo entre dificultades iniciales, redes de sostén y estrategias autónomas. Redactá un memo que compare los procesos de Ana y Mateo.',
        categories: [
            ['cat-adaptacion', null, 'CAT-ADAP', 'Adaptación al aprendizaje', '#0f766e', 'Estrategias y dificultades para organizar el estudio, comprender textos académicos y cumplir con las exigencias curriculares.'],
            ['sub-autonomia', 'cat-adaptacion', 'SUB-AUT', 'Autonomía para estudiar', '#14b8a6', 'Desarrollo de métodos propios de estudio, gestión del tiempo, búsqueda bibliográfica independiente y formulación de consultas.'],
            ['cat-apoyo', null, 'CAT-APO', 'Redes de apoyo y acompañamiento', '#2563eb', 'Vínculos con compañeros, grupos de estudio, tutorías docentes y contención familiar que sostienen la trayectoria.'],
            ['cat-incertidumbre', null, 'CAT-INC', 'Incertidumbre y vivencias emocionales', '#b45309', 'Dudas vocacionales, temor al fracaso, estrés ante evaluaciones y vivencia de desorientación al inicio de la carrera.']
        ],
        documents: [
            ['Entrevista_Ana_Trayectoria_Educativa.txt', `ENTREVISTA EN PROFUNDIDAD - CASO ANA
Informante: Ana (19 años, estudiante de primer año de Profesorado, primera generación en estudios terciarios)
Lugar: Biblioteca del Instituto | Fecha: 24/04/2025

Entrevistadora: Buenas tardes, Ana. Quería consultarte cómo viviste la transición entre la secundaria y el ingreso a esta carrera docente. ¿Qué fue lo que más te impactó al comienzo?

Ana: Al principio fue un shock bastante fuerte. En el liceo yo estaba acostumbrada a que los profesores te daban resúmenes breves y te iban recordando las fechas clase a clase. Acá, el primer día de Pedagogía nos dieron un programa con cinco libros y textos de 40 páginas para la semana siguiente. Sentí una desorientación total. Me pasaba las tardes intentando leer sin entender bien qué era lo importante y qué no. Pensaba: "esto no es para mí, no voy a dar abasto". Me daba muchísima vergüenza levantar la mano para preguntar porque veía que otros compañeros intervenían usando palabras técnicas y sentía que si no entendía era una falla exclusivamente mía.

Entrevistadora: ¿Y en qué momento sentiste que esa situación empezó a cambiar o qué te ayudó a encontrar un ritmo?

Ana: Lo que me salvó fue una compañera que me vio angustiada en el patio y me invitó a sumarme a su grupo de estudio en la biblioteca. Éramos cuatro. Empezamos a juntarnos dos veces por semana, nos dividíamos los capítulos, hacíamos puestas en común y ahí me di cuenta de que todos estábamos con las mismas dudas y miedos. El grupo de pares fue fundamental; dejó de ser una experiencia solitaria. Además, la profesora de Lengua organizó talleres de lectura académica y nos enseñó a fichar textos y armar redes conceptuales.

Entrevistadora: Mirando hacia atrás, ¿qué cambios notas en tu forma de estudiar hoy?

Ana: Aprendí a ser mucho más autónoma. Ahora tengo mi propio cuaderno de síntesis, me armo una planificación semanal con horarios fijos y si no comprendo un concepto busco artículos complementarios o voy directamente a los horarios de consulta de los docentes. Ya no espero que me digan qué hacer; tomo la iniciativa. Todavía me pongo nerviosa antes de los parciales orales, pero sé que tengo herramientas para prepararme y que puedo apoyarme en mis compañeros.`],
            ['Entrevista_Mateo_Trayectoria_Educativa.txt', `ENTREVISTA EN PROFUNDIDAD - CASO MATEO
Informante: Mateo (20 años, estudiante de primer año proveniente de una localidad rural del interior)
Lugar: Sala de Tutorías | Fecha: 28/04/2025

Entrevistador: Hola Mateo, gracias por participar. Contanos cómo fue tu llegada a la institución y cómo viviste las primeras semanas de cursada.

Mateo: Para mí el cambio fue doble: por un lado el nivel de exigencia y por otro el desarraigo de dejar mi pueblo y venirme a vivir solo a la capital. Llegué con mucho entusiasmo pero también con un nudo en la garganta. No conocía a nadie, los pasillos estaban llenos de gente y los salones eran gigantescos. En las primeras clases de Filosofía me sentía invisible. La forma de evaluar acá no tiene nada que ver con lo que yo conocía: te piden argumentar, fundamentar con autores, tomar una postura crítica, y yo venía de un sistema donde memorizaba definiciones para la prueba. En el primer trabajo escrito me saqué una nota baja y me agarró una crisis terrible, pensé seriamente en abandonar y volverme.

Entrevistador: ¿Qué factores intervinieron para que decidieras quedarte y cómo fuiste resolviendo esas dificultades?

Mateo: Fueron clave dos cosas. Primero, mi familia que todos los días me llamaba por videollamada para darme ánimo, y segundo, el sistema de tutorías entre pares que tiene el instituto. Me asignaron un tutor de cuarto año que me dedicó dos horas por semana para explicarme cómo encarar la bibliografía, cómo citar en normas APA y cómo organizar los tiempos entre el estudio y las tareas de la casa. Ese acompañamiento me devolvió la seguridad. 

Entrevistador: ¿Cómo describirías tu desempeño y tu relación con el estudio en la actualidad?

Mateo: Siento que fui construyendo mi propia autonomía. Empecé a usar aplicaciones de calendario para no retrasarme, armé resúmenes por autor y me animé a participar activamente en los debates en clase. Me di cuenta de que equivocarse en una intervención no es un drama sino parte del aprendizaje. Sigue habiendo semanas agotadoras donde la incertidumbre reaparece, especialmente cuando se juntan entregas, pero aprendí a confiar en mis capacidades y a pedir ayuda a tiempo cuando la necesito.`]
        ]
    },
    retroalimentacion: {
        title: 'Devoluciones docentes y evaluación formativa',
        prompt: '¿Cómo perciben y significan los estudiantes las devoluciones docentes y qué condiciones transforman la retroalimentación en una experiencia formativa?',
        task: 'Identificá en los testimonios qué características hacen que una devolución sea clara o frustrante, el impacto emocional asociado y las oportunidades de diálogo pedagógico.',
        categories: [
            ['cat-clara', null, 'CAT-CLA', 'Orientación formativa clara', '#0f766e', 'Devoluciones que explican logros alcanzados, señalan debilidades argumentativas y ofrecen pautas concretas para mejorar.'],
            ['sub-criterios', 'cat-clara', 'SUB-CRI', 'Criterios explícitos y rúbricas', '#14b8a6', 'Uso de matrices de evaluación, rúbricas conocidas de antemano y referencias explícitas a los objetivos de aprendizaje.'],
            ['cat-emocion', null, 'CAT-EMO', 'Impacto emocional y afectivo', '#9333ea', 'Reacciones emocionales ante la corrección: frustración, ansiedad, sensación de injusticia, desmotivación o alivio y entusiasmo.'],
            ['cat-dialogo', null, 'CAT-DIA', 'Diálogo pedagógico y reescritura', '#2563eb', 'Instancias de intercambio presencial, posibilidad de repreguntar, aclarar dudas y reentregar trabajos reelaborados.']
        ],
        documents: [
            ['Grupo_focal_Devoluciones_Estudiantes.txt', `GRUPO FOCAL - DEVOLUCIONES DOCENTES Y APRENDIZAJE
Participantes: Estudiante 1 (Martín), Estudiante 2 (Camila), Estudiante 3 (Sofía)
Moderador: Profesor del área pedagógica | Duración: 45 minutos

Moderador: Bienvenidos. La intención de este encuentro es conversar sobre cómo experimentan las correcciones y devoluciones que reciben de sus docentes en las distintas asignaturas. ¿Qué sienten cuando reciben un trabajo corregido?

Estudiante 1 (Martín): Para mí depende totalmente del docente. Hay profesores que te devuelven una hoja con una nota numérica encerrada en un círculo rojo y la palabra "incompleto" o signos de interrogación al margen. Eso te genera una frustración bárbara y mucha bronca, porque le dedicaste días a escribir y no tenés ni la menor idea de qué está mal o qué esperaba que pusieras. No aprendés nada, te quedás con una sensación de impotencia.

Estudiante 2 (Camila): Coincido con Martín. Lo que a mí me sirve es cuando el docente utiliza una rúbrica que nos entregó antes de empezar la tarea. Cuando veo los criterios desglosados —por ejemplo, "uso de fuentes", "claridad en la hipótesis", "coherencia global"— y al lado hay un comentario específico diciendo: "Tu planteo es sólido, pero en el tercer párrafo falta contrastar con el autor X", ahí sí entiendo. Me da tranquilidad y me orienta sobre el paso a seguir. Deja de ser un misterio personal del profesor.

Estudiante 3 (Sofía): El impacto emocional es muy fuerte. Cuando una devolución es puramente destructiva o sarcástica, te bloquea; sentís que te están juzgando como persona y no a tu producción. En cambio, cuando el profesor abre un espacio de diálogo en el aula y nos dice: "Tómense diez minutos para leer los comentarios y el que tenga dudas se acerca al escritorio", la dinámica cambia por completo. Poder conversar la corrección, explicar lo que quisiste decir y que te den la chance de reescribir el trabajo transforma el error en algo valioso.`],
            ['Entrevista_Valentina_Devoluciones.txt', `ENTREVISTA EN PROFUNDIDAD - CASO VALENTINA
Informante: Valentina (21 años, estudiante de formación terciaria)
Lugar: Salón de reuniones | Fecha: 12/05/2025

Entrevistadora: Valentina, ¿podrías describir alguna experiencia de evaluación que haya sido especialmente significativa para tu aprendizaje, ya sea positiva o negativa?

Valentina: Recuerdo dos experiencias totalmente opuestas. En primer año entregué una monografía en Historia de la Educación. La docente me la devolvió llena de tachaduras rojas y escribió al final: "Nivel insuficiente, rehacer". Me dio tanta angustia que estuve a punto de no presentarme al examen. Sentí que no servía para esto. Fui a pedirle una explicación y me contestó que "las pautas ya estaban dadas en clase". No hubo diálogo posible.

Entrevistadora: ¿Y la experiencia positiva cómo fue?

Valentina: Fue al año siguiente en Didáctica. El profesor nos propuso diseñar una secuencia de enseñanza con entregas parciales de borradores. En cada entrega nos hacía devoluciones cualitativas en Google Docs usando comentarios contextualizados. No ponía nota numérica en las etapas intermedias; nos hacía preguntas disparadoras: "¿Cómo se relaciona este objetivo con la actividad que propusiste?", "¿Qué alternativas le darías a un estudiante que no comprende la consigna?". 

Entrevistadora: ¿Qué impacto tuvo esa forma de trabajo en tu aprendizaje?

Valentina: Fue transformador. Me enseñó a autorregularme y a revisar críticamente mis propias producciones. Sentí que el docente confiaba en mi capacidad de superación. Ya no estudiaba para "zafar" de una nota, sino para comprender en profundidad. La retroalimentación dejó de ser una sentencia final y pasó a ser un puente pedagógico.`]
        ]
    },
    participacion: {
        title: 'Dinámicas y barreras de participación en el aula',
        prompt: '¿Qué factores inhiben o facilitan la participación activa y la expresión oral de los estudiantes en los espacios de clase?',
        task: 'Marcá evidencias de barreras subjetivas e interactivas, factores del clima escolar y estrategias docentes que favorecen la inclusión comunicativa.',
        categories: [
            ['cat-barreras', null, 'CAT-BAR', 'Barreras para la participación', '#b91c1c', 'Factores que inhiben la intervención oral: timidez, monopolio de la palabra por un subgrupo, dinámicas expositivas rígidas y mandatos grupales.'],
            ['sub-temor', 'cat-barreras', 'SUB-TEM', 'Temor a la exposición y al error', '#ef4444', 'Miedo a equivocarse en público, ser juzgado por pares, recibir burlas o ser descalificado por el docente.'],
            ['cat-clima', null, 'CAT-CLI', 'Clima de aula y seguridad pedagógica', '#0f766e', 'Ambiente de respeto, validación del error como oportunidad de aprendizaje, escucha atenta y confianza grupal.'],
            ['cat-estrategias', null, 'CAT-EST', 'Estrategias docentes de mediación', '#2563eb', 'Técnicas pedagógicas que diversifican la participación: trabajo en parejas, escritura previa individual, pizarras virtuales y rondas de preguntas.']
        ],
        documents: [
            ['Entrevista_Lucia_Participacion.txt', `ENTREVISTA EN PROFUNDIDAD - CASO LUCÍA
Informante: Lucía (16 años, estudiante de educación media superior)
Lugar: Sala de orientación | Fecha: 08/06/2025

Entrevistadora: Hola Lucía. Queremos conversar sobre cómo te sentís en las clases a la hora de intervenir, opinar o responder preguntas. ¿Participás habitualmente de forma oral?

Lucía: La verdad es que la mayoría de las veces prefiero quedarme callada. Muchas veces sé la respuesta exacta a lo que el profesor está preguntando o tengo una idea que me parece buena, pero me gana el miedo a que me trabe al hablar o diga una tontería y los demás se rían. En mi grupo hay dos o tres compañeros que siempre hablan primero, opinan de todo y a veces hacen comentarios burlones por lo bajo si alguien se equivoca. Entonces preferís no exponerte; el silencio es como un escudo.

Entrevistadora: ¿Hay alguna materia o docente con quien te sientas más cómoda para participar? ¿Qué hace diferente ese docente?

Lucía: Sí, con la profesora de Filosofía. Ella implementó una regla desde el principio: nadie puede interrumpir ni reírse de la opinión de otro. Además, no tira preguntas al aire para que responda el más rápido. Nos dice: "Piensen dos minutos en silencio, escriban una frase en su cuaderno y conversen con el compañero de banco". Cuando trabajamos de a dos, yo me animo a discutir mi idea con mi compañera. Y después la profesora nos dice: "¿Qué conversaron en este banco?". Al hablar en nombre de las dos, ya no siento tanta presión individual.

Entrevistadora: ¿Qué otras cosas sentís que ayudan a que todo el salón participe más?

Lucía: Que los profesores valoren las preguntas y no solo las respuestas perfectas. Cuando un profesor te dice: "Esa duda que planteaste es excelente porque nos permite pensar otra cosa", te sentís respetada. También usamos a veces pizarras digitales o papelitos anónimos pegados en el pizarrón; eso ayuda a que participen los que nunca se animan a levantar la mano.`],
            ['Observacion_Clase_Participacion.txt', `REGISTRO ETNOGRÁFICO DE OBSERVACIÓN DE CLASE
Materia: Ciencias Sociales | Duración: 80 minutos | Grupo: 28 estudiantes
Observador: Investigador de campo | Fecha: 15/06/2025

09:00 - Inicio de la sesión. El docente expone en el pizarrón el tema "Transformaciones urbanas y desigualdad social". El docente mantiene un tono enérgico y realiza preguntas abiertas al plenario: "¿Quién puede explicar qué consecuencias tuvo la migración campo-ciudad?".
09:12 - Se observa que tres estudiantes sentados en la primera fila monopolizan las respuestas de inmediato. En el sector posterior y lateral, la gran mayoría de los alumnos permanece con la mirada baja, dibujando en sus cuadernos o manipulando disimuladamente el celular. No se registran pedidos de palabra espontáneos por fuera del subgrupo dominante.
09:25 - El docente detecta la desconexión del grupo y decide cambiar la dinámica didáctica. Introduce una consigna estructurada: "Vamos a detenernos cinco minutos. Cada uno va a leer el fragmento del testimonio en la fotocopia y va a escribir en una ficha dos preguntas que le surjan. Luego, se agrupan en duplas para comparar sus fichas".
09:30 - El clima sonoro del aula cambia radicalmente: disminuye el murmullo disperso y se activan conversaciones intensas en parejas. Se observa a estudiantes que antes estaban retraídos debatiendo activamente con sus pares, señalando párrafos con el dedo y tomando notas compartidas.
09:45 - Puesta en común guiada. El docente no pide voluntarios al azar sino que recorre las mesas: "El equipo de Sofía y Mateo planteó una pregunta muy potente sobre el acceso a la vivienda; cuéntennos qué debatieron". Sofía expone con fluidez la conclusión alcanzada con su par.
10:05 - Un estudiante comete un error conceptual al interpretar un gráfico estadístico. El docente interviene inmediatamente con tono empático: "Es muy común esa confusión; justamente ese dato parece indicar otra cosa a primera vista. Vamos a analizarlo juntos entre todos". El grupo escucha con atención, sin registrarse burlas ni descalificaciones.
10:15 - Cierre de la clase con un balance generalizado donde intervinieron 18 de los 28 estudiantes.`]
        ]
    },
    estudio_caso: {
        title: 'Estudio de Caso: Tecnologías en la Gestión Escolar',
        prompt: '¿Cómo incide la integración de tecnologías digitales en la cultura institucional y en las prácticas de enseñanza y gestión de un centro educativo?',
        task: 'Analizá las tensiones entre liderazgo directivo, disponibilidad de recursos técnicos, resistencias docentes y prácticas de innovación pedagógica.',
        categories: [
            ['cat-facilitadores', null, 'CAT-FAC', 'Facilitadores y liderazgo institucional', '#0f766e', 'Acompañamiento directivo, cultura colaborativa, espacios de coordinación y proyectos transversales integrados.'],
            ['sub-equipamiento', 'cat-facilitadores', 'SUB-EQU', 'Infraestructura y disponibilidad de recursos', '#14b8a6', 'Acceso a conectividad estable, dispositivos Ceibal/portátiles, proyectores y plataformas digitales operativas.'],
            ['cat-resistencias', null, 'CAT-RES', 'Resistencias y sobrecarga laboral', '#b91c1c', 'Inseguridad técnica, temor a la pérdida del control pedagógico, burocracia digital y falta de tiempo remunerado para diseño.'],
            ['cat-innovacion', null, 'CAT-INN', 'Prácticas pedagógicas emergentes', '#2563eb', 'Diseño de propuestas interdisciplinarias, creación de contenidos multimedia por estudiantes y evaluación basada en proyectos.']
        ],
        documents: [
            ['Entrevista_Director_Escuela.txt', `ENTREVISTA A EQUIPO DIRECTIVO - CASO LICEO COMUNITARIO
Informante: Director del centro (15 años en la docencia, 4 en la gestión directiva)
Lugar: Dirección del centro | Fecha: 10/05/2025

Entrevistadora: ¿Cómo ha sido el proceso de adopción de tecnologías digitales en el centro educativo durante los últimos años?

Director: Ha sido un camino con avances significativos pero no exento de contradicciones. Desde la dirección entendemos que la tecnología no es un fin en sí mismo, sino una herramienta para democratizar el acceso al conocimiento y diversificar la enseñanza. Por eso impulsamos la creación de una comisión de innovación pedagógica integrada por docentes de distintas áreas y el docente dinamizador de Ceibal. El principal facilitador ha sido habilitar los espacios de coordinación semanal para que los profesores que tienen más destrezas compartan sus planificaciones y ayuden a los que están más rezagados. Cuando el apoyo viene de un par, la resistencia baja notablemente.

Entrevistadora: ¿Cuáles han sido los principales obstáculos o resistencias con los que se han encontrado?

Director: La brecha más dura no es la de los estudiantes, sino la sobrecarga y el cansancio de los docentes. Muchos profesores argumentan con razón que planificar secuencias digitales complejas o corregir foros en plataformas insume horas que no están remuneradas. A eso se suma la frustración cuando la conectividad se cae en pleno desarrollo de la clase o cuando los estudiantes olvidan sus cargadores. Hay un sector docente que todavía ve a la tecnología como una distracción o una amenaza a su autoridad en el aula.

Entrevistadora: ¿Qué proyectos o cambios concretos destacaría como logros institucionales?

Director: Logramos que varias materias trabajen de forma interdisciplinaria a través de proyectos basados en problemas reales del barrio. Por ejemplo, los grupos de tercer año combinaron Biología, Geografía e Informática para mapear la calidad del agua en el arroyo cercano utilizando sensores digitales y produciendo podcasts informativos para la radio comunitaria. Eso demuestra que cuando la tecnología se conecta con la vida real de los jóvenes, el aprendizaje cobra un sentido totalmente nuevo.`],
            ['Informe_Observacion_Institucional.txt', `INFORME DE OBSERVACIÓN INSTITUCIONAL
Contexto: Sala de Coordinación Docente y Pasillos del Centro Educativo
Fecha: 22/05/2025 | Observador: Equipo de Investigación Evaluativa

Durante la jornada de coordinación institucional de las 14:00 hs, se observa un debate intenso en torno al uso obligatorio de la plataforma institucional para el registro de calificaciones y actividades formativas.
- Dimensión de resistencias y quejas técnicas: Tres docentes con más de 20 años de antigüedad manifiestan su disconformidad ante la duplicación de tareas administrativas: "Tenemos que llenar la libreta papel y además cargar todo en la plataforma; se nos va la mitad del tiempo de coordinación en tareas burocráticas en lugar de discutir pedagogía". Se señalan problemas recurrentes con la lentitud del servidor y la falta de adaptadores en las aulas.
- Dimensión de colaboración entre pares: Dos docentes noveles del área de Ciencias toman la palabra y proyectan un repositorio compartido en Google Drive donde subieron plantillas editables, rúbricas automatizadas y tutoriales en video de cinco minutos. Se ofrecen para realizar tutorías personalizadas durante los recreos para quienes no logren configurar sus aulas virtuales. Se observa una distensión en el clima de la sala; los docentes más reticentes aceptan la propuesta de apoyo mutuo.
- Prácticas emergentes registradas en cartelera: En el hall central se exhiben códigos QR generados por estudiantes de primer año que vinculan a narrativas transmedia sobre historia nacional, videominutos de concientización ambiental y muestras de arte digital, evidenciando una apropiación creativa de las tecnologías por parte del estudiantado.`]
        ]
    },
    teoria_fundamentada: {
        title: 'Teoría Fundamentada: Bienestar y Cuidado en Salud',
        prompt: '¿Cómo experimentan y gestionan el desgaste profesional y el cuidado subjetivo los trabajadores en servicios de salud de alta exigencia?',
        task: 'Aplicá codificación abierta y axial: vinculá las evidencias de sobrecarga y sufrimiento vicario con las estrategias personales de autocuidado y los dispositivos colectivos de soporte.',
        categories: [
            ['cat-desgaste', null, 'CAT-DES', 'Fatiga laboral y desgaste', '#b91c1c', 'Sobrecarga horaria, turnos rotativos, agotamiento psicofísico y precarización de las condiciones de atención.'],
            ['sub-emocional', 'cat-desgaste', 'SUB-EMO', 'Carga emocional y sufrimiento vicario', '#ef4444', 'Impacto subjetivo del contacto cotidiano con el dolor ajeno, la muerte, la incertidumbre clínica y la impotencia institucional.'],
            ['cat-autocuidado', null, 'CAT-AUT', 'Estrategias individuales de autocuidado', '#0f766e', 'Prácticas deliberadas para preservar la salud: límites entre trabajo y vida personal, desconexión digital, actividad física y terapia.'],
            ['cat-soporte', null, 'CAT-SOP', 'Soporte grupal y ateneos reflexivos', '#2563eb', 'Espacios sistemáticos de diálogo interdisciplinario, escucha mutua, desahogo emocional y contención entre colegas de equipo.']
        ],
        documents: [
            ['Entrevista_Dra_Elena_Salud.txt', `ENTREVISTA EN PROFUNDIDAD - PERSPECTIVA CLÍNICA
Informante: Dra. Elena (Médica intensivista y de urgencias, 12 años de ejercicio profesional)
Lugar: Hospital General | Fecha: 18/06/2025

Entrevistadora: Doctora Elena, ¿cómo impacta la cotidianeidad de las guardias de emergencia en su bienestar físico y emocional?

Elena: La exigencia en la puerta de urgencia es abrumadora y sostenida. Estás tomando decisiones de vida o muerte bajo presión constante, con escasez de camas y muchas veces con familiares angustiados o enojados. El cuerpo te va pasando factura: insomnio crónico, contracturas, taquicardia cuando suena el teléfono de guardia. Pero lo más duro no es el cansancio físico, sino la carga emocional invisible. Cuando despedís a un paciente joven o tenés que comunicar una mala noticia a una familia, absorbés ese sufrimiento. Si no hacés un trabajo consciente para procesarlo, te vas apagando; entrás en lo que llamamos despersonalización o cinismo defensivo para no quebrarte.

Entrevistadora: ¿Qué herramientas o estrategias ha desarrollado para proteger su salud mental y no llegar al colapso?

Elena: Tuve que aprender a ponerme límites muy claros. Antes me llevaba las historias clínicas a casa y contestaba mensajes de WhatsApp a la medianoche. Hoy tengo un teléfono exclusivo para el trabajo que se apaga en cuanto cruzo la puerta de salida. Hago natación tres veces por semana y sostengo mi propio espacio de terapia psicológica. Esas cosas son mi ancla.

Entrevistadora: A nivel del equipo de trabajo, ¿qué dispositivos existen para sostenerse mutuamente?

Elena: Lo más valioso que logramos consolidar es el espacio de ateneo clínico-emocional de los viernes a la mañana. Nos juntamos médicos, enfermeros y psicólogos durante una hora con un café. No discutimos dosis farmacológicas, sino cómo nos sentimos frente a los casos más difíciles de la semana. Poder llorar, reírse o decir abiertamente "este caso me superó y no supe qué hacer" sin sentirte juzgado por tus colegas es lo que te permite seguir adelante con vocación y humanidad.`],
            ['Registro_Ateneo_Equipo_Salud.txt', `REGISTRO TRANSCRIPTO DE ATENEO REFLEXIVO INTERDISCIPLINARIO
Servicio de Cuidados Paliativos y Medicina Interna
Participantes: Lic. Andrea (Enfermera jefa), Dr. Pablo (Médico de planta), Lic. Marcela (Trabajadora Social), Enf. Carlos (Enfermero novel)
Fecha: 27/06/2025 | Duración: 60 minutos

Lic. Andrea: Quería que abriéramos el ateneo de hoy retomando lo que pasó esta semana con el paciente de la sala 4. Sé que todo el equipo quedó muy conmovido por el desenlace y que hubo situaciones de mucha tensión con la familia.

Enf. Carlos: Para mí fue mi primera experiencia en este servicio. Cuando el paciente entró en paro y los familiares empezaron a desesperarse, me quedé paralizado por unos segundos. Sentí una impotencia atroz. Llegué a mi casa esa noche y no pude cenar ni dormir, sentía que había fallado en algo.

Dr. Pablo: Es totalmente comprensible, Carlos. A todos los que estamos acá nos pasó lo mismo en nuestras primeras guardias. Lo peor que podemos hacer es guardarnos esa angustia y fingir que somos de piedra. En este servicio trabajamos con el límite de la vida; la muerte no es un error médico ni una falla de enfermería, es parte del proceso, pero acompañar con dignidad tiene un costo psíquico que tenemos que repartir entre todos.

Lic. Marcela: Desde el área social vimos que la familia demandaba información de manera agresiva porque estaban en una fase de negación absoluta. Como equipo logramos contenerlos y habilitar la despedida. Para cuidarnos entre nosotros, propongo que cuando tengamos situaciones de esta intensidad, rotemos a los profesionales a cargo de la habitación cada dos horas para no quemar a un solo compañero.

Lic. Andrea: Totalmente de acuerdo. Institucionalicemos esa pauta. Y recordemos nuestro pequeño ritual de cierre: al terminar el pase de guardia, nos tomamos dos minutos para respirar juntos y dejar el hospital en el hospital. Cuidar al que cuida no es un lujo, es una condición ética para que el servicio funcione.`]
        ]
    },
    etnografia: {
        title: 'Etnografía: Convivencia y Espacio Público Barrial',
        prompt: '¿Cómo significan, disputan y negocian los vecinos el uso del espacio público y la convivencia comunitaria en la plaza del barrio?',
        task: 'Codificá los registros de campo y entrevistas identificando prácticas de apropiación, tensiones intergeneracionales, acuerdos tácitos y construcción de memoria barrial.',
        categories: [
            ['cat-apropiacion', null, 'CAT-APR', 'Apropiación social del espacio', '#0f766e', 'Usos cotidianos, itinerarios barriales, encuentros comunitarios, ferias y prácticas deportivas o lúdicas.'],
            ['sub-recreacion', 'cat-apropiacion', 'SUB-REC', 'Prácticas recreativas y juveniles', '#14b8a6', 'Actividades de esparcimiento: juegos infantiles, rondas de mate, música, danzas urbanas, skate y deportes colectivos.'],
            ['cat-conflicto', null, 'CAT-CON', 'Tensiones y disputas territoriales', '#b45309', 'Conflictos por ruidos molestos, horarios nocturnos, tenencia de mascotas, acumulación de basura y choque de expectativas entre generaciones.'],
            ['cat-identidad', null, 'CAT-IDE', 'Identidad comunitaria y memoria barrial', '#9333ea', 'Sentido de pertenencia al territorio, historia de organización vecinal, defensa del espacio público y lazos de solidaridad.']
        ],
        documents: [
            ['Diario_de_Campo_Plaza_Central.txt', `DIARIO DE CAMPO ETNOGRÁFICO - PLAZA DEL SOL
Observadora: Investigadora antropóloga | Fecha: Sábado 17/05/2025 | Horario: 16:00 - 19:30 hs

16:00 - La plaza presenta una ocupación heterogénea y dinámica. En el sector norte, alrededor del arenero y los juegos infantiles, se concentran familias con niños pequeños; madres y padres comparten rondas de mate sentados en mantas sobre el césped. En el sector de las mesas de hormigón, un grupo de diez adultos mayores juega al truco y al dominó bajo la sombra de los paraísos.
17:15 - Ingresan a la zona del anfiteatro unos quince adolescentes con parlantes portátiles, bicicletas y skates. Comienzan a poner bases instrumentales de trap y a practicar competencias de freestyle (rimas improvisadas). El volumen de la música se eleva notablemente.
17:40 - Emergencia de micro-tensiones: Dos vecinas mayores que caminaban por el sendero perimetral se detienen y hacen gestos de desagrado hacia el anfiteatro. Una de ellas se acerca al grupo de jóvenes y les recrimina en tono elevado: "Esta plaza es para todos, no tienen por qué aturdir con esa música". Se genera un intercambio tenso. Uno de los jóvenes responde: "Estamos acá haciendo arte en el anfiteatro, no le estamos haciendo daño a nadie".
18:10 - Mecanismos de negociación y mediación barrial: Don Carlos, puestero de la feria vecinal y referente del barrio, interviene de manera amigable: se acerca a los muchachos, los saluda por su nombre y les propone orientar el parlante hacia el muro del fondo y moderar los graves para no interferir con las mesas de los abuelos. Los jóvenes aceptan la sugerencia y reacomodan el equipo. La vecina retoma su caminata. La tensión se disipa mediante este acuerdo tácito de coexistencia.
19:00 - Al caer la tarde, la iluminación led de la plaza se enciende. Los feriantes comienzan a guardar sus puestos, mientras vecinos pasean sus perros con correa por los canteros. Se constata una densa trama de relaciones cara a cara que sostiene el uso vivo del espacio público.`]
        ]
    }
};

// Also let's keep doc 2 for etnografia
educationalCases.etnografia.documents.push([
    'Entrevista_Vecino_Don_Carlos.txt',
    `ENTREVISTA EN PROFUNDIDAD - MEMORIA E IDENTIDAD BARRIAL
Informante: Don Carlos (68 años, jubilado ferroviario, residente del barrio desde hace 45 años y miembro de la Comisión de Vecinos)
Lugar: Banco de la Plaza del Sol | Fecha: 20/05/2025

Entrevistadora: Don Carlos, cuéntenos cómo era este lugar hace unos años y cómo llegó la plaza a ser lo que vemos hoy.

Don Carlos: Mire, en los años noventa esto era un baldío abandonado, un basurero clandestino donde no se podía ni pasar después de las seis de la tarde. Daba pena y miedo. En el 2004, en plena crisis, un grupo de vecinos nos organizamos: armamos asambleas los domingos, juntamos firmas, fuimos a la Intendencia y empezamos a limpiar el terreno con palas y carretillas nuestras. Plantamos los primeros ceibos y tipas con los gurises de la escuela. Cada árbol que usted ve acá tiene el nombre de un vecino que puso el cuerpo. Por eso para nosotros la plaza no es cuatro pedazos de pasto: es la dignidad del barrio, es nuestra historia viva.

Entrevistadora: ¿Cómo ve la convivencia hoy entre los distintos grupos que usan la plaza?

Don Carlos: Hay tensiones, como en cualquier familia grande. A veces los vecinos más viejos se quejan del bochinche de los gurises que vienen a rapear o de los que andan en patineta. Pero yo siempre les digo: "Prefiero mil veces tener a los chiquilines en la plaza haciendo música, riéndose y ocupando el espacio público, que tenerlos encerrados frente a una pantalla o en esquinas peligrosas". La plaza tiene que ser de todos. Lo único que les pedimos es que no rompan las plantas y que levanten las botellas y los papeles antes de irse.

Entrevistadora: ¿Qué representa la plaza para la vida cotidiana de la comunidad?

Don Carlos: Es el único lugar democrático que nos queda donde no hay que pagar entrada ni consumir para existir. Acá se cruza el médico del sanatorio con el albañil, la señora que viene a tomar sol con el pibe que anda en bici. Cuando alguien del barrio tiene un problema o se enferma, la rifa solidaria se organiza acá en la plaza. Es el corazón que mantiene al barrio unido.`
]);

// Replace educationalCases in web-beta/educational.js
const regex = /const educationalCases = \{[\s\S]*?\n    \};/;
const newObjectStr = 'const educationalCases = ' + JSON.stringify(educationalCases, null, 4) + ';';

if (!regex.test(code)) {
    console.error('No se pudo encontrar educationalCases en el archivo');
    process.exit(1);
}

code = code.replace(regex, newObjectStr);
fs.writeFileSync(targetPath, code, 'utf8');
console.log('web-beta/educational.js enriquecido exitosamente con los 7 casos completos.');
