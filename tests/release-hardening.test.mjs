import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('all product manifests declare release 1.0.4', async () => {
    const packageJson = JSON.parse(await read('package.json'));
    const packageLock = JSON.parse(await read('package-lock.json'));
    const tauri = JSON.parse(await read('src-tauri/tauri.conf.json'));
    const cargo = await read('src-tauri/Cargo.toml');
    const cargoLock = await read('src-tauri/Cargo.lock');
    assert.equal(packageJson.version, '1.0.4');
    assert.equal(packageLock.version, '1.0.4');
    assert.equal(packageLock.packages[''].version, '1.0.4');
    assert.equal(tauri.version, '1.0.4');
    assert.match(cargo, /^version = "1\.0\.4"$/m);
    assert.match(cargoLock, /name = "analizador_cuali_uy_pro"\r?\nversion = "1\.0\.4"/);
    assert.match(await read('GUIA-INSTALACION-WINDOWS.txt'), /AnalizadorCualiUY-Pro-Setup-1\.0\.4\.exe/);
    assert.match(await read('GUIA-INSTALACION-Y-ACTIVACION-WINDOWS.txt'), /AnalizadorCualiUY-Pro-Setup-1\.0\.4\.exe/);
});

test('commercial release fails before building when signing configuration is absent', () => {
    const env = { ...process.env };
    delete env.ACUY_CERTIFICATE_THUMBPRINT;
    delete env.ACUY_TIMESTAMP_URL;
    const result = spawnSync('powershell', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', 'build-release.ps1'
    ], { cwd: new URL('..', import.meta.url), env, encoding: 'utf8' });
    const output = `${result.stdout || ''}\n${result.stderr || ''}`;
    assert.notEqual(result.status, 0);
    assert.match(output, /requiere .*ACUY_CERTIFICATE_THUMBPRINT/i);
    assert.doesNotMatch(output, /Compilando AnalizadorCualiUY-Pro/);
});

test('unsigned internal artifacts are visibly distinct from commercial files', async () => {
    const release = await read('build-release.ps1');
    assert.match(release, /-INTERNAL-UNSIGNED/);
    assert.match(release, /INTERNAL-UNSIGNED-NO-DISTRIBUIR\.txt/);
    assert.match(release, /COMPILACION INTERNA SIN FIRMA - NO DISTRIBUIR NI VENDER/);
    assert.match(release, /Windows Portable - INTERNAL-UNSIGNED - NO DISTRIBUIR/);
});

test('frontend build and development server use isolated roots', async () => {
    const config = JSON.parse(await read('src-tauri/tauri.conf.json'));
    const dev = await read('serve-dev.ps1');
    const build = await read('build-frontend.ps1');
    assert.equal(config.build.beforeBuildCommand, 'npm run build:frontend');
    assert.equal(config.build.devUrl, 'http://127.0.0.1:1420');
    assert.match(dev, /--bind 127\.0\.0\.1/);
    assert.match(dev, /dist-dev/);
    assert.match(build, /ValidateSet\("dist", "dist-dev"\)/);
    assert.doesNotMatch(dev, /--directory\s+\$root(?:\s|$)/);
});

test('NSIS leaves desktop-shortcut choice and cleanup to the standard installer', async () => {
    const config = JSON.parse(await read('src-tauri/tauri.conf.json'));
    assert.equal(config.bundle.windows.nsis.installerHooks, undefined);
});

test('release gates and distributes the reproducible CycloneDX inventory', async () => {
    const release = await read('build-release.ps1');
    const sbom = JSON.parse(await read('SBOM.cdx.json'));
    assert.equal(sbom.bomFormat, 'CycloneDX');
    assert.equal(sbom.specVersion, '1.5');
    assert.ok(sbom.components.length > 300);
    assert.match(release, /"SBOM\.cdx\.json"/);
    assert.match(release, /npm run legal:check/);

    const result = spawnSync(process.execPath, ['tools/generate-third-party-inventory.mjs', '--check'], {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8'
    });
    assert.equal(result.status, 0, `${result.stdout || ''}\n${result.stderr || ''}`);
});
