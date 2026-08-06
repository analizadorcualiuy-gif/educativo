import assert from 'node:assert/strict';
import test from 'node:test';
import { deflateSync } from 'node:zlib';

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

function compressedTwoPagePdf() {
    const chunks = [Buffer.from('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n', 'binary')];
    const offsets = [0];
    let length = chunks[0].length;

    function addObject(id, body) {
        offsets[id] = length;
        const chunk = Buffer.isBuffer(body)
            ? Buffer.concat([Buffer.from(`${id} 0 obj\n`, 'ascii'), body, Buffer.from('\nendobj\n', 'ascii')])
            : Buffer.from(`${id} 0 obj\n${body}\nendobj\n`, 'binary');
        chunks.push(chunk);
        length += chunk.length;
    }

    function streamObject(command) {
        const compressed = deflateSync(Buffer.from(command, 'binary'));
        return Buffer.concat([
            Buffer.from(`<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`, 'ascii'),
            compressed,
            Buffer.from('\nendstream', 'ascii')
        ]);
    }

    addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
    addObject(2, '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>');
    addObject(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>');
    addObject(4, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>');
    addObject(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    addObject(6, streamObject('BT /F1 12 Tf 72 720 Td (Primera pagina: caf\\351) Tj ET'));
    addObject(7, streamObject('BT /F1 12 Tf 72 720 Td (Segunda pagina: ni\\361o) Tj ET'));

    const xrefOffset = length;
    let xref = 'xref\n0 8\n0000000000 65535 f \n';
    for (let id = 1; id <= 7; id++) xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    xref += `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    chunks.push(Buffer.from(xref, 'ascii'));
    return new Uint8Array(Buffer.concat(chunks));
}

test('official PDF.js parses compressed, multipage WinAnsi text', async () => {
    const loadingTask = pdfjs.getDocument({ data: compressedTwoPagePdf(), disableWorker: true, verbosity: 0 });
    const pdf = await loadingTask.promise;
    assert.equal(pdf.numPages, 2);
    const texts = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        texts.push(content.items.map(item => item.str).join(' '));
    }
    assert.equal(texts[0], 'Primera pagina: café');
    assert.equal(texts[1], 'Segunda pagina: niño');
    await loadingTask.destroy();
});
