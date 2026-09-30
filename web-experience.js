(function (global) {
    'use strict';
    let api, deferred = false, profileRef;
    const colors = ['#526176', '#2463a6', '#7851a9', '#a35b12', '#16716b', '#9b4367', '#66529a', '#267b47', '#914e18', '#566579'];
    const help = {
        network: ['Red de coocurrencias', 'Localiza categorías que aparecen juntas en la unidad seleccionada. Apoya la exploración temática y la comparación constante; una conexión no demuestra causalidad ni acuerdo.', 'Ejemplo ficticio: “apoyo” y “autonomía” coinciden en dos párrafos. Lee ambos pasajes: podrían expresar apoyo o una tensión.'],
        heatmap: ['Matriz de coocurrencias', 'Compara pares de categorías de forma sistemática. Es útil en análisis de contenido y exploración temática. Cada celda cuenta coincidencias según los filtros; no mide semejanza de significado.', 'Ejemplo ficticio: A–B registra 3 y A–C registra 1. Son coincidencias, no tres participantes ni una relación más importante.'],
        bars: ['Comparación de categorías', 'Permite explorar la distribución de codificaciones. Suele apoyar análisis de contenido. Interpreta los recuentos considerando extensión de las fuentes, reglas y revisión.', 'Ejemplo ficticio: una entrevista larga tiene 8 asignaciones y otra corta 3. Esto no demuestra que el tema importe más en la primera.'],
        quality: ['Calidad de codificación', 'Ayuda a revisar decisiones pendientes y cobertura del trabajo. Es un apoyo de trazabilidad transversal a los enfoques, no una medida automática de validez.', 'Ejemplo ficticio: 5 propuestas pendientes requieren lectura humana antes de incorporarlas a una interpretación.'],
        matrix: ['Matriz y estadísticas', 'Organiza categorías y fuentes para volver a la evidencia. Puede apoyar comparaciones por fuente en estudios de caso o Framework Analysis; una tabla de recuentos no sustituye la matriz de síntesis interpretativa.', 'Ejemplo ficticio: dos fuentes comparten “participación”. Revisa los fragmentos y escribe una síntesis: podrían describir experiencias opuestas.']
    };
    const el = id => document.getElementById(id);
    function node(tag, text, className) { const n = document.createElement(tag); if (text) n.textContent = text; if (className) n.className = className; return n; }
    function button(text, action) { const b = node('button', text, 'btn btn-secondary'); b.type = 'button'; b.onclick = action; return b; }
    function guidance(key) {
        const target = el('web-method-guidance'); target.replaceChildren();
        const approach = global.MethodologyGuide.approaches[key];
        const webScope = {
            mixed: ['Un diseño mixto requiere integrar explícitamente componentes cualitativos y cuantitativos. Las comparaciones de esta edición pueden apoyar la exploración del componente cualitativo.', 'Los recuentos de codificaciones no constituyen por sí solos un diseño mixto. Esta edición no incluye Joint Displays ni integración con una base cuantitativa independiente.'],
            visual: ['El análisis visual interpreta imágenes atendiendo a su producción, contexto y recepción. Aquí puedes organizar descripciones textuales y notas sobre esas fuentes.', 'Esta edición web no ofrece codificación de regiones de imágenes. Sus gráficas de texto no realizan una interpretación visual.'],
            'narrative-discourse': ['Las tradiciones narrativas y discursivas requieren interpretar relatos, secuencias y usos situados del lenguaje. Prioriza la lectura de la fuente completa y los memos.', 'Estas gráficas organizan codificaciones; no analizan automáticamente la estructura narrativa ni las posiciones discursivas.']
        };
        const [rationale, caution] = webScope[key] || [approach.rationale, approach.caution];
        target.append(node('p', rationale), node('p', caution));
        const suggested = ['content-analysis', 'mixed'].includes(key) ? 'bars' : ['framework-analysis', 'case-study'].includes(key) ? 'matrix' : ['narrative-discourse', 'visual'].includes(key) ? 'quality' : 'network';
        target.append(node('p', `Sugerencia de apoyo en esta edición: ${help[suggested][0]}. El enfoque orienta la lectura; no habilita ni bloquea funciones.`));
        for (const ref of approach.refs) { const source = global.MethodologyGuide.references[ref]; const a = node('a', source.title); a.href = source.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; target.append(a, node('br')); }
    }
    function openProfile() {
        const p = api.project().methodologyProfile;
        for (const field of ['approach', 'customApproach', 'purpose', 'researchQuestions', 'unitOfAnalysis']) el(`web-method-${field}`).value = p[field] || '';
        guidance(p.approach); el('web-method-modal').style.display = 'flex';
    }
    function sync() {
        if (!api) return;
        const p = api.project().methodologyProfile;
        if (profileRef !== p) { profileRef = p; deferred = false; }
        const keys = Object.keys(global.MethodologyGuide.approaches);
        const label = p.approach === 'other' ? p.customApproach : global.MethodologyGuide.approaches[p.approach].label;
        el('web-method-badge').textContent = `Perfil: ${label}`;
        el('web-method-badge').style.backgroundColor = colors[keys.indexOf(p.approach)] || colors[0];
        el('web-method-invite').hidden = deferred || p.approach !== 'unspecified';
    }
    function onTab(id) {
        if (!api) return;
        const graphical = id === 'tab-network';
        if (graphical) document.documentElement.dataset.webStep = 'results';
        else if (document.documentElement.dataset.webStep === 'results') document.documentElement.dataset.webStep = 'coding';
        if (id === 'tab-search') document.documentElement.dataset.webReview = 'open';
        syncSteps();
        el('app-workspace').hidden = graphical; el('web-graphics').hidden = !graphical;
        el('web-tab-corpus').setAttribute('aria-pressed', String(!graphical)); el('web-tab-graphics').setAttribute('aria-pressed', String(graphical));
        if (!graphical) maximize(false);
        else requestAnimationFrame(api.refreshCharts);
    }
    function maximize(value) { el('web-graphics').classList.toggle('web-maximized', value); el('web-maximize').textContent = value ? 'Restaurar' : 'Maximizar'; el('web-maximize').setAttribute('aria-pressed', String(value)); requestAnimationFrame(api.refreshCharts); }
    function syncSteps() {
        const step = document.documentElement.dataset.webStep;
        document.querySelectorAll('[data-web-step-button]').forEach(control => {
            if (control.dataset.webStepButton === step) control.setAttribute('aria-current', 'step');
            else control.removeAttribute('aria-current');
        });
        const hint = el('web-step-hint');
        if (hint) hint.textContent = { sources: 'Importá TXT, DOCX o PDF y seleccioná una fuente para leerla.', coding: 'Seleccioná un pasaje y asigná una categoría. Abrí pasajes y notas cuando los necesites.', results: 'Explorá las gráficas y volvé a la evidencia antes de interpretar.' }[step];
    }
    function mountViewSelector(nav) {
        const storageKey = `ACUY_WEB_VIEW_V1:${location.pathname}`;
        const picker = node('div', '', 'web-view-picker web-view-picker-inline');
        picker.setAttribute('role', 'group'); picker.setAttribute('aria-label', 'Vista de la interfaz');
        for (const [value, label] of [['simple', 'Vista simplificada'], ['complete', 'Vista completa']]) {
            const control = button(label, () => {}); control.dataset.webView = value; picker.append(control);
        }
        const status = node('span', '', 'web-view-status'); status.setAttribute('role', 'status');
        picker.append(status); nav.append(picker);
        document.documentElement.dataset.webStep = 'sources';
        document.documentElement.dataset.webReview = 'closed';
        const steps = node('nav', '', 'web-simple-steps'); steps.setAttribute('aria-label', 'Recorrido simplificado');
        for (const [value, label] of [['sources', '1. Fuentes'], ['coding', '2. Codificación'], ['results', '3. Resultados']]) {
            const control = button(label, () => {
                document.documentElement.dataset.webStep = value;
                api.switchTab(value === 'results' ? 'tab-network' : 'tab-decoder');
            });
            control.dataset.webStepButton = value; steps.append(control);
        }
        const review = button('Ver pasajes y notas', () => {
            const open = document.documentElement.dataset.webReview !== 'open';
            document.documentElement.dataset.webReview = open ? 'open' : 'closed';
            review.setAttribute('aria-expanded', String(open)); review.textContent = open ? 'Cerrar pasajes y notas' : 'Ver pasajes y notas';
            if (open) { document.documentElement.dataset.webStep = 'coding'; api.switchTab('tab-decoder'); }
        });
        review.id = 'web-review-toggle'; review.setAttribute('aria-expanded', 'false'); review.setAttribute('aria-controls', 'pane-analysis');
        const hint = node('span', '', 'web-step-hint'); hint.id = 'web-step-hint'; steps.append(review, hint); nav.after(steps);
        el('document-list').closest('.sidebar-section').classList.add('web-sources-section');
        el('btn-add-category').closest('.sidebar-section').classList.add('web-categories-section');
        const more = node('details', '', 'web-more-tools'); more.id = 'web-more-tools';
        more.append(node('summary', 'Más herramientas'));
        const content = node('div', '', 'web-more-tools-content'); more.append(content);
        for (const id of ['btn-load-sample', 'btn-open-corpus-exclusion', 'btn-cite-software', 'btn-open-credits']) {
            const control = el(id); if (control) content.append(control);
        }
        document.querySelector('.header-actions').append(more);
        const graphOptions = node('details', '', 'web-more-tools'); graphOptions.id = 'web-graph-options';
        graphOptions.append(node('summary', 'Más herramientas de presentación de la gráfica'));
        const toolbar = el('graph-toolbar-container'); toolbar.before(graphOptions); graphOptions.append(toolbar);
        function setView(value, persist) {
            const complete = value === 'complete';
            document.documentElement.dataset.webView = complete ? 'complete' : 'simple';
            document.querySelectorAll('button[data-web-view]').forEach(control => control.setAttribute('aria-pressed', String(control.dataset.webView === value)));
            more.open = complete; graphOptions.open = complete;
            status.textContent = complete ? 'Todas las opciones de esta edición desplegadas' : 'Opciones adicionales en Más herramientas';
            if (persist) {
                try { localStorage.setItem(storageKey, value); }
                catch { status.textContent += ' · Preferencia aplicada solo en esta sesión'; }
            }
            if (!el('web-graphics').hidden) requestAnimationFrame(api.refreshCharts);
        }
        document.querySelectorAll('button[data-web-view]').forEach(control => control.addEventListener('click', () => setView(control.dataset.webView, true)));
        let saved;
        try { saved = localStorage.getItem(storageKey); } catch { /* Session-only preference. */ }
        setView(saved === 'complete' ? 'complete' : 'simple', false);
    }
    function mount(bridge) {
        api = bridge;
        const badge = button('Perfil metodológico', openProfile); badge.id = 'web-method-badge'; document.querySelector('.brand-text').append(badge);
        const corpus = el('app-workspace');
        const invitation = node('section', '', 'web-method-invite'); invitation.id = 'web-method-invite';
        invitation.append(node('strong', 'Antes de analizar: define tu orientación metodológica'), node('p', 'Registra el enfoque y tus preguntas para acompañar la navegación. Puedes revisarlos después; las herramientas siguen disponibles.'), button('Configurar perfil', openProfile), button('Más adelante', () => { deferred = true; sync(); }));
        corpus.before(invitation);
        const nav = node('nav', '', 'web-workspace-nav'); nav.setAttribute('aria-label', 'Espacios de análisis');
        const c = button('Análisis del corpus', () => api.switchTab('tab-decoder')); c.id = 'web-tab-corpus';
        const g = button('Exploración gráfica', () => api.switchTab('tab-network')); g.id = 'web-tab-graphics'; nav.append(c, g); corpus.before(nav);
        const graphics = node('section', '', 'web-graphics'); graphics.id = 'web-graphics'; graphics.hidden = true;
        const toolbar = node('div', '', 'web-graphics-toolbar'); const max = button('Maximizar', () => maximize(!graphics.classList.contains('web-maximized'))); max.id = 'web-maximize';
        toolbar.append(node('h2', 'Gráficas, matrices y evidencia'), button('Perfil metodológico', openProfile), button('Matriz y estadísticas', () => el('btn-open-matrix').click()), max);
        graphics.append(toolbar, el('tab-network')); corpus.after(graphics);
        const oldTab = document.querySelector('.tab-btn[data-tab="tab-network"]'); if (oldTab) oldTab.hidden = true;
        const guide = node('details', '', 'web-tool-guide'); guide.open = true; guide.append(node('summary', 'Para qué sirve y cómo interpretar esta herramienta'));
        const explanation = node('div'); guide.append(explanation); el('tab-network').prepend(guide);
        function showHelp(key) { explanation.replaceChildren(node('h3', help[key][0]), node('p', help[key][1]), node('p', help[key][2])); }
        for (const key of ['network', 'heatmap', 'bars', 'quality']) el(`chart-type-${key}`).addEventListener('click', () => showHelp(key));
        showHelp('network');
        const matrixHelp = node('details', '', 'web-tool-guide'); matrixHelp.append(node('summary', 'Utilidad y ejemplo de la matriz'), node('p', help.matrix[1]), node('p', help.matrix[2])); toolbar.after(matrixHelp);
        const modal = node('div', '', 'modal-backdrop'); modal.id = 'web-method-modal'; modal.style.display = 'none';
        const card = node('div', '', 'modal-card web-profile-card'); card.append(node('h2', 'Perfil metodológico'));
        const form = node('form');
        for (const [field, label] of [['approach', 'Enfoque'], ['customApproach', 'Nombre del otro enfoque'], ['purpose', 'Propósito'], ['researchQuestions', 'Preguntas de investigación'], ['unitOfAnalysis', 'Unidad de análisis']]) {
            const l = node('label', label); const input = node(field === 'approach' ? 'select' : 'textarea'); input.id = `web-method-${field}`;
            if (field === 'approach') { for (const [key, value] of Object.entries(global.MethodologyGuide.approaches)) { const option = node('option', value.label); option.value = key; input.append(option); } input.onchange = () => guidance(input.value); }
            else input.maxLength = field === 'customApproach' ? 256 : field === 'unitOfAnalysis' ? 4096 : field === 'purpose' ? 16384 : 65536;
            l.append(input); form.append(l);
        }
        const info = node('div'); info.id = 'web-method-guidance'; form.append(info);
        const submit = button('Guardar perfil', () => {}); submit.type = 'submit';
        const close = button('Cerrar', () => { modal.style.display = 'none'; }); close.classList.add('modal-close'); form.append(submit, close);
        form.onsubmit = event => { event.preventDefault(); try { const next = { ...api.project().methodologyProfile, updatedAt: Date.now() }; for (const f of ['approach', 'customApproach', 'purpose', 'researchQuestions', 'unitOfAnalysis']) next[f] = el(`web-method-${f}`).value; if (api.saveProfile(next)) { sync(); modal.style.display = 'none'; } } catch (error) { alert(error.message); } };
        card.append(form); modal.append(card); document.body.append(modal);
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && graphics.classList.contains('web-maximized')) { maximize(false); max.focus(); } });
        mountViewSelector(nav);
        sync(); onTab('tab-decoder');
    }
    global.WebExperience = { mount, sync, onTab, showCorpus() { if (api && !el('web-graphics').hidden) api.switchTab('tab-decoder'); } };
})(window);
