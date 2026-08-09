import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const target = 'x86_64-pc-windows-msvc';
const noticesPath = join(root, 'THIRD_PARTY_NOTICES.txt');
const sbomPath = join(root, 'SBOM.cdx.json');
const licenseNamePattern = /^(?:licen[cs]e|copying|notice|copyright)(?:$|[-_.])/iu;

function normalizeText(value) {
    return String(value || '').replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n').trimEnd() + '\n';
}

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/u, ''));
}

function normalizeLicenseExpression(value) {
    const expression = String(value || 'NOASSERTION').trim();
    const normalized = expression
        .replace(/^MIT\/Apache-2\.0$/u, 'MIT OR Apache-2.0')
        .replace(/^Apache-2\.0\/MIT$/u, 'Apache-2.0 OR MIT')
        .replace(/^Unlicense\/MIT$/u, 'Unlicense OR MIT')
        .replace(/\s*\/\s*/gu, ' OR ');
    // duck@0.1.12 declara el identificador histórico "BSD", pero su texto
    // tiene exactamente las dos cláusulas de BSD-2-Clause.
    return normalized === 'BSD' ? 'BSD-2-Clause' : normalized;
}

function normalizeRepositoryUrl(value) {
    let repository = String(value || '').trim().replace(/^git\+/u, '').replace(/\.git$/u, '');
    if (!repository) return '';
    repository = repository.replace(/^git:\/\//u, 'https://').replace(/^git@github\.com:/u, 'https://github.com/');
    repository = repository.replace(/^github:/u, 'https://github.com/');
    if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository)) repository = `https://github.com/${repository}`;
    try {
        const parsed = new URL(repository);
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href.replace(/\/$/u, '') : '';
    } catch {
        return '';
    }
}

function licenseFilesFor(directory, explicitPath = null) {
    const candidates = new Set();
    if (explicitPath) {
        const resolved = resolve(directory, explicitPath);
        if (existsSync(resolved) && statSync(resolved).isFile()) candidates.add(resolved);
    }
    if (existsSync(directory)) {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            if (entry.isFile() && licenseNamePattern.test(entry.name)) candidates.add(join(directory, entry.name));
        }
    }
    return [...candidates].sort((a, b) => a.localeCompare(b)).map(path => {
        const raw = readFileSync(path);
        if (raw.length > 2 * 1024 * 1024 || raw.includes(0)) {
            throw new Error(`El archivo de licencia no es texto acotado: ${path}`);
        }
        const content = normalizeText(raw.toString('utf8'));
        return { name: path.split(/[\\/]/u).at(-1), content, sha256: sha256(content) };
    });
}

