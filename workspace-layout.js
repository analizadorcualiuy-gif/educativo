/* Local workspace presentation only: never reads or writes project data. */
(function (global) {
    'use strict';

    const document = global.document;
    if (!document) return;
    const root = document.documentElement;
    const preferenceKey = 'ACUY_WORKSPACE_LAYOUT_V1';
    const defaults = Object.freeze({
        sidebarWidth: 280,
        analysisWidth: 360,
        sidebarSplit: 50,
        ribbonCollapsed: false,
        leftCollapsed: false,
        rightCollapsed: false,
        focusMode: false
    });
    let state = loadPreference();
    let initialized = false;
    let onResize = null;

    function clamp(value, minimum, maximum, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
    }

    function sanitizeState(value = {}) {
        const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        return {
            sidebarWidth: Math.round(clamp(source.sidebarWidth, 180, 500, defaults.sidebarWidth)),
            analysisWidth: Math.round(clamp(source.analysisWidth, 220, 600, defaults.analysisWidth)),
            sidebarSplit: Math.round(clamp(source.sidebarSplit, 20, 80, defaults.sidebarSplit)),
            ribbonCollapsed: source.ribbonCollapsed === true,
            leftCollapsed: source.leftCollapsed === true,
            rightCollapsed: source.rightCollapsed === true,
            focusMode: source.focusMode === true
        };
    }

    function loadPreference() {
        try {
            const stored = global.localStorage.getItem(preferenceKey);
            return stored ? sanitizeState(JSON.parse(stored)) : { ...defaults };
        } catch (_) {
            return { ...defaults };
        }
    }

    function persist() {
        try { global.localStorage.setItem(preferenceKey, JSON.stringify(state)); } catch (_) { /* Session state still works. */ }
    }

    function setButton(id, expanded, expandedLabel, collapsedLabel) {
        const button = document.getElementById(id);
        if (!button) return;
        button.setAttribute('aria-expanded', String(expanded));
        button.setAttribute('aria-pressed', String(!expanded));
        button.textContent = expanded ? expandedLabel : collapsedLabel;
    }

    function refresh({ notify = false } = {}) {
        root.style.setProperty('--acuy-sidebar-width', `${state.sidebarWidth}px`);
        root.style.setProperty('--acuy-analysis-width', `${state.analysisWidth}px`);
        root.style.setProperty('--acuy-sidebar-split', `${state.sidebarSplit}%`);
        root.dataset.ribbonState = state.ribbonCollapsed ? 'collapsed' : 'expanded';
        root.dataset.leftPanel = state.leftCollapsed ? 'closed' : 'open';
        root.dataset.rightPanel = state.rightCollapsed ? 'closed' : 'open';
        root.dataset.workspaceFocus = state.focusMode ? 'on' : 'off';

        setButton('btn-toggle-ribbon', !state.ribbonCollapsed, 'Ocultar cinta', 'Mostrar cinta');
        setButton('btn-toggle-left-panel', !state.leftCollapsed, 'Ocultar fuentes', 'Mostrar fuentes');
        setButton('btn-toggle-right-panel', !state.rightCollapsed, 'Ocultar análisis', 'Mostrar análisis');
        const focus = document.getElementById('btn-toggle-focus-mode');
        if (focus) {
            focus.setAttribute('aria-pressed', String(state.focusMode));
            focus.textContent = state.focusMode ? 'Salir de enfoque' : 'Modo enfoque';
        }
        const divider = document.getElementById('basic-sidebar-divider');
        if (divider) divider.setAttribute('aria-valuenow', String(state.sidebarSplit));
        if (notify && typeof onResize === 'function') onResize({ ...state });
    }

    function update(patch, { save = true, notify = true } = {}) {
        state = sanitizeState({ ...state, ...patch });
        refresh({ notify });
        if (save) persist();
        return { ...state };
    }

    function toggleRibbon() { return update({ ribbonCollapsed: !state.ribbonCollapsed }); }
    function togglePanel(side) {
        if (side === 'left') return update({ leftCollapsed: !state.leftCollapsed });
        if (side === 'right') return update({ rightCollapsed: !state.rightCollapsed });
        return { ...state };
    }
    function toggleFocus() { return update({ focusMode: !state.focusMode }); }
    function reset() { return update({ ...defaults }); }

    function bindHorizontalResizer(id, side) {
        const resizer = document.getElementById(id);
        const workspace = document.getElementById('app-workspace');
        if (!resizer || !workspace) return;
        let dragging = false;
        resizer.addEventListener('mousedown', event => {
            if (event.button !== 0) return;
            dragging = true;
            resizer.classList.add('dragging');
            root.dataset.workspaceResizing = 'horizontal';
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            event.preventDefault();
        });
        document.addEventListener('mousemove', event => {
            if (!dragging) return;
            const bounds = workspace.getBoundingClientRect();
            const width = side === 'left' ? event.clientX - bounds.left : bounds.right - event.clientX;
            update(side === 'left' ? { sidebarWidth: width } : { analysisWidth: width }, { save: false, notify: false });
        });
        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            resizer.classList.remove('dragging');
            delete root.dataset.workspaceResizing;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            persist();
            if (typeof onResize === 'function') onResize({ ...state });
        });
    }

    function bindSidebarDivider() {
        const divider = document.getElementById('basic-sidebar-divider');
        const sidebar = document.getElementById('pane-sidebar');
        if (!divider || !sidebar) return;
        let dragging = false;
        divider.addEventListener('mousedown', event => {
            if (event.button !== 0) return;
            dragging = true;
            divider.classList.add('dragging');
            root.dataset.workspaceResizing = 'vertical';
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
            event.preventDefault();
        });
        document.addEventListener('mousemove', event => {
            if (!dragging) return;
            const bounds = sidebar.getBoundingClientRect();
            const percentage = bounds.height ? ((event.clientY - bounds.top) / bounds.height) * 100 : defaults.sidebarSplit;
            update({ sidebarSplit: percentage }, { save: false, notify: false });
        });
        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            divider.classList.remove('dragging');
            delete root.dataset.workspaceResizing;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            persist();
        });
        divider.addEventListener('keydown', event => {
            if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 20 : event.key === 'End' ? 80
                : state.sidebarSplit + (event.key === 'ArrowDown' ? 5 : -5);
            update({ sidebarSplit: next });
        });
    }

    function init(options = {}) {
        if (typeof options.onResize === 'function') onResize = options.onResize;
        refresh();
        if (initialized) return;
        initialized = true;
        document.getElementById('btn-toggle-ribbon')?.addEventListener('click', toggleRibbon);
        document.getElementById('btn-toggle-left-panel')?.addEventListener('click', () => togglePanel('left'));
        document.getElementById('btn-toggle-right-panel')?.addEventListener('click', () => togglePanel('right'));
        document.getElementById('btn-toggle-focus-mode')?.addEventListener('click', toggleFocus);
        document.getElementById('btn-reset-workspace-layout')?.addEventListener('click', reset);
        document.addEventListener('keydown', event => {
            if (event.ctrlKey && event.key === 'F1') {
                event.preventDefault();
                toggleRibbon();
            } else if (event.key === 'Escape' && state.focusMode) {
                toggleFocus();
                document.getElementById('btn-toggle-focus-mode')?.focus();
            }
        });
        bindHorizontalResizer('resizer-left', 'left');
        bindHorizontalResizer('resizer-right', 'right');
        bindSidebarDivider();
    }

    global.WorkspaceLayout = Object.freeze({
        init,
        getState: () => ({ ...state }),
        toggleRibbon,
        togglePanel,
        toggleFocus,
        reset,
        sanitizeState,
        preferenceKey
    });
    refresh();
})(typeof window !== 'undefined' ? window : globalThis);
