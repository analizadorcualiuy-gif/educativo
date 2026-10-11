/* Local text-to-speech reader. It never mutates corpus or project state. */
(function (global) {
    'use strict';

    const document = global.document;
    const preferenceKey = 'ACUY_CORPUS_READER_V1';
    const maximumPassageLength = 1200;
    let bridge = {};
    let initialized = false;
    let activeDocument = null;
    let passages = [];
    let currentIndex = -1;
    let playbackState = 'idle';
    let runToken = 0;
    let voices = [];
    let preferences = loadPreferences();

    function sanitizeRate(value) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(0.6, Math.min(1.8, Math.round(number * 10) / 10)) : 1;
    }

    function loadPreferences() {
        try {
            const stored = JSON.parse(global.localStorage.getItem(preferenceKey) || '{}');
            return { rate: sanitizeRate(stored.rate), voiceURI: typeof stored.voiceURI === 'string' ? stored.voiceURI : '' };
        } catch (_) {
            return { rate: 1, voiceURI: '' };
        }
    }

    function persistPreferences() {
        try { global.localStorage.setItem(preferenceKey, JSON.stringify(preferences)); } catch (_) { /* Optional local preference. */ }
    }

    function splitLongRange(text, start, end, paragraphIndex, limit) {
        const results = [];
        let cursor = start;
        while (cursor < end) {
            while (cursor < end && /\s/.test(text[cursor])) cursor++;
            if (cursor >= end) break;
            let cut = Math.min(end, cursor + limit);
            if (cut < end) {
                const floor = cursor + Math.floor(limit * 0.45);
                const candidate = text.slice(floor, cut);
                const sentenceMatches = [...candidate.matchAll(/[.!?…][\s]+/g)];
                if (sentenceMatches.length) cut = floor + sentenceMatches[sentenceMatches.length - 1].index + sentenceMatches[sentenceMatches.length - 1][0].length;
                else {
                    const whitespace = text.slice(floor, cut).search(/\s+\S*$/);
                    if (whitespace >= 0) cut = floor + whitespace;
                }
            }
            let trimmedEnd = cut;
            while (trimmedEnd > cursor && /\s/.test(text[trimmedEnd - 1])) trimmedEnd--;
            if (trimmedEnd <= cursor) trimmedEnd = Math.min(end, cursor + limit);
            results.push({ start: cursor, end: trimmedEnd, text: text.slice(cursor, trimmedEnd), paragraphIndex });
            cursor = Math.max(cut, trimmedEnd);
        }
        return results;
    }

    function splitPassages(value, limit = maximumPassageLength) {
        const text = String(value || '');
        const safeLimit = Math.max(200, Number(limit) || maximumPassageLength);
        const results = [];
        let cursor = 0;
        let paragraphIndex = 0;
        while (cursor < text.length) {
            while (cursor < text.length && /\s/.test(text[cursor])) cursor++;
            if (cursor >= text.length) break;
            const rest = text.slice(cursor);
            const separator = /\r?\n[\t ]*\r?\n/.exec(rest);
            const rawEnd = separator ? cursor + separator.index : text.length;
            let end = rawEnd;
            while (end > cursor && /\s/.test(text[end - 1])) end--;
            if (end > cursor) results.push(...splitLongRange(text, cursor, end, paragraphIndex++, safeLimit));
            cursor = separator ? cursor + separator.index + separator[0].length : text.length;
        }
        return results.map((passage, index) => ({ ...passage, index }));
    }

    function localVoices(allVoices) {
        return Array.from(allVoices || []).filter(voice => voice && voice.localService === true);
    }

    function chooseLocalVoice(allVoices, preferredURI = '', language = 'es-UY') {
        const available = localVoices(allVoices);
        if (!available.length) return null;
        return available.find(voice => voice.voiceURI === preferredURI)
            || available.find(voice => String(voice.lang).toLowerCase() === String(language).toLowerCase())
            || available.find(voice => String(voice.lang).toLowerCase().startsWith('es-'))
            || available.find(voice => voice.default)
            || available[0];
    }

    function selectedVoice() {
        return chooseLocalVoice(voices, preferences.voiceURI, document?.documentElement?.lang || 'es-UY');
    }

    function statusElement() { return document?.getElementById('corpus-reader-status'); }
    function setStatus(message, tone = '') {
        const element = statusElement();
        if (!element) return;
        element.textContent = message;
        element.dataset.tone = tone;
    }

    function updateControls() {
        if (!document) return;
        const hasDocument = !!activeDocument && passages.length > 0;
        const hasVoice = !!selectedVoice();
        const play = document.getElementById('btn-corpus-read-play');
        const pause = document.getElementById('btn-corpus-read-pause');
        const stop = document.getElementById('btn-corpus-read-stop');
        const previous = document.getElementById('btn-corpus-read-previous');
        const next = document.getElementById('btn-corpus-read-next');
        if (play) {
            play.disabled = !hasDocument || !hasVoice;
            play.textContent = playbackState === 'paused' ? '▶ Continuar' : playbackState === 'speaking' ? '🔊 Leyendo' : '▶ Leer';
            play.setAttribute('aria-pressed', String(playbackState === 'speaking'));
        }
        if (pause) pause.disabled = playbackState !== 'speaking';
        if (stop) stop.disabled = playbackState === 'idle';
        if (previous) previous.disabled = !hasDocument || currentIndex <= 0;
        if (next) next.disabled = !hasDocument || currentIndex >= passages.length - 1;
        const position = document.getElementById('corpus-reader-position');
        if (position) position.textContent = currentIndex >= 0 && passages.length ? `${currentIndex + 1}/${passages.length}` : `0/${passages.length}`;
    }

    function refreshVoiceOptions() {
        const synth = global.speechSynthesis;
        voices = localVoices(synth?.getVoices?.() || []);
        const select = document?.getElementById('corpus-reader-voice');
        if (select) {
            select.innerHTML = '';
            if (!voices.length) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Sin voces locales disponibles';
                select.appendChild(option);
                select.disabled = true;
            } else {
                voices.forEach(voice => {
                    const option = document.createElement('option');
                    option.value = voice.voiceURI;
                    option.textContent = `${voice.name} (${voice.lang})`;
                    select.appendChild(option);
                });
                const voice = selectedVoice();
                select.value = voice?.voiceURI || voices[0].voiceURI;
                select.disabled = false;
                if (!preferences.voiceURI && voice) preferences.voiceURI = voice.voiceURI;
            }
        }
        if (!global.speechSynthesis || !global.SpeechSynthesisUtterance) setStatus('La lectura en voz alta no está disponible en este entorno.', 'error');
        else if (!voices.length) setStatus('No se detectó una voz instalada en el equipo. Instala una voz local para usar el lector.', 'warning');
        else if (!activeDocument) setStatus('Selecciona un documento de texto para comenzar.');
        else if (playbackState === 'idle') setStatus('Listo para leer con una voz instalada en este equipo.');
        updateControls();
    }

    function clearHighlight() { bridge.clearRange?.(); }
    function refreshHighlight() {
        if (currentIndex < 0 || !passages[currentIndex] || playbackState === 'idle') return clearHighlight();
        const passage = passages[currentIndex];
        bridge.revealRange?.(passage.start, passage.end);
    }

    function stop(announce = true) {
        runToken++;
        try { global.speechSynthesis?.cancel?.(); } catch (_) { /* No active engine. */ }
        playbackState = 'idle';
        currentIndex = -1;
        clearHighlight();
        if (announce) setStatus(activeDocument ? 'Lectura detenida.' : 'Selecciona un documento de texto para comenzar.');
        updateControls();
    }

    function syncDocument() {
        const candidate = bridge.getDocument?.();
        const next = candidate && typeof candidate.text === 'string' && candidate.id != null
            ? { id: String(candidate.id), title: String(candidate.title || 'Documento'), text: candidate.text }
            : null;
        const changed = (!next && activeDocument) || (next && (!activeDocument || next.id !== activeDocument.id || next.text !== activeDocument.text));
        if (changed) stop(false);
        activeDocument = next;
        passages = next ? splitPassages(next.text) : [];
        if (!next) setStatus('Selecciona un documento de texto para comenzar.');
        else if (!passages.length) setStatus('El documento activo no contiene texto legible.', 'warning');
        else if (voices.length && playbackState === 'idle') setStatus('Listo para leer con una voz instalada en este equipo.');
        refreshHighlight();
        updateControls();
        return !!next;
    }

    function indexForOffset(offset) {
        const safeOffset = Math.max(0, Number(offset) || 0);
        const containing = passages.findIndex(passage => safeOffset >= passage.start && safeOffset < passage.end);
        if (containing >= 0) return containing;
        const following = passages.findIndex(passage => passage.start >= safeOffset);
        return following >= 0 ? following : Math.max(0, passages.length - 1);
    }

    function speak(index) {
        syncDocument();
        const voice = selectedVoice();
        if (!activeDocument || !passages.length) return false;
        if (!voice || !global.speechSynthesis || !global.SpeechSynthesisUtterance) {
            refreshVoiceOptions();
            return false;
        }
        const nextIndex = Math.max(0, Math.min(passages.length - 1, Number(index) || 0));
        const passage = passages[nextIndex];
        const token = ++runToken;
        try { global.speechSynthesis.cancel(); } catch (_) { /* Continue with a fresh utterance. */ }
        const utterance = new global.SpeechSynthesisUtterance(passage.text);
        utterance.voice = voice;
        utterance.lang = voice.lang || 'es-UY';
        utterance.rate = preferences.rate;
        utterance.onstart = () => {
            if (token !== runToken) return;
            playbackState = 'speaking';
            currentIndex = nextIndex;
            setStatus(`Leyendo ${activeDocument.title}: pasaje ${currentIndex + 1} de ${passages.length}.`);
            refreshHighlight();
            updateControls();
        };
        utterance.onend = () => {
            if (token !== runToken) return;
            if (nextIndex < passages.length - 1) speak(nextIndex + 1);
            else {
                playbackState = 'idle';
                clearHighlight();
                setStatus('Lectura completa.');
                updateControls();
            }
        };
        utterance.onerror = event => {
            if (token !== runToken || event?.error === 'canceled' || event?.error === 'interrupted') return;
            playbackState = 'idle';
            clearHighlight();
            setStatus('No se pudo continuar la lectura con la voz seleccionada.', 'error');
            updateControls();
        };
        playbackState = 'speaking';
        currentIndex = nextIndex;
        refreshHighlight();
        updateControls();
        global.speechSynthesis.speak(utterance);
        return true;
    }

    function play() {
        syncDocument();
        if (playbackState === 'paused') {
            try { global.speechSynthesis.resume(); } catch (_) { return false; }
            playbackState = 'speaking';
            setStatus(`Continuando ${activeDocument.title}.`);
            updateControls();
            return true;
        }
        if (playbackState === 'speaking') return true;
        const offset = bridge.getStartOffset?.() ?? 0;
        return speak(indexForOffset(offset));
    }

    function pause() {
        if (playbackState !== 'speaking') return false;
        try { global.speechSynthesis.pause(); } catch (_) { return false; }
        playbackState = 'paused';
        setStatus('Lectura en pausa.');
        updateControls();
        return true;
    }

    function move(delta) {
        syncDocument();
        if (!passages.length) return false;
        const base = currentIndex < 0 ? indexForOffset(bridge.getStartOffset?.() ?? 0) : currentIndex;
        return speak(Math.max(0, Math.min(passages.length - 1, base + delta)));
    }

    function init(options = {}) {
        bridge = { ...bridge, ...options };
        if (!document) return false;
        syncDocument();
        refreshVoiceOptions();
        if (initialized) return true;
        initialized = true;
        document.getElementById('btn-corpus-read-play')?.addEventListener('click', play);
        document.getElementById('btn-corpus-read-pause')?.addEventListener('click', pause);
        document.getElementById('btn-corpus-read-stop')?.addEventListener('click', () => stop());
        document.getElementById('btn-corpus-read-previous')?.addEventListener('click', () => move(-1));
        document.getElementById('btn-corpus-read-next')?.addEventListener('click', () => move(1));
        document.getElementById('corpus-reader-voice')?.addEventListener('change', event => {
            preferences.voiceURI = event.target.value;
            persistPreferences();
            if (playbackState !== 'idle' && currentIndex >= 0) speak(currentIndex);
        });
        const rate = document.getElementById('corpus-reader-rate');
        const rateValue = document.getElementById('corpus-reader-rate-value');
        if (rate) {
            rate.value = String(preferences.rate);
            if (rateValue) rateValue.textContent = `${preferences.rate.toFixed(1)}×`;
            rate.addEventListener('input', event => {
                preferences.rate = sanitizeRate(event.target.value);
                if (rateValue) rateValue.textContent = `${preferences.rate.toFixed(1)}×`;
                persistPreferences();
            });
            rate.addEventListener('change', () => {
                if (playbackState !== 'idle' && currentIndex >= 0) speak(currentIndex);
            });
        }
        const optionsButton = document.getElementById('btn-corpus-reader-options');
        const optionsPanel = document.getElementById('corpus-reader-options');
        optionsButton?.addEventListener('click', () => {
            const expanded = optionsButton.getAttribute('aria-expanded') === 'true';
            optionsButton.setAttribute('aria-expanded', String(!expanded));
            if (optionsPanel) optionsPanel.hidden = expanded;
        });
        if (global.speechSynthesis) global.speechSynthesis.addEventListener?.('voiceschanged', refreshVoiceOptions);
        global.addEventListener?.('beforeunload', () => stop(false));
        return true;
    }

    global.CorpusReader = Object.freeze({
        init,
        syncDocument,
        refreshHighlight,
        play,
        pause,
        stop,
        next: () => move(1),
        previous: () => move(-1),
        splitPassages,
        localVoices,
        chooseLocalVoice,
        sanitizeRate,
        getState: () => ({ activeDocumentId: activeDocument?.id || null, passages: passages.length, currentIndex, playbackState }),
        preferenceKey
    });
})(typeof window !== 'undefined' ? window : globalThis);
