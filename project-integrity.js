/* Shared project-integrity primitives. Browser and Node compatible. */
(function (global) {
    'use strict';

    const DEFAULT_MAX_DEPTH = 2;
    const PROJECT_FORMAT = 'AnalizadorCualiUY.Project';
    const CURRENT_SCHEMA_VERSION = 1;

    function validateProjectMetadata(project) {
        if (!project || typeof project !== 'object' || Array.isArray(project)) {
            throw new Error('El proyecto debe ser un objeto JSON.');
        }
        if (project.schemaVersion == null && project.format == null) {
            return { schemaVersion: 0, legacy: true, edition: null, createdWith: null };
        }
        if (project.format !== PROJECT_FORMAT) throw new Error('El archivo no pertenece al formato de proyecto AnalizadorCualiUY.');
        if (!Number.isSafeInteger(project.schemaVersion) || project.schemaVersion < 1) {
            throw new Error('La versión del esquema de proyecto es inválida.');
        }
        if (project.schemaVersion > CURRENT_SCHEMA_VERSION) {
            throw new Error(`El proyecto usa el esquema ${project.schemaVersion}, posterior al máximo compatible ${CURRENT_SCHEMA_VERSION}.`);
        }
        if (!['beta', 'pro'].includes(project.edition)) throw new Error('La edición creadora del proyecto es inválida.');
        return {
            schemaVersion: project.schemaVersion,
            legacy: false,
            edition: project.edition,
            createdWith: typeof project.createdWith === 'string' ? project.createdWith : null
        };
    }

    function createProjectEnvelope(project, edition, createdWith) {
        if (!['beta', 'pro'].includes(edition)) throw new Error('La edición del proyecto es inválida.');
        return Object.assign({
            format: PROJECT_FORMAT,
            schemaVersion: CURRENT_SCHEMA_VERSION,
            edition,
            createdWith: String(createdWith || '')
        }, project || {});
    }

    function categoryMap(categories) {
        return new Map((categories || []).map(category => [category.id, category]));
    }

    function validateHierarchy(categories, maxDepth = DEFAULT_MAX_DEPTH) {
        const items = categories || [];
        const byId = categoryMap(items);
        const visiting = new Set();
        const visited = new Set();
        const depths = new Map();

        function visit(category) {
            if (visited.has(category.id)) return depths.get(category.id);
            if (visiting.has(category.id)) {
                throw new Error(`La jerarquía contiene un ciclo que incluye la categoría ${category.id}.`);
            }
            visiting.add(category.id);
            let depth = 1;
            if (category.parentId != null) {
                const parent = byId.get(category.parentId);
                if (!parent) throw new Error(`La categoría ${category.id} referencia un padre inexistente.`);
                if (parent.id === category.id) throw new Error(`La categoría ${category.id} no puede ser su propio padre.`);
                depth = visit(parent) + 1;
            }
            if (depth > maxDepth) {
                throw new Error(`La categoría ${category.id} supera la profundidad máxima de ${maxDepth} niveles.`);
            }
            visiting.delete(category.id);
            visited.add(category.id);
            depths.set(category.id, depth);
            return depth;
        }

        items.forEach(visit);
        return depths;
    }

    function descendantCategoryIds(categories, rootId) {
        const children = new Map();
        (categories || []).forEach(category => {
            if (category.parentId == null) return;
            if (!children.has(category.parentId)) children.set(category.parentId, []);
            children.get(category.parentId).push(category.id);
        });
        const result = new Set();
        const pending = [rootId];
        while (pending.length) {
            const id = pending.pop();
            if (result.has(id)) continue;
            result.add(id);
            (children.get(id) || []).forEach(childId => pending.push(childId));
        }
        return result;
    }

    function wouldCreateCycle(categories, categoryId, candidateParentId) {
        if (candidateParentId == null) return false;
        if (categoryId === candidateParentId) return true;
        const byId = categoryMap(categories);
        const visited = new Set();
        let currentId = candidateParentId;
        while (currentId != null && !visited.has(currentId)) {
            if (currentId === categoryId) return true;
            visited.add(currentId);
            const current = byId.get(currentId);
            currentId = current ? current.parentId : null;
        }
        return false;
    }

    function canonicalQuote(document, coding) {
        const content = String(document && document.content || '');
        const start = Number(coding && coding.startChar);
        const end = Number(coding && coding.endChar);
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start || end > content.length) {
            throw new Error(`La codificación ${coding && coding.id || ''} contiene posiciones de texto inválidas.`);
        }
        return content.slice(start, end);
    }

    function buildTextSegments(content, codings) {
        const text = String(content || '');
        const valid = (codings || []).filter(coding => Number.isSafeInteger(coding.startChar)
            && Number.isSafeInteger(coding.endChar)
            && coding.startChar >= 0
            && coding.endChar > coding.startChar
            && coding.endChar <= text.length);
        const boundaries = new Set([0, text.length]);
        valid.forEach(coding => {
            boundaries.add(coding.startChar);
            boundaries.add(coding.endChar);
        });
        const points = [...boundaries].sort((a, b) => a - b);
        const segments = [];
        for (let index = 0; index < points.length - 1; index++) {
            const start = points[index];
            const end = points[index + 1];
            if (end <= start) continue;
            const active = valid
                .filter(coding => coding.startChar < end && coding.endChar > start)
                .sort((a, b) => a.startChar - b.startChar || a.endChar - b.endChar || String(a.id).localeCompare(String(b.id)));
            segments.push({
                start,
                end,
                text: text.slice(start, end),
                codingIds: active.map(coding => coding.id)
            });
        }
        return segments;
    }

    function trimSelectionOffsets(content, start, end) {
        const text = String(content || '');
        let safeStart = Math.max(0, Math.min(Number(start) || 0, text.length));
        let safeEnd = Math.max(safeStart, Math.min(Number(end) || 0, text.length));
        const selected = text.slice(safeStart, safeEnd);
        const leading = (selected.match(/^\s+/) || [''])[0].length;
        const trailing = (selected.match(/\s+$/) || [''])[0].length;
        safeStart += leading;
        safeEnd = Math.max(safeStart, safeEnd - trailing);
        return { start: safeStart, end: safeEnd, text: text.slice(safeStart, safeEnd) };
    }

    function segmentElement(root, node) {
        let element = node && node.nodeType === 1 ? node : node && node.parentElement;
        while (element && element !== root) {
            if (element.dataset && element.dataset.textStart != null && element.dataset.textEnd != null) return element;
            element = element.parentElement;
        }
        return null;
    }

    function nodeTextLength(node) {
        if (!node) return 0;
        if (node.nodeType === 3) return String(node.textContent || '').length;
        if (node.childNodes) return Array.from(node.childNodes).reduce((sum, child) => sum + nodeTextLength(child), 0);
        return String(node.textContent || '').length;
    }

    function offsetWithinSegment(segment, target, offset) {
        if (target === segment && segment.childNodes) {
            return Array.from(segment.childNodes).slice(0, Math.max(0, offset)).reduce((sum, child) => sum + nodeTextLength(child), 0);
        }
        let total = 0;
        let found = false;
        function walk(node) {
            if (!node || found) return;
            if (node === target) {
                if (node.nodeType === 3) total += Math.max(0, offset);
                else if (node.childNodes) total += Array.from(node.childNodes).slice(0, Math.max(0, offset)).reduce((sum, child) => sum + nodeTextLength(child), 0);
                found = true;
                return;
            }
            if (node.nodeType === 3) {
                total += nodeTextLength(node);
                return;
            }
            if (node.childNodes) Array.from(node.childNodes).forEach(walk);
        }
        walk(segment);
        return found ? total : Math.max(0, offset);
    }

    function boundaryOffset(root, container, offset, isEnd) {
        const segment = segmentElement(root, container);
        if (segment) {
            const start = Number(segment.dataset.textStart);
            const end = Number(segment.dataset.textEnd);
            const local = offsetWithinSegment(segment, container, offset);
            return Math.max(start, Math.min(start + local, end));
        }
        if (container === root && root.children) {
            if (offset <= 0) return 0;
            if (offset >= root.children.length) {
                const last = root.children[root.children.length - 1];
                return last && last.dataset ? Number(last.dataset.textEnd) : 0;
            }
            const child = root.children[isEnd ? offset - 1 : offset];
            return Number(child.dataset[isEnd ? 'textEnd' : 'textStart']);
        }
        return null;
    }

    function rangeToOffsets(root, range, content) {
        if (!root || !range) return null;
        const start = boundaryOffset(root, range.startContainer, range.startOffset, false);
        const end = boundaryOffset(root, range.endContainer, range.endOffset, true);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
        return trimSelectionOffsets(content, Math.min(start, end), Math.max(start, end));
    }

    global.ProjectIntegrity = {
        DEFAULT_MAX_DEPTH,
        PROJECT_FORMAT,
        CURRENT_SCHEMA_VERSION,
        validateProjectMetadata,
        createProjectEnvelope,
        validateHierarchy,
        descendantCategoryIds,
        wouldCreateCycle,
        canonicalQuote,
        buildTextSegments,
        trimSelectionOffsets,
        rangeToOffsets
    };
})(typeof window !== 'undefined' ? window : globalThis);
