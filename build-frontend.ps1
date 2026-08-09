[CmdletBinding()]
param(
    [ValidateSet("dist", "dist-dev")]
    [string]$OutputDirectory = "dist",
    [switch]$Minify
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$output = Join-Path $root $OutputDirectory
$allowedOutputs = @(
    [IO.Path]::GetFullPath((Join-Path $root "dist")),
    [IO.Path]::GetFullPath((Join-Path $root "dist-dev"))
)
if ([IO.Path]::GetFullPath($output) -notin $allowedOutputs) {
    throw "La carpeta de salida no está permitida."
}

$rootFiles = @(
    "index.html",
    "styles.css",
    "project-integrity.js",
    "analytics.js",
    "pdf-loader.js",
    "pdf-report.js",
    "docx-export.js",
    "EULA.txt"
)
$vendorFiles = @(
    "mammoth.browser.min.js",
    "pdf.mjs",
    "pdf.worker.mjs",
    "pdfjs-LICENSE.txt",
    "pdf-lib.min.js",
    "fontkit.umd.min.js",
    "LiberationSans-Regular.ttf",
    "LiberationSans-Bold.ttf",
    "pdf-lib-LICENSE.txt",
    "fontkit-LICENSE.txt",
    "LiberationSans-LICENSE.txt"
)
$vendorDirectories = @("cmaps", "standard_fonts", "wasm")

foreach ($relativePath in $rootFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $root $relativePath) -PathType Leaf)) {
        throw "Falta un recurso obligatorio del frontend: $relativePath"
    }
}
foreach ($relativePath in $vendorFiles) {
    $source = Join-Path $root (Join-Path "public\vendor" $relativePath)
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Falta un recurso vendor obligatorio: $relativePath"
    }
}
foreach ($relativePath in $vendorDirectories) {
    $source = Join-Path $root (Join-Path "public\vendor" $relativePath)
    if (-not (Test-Path -LiteralPath $source -PathType Container)) {
        throw "Falta una carpeta vendor obligatoria: $relativePath"
    }
}

if (Test-Path -LiteralPath $output) {
    Remove-Item -LiteralPath $output -Recurse -Force
}
New-Item -ItemType Directory -Path (Join-Path $output "public\vendor") -Force | Out-Null

foreach ($relativePath in $rootFiles) {
    Copy-Item -LiteralPath (Join-Path $root $relativePath) -Destination $output -Force
}
Copy-Item -LiteralPath (Join-Path $root "public\logo.png") -Destination (Join-Path $output "public") -Force
foreach ($relativePath in $vendorFiles) {
    Copy-Item -LiteralPath (Join-Path $root (Join-Path "public\vendor" $relativePath)) -Destination (Join-Path $output "public\vendor") -Force
}
foreach ($relativePath in $vendorDirectories) {
    Copy-Item -LiteralPath (Join-Path $root (Join-Path "public\vendor" $relativePath)) -Destination (Join-Path $output "public\vendor") -Recurse -Force
}

if ($Minify) {
    $terser = Join-Path $root "node_modules\.bin\terser.cmd"
    if (-not (Test-Path -LiteralPath $terser -PathType Leaf)) {
        throw "Terser no está instalado. Ejecute npm ci antes de compilar."
    }
    & $terser (Join-Path $root "app.js") -o (Join-Path $output "app.js") --compress --mangle
    if ($LASTEXITCODE -ne 0) {
        throw "Terser no pudo generar app.js."
    }
} else {
    Copy-Item -LiteralPath (Join-Path $root "app.js") -Destination $output -Force
}

Write-Host "Frontend generado en $output" -ForegroundColor Green
