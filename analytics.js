/* Shared qualitative analytics engine. Browser and Node compatible. */
(function (global) {
    'use strict';

    function countWords(text) {
        const matches = String(text || '').trim().match(/\S+/g);
        return matches ? matches.length : 0;
    }

    function spansFor(text, unit) {
        const value = String(text || '');
        if (unit === 'document') return [{ start: 0, end: value.length, index: 0 }];
        const spans = [];
        if (unit === 'paragraph') {
            const re = /(?:^|\n\s*\n)([\s\S]*?)(?=\n\s*\n|$)/g;
            let match;
            while ((match = re.exec(value))) {
                const raw = match[1] || '';
                const offset = match.index + match[0].indexOf(raw);
                if (raw.trim()) spans.push({ start: offset, end: offset + raw.length, index: spans.length });
                if (match[0].length === 0) re.lastIndex++;
            }
        } else {
            const re = /[^.!?\n]+(?:[.!?]+|(?=\n|$))/g;
            let match;
            while ((match = re.exec(value))) {
                if (match[0].trim()) spans.push({ start: match.index, end: match.index + match[0].length, index: spans.length });
            }
        }
        return spans.length ? spans : [{ start: 0, end: value.length, index: 0 }];
    }

    function codingUnitKeys(coding, document, unit, cache) {
        if (unit === 'document') return [`${coding.docId}:document`];
        if (unit !== 'paragraph' && unit !== 'sentence') return [`${coding.docId}:${coding.id}`];
        const key = `${coding.docId}:${unit}`;
        if (!cache.has(key)) cache.set(key, spansFor(document ? document.content : '', unit));
        const start = Number(coding.startChar) || 0;
        const end = Number(coding.endChar) || start;
        return cache.get(key)
            .filter(span => start < span.end && end > span.start)
            .map(span => `${coding.docId}:${unit}:${span.index}`);
    }

    function intervalGap(a, b) {
        const aStart = Number(a.startChar) || 0;
        const aEnd = Number(a.endChar) || aStart;
        const bStart = Number(b.startChar) || 0;
        const bEnd = Number(b.endChar) || bStart;
        if (aStart < bEnd && bStart < aEnd) return 0;
        return Math.max(0, Math.max(aStart, bStart) - Math.min(aEnd, bEnd));
    }

    function unionLength(intervals) {
        const sorted = intervals
            .map(item => [Math.max(0, Number(item.startChar) || 0), Math.max(0, Number(item.endChar) || 0)])
            .filter(item => item[1] > item[0])
            .sort((a, b) => a[0] - b[0]);
        let total = 0;
        let current = null;
        sorted.forEach(interval => {
            if (!current || interval[0] > current[1]) {
                if (current) total += current[1] - current[0];
                current = interval.slice();
            } else {
                current[1] = Math.max(current[1], interval[1]);
            }
        });
        if (current) total += current[1] - current[0];
        return total;
    }

    function mergedIntervals(intervals) {
        const sorted = intervals
            .filter(interval => interval[1] > interval[0])
            .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const merged = [];
        sorted.forEach(interval => {
            const last = merged[merged.length - 1];
            if (!last || interval[0] > last[1]) merged.push(interval.slice());
            else last[1] = Math.max(last[1], interval[1]);
        });
        return merged;
    }

    function intersectionLength(left, right) {
        let i = 0;
        let j = 0;
        let total = 0;
        while (i < left.length && j < right.length) {
            total += Math.max(0, Math.min(left[i][1], right[j][1]) - Math.max(left[i][0], right[j][0]));
            if (left[i][1] < right[j][1]) i++;
            else j++;
        }
        return total;
    }

    function intervalJaccard(rowsA, rowsB, documentMap, expansion) {
        const documentIds = new Set([...rowsA.map(row => row.docId), ...rowsB.map(row => row.docId)]);
        let intersection = 0;
        let union = 0;
        const radius = Math.max(0, Number(expansion) || 0) / 2;
        documentIds.forEach(docId => {
            const document = documentMap.get(docId);
            const length = document ? String(document.content || '').length : Number.MAX_SAFE_INTEGER;
            const intervals = rows => mergedIntervals(rows
                .filter(row => row.docId === docId)
                .map(row => [Math.max(0, Number(row.startChar) - radius), Math.min(length, Number(row.endChar) + radius)]));
            const a = intervals(rowsA);
            const b = intervals(rowsB);
            const shared = intersectionLength(a, b);
            const aLength = a.reduce((sum, interval) => sum + interval[1] - interval[0], 0);
            const bLength = b.reduce((sum, interval) => sum + interval[1] - interval[0], 0);
            intersection += shared;
            union += aLength + bLength - shared;
        });
        return union ? intersection / union : 0;
    }

    function filterCorpus(input, documentId) {
        const documents = (input.documents || []).filter(doc => !documentId || doc.id === documentId);
        const ids = new Set(documents.map(doc => doc.id));
        return {
            documents,
            categories: input.categories || [],
            codings: (input.codings || []).filter(coding => ids.has(coding.docId))
        };
    }

    function aggregateCategories(corpus, mode) {
        if (mode !== 'main') return corpus;
        const categoryMap = new Map(corpus.categories.map(category => [category.id, category]));
        function rootId(categoryId) {
            let current = categoryMap.get(categoryId);
            const visited = new Set();
            while (current && current.parentId && categoryMap.has(current.parentId) && !visited.has(current.id)) {
                visited.add(current.id);
                current = categoryMap.get(current.parentId);
            }
            return current ? current.id : categoryId;
        }
        const categories = corpus.categories.filter(category => !category.parentId || !categoryMap.has(category.parentId));
        const valid = new Set(categories.map(category => category.id));
        const codings = corpus.codings.map(coding => {
            const categoryId = rootId(coding.categoryId);
            return valid.has(categoryId) ? Object.assign({}, coding, { originalCategoryId: coding.categoryId, categoryId }) : coding;
        }).filter(coding => valid.has(coding.categoryId));
        return { documents: corpus.documents, categories, codings };
    }

    function analyze(input, options) {
        const opts = Object.assign({ unit: 'paragraph', metric: 'jaccard', windowSize: 100, threshold: 0, documentId: '', categoryMode: 'main' }, options || {});
        const corpus = aggregateCategories(filterCorpus(input || {}, opts.documentId), opts.categoryMode);
        const documentMap = new Map(corpus.documents.map(doc => [doc.id, doc]));
        const categoryMap = new Map(corpus.categories.map(cat => [cat.id, cat]));
        const cache = new Map();
        const totalWords = corpus.documents.reduce((sum, doc) => sum + (doc.wordCount || countWords(doc.content)), 0);
        const occurrences = new Map();
        const byCategory = new Map(corpus.categories.map(cat => [cat.id, []]));

        corpus.codings.forEach(coding => {
            if (!byCategory.has(coding.categoryId)) return;
            byCategory.get(coding.categoryId).push(coding);
            const keys = codingUnitKeys(coding, documentMap.get(coding.docId), opts.unit, cache);
            if (!occurrences.has(coding.categoryId)) occurrences.set(coding.categoryId, new Set());
            keys.forEach(key => occurrences.get(coding.categoryId).add(key));
        });

        const stats = corpus.categories.map(category => {
            const rows = byCategory.get(category.id) || [];
            const docCount = new Set(rows.map(row => row.docId)).size;
            return {
                id: category.id,
                count: rows.length,
                docCount,
                documentShare: corpus.documents.length ? docCount / corpus.documents.length : 0,
                perThousand: totalWords ? rows.length * 1000 / totalWords : 0,
                memoCount: rows.filter(row => String(row.memo || '').trim()).length,
                manualCount: rows.filter(row => row.source === 'manual' || !String(row.id || '').startsWith('cod-auto-')).length,
                automaticCount: rows.filter(row => row.source === 'automatic' || String(row.id || '').startsWith('cod-auto-')).length,
                codedChars: rows.reduce((sum, row) => sum + Math.max(0, (row.endChar || 0) - (row.startChar || 0)), 0)
            };
        });
        const statsMap = new Map(stats.map(item => [item.id, item]));
        const edges = [];
        const matrix = {};
        corpus.categories.forEach(cat => { matrix[cat.id] = {}; });

        for (let i = 0; i < corpus.categories.length; i++) {
            const catA = corpus.categories[i];
            matrix[catA.id][catA.id] = statsMap.get(catA.id).count;
            for (let j = i + 1; j < corpus.categories.length; j++) {
                const catB = corpus.categories[j];
                const rowsA = byCategory.get(catA.id) || [];
                const rowsB = byCategory.get(catB.id) || [];
                const evidence = [];
                const pairUnits = new Set();

                if (opts.unit === 'window' || opts.unit === 'overlap') {
                    rowsA.forEach(a => rowsB.forEach(b => {
                        if (a.docId !== b.docId) return;
                        const gap = intervalGap(a, b);
                        const matches = opts.unit === 'overlap' ? gap === 0 : gap <= Math.max(0, Number(opts.windowSize) || 0);
                        if (matches) {
                            const pairKey = `${a.id}|${b.id}`;
                            pairUnits.add(pairKey);
                            evidence.push({ codingAId: a.id, codingBId: b.id, docId: a.docId, quoteA: a.quoteText || '', quoteB: b.quoteText || '', gap });
                        }
                    }));
                } else {
                    const unitsA = occurrences.get(catA.id) || new Set();
                    const unitsB = occurrences.get(catB.id) || new Set();
                    unitsA.forEach(key => { if (unitsB.has(key)) pairUnits.add(key); });
                    pairUnits.forEach(key => {
                        const a = rowsA.find(row => codingUnitKeys(row, documentMap.get(row.docId), opts.unit, cache).includes(key));
                        const b = rowsB.find(row => codingUnitKeys(row, documentMap.get(row.docId), opts.unit, cache).includes(key));
                        if (a && b) evidence.push({ codingAId: a.id, codingBId: b.id, docId: a.docId, quoteA: a.quoteText || '', quoteB: b.quoteText || '', unitKey: key });
                    });
                }

                const count = pairUnits.size;
                const unitsA = occurrences.get(catA.id) ? occurrences.get(catA.id).size : 0;
                const unitsB = occurrences.get(catB.id) ? occurrences.get(catB.id).size : 0;
                const denominator = Math.max(0, unitsA + unitsB - count);
                const jaccard = opts.unit === 'window' || opts.unit === 'overlap'
                    ? intervalJaccard(rowsA, rowsB, documentMap, opts.unit === 'window' ? opts.windowSize : 0)
                    : (denominator ? count / denominator : 0);
                const sharedDocs = new Set(evidence.map(item => item.docId)).size;
                const documentShare = corpus.documents.length ? sharedDocs / corpus.documents.length : 0;
                const metricValue = opts.metric === 'count' ? count : (opts.metric === 'documentShare' ? documentShare : jaccard);
                const edge = { sourceId: catA.id, targetId: catB.id, count, jaccard, documentShare, sharedDocs, metricValue, evidence };
                matrix[catA.id][catB.id] = edge;
                matrix[catB.id][catA.id] = edge;
                if (count > 0 && metricValue >= Number(opts.threshold || 0)) edges.push(edge);
            }
        }

        return { options: opts, documents: corpus.documents, categories: corpus.categories, codings: corpus.codings, totalWords, stats, statsMap, edges, matrix, categoryMap };
    }

    function quality(input, options) {
        const opts = Object.assign({ longFragmentChars: 500 }, options || {});
        const corpus = filterCorpus(input || {}, opts.documentId || '');
        const totalChars = corpus.documents.reduce((sum, doc) => sum + String(doc.content || '').length, 0);
        const duplicates = [];
        const seen = new Map();
        corpus.codings.forEach(coding => {
            const key = [coding.docId, coding.categoryId, coding.startChar, coding.endChar].join('|');
            if (seen.has(key)) duplicates.push([seen.get(key), coding]); else seen.set(key, coding);
        });
        const overlaps = [];
        corpus.documents.forEach(doc => {
            const rows = corpus.codings.filter(c => c.docId === doc.id).sort((a, b) => a.startChar - b.startChar);
            for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length && rows[j].startChar < rows[i].endChar; j++) {
                if (rows[i].id !== rows[j].id) overlaps.push([rows[i], rows[j]]);
            }
        });
        const codedChars = corpus.documents.reduce((sum, doc) => sum + unionLength(corpus.codings.filter(c => c.docId === doc.id)), 0);
        const categoryDocs = new Map(corpus.categories.map(cat => [cat.id, new Set(corpus.codings.filter(c => c.categoryId === cat.id).map(c => c.docId))]));
        const automatic = corpus.codings.filter(c => c.source === 'automatic' || String(c.id || '').startsWith('cod-auto-')).length;
        return {
            missingMemos: corpus.codings.filter(c => !String(c.memo || '').trim()),
            incompleteCategories: corpus.categories.filter(cat => !String(cat.code || '').trim() || !String(cat.description || '').trim() || !(cat.keywords || []).length),
            duplicates,
            overlaps,
            uncodedDocuments: corpus.documents.filter(doc => !corpus.codings.some(c => c.docId === doc.id)),
            singleDocumentCategories: corpus.categories.filter(cat => (categoryDocs.get(cat.id) || new Set()).size === 1),
            longFragments: corpus.codings.filter(c => Math.max(0, (c.endChar || 0) - (c.startChar || 0)) > opts.longFragmentChars),
            coverage: totalChars ? codedChars / totalChars : 0,
            codedChars,
            totalChars,
            automatic,
            manual: corpus.codings.length - automatic,
            totalCodings: corpus.codings.length
        };
    }

    global.AnalyticsEngine = { analyze, quality, countWords, spansFor, intervalGap, unionLength };
})(typeof window !== 'undefined' ? window : globalThis);
