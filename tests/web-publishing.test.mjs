import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const betaHtml = await readFile('web-beta/index.html', 'utf8');
const betaApp = await readFile('web-beta/app.js', 'utf8');
const headers = await readFile('web-beta/_headers', 'utf8');

test('beta publishes privacy and terms links without absolute confidentiality claims', () => {
    assert.match(betaHtml, /PRIVACY-BETA\.html/);
    assert.match(betaHtml, /BETA-LICENSE\.txt/);
    assert.match(betaHtml, /no transmite tus documentos/i);
    assert.doesNotMatch(betaHtml, /100% Local & Confidencial/i);
});

test('beta makes the Pro contact route prominent and keeps its long notice usable', () => {
    assert.match(betaHtml, /Hola%20departamento%20de%20ventas%20de%20AnalizadorCualiUY/);
    assert.match(betaHtml, /class="btn-banner-action beta-contact-cta">Actualizar a Pro</);
    assert.match(betaHtml, /class="modal-body modal-pro-intro-body"/);
});

test('beta hosting policy denies framing, sniffing and outbound connections', () => {
    assert.match(headers, /frame-ancestors 'none'/);
    assert.match(headers, /X-Content-Type-Options: nosniff/);
    assert.match(headers, /Referrer-Policy: no-referrer/);
    assert.match(headers, /connect-src 'none'/);
});

test('dialogs expose semantics, Escape, focus trap and focus restoration', () => {
    assert.match(betaApp, /setAttribute\('role', 'dialog'\)/);
    assert.match(betaApp, /setAttribute\('aria-modal', 'true'\)/);
    assert.match(betaApp, /event\.key === 'Escape'/);
    assert.match(betaApp, /event\.key !== 'Tab'/);
    assert.match(betaApp, /previousFocus/);
});
