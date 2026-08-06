import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

async function hash(path) {
    return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function tree(root) {
    const result = new Map();
    async function visit(directory) {
        const entries = await readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
            const path = join(directory, entry.name);
            if (entry.isDirectory()) await visit(path);
            else result.set(relative(root, path).replaceAll('\\', '/'), await hash(path));
        }
    }
    await visit(root);
    return result;
}

test('vendored browser libraries exactly match pinned npm packages', async () => {
    assert.equal(
        await hash('web-beta/public/vendor/mammoth.browser.min.js'),
        await hash('node_modules/mammoth/mammoth.browser.min.js')
    );
    for (const [vendored, installed] of [
        ['web-beta/public/vendor/pdf.mjs', 'node_modules/pdfjs-dist/build/pdf.mjs'],
        ['web-beta/public/vendor/pdf.worker.mjs', 'node_modules/pdfjs-dist/build/pdf.worker.mjs'],
        ['web-beta/public/vendor/pdfjs-LICENSE.txt', 'node_modules/pdfjs-dist/LICENSE']
    ]) assert.equal(await hash(vendored), await hash(installed));

    for (const directory of ['cmaps', 'standard_fonts', 'wasm']) {
        assert.deepEqual(
            await tree(`web-beta/public/vendor/${directory}`),
            await tree(`node_modules/pdfjs-dist/${directory}`)
        );
    }

    for (const vendorRoot of ['public/vendor', 'web-beta/public/vendor']) {
        for (const [vendored, installed] of [
            ['pdf-lib.min.js', 'node_modules/pdf-lib/dist/pdf-lib.min.js'],
            ['fontkit.umd.min.js', 'node_modules/@pdf-lib/fontkit/dist/fontkit.umd.min.js'],
            ['LiberationSans-Regular.ttf', 'node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf'],
            ['LiberationSans-Bold.ttf', 'node_modules/pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf'],
            ['pdf-lib-LICENSE.txt', 'node_modules/pdf-lib/LICENSE.md'],
            ['LiberationSans-LICENSE.txt', 'node_modules/pdfjs-dist/standard_fonts/LICENSE_LIBERATION']
        ]) assert.equal(await hash(`${vendorRoot}/${vendored}`), await hash(installed));
    }
});
