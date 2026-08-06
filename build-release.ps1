# AnalizadorCualiUY Pro - build comercial para Windows
param(
    [switch]$AllowUnsigned
)

$ErrorActionPreference = "Stop"

$package = Get-Content "package.json" -Raw | ConvertFrom-Json
$version = $package.version
$product = "AnalizadorCualiUY-Pro"
$channel = if ($AllowUnsigned) { "internal-unsigned" } else { "release" }
$releaseDir = Join-Path $channel $version
$portableDir = Join-Path $releaseDir "$product-Portable"
$setupOutput = Join-Path $releaseDir "$product-Setup-$version.exe"
$portableOutput = Join-Path $releaseDir "$product-Portable-$version.zip"

Write-Host "Compilando $product $version..." -ForegroundColor Cyan

if (-not (Get-Command "cargo" -ErrorAction SilentlyContinue)) {
    throw "Cargo no está disponible. Instale Rust stable con soporte MSVC."
}
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    throw "Node.js/npm no está disponible."
}
git rev-parse --verify HEAD 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { throw "No existe un commit Git base; el release no es trazable." }
if ((git status --porcelain).Count -ne 0) { throw "El árbol Git debe estar limpio antes de generar un release." }
if (-not $AllowUnsigned) {
    $expectedTag = "v$version"
    $actualTag = git describe --exact-match --tags HEAD 2>$null
    if ($LASTEXITCODE -ne 0 -or $actualTag -ne $expectedTag) {
        throw "El release comercial debe generarse desde la etiqueta exacta $expectedTag."
    }
}

npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci falló." }
npm test
if ($LASTEXITCODE -ne 0) { throw "Las pruebas JavaScript fallaron." }
npm audit --omit=dev --audit-level=high
if ($LASTEXITCODE -ne 0) { throw "npm audit detectó vulnerabilidades no aceptables." }
cargo test --locked --manifest-path "src-tauri\Cargo.toml"
if ($LASTEXITCODE -ne 0) { throw "Las pruebas Rust fallaron." }
cargo audit --file "src-tauri\Cargo.lock" --target-os windows --target-arch x86_64
if ($LASTEXITCODE -ne 0) { throw "cargo audit detectó vulnerabilidades aplicables a Windows." }
cargo test --locked --manifest-path "license-core\Cargo.toml"
if ($LASTEXITCODE -ne 0) { throw "Las pruebas del verificador de licencias fallaron." }
cargo test --locked --manifest-path "license-admin\Cargo.toml"
if ($LASTEXITCODE -ne 0) { throw "Las pruebas de la herramienta emisora fallaron." }
cargo audit --file "license-core\Cargo.lock"
if ($LASTEXITCODE -ne 0) { throw "RustSec rechazó el verificador de licencias." }
cargo audit --file "license-admin\Cargo.lock" --target-os windows --target-arch x86_64
if ($LASTEXITCODE -ne 0) { throw "RustSec rechazó la herramienta emisora." }
$publicKeyBytes = [Convert]::FromBase64String((Get-Content "src-tauri\license-public-key.txt" -Raw).Trim())
if ($publicKeyBytes.Length -ne 32 -or ($publicKeyBytes | Where-Object { $_ -ne 0 }).Count -eq 0) {
    throw "La clave pública Ed25519 del producto no es válida."
}

if (Test-Path $releaseDir) { Remove-Item $releaseDir -Recurse -Force }
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }
New-Item -ItemType Directory -Path "dist\public\vendor" -Force | Out-Null

Copy-Item "index.html", "styles.css", "project-integrity.js", "analytics.js", "pdf-report.js", "docx-export.js" -Destination "dist" -Force
Copy-Item "public\logo.png" -Destination "dist\public" -Force
Copy-Item "public\vendor\mammoth.browser.min.js", "public\vendor\pdf-lib.min.js", "public\vendor\fontkit.umd.min.js", "public\vendor\LiberationSans-Regular.ttf", "public\vendor\LiberationSans-Bold.ttf", "public\vendor\pdf-lib-LICENSE.txt", "public\vendor\fontkit-LICENSE.txt", "public\vendor\LiberationSans-LICENSE.txt" -Destination "dist\public\vendor" -Force
npx terser app.js -o dist\app.js --compress --mangle
npx tauri build -- --locked
if ($LASTEXITCODE -ne 0) { throw "Tauri no pudo completar el build bloqueado." }

$setup = Get-ChildItem "src-tauri\target\release\bundle\nsis" -Filter "*-setup.exe" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if (-not $setup) { throw "Tauri no generó un instalador NSIS." }
Copy-Item $setup.FullName -Destination $setupOutput -Force

$setupSignature = Get-AuthenticodeSignature $setupOutput
if ($setupSignature.Status -ne "Valid" -and -not $AllowUnsigned) {
    throw "El instalador no tiene una firma Authenticode válida. Configure la firma de código o use -AllowUnsigned únicamente para pruebas internas."
}

$exeCandidates = @(
    "src-tauri\target\release\analizador_cuali_uy_pro.exe",
    "src-tauri\target\release\AnalizadorCualiUY Pro.exe"
)
$exe = $exeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $exe) { throw "No se encontró el ejecutable release de AnalizadorCualiUY Pro." }
$exeSignature = Get-AuthenticodeSignature $exe
if ($exeSignature.Status -ne "Valid" -and -not $AllowUnsigned) {
    throw "El ejecutable no tiene una firma Authenticode válida. Configure la firma de código o use -AllowUnsigned únicamente para pruebas internas."
}

if (Test-Path $portableDir) { Remove-Item $portableDir -Recurse -Force }
New-Item -ItemType Directory -Path "$portableDir\data" -Force | Out-Null
Copy-Item $exe -Destination "$portableDir\AnalizadorCualiUY-Pro.exe" -Force
Copy-Item "EULA.txt", "PRIVACY.md", "THIRD_PARTY_NOTICES.txt" -Destination $portableDir -Force
"portable" | Set-Content "$portableDir\portable.flag" -Encoding ascii
"$version (Windows Portable)" | Set-Content "$portableDir\VERSION.txt" -Encoding utf8
Compress-Archive -Path "$portableDir\*" -DestinationPath $portableOutput -Force

$artifacts = @($setupOutput, $portableOutput)
$checksums = $artifacts | ForEach-Object {
    $hash = Get-FileHash $_ -Algorithm SHA256
    "$($hash.Hash)  $($_)"
}
$checksums | Set-Content (Join-Path $releaseDir "CHECKSUMS.txt") -Encoding utf8
if (Test-Path $portableDir) { Remove-Item $portableDir -Recurse -Force }

$allowed = @(
    (Split-Path $setupOutput -Leaf),
    (Split-Path $portableOutput -Leaf),
    "CHECKSUMS.txt"
)
$extras = Get-ChildItem $releaseDir -File | Where-Object { $_.Name -notin $allowed }
if ($extras) { throw "El directorio de entrega contiene archivos no permitidos: $($extras.Name -join ', ')" }

Write-Host "Release generado:" -ForegroundColor Green
$artifacts | ForEach-Object { Write-Host "  $_" }
Write-Host "  $(Join-Path $releaseDir 'CHECKSUMS.txt')"
