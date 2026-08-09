/* Shared qualitative analytics engine. Browser and Node compatible. */
(function (global) {
    'use strict';

    const MAX_PAIR_RECORDS = 10000;
    const MAX_PAIR_EVALUATIONS = 1000000;
    const MAX_EVIDENCE_PER_PAIR = 100;
    const MAX_QUALITY_OVERLAP_SAMPLES = 1000;
    const MAX_QUALITY_DUPLICATE_SAMPLES = 1000;

    function countWords(text) {
        const matcher = /\S+/g;
        const value = String(text || '');
        let count = 0;
        while (matcher.exec(value)) count++;
        return count;
    }

    function spansFor(text, unit) {
        const value = String(text || '');
        if (unit === 'document') return [{ start: 0, end: value.length, index: 0 }];
        const spans = [];
        if (unit === 'paragraph') {
            // A paragraph is separated by one or more blank lines. A single
            // line break remains inside the paragraph, which is important for
            // transcripts. Scan separators instead of normalizing the text so
            // every returned offset still refers to the original document.
            const leadingBlankLines = value.match(/^(?:[^\S\r\n]*(?:\r\n|\n|\r))+/);
            let start = leadingBlankLines ? leadingBlankLines[0].length : 0;
            const separator = /(?:\r\n|\n|\r)[^\S\r\n]*(?:\r\n|\n|\r)(?:[^\S\r\n]*(?:\r\n|\n|\r))*/g;
            separator.lastIndex = start;
            let match;
            while ((match = separator.exec(value))) {
                if (value.slice(start, match.index).trim()) {
                    spans.push({ start, end: match.index, index: spans.length });
                }
                start = separator.lastIndex;
            }
            if (value.slice(start).trim()) spans.push({ start, end: value.length, index: spans.length });
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
        const spans = cache.get(key);
        // Paragraph and sentence spans are ordered and non-overlapping. Find
        // the first possible overlap by end offset instead of rescanning the
        // entire document for every coding.
        let low = 0;
        let high = spans.length;
        while (low < high) {
            const middle = low + Math.floor((high - low) / 2);
            if (spans[middle].end <= start) low = middle + 1;
            else high = middle;
        }
        const keys = [];
        for (let index = low; index < spans.length && spans[index].start < end; index++) {
            const span = spans[index];
            if (start < span.end && end > span.start) keys.push(`${coding.docId}:${unit}:${span.index}`);
        }
        return keys;
    }

    function intervalGap(a, b) {
        const aStart = Number(a.startChar) || 0;
        const aEnd = Number(a.endChar) || aStart;
        const bStart = Number(b.startChar) || 0;
        const bEnd = Number(b.endChar) || bStart;
        if (aStart < bEnd && bStart < aEnd) return 0;
        return Math.max(0, Math.max(aStart, bStart) - Math.min(aEnd, bEnd));
    }

    function intervalsOverlap(a, b) {
        const aStart = Number(a.startChar) || 0;
        const aEnd = Number(a.endChar) || aStart;
        const bStart = Number(b.startChar) || 0;
        const bEnd = Number(b.endChar) || bStart;
        return aStart < bEnd && bStart < aEnd;
    }

    function isAutomaticCoding(coding) {
        return Boolean(coding) && (coding.source === 'automatic' || String(coding.id || '').startsWith('cod-auto-'));
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

    function buildIntervalIndex(byCategory, documentMap, expansion, includedCategoryIds) {
        const radius = Math.max(0, Number(expansion) || 0) / 2;
        const result = new Map();
        byCategory.forEach((rows, categoryId) => {
            if (includedCategoryIds && !includedCategoryIds.has(categoryId)) return;
            const rawByDocument = new Map();
            rows.forEach(row => {
                const start = Number(row.startChar);
                const end = Number(row.endChar);
                if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
                const document = documentMap.get(row.docId);
                const length = document ? String(document.content || '').length : Number.MAX_SAFE_INTEGER;
                if (!rawByDocument.has(row.docId)) rawByDocument.set(row.docId, []);
                rawByDocument.get(row.docId).push([Math.max(0, start - radius), Math.min(length, end + radius)]);
            });
            const documents = new Map();
            let totalLength = 0;
            rawByDocument.forEach((intervals, docId) => {
                const merged = mergedIntervals(intervals);
                if (!merged.length) return;
                documents.set(docId, merged);
                totalLength += merged.reduce((sum, interval) => sum + interval[1] - interval[0], 0);
            });
            result.set(categoryId, { documents, totalLength });
        });
        return result;
    }

    function indexedIntervalJaccard(left, right) {
        if (!left || !right) return 0;
        let intersection = 0;
        const smaller = left.documents.size <= right.documents.size ? left.documents : right.documents;
        const larger = smaller === left.documents ? right.documents : left.documents;
        smaller.forEach((intervals, docId) => {
            const other = larger.get(docId);
            if (other) intersection += intersectionLength(intervals, other);
        });
        const union = left.totalLength + right.totalLength - intersection;
        return union ? intersection / union : 0;
    }

    function categoryPair(leftId, rightId, categoryOrder) {
        const leftIndex = categoryOrder.get(leftId);
        const rightIndex = categoryOrder.get(rightId);
        if (leftIndex == null || rightIndex == null || leftIndex === rightIndex) return null;
        const sourceIndex = Math.min(leftIndex, rightIndex);
        const targetIndex = Math.max(leftIndex, rightIndex);
        return {
            key: `${sourceIndex}:${targetIndex}`,
            sourceIndex,
            targetIndex,
            sourceId: leftIndex === sourceIndex ? leftId : rightId,
            targetId: leftIndex === sourceIndex ? rightId : leftId
        };
    }

    function createLazyMatrix(categories, statsMap, edgeMap, categoryOrder, resultsTruncated) {
        const categoryIds = categories.map(category => String(category.id));
        const validIds = new Set(categoryIds);
        const originalIds = new Map(categories.map(category => [String(category.id), category.id]));
        const lazyZeroEdges = new Map();
        const matrix = {};
        categories.forEach(category => {
            const categoryId = String(category.id);
            const target = {};
            const row = new Proxy(target, {
                get(object, property, receiver) {
                    if (Object.prototype.hasOwnProperty.call(object, property)) return Reflect.get(object, property, receiver);
                    if (typeof property !== 'string' || !validIds.has(property)) return Reflect.get(object, property, receiver);
                    if (property === categoryId) return (statsMap.get(category.id) || { count: 0 }).count;
                    const pair = categoryPair(category.id, originalIds.get(property), categoryOrder);
                    const existing = pair ? edgeMap.get(pair.key) : null;
                    if (existing) return existing;
                    if (!pair) return undefined;
                    if (!lazyZeroEdges.has(pair.key)) {
                        lazyZeroEdges.set(pair.key, {
                            sourceId: pair.sourceId,
                            targetId: pair.targetId,
                            count: 0,
                            jaccard: 0,
                            documentShare: 0,
                            sharedDocs: 0,
                            metricValue: 0,
                            evidence: [],
                            unavailable: Boolean(resultsTruncated)
                        });
                    }
                    return lazyZeroEdges.get(pair.key);
                },
                has(object, property) {
                    return (typeof property === 'string' && validIds.has(property)) || Reflect.has(object, property);
                },
                ownKeys(object) {
                    return [...new Set([...Reflect.ownKeys(object), ...categoryIds])];
                },
                getOwnPropertyDescriptor(object, property) {
                    return Reflect.getOwnPropertyDescriptor(object, property)
                        || (typeof property === 'string' && validIds.has(property) ? { configurable: true, enumerable: true } : undefined);
                }
            });
            Object.defineProperty(matrix, categoryId, { configurable: true, enumerable: true, writable: true, value: row });
        });
        return matrix;
    }

    function filterCorpus(input, documentId, documentGroup) {
        const documents = (input.documents || []).filter(doc => {
            if (documentId && doc.id !== documentId) return false;
            return !documentGroup || String((doc.profile || {}).group || '') === documentGroup;
        });
        const ids = new Set(documents.map(doc => doc.id));
        return {
            documents,
            categories: input.categories || [],
            // Una coincidencia desestimada se conserva en el proyecto, pero no
            // participa en métricas, gráficos, coocurrencias ni porcentajes.
            codings: (input.codings || []).filter(coding => !coding.dismissed && ids.has(coding.docId))
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
        const opts = Object.assign({ unit: 'paragraph', metric: 'jaccard', windowSize: 100, threshold: 0, documentId: '', documentGroup: '', categoryMode: 'main' }, options || {});
        const corpus = aggregateCategories(filterCorpus(input || {}, opts.documentId, opts.documentGroup), opts.categoryMode);
        const documentMap = new Map(corpus.documents.map(doc => [doc.id, doc]));
        const categoryMap = new Map(corpus.categories.map(cat => [cat.id, cat]));
        const categoryOrder = new Map(corpus.categories.map((cat, index) => [cat.id, index]));
        const cache = new Map();
        const totalWords = corpus.documents.reduce((sum, doc) => sum + (doc.wordCount || countWords(doc.content)), 0);
        const occurrences = new Map(corpus.categories.map(cat => [cat.id, new Set()]));
        const byCategory = new Map(corpus.categories.map(cat => [cat.id, []]));
        const usesProximity = opts.unit === 'window' || opts.unit === 'overlap';
        const unitRepresentatives = usesProximity ? null : new Map();

        corpus.codings.forEach(coding => {
            if (!byCategory.has(coding.categoryId)) return;
            byCategory.get(coding.categoryId).push(coding);
            const keys = codingUnitKeys(coding, documentMap.get(coding.docId), opts.unit, cache);
            keys.forEach(key => {
                occurrences.get(coding.categoryId).add(key);
                if (unitRepresentatives) {
                    if (!unitRepresentatives.has(key)) unitRepresentatives.set(key, new Map());
                    const representatives = unitRepresentatives.get(key);
                    if (!representatives.has(coding.categoryId)) representatives.set(coding.categoryId, coding);
                }
            });
        });

        const stats = corpus.categories.map(category => {
            const rows = byCategory.get(category.id) || [];
            const docCount = new Set(rows.map(row => row.docId)).size;
            let weightedCount = 0;
            let memoCount = 0;
            let automaticCount = 0;
            let codedChars = 0;
            rows.forEach(row => {
                weightedCount += [1, 2, 3].includes(Number(row.weight)) ? Number(row.weight) : 1;
                if (String(row.memo || '').trim()) memoCount++;
                if (isAutomaticCoding(row)) automaticCount++;
                codedChars += Math.max(0, (Number(row.endChar) || 0) - (Number(row.startChar) || 0));
            });
            return {
                id: category.id,
                count: rows.length,
                weightedCount,
                averageWeight: rows.length ? weightedCount / rows.length : 0,
                docCount,
                documentShare: corpus.documents.length ? docCount / corpus.documents.length : 0,
                perThousand: totalWords ? rows.length * 1000 / totalWords : 0,
                memoCount,
                manualCount: rows.length - automaticCount,
                automaticCount,
                codedChars
            };
        });
        const statsMap = new Map(stats.map(item => [item.id, item]));
        const pairRecords = new Map();
        let pairEvaluations = 0;
        let pairScanTruncated = false;
        let pairRecordLimitReached = false;
        let matchedPairCount = 0;
        let omittedPairMatches = 0;

        function consumePairEvaluation() {
            if (pairEvaluations >= MAX_PAIR_EVALUATIONS) {
                pairScanTruncated = true;
                return false;
            }
            pairEvaluations++;
            return true;
        }

        function pairRecord(leftCoding, rightCoding) {
            const pair = categoryPair(leftCoding.categoryId, rightCoding.categoryId, categoryOrder);
            if (!pair) return null;
            if (!pairRecords.has(pair.key)) {
                if (pairRecords.size >= MAX_PAIR_RECORDS) {
                    pairRecordLimitReached = true;
                    return null;
                }
                pairRecords.set(pair.key, Object.assign({}, pair, { count: 0, evidence: [], documentIds: new Set() }));
            }
            return pairRecords.get(pair.key);
        }

        function appendEvidence(record, leftCoding, rightCoding, unitKey, gap) {
            if (record.evidence.length >= MAX_EVIDENCE_PER_PAIR) return;
            const sourceCoding = leftCoding.categoryId === record.sourceId ? leftCoding : rightCoding;
            const targetCoding = sourceCoding === leftCoding ? rightCoding : leftCoding;
            const evidence = {
                codingAId: sourceCoding.id,
                codingBId: targetCoding.id,
                docId: sourceCoding.docId,
                quoteA: sourceCoding.quoteText || '',
                quoteB: targetCoding.quoteText || ''
            };
            if (gap == null) evidence.unitKey = unitKey;
            else evidence.gap = gap;
            record.evidence.push(evidence);
        }

        function addSinglePair(leftCoding, rightCoding, unitKey) {
            matchedPairCount++;
            const record = pairRecord(leftCoding, rightCoding);
            if (!record) {
                omittedPairMatches++;
                return;
            }
            record.count++;
            appendEvidence(record, leftCoding, rightCoding, unitKey, null);
            record.documentIds.add(leftCoding.docId);
        }

        function addProximityPairs(activeIndexes, rows, rightCoding) {
            const matchCount = activeIndexes.size;
            matchedPairCount += matchCount;
            const firstIndex = activeIndexes.values().next().value;
            const firstLeft = firstIndex == null ? null : rows[firstIndex];
            const record = firstLeft ? pairRecord(firstLeft, rightCoding) : null;
            if (!record) {
                omittedPairMatches += matchCount;
                return;
            }
            record.count += matchCount;
            record.documentIds.add(rightCoding.docId);
            let remaining = MAX_EVIDENCE_PER_PAIR - record.evidence.length;
            if (remaining <= 0) return;
            for (const activeIndex of activeIndexes) {
                const leftCoding = rows[activeIndex];
                appendEvidence(record, leftCoding, rightCoding, null, intervalGap(leftCoding, rightCoding));
                if (--remaining <= 0) break;
            }
        }

        if (usesProximity) {
            const rowsByDocument = new Map(corpus.documents.map(document => [document.id, []]));
            corpus.codings.forEach(coding => {
                if (categoryOrder.has(coding.categoryId) && rowsByDocument.has(coding.docId)) rowsByDocument.get(coding.docId).push(coding);
            });
            const windowSize = Math.max(0, Number(opts.windowSize) || 0);
            proximityDocuments:
            for (const rows of rowsByDocument.values()) {
                const validRows = rows.filter(row => {
                    const start = Number(row.startChar);
                    const end = Number(row.endChar);
                    return Number.isFinite(start) && Number.isFinite(end) && end > start;
                }).sort((a, b) => Number(a.startChar) - Number(b.startChar)
                    || Number(a.endChar) - Number(b.endChar)
                    || String(a.id || '').localeCompare(String(b.id || '')));
                const expirations = Array.from({ length: validRows.length }, (_, index) => index)
                    .sort((leftIndex, rightIndex) => Number(validRows[leftIndex].endChar) - Number(validRows[rightIndex].endChar)
                        || Number(validRows[leftIndex].startChar) - Number(validRows[rightIndex].startChar)
                        || String(validRows[leftIndex].id || '').localeCompare(String(validRows[rightIndex].id || '')));
                const activeByCategory = new Map();
                let expirationIndex = 0;
                for (let rightIndex = 0; rightIndex < validRows.length; rightIndex++) {
                    const rightCoding = validRows[rightIndex];
                    const rightStart = Number(rightCoding.startChar);
                    while (expirationIndex < expirations.length) {
                        const expiredIndex = expirations[expirationIndex];
                        const expired = validRows[expiredIndex];
                        const expiredEnd = Number(expired.endChar);
                        const shouldExpire = opts.unit === 'overlap'
                            ? expiredEnd <= rightStart
                            : expiredEnd + windowSize < rightStart;
                        if (!shouldExpire) break;
                        const activeIndexes = activeByCategory.get(expired.categoryId);
                        if (activeIndexes) {
                            activeIndexes.delete(expiredIndex);
                            if (!activeIndexes.size) activeByCategory.delete(expired.categoryId);
                        }
                        expirationIndex++;
                    }
                    for (const [categoryId, activeIndexes] of activeByCategory) {
                        if (categoryId === rightCoding.categoryId) continue;
                        if (!consumePairEvaluation()) break proximityDocuments;
                        addProximityPairs(activeIndexes, validRows, rightCoding);
                    }
                    if (!activeByCategory.has(rightCoding.categoryId)) activeByCategory.set(rightCoding.categoryId, new Set());
                    activeByCategory.get(rightCoding.categoryId).add(rightIndex);
                }
            }
        } else {
            analyticalUnits:
            for (const [unitKey, representatives] of unitRepresentatives) {
                const categoryIds = [...representatives.keys()].sort((a, b) => categoryOrder.get(a) - categoryOrder.get(b));
                for (let i = 0; i < categoryIds.length; i++) {
                    for (let j = i + 1; j < categoryIds.length; j++) {
                        if (!consumePairEvaluation()) break analyticalUnits;
                        addSinglePair(representatives.get(categoryIds[i]), representatives.get(categoryIds[j]), unitKey);
                    }
                }
            }
        }

        const edgeMap = new Map();
        const edges = [];
        const threshold = Number.isFinite(Number(opts.threshold)) ? Number(opts.threshold) : 0;
        const orderedRecords = [...pairRecords.values()].sort((a, b) => a.sourceIndex - b.sourceIndex || a.targetIndex - b.targetIndex);
        const indexedCategoryIds = usesProximity
            ? new Set(orderedRecords.flatMap(record => [record.sourceId, record.targetId]))
            : null;
        const intervalIndex = usesProximity
            ? buildIntervalIndex(byCategory, documentMap, opts.unit === 'window' ? opts.windowSize : 0, indexedCategoryIds)
            : null;
        let omittedEvidence = 0;
        orderedRecords.forEach(record => {
            const count = record.count;
            const unitsA = (occurrences.get(record.sourceId) || new Set()).size;
            const unitsB = (occurrences.get(record.targetId) || new Set()).size;
            const denominator = Math.max(0, unitsA + unitsB - count);
            const jaccard = usesProximity
                ? indexedIntervalJaccard(intervalIndex.get(record.sourceId), intervalIndex.get(record.targetId))
                : (denominator ? count / denominator : 0);
            const sharedDocs = record.documentIds.size;
            const documentShare = corpus.documents.length ? sharedDocs / corpus.documents.length : 0;
            const metricValue = opts.metric === 'count' ? count : (opts.metric === 'documentShare' ? documentShare : jaccard);
            const edgeOmittedEvidence = Math.max(0, count - record.evidence.length);
            omittedEvidence += edgeOmittedEvidence;
            const edge = {
                sourceId: record.sourceId,
                targetId: record.targetId,
                count,
                jaccard,
                documentShare,
                sharedDocs,
                metricValue,
                evidence: record.evidence,
                evidenceLimit: MAX_EVIDENCE_PER_PAIR,
                evidenceTruncated: edgeOmittedEvidence > 0,
                omittedEvidence: edgeOmittedEvidence,
                countMayBeTruncated: pairScanTruncated
            };
            edgeMap.set(record.key, edge);
            if (count > 0 && metricValue >= threshold) edges.push(edge);
        });

        const theoreticalPairs = corpus.categories.length > 1 ? corpus.categories.length * (corpus.categories.length - 1) / 2 : 0;
        const resultsTruncated = pairScanTruncated || pairRecordLimitReached;
        const diagnostics = {
            pairStrategy: 'sparse-lazy-bounded',
            pairEvaluationStrategy: usesProximity ? 'active-category-buckets' : 'analytical-unit-category-pairs',
            theoreticalPairs,
            evaluatedPairs: orderedRecords.length,
            lazyZeroPairs: resultsTruncated ? null : Math.max(0, theoreticalPairs - orderedRecords.length),
            hasUnknownLazyPairs: resultsTruncated,
            pairEvaluations,
            pairEvaluationLimit: MAX_PAIR_EVALUATIONS,
            pairRecordLimit: MAX_PAIR_RECORDS,
            evidenceLimitPerPair: MAX_EVIDENCE_PER_PAIR,
            matchedPairCount,
            returnedPairMatches: matchedPairCount - omittedPairMatches,
            resultsTruncated,
            pairScanTruncated,
            pairRecordLimitReached,
            omittedPairMatches,
            omittedPairMatchesIsLowerBound: pairScanTruncated,
            evidenceTruncated: omittedEvidence > 0,
            omittedEvidence
        };
        const matrix = createLazyMatrix(corpus.categories, statsMap, edgeMap, categoryOrder, resultsTruncated);
        return { options: opts, documents: corpus.documents, categories: corpus.categories, codings: corpus.codings, totalWords, stats, statsMap, edges, matrix, categoryMap, diagnostics };
    }

    function quality(input, options) {
        const opts = Object.assign({ longFragmentChars: 500 }, options || {});
        const corpus = filterCorpus(input || {}, opts.documentId || '', opts.documentGroup || '');
        const totalChars = corpus.documents.reduce((sum, doc) => sum + String(doc.content || '').length, 0);
        const duplicates = [];
        let totalDuplicates = 0;
        const seen = new Map();
        const codingsByDocument = new Map(corpus.documents.map(document => [document.id, []]));
        const categoryDocs = new Map(corpus.categories.map(category => [category.id, new Set()]));
        corpus.codings.forEach(coding => {
            const key = [coding.docId, coding.categoryId, coding.startChar, coding.endChar].join('|');
            if (seen.has(key)) {
                totalDuplicates++;
                if (duplicates.length < MAX_QUALITY_DUPLICATE_SAMPLES) duplicates.push([seen.get(key), coding]);
            } else {
                seen.set(key, coding);
            }
            if (codingsByDocument.has(coding.docId)) codingsByDocument.get(coding.docId).push(coding);
            if (categoryDocs.has(coding.categoryId)) categoryDocs.get(coding.categoryId).add(coding.docId);
        });
        const overlaps = [];
        let totalOverlaps = 0;
        corpus.documents.forEach(doc => {
            const rows = codingsByDocument.get(doc.id).filter(row => {
                const start = Number(row.startChar);
                const end = Number(row.endChar);
                return Number.isFinite(start) && Number.isFinite(end) && end > start;
            }).sort((a, b) => Number(a.startChar) - Number(b.startChar)
                || Number(a.endChar) - Number(b.endChar)
                || String(a.id || '').localeCompare(String(b.id || '')));
            const expirations = Array.from({ length: rows.length }, (_, index) => index)
                .sort((leftIndex, rightIndex) => Number(rows[leftIndex].endChar) - Number(rows[rightIndex].endChar)
                    || Number(rows[leftIndex].startChar) - Number(rows[rightIndex].startChar)
                    || String(rows[leftIndex].id || '').localeCompare(String(rows[rightIndex].id || '')));
            const activeIndexes = new Set();
            const activeIdCounts = new Map();
            let expirationIndex = 0;
            for (let rightIndex = 0; rightIndex < rows.length; rightIndex++) {
                const rightCoding = rows[rightIndex];
                const rightStart = Number(rightCoding.startChar);
                while (expirationIndex < expirations.length) {
                    const expiredIndex = expirations[expirationIndex];
                    const expiredCoding = rows[expiredIndex];
                    if (Number(expiredCoding.endChar) > rightStart) break;
                    if (activeIndexes.delete(expiredIndex)) {
                        const remaining = (activeIdCounts.get(expiredCoding.id) || 0) - 1;
                        if (remaining > 0) activeIdCounts.set(expiredCoding.id, remaining);
                        else activeIdCounts.delete(expiredCoding.id);
                    }
                    expirationIndex++;
                }
                const matchingCount = activeIndexes.size - (activeIdCounts.get(rightCoding.id) || 0);
                totalOverlaps += matchingCount;
                if (overlaps.length < MAX_QUALITY_OVERLAP_SAMPLES && matchingCount > 0) {
                    for (const leftIndex of activeIndexes) {
                        const leftCoding = rows[leftIndex];
                        if (leftCoding.id === rightCoding.id) continue;
                        overlaps.push([leftCoding, rightCoding]);
                        if (overlaps.length >= MAX_QUALITY_OVERLAP_SAMPLES) break;
                    }
                }
                activeIndexes.add(rightIndex);
                activeIdCounts.set(rightCoding.id, (activeIdCounts.get(rightCoding.id) || 0) + 1);
            }
        });
        const overlapDiagnostics = {
            truncated: totalOverlaps > overlaps.length,
            totalDetected: totalOverlaps,
            returned: overlaps.length,
            omitted: Math.max(0, totalOverlaps - overlaps.length),
            limit: MAX_QUALITY_OVERLAP_SAMPLES
        };
        const duplicateDiagnostics = {
            truncated: totalDuplicates > duplicates.length,
            totalDetected: totalDuplicates,
            returned: duplicates.length,
            omitted: Math.max(0, totalDuplicates - duplicates.length),
            limit: MAX_QUALITY_DUPLICATE_SAMPLES
        };
        const codedChars = corpus.documents.reduce((sum, doc) => sum + unionLength(codingsByDocument.get(doc.id)), 0);
        const automatic = corpus.codings.filter(isAutomaticCoding).length;
        return {
            missingMemos: corpus.codings.filter(c => !String(c.memo || '').trim()),
            incompleteCategories: corpus.categories.filter(category => {
                const hasCriterion = Boolean(String(category.description || '').trim() || String(category.criteria || '').trim());
                const hasKeyword = (category.keywords || []).some(keyword => String(keyword || '').trim());
                return !String(category.code || '').trim() || !hasCriterion || !hasKeyword;
            }),
            duplicates,
            duplicateDiagnostics,
            overlaps,
            overlapDiagnostics,
            uncodedDocuments: corpus.documents.filter(doc => !codingsByDocument.get(doc.id).length),
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
