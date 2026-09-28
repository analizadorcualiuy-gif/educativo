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
        target.append(node('p', approach.rationale), node('p', approach.caution));
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
        el('app-workspace').hidden = graphical; el('web-graphics').hidden = !graphical;
        el('web-tab-corpus').setAttribute('aria-pressed', String(!graphical)); el('web-tab-graphics').setAttribute('aria-pressed', String(graphical));
        if (!graphical) maximize(false);
        else requestAnimationFrame(api.refreshCharts);
    }
    function maximize(value) { el('web-graphics').classList.toggle('web-maximized', value); el('web-maximize').textContent = value ? 'Restaurar' : 'Maximizar'; el('web-maximize').setAttribute('aria-pressed', String(value)); requestAnimationFrame(api.refreshCharts); }
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
        sync(); onTab('tab-decoder');
    }
    global.WebExperience = { mount, sync, onTab, showCorpus() { if (api && !el('web-graphics').hidden) api.switchTab('tab-decoder'); } };
})(window);
