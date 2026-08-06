# AnalizadorCualiUY Beta - sitio web estático publicable
$ErrorActionPreference = "Stop"

$source = "web-beta"
$output = "dist-beta"

if (-not (Test-Path "$source\index.html")) {
    throw "No se encontró la fuente de la beta en $source."
}
if (-not (Test-Path "node_modules\.bin\terser.cmd")) {
    throw "Falta Terser. Ejecute npm ci en AnalizadorCualiUY-Pro."
}

if (Test-Path $output) { Remove-Item $output -Recurse -Force }
New-Item -ItemType Directory -Path "$output\public\vendor" -Force | Out-Null

Copy-Item "$source\index.html", "$source\styles.css", "$source\project-integrity.js", "$source\analytics.js", "$source\pdf-report.js", "$source\pdf-loader.js" -Destination $output -Force
Copy-Item "$source\public\logo.png" -Destination "$output\public\logo.png" -Force
Copy-Item "$source\public\vendor\mammoth.browser.min.js", "$source\public\vendor\pdf.mjs", "$source\public\vendor\pdf.worker.mjs", "$source\public\vendor\pdfjs-LICENSE.txt", "$source\public\vendor\pdf-lib.min.js", "$source\public\vendor\fontkit.umd.min.js", "$source\public\vendor\LiberationSans-Regular.ttf", "$source\public\vendor\LiberationSans-Bold.ttf", "$source\public\vendor\pdf-lib-LICENSE.txt", "$source\public\vendor\fontkit-LICENSE.txt", "$source\public\vendor\LiberationSans-LICENSE.txt" -Destination "$output\public\vendor" -Force
Copy-Item "$source\public\vendor\cmaps", "$source\public\vendor\standard_fonts", "$source\public\vendor\wasm" -Destination "$output\public\vendor" -Recurse -Force

& "node_modules\.bin\terser.cmd" "$source\app.js" -o "$output\app.js" --compress passes=2 --mangle
if ($LASTEXITCODE -ne 0) { throw "Terser no pudo construir la beta." }

$forbidden = @(
    "DocxExporter",
    "exportCategoricalMatrixCSV",
    "exportGraphPNG",
    "exportGraphSVG",
    "btn-export-docx",
    "btn-export-csv",
    "btn-export-report-docx"
)
$bundle = Get-Content "$output\app.js" -Raw
foreach ($term in $forbidden) {
    if ($bundle.Contains($term)) {
        throw "El bundle beta conserva una referencia premium no permitida: $term"
    }
}

Copy-Item "$source\BETA-LICENSE.txt", "$source\THIRD_PARTY_NOTICES.txt", "$source\PRIVACY-BETA.html", "$source\_headers", "$source\README.md" -Destination $output -Force
Write-Host "Beta web generada en $output" -ForegroundColor Green