function cargoComponents() {
    const output = execFileSync('cargo', [
        'metadata', '--locked', '--format-version', '1',
        '--manifest-path', 'src-tauri/Cargo.toml',
        '--filter-platform', target
    ], { cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
    const metadata = JSON.parse(output.replace(/^\uFEFF/u, ''));
    const packageById = new Map(metadata.packages.map(pkg => [pkg.id, pkg]));
    const nodeById = new Map((metadata.resolve?.nodes || []).map(node => [node.id, node]));
    const reachable = new Set();
    const queue = [metadata.resolve?.root].filter(Boolean);
    while (queue.length) {
        const id = queue.pop();
        if (reachable.has(id)) continue;
        reachable.add(id);
        const node = nodeById.get(id);
        for (const dependency of node?.deps || []) queue.push(dependency.pkg);
    }
    return [...reachable]
        .map(id => packageById.get(id))
        .filter(pkg => pkg && pkg.source)
        .map(pkg => {
            const directory = dirname(pkg.manifest_path);
            return {
                ecosystem: 'cargo',
                name: pkg.name,
                version: pkg.version,
                license: normalizeLicenseExpression(pkg.license),
                authors: pkg.authors || [],
                repository: normalizeRepositoryUrl(pkg.repository),
                purl: `pkg:cargo/${encodeURIComponent(pkg.name)}@${encodeURIComponent(pkg.version)}`,
                licenseFiles: licenseFilesFor(directory, pkg.license_file)
            };
        });
}

function npmPackageName(packagePath, packageJson) {
    if (packageJson.name) return packageJson.name;
    const parts = packagePath.replace(/\\/gu, '/').split('/node_modules/').at(-1).split('/');
    return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
}

function npmComponents() {
    const lock = readJson(join(root, 'package-lock.json'));
    const components = [];
    for (const [packagePath, locked] of Object.entries(lock.packages || {})) {
        if (!packagePath || !locked || locked.dev === true || locked.link === true) continue;
        const directory = join(root, ...packagePath.split('/'));
        const manifestPath = join(directory, 'package.json');
        if (!existsSync(manifestPath)) {
            if (locked.optional === true) continue;
            throw new Error(`Falta instalar ${packagePath}; ejecute npm ci antes del inventario.`);
        }
        const manifest = readJson(manifestPath);
        const name = npmPackageName(packagePath, manifest);
        const version = String(manifest.version || locked.version || '0.0.0');
        const repositoryValue = typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url;
        const authorValue = typeof manifest.author === 'string' ? manifest.author : manifest.author?.name;
        components.push({
            ecosystem: 'npm',
            name,
            version,
            license: normalizeLicenseExpression(manifest.license || locked.license),
            authors: authorValue ? [authorValue] : [],
            repository: normalizeRepositoryUrl(repositoryValue || manifest.homepage),
            purl: `pkg:npm/${name.startsWith('@') ? `%40${name.slice(1).split('/').map(encodeURIComponent).join('/')}` : encodeURIComponent(name)}@${encodeURIComponent(version)}`,
            licenseFiles: licenseFilesFor(directory, manifest.licenseFile)
        });
    }
    return components;
}

function manualComponents() {
    const directory = join(root, 'public', 'vendor');
    const licensePath = join(directory, 'LiberationSans-LICENSE.txt');
    return [{
        ecosystem: 'font',
        name: 'Liberation Sans',
        version: 'bundled-2012',
        license: 'OFL-1.1',
        authors: ['Red Hat, Inc.', 'Google Corporation'],
        repository: normalizeRepositoryUrl('https://github.com/liberationfonts/liberation-fonts'),
        purl: 'pkg:generic/liberation-sans@bundled-2012',
        licenseFiles: licenseFilesFor(directory, licensePath).filter(file => file.name === 'LiberationSans-LICENSE.txt')
    }];
}

function componentKey(component) {
    return `${component.ecosystem}:${component.name}@${component.version}`;
}

const packageManifest = readJson(join(root, 'package.json'));
const components = [...cargoComponents(), ...npmComponents(), ...manualComponents()]
    .sort((a, b) => componentKey(a).localeCompare(componentKey(b)));
const duplicates = components.filter((component, index) => index > 0 && componentKey(component) === componentKey(components[index - 1]));
if (duplicates.length) throw new Error(`Componentes duplicados: ${duplicates.map(componentKey).join(', ')}`);

// Algunos paquetes publicados declaran correctamente su SPDX en el manifiesto
// pero omiten el archivo LICENSE del tarball. Para ellos se crea un aviso
// determinista con su atribución y una copia canónica del mismo texto SPDX,
// tomada de otro componente alcanzable que sí lo distribuye.
const canonicalLicenseTexts = new Map();
for (const component of components) {
    if (/^[A-Za-z0-9.+-]+$/u.test(component.license) && component.licenseFiles.length) {
        const shortest = [...component.licenseFiles].sort((a, b) => a.content.length - b.content.length)[0];
        if (!canonicalLicenseTexts.has(component.license)) canonicalLicenseTexts.set(component.license, shortest.content);
    }
}
for (const component of components.filter(item => item.licenseFiles.length === 0 && item.license !== 'NOASSERTION')) {
    const identifiers = [...new Set(component.license.match(/[A-Za-z0-9.+-]+/gu) || [])]
        .filter(identifier => !['AND', 'OR', 'WITH'].includes(identifier));
    const missing = identifiers.filter(identifier => !canonicalLicenseTexts.has(identifier));
    if (missing.length) continue;
    const attribution = [
        `Componente: ${component.name} ${component.version}`,
        `Ecosistema: ${component.ecosystem}`,
        `Licencia declarada: ${component.license}`,
        `Autores/titulares declarados: ${component.authors.join(', ') || 'véase el repositorio upstream'}`,
        `Repositorio: ${component.repository || 'no declarado'}`,
        '',
        ...identifiers.flatMap(identifier => [
            `--- TEXTO CANÓNICO ${identifier} ---`,
            canonicalLicenseTexts.get(identifier).trimEnd(),
            ''
        ])
    ].join('\n');
    const content = normalizeText(attribution);
    component.licenseFiles = [{ name: 'GENERATED-LICENSE-NOTICE.txt', content, sha256: sha256(content) }];
}
const missingLicenseMetadata = components.filter(component => component.license === 'NOASSERTION');
const missingLicenseText = components.filter(component => component.licenseFiles.length === 0);
if (missingLicenseMetadata.length || missingLicenseText.length) {
    const details = [
        ...missingLicenseMetadata.map(component => `${componentKey(component)} sin expresión de licencia`),
        ...missingLicenseText.map(component => `${componentKey(component)} (${component.license}) sin texto de licencia`)
    ];
    throw new Error(`Inventario legal incompleto:\n${details.join('\n')}`);
}

const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    metadata: {
        component: {
            type: 'application',
            name: packageManifest.name,
            version: packageManifest.version,
            licenses: [{ expression: 'LicenseRef-Proprietary' }]
        },
        properties: [
            { name: 'analizadorcualiuy:target', value: target },
            { name: 'analizadorcualiuy:package-lock-sha256', value: sha256(readFileSync(join(root, 'package-lock.json'))) },
            { name: 'analizadorcualiuy:cargo-lock-sha256', value: sha256(readFileSync(join(root, 'src-tauri', 'Cargo.lock'))) }
        ]
    },
    components: components.map(component => ({
        type: component.ecosystem === 'font' ? 'file' : 'library',
        'bom-ref': component.purl,
        name: component.name,
        version: component.version,
        purl: component.purl,
        ...(component.authors.length ? { author: component.authors.join(', ') } : {}),
        licenses: [{ expression: component.license }],
        ...(component.repository ? { externalReferences: [{ type: 'website', url: component.repository }] } : {}),
        properties: [
            { name: 'analizadorcualiuy:ecosystem', value: component.ecosystem },
            ...component.licenseFiles.map(file => ({ name: `analizadorcualiuy:license-file:${file.name}`, value: `sha256:${file.sha256}` }))
        ]
    }))
};

const blobs = new Map();
for (const component of components) {
    for (const file of component.licenseFiles) {
        if (!blobs.has(file.sha256)) blobs.set(file.sha256, { ...file, components: [] });
        blobs.get(file.sha256).components.push(componentKey(component));
    }
}

const noticesLines = [
    'AVISOS DE COMPONENTES DE TERCEROS — ANALIZADORCUALIUY PRO',
    `Inventario reproducible para la versión ${packageManifest.version} (Windows ${target})`,
    '',
    'Este producto incluye software y fuentes de terceros. El EULA de AnalizadorCualiUY Pro no restringe los derechos concedidos por sus licencias.',
    'La lista se genera desde package-lock.json, src-tauri/Cargo.lock, cargo metadata y los paquetes instalados. SBOM.cdx.json contiene el inventario CycloneDX verificable.',
    '',
    `COMPONENTES (${components.length})`,
    ''
];
for (const component of components) {
    noticesLines.push(`- [${component.ecosystem}] ${component.name} ${component.version} — ${component.license}`);
}
noticesLines.push('', `TEXTOS Y AVISOS DE LICENCIA (${blobs.size} contenidos únicos)`, '');
for (const blob of [...blobs.values()].sort((a, b) => a.sha256.localeCompare(b.sha256))) {
    noticesLines.push('='.repeat(78));
    noticesLines.push(`SHA-256: ${blob.sha256}`);
    noticesLines.push(`Archivo fuente: ${blob.name}`);
    noticesLines.push('Componentes:');
    for (const component of blob.components.sort()) noticesLines.push(`  - ${component}`);
    noticesLines.push('='.repeat(78), '', blob.content.trimEnd(), '');
}

const outputs = new Map([
    [sbomPath, normalizeText(JSON.stringify(sbom, null, 2))],
    [noticesPath, normalizeText(noticesLines.join('\n'))]
]);
for (const [path, content] of outputs) {
    if (checkOnly) {
        if (!existsSync(path) || normalizeText(readFileSync(path, 'utf8')) !== content) {
            throw new Error(`${path.split(/[\\/]/u).at(-1)} está desactualizado. Ejecute npm run legal:generate y revise el diff.`);
        }
    } else {
        writeFileSync(path, content, 'utf8');
    }
}
console.log(`${checkOnly ? 'Verificados' : 'Generados'} ${components.length} componentes y ${blobs.size} textos de licencia.`);
