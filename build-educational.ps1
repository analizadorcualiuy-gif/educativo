# AnalizadorCualiUY Educativa - sitio web estático para uso formativo
$ErrorActionPreference = 'Stop'

$source = 'web-beta'
$output = 'dist-educativa'

if (-not (Test-Path "$source\index.html")) { throw 'No se encontró la fuente de la beta.' }
if (-not (Test-Path 'node_modules\.bin\terser.cmd')) { throw 'Falta Terser. Ejecute npm ci en AnalizadorCualiUY-Pro.' }

if (Test-Path $output) { Remove-Item $output -Recurse -Force }
New-Item -ItemType Directory -Path "$output\public\vendor" -Force | Out-Null

Copy-Item "$source\index.html", "$source\styles.css", "$source\project-integrity.js", "$source\analytics.js", "$source\pdf-report.js", "$source\pdf-loader.js", "$source\educational.js", "$source\educational.css" -Destination $output -Force
Copy-Item "$source\public\logo.png" -Destination "$output\public\logo.png" -Force
Copy-Item "$source\public\vendor\mammoth.browser.min.js", "$source\public\vendor\pdf.mjs", "$source\public\vendor\pdf.worker.mjs", "$source\public\vendor\pdfjs-LICENSE.txt", "$source\public\vendor\pdf-lib.min.js", "$source\public\vendor\fontkit.umd.min.js", "$source\public\vendor\LiberationSans-Regular.ttf", "$source\public\vendor\LiberationSans-Bold.ttf", "$source\public\vendor\pdf-lib-LICENSE.txt", "$source\public\vendor\fontkit-LICENSE.txt", "$source\public\vendor\LiberationSans-LICENSE.txt" -Destination "$output\public\vendor" -Force
Copy-Item "$source\public\vendor\cmaps", "$source\public\vendor\standard_fonts", "$source\public\vendor\wasm" -Destination "$output\public\vendor" -Recurse -Force

& 'node_modules\.bin\terser.cmd' "$source\app.js" -o "$output\app.js" --compress passes=2 --mangle
if ($LASTEXITCODE -ne 0) { throw 'Terser no pudo construir la edición educativa.' }

$html = Get-Content "$output\index.html" -Raw
$html = $html.Replace('AnalizadorCualiUY Beta - Análisis Cualitativo Local', 'AnalizadorCualiUY Educativa - Aprender Análisis Cualitativo')
$html = $html.Replace('Beta gratuita de AnalizadorCualiUY: análisis cualitativo local y confidencial con exportación a PDF.', 'Edición educativa de AnalizadorCualiUY: aprende análisis cualitativo guiado, local y con exportación PDF formativa.')
$html = $html.Replace('Versión Beta', 'Edición Educativa').Replace('AnalizadorCualiUY Beta', 'AnalizadorCualiUY Educativa').Replace('AnalizadorCualiUY BETA', 'AnalizadorCualiUY EDUCATIVA').Replace('BETA-LICENSE.txt', 'EDUCATIONAL-LICENSE.txt')
$html = $html.Replace('<link rel="stylesheet" href="styles.css">', '<link rel="stylesheet" href="styles.css">' + [Environment]::NewLine + '    <link rel="stylesheet" href="educational.css">')
$html = $html.Replace('<script src="app.js"></script>', '<script src="app.js"></script>' + [Environment]::NewLine + '    <script src="educational.js"></script>')
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "$output\index.html"), $html, [System.Text.UTF8Encoding]::new($false))

$pdf = Get-Content "$output\pdf-report.js" -Raw
$pdf = $pdf.Replace('VERSIÓN BETA — INFORME DE EVALUACIÓN', 'EDICIÓN EDUCATIVA — MATERIAL FORMATIVO')
$pdf = $pdf.Replace('AnalizadorCualiUY Beta | Uso de evaluación', 'AnalizadorCualiUY Educativa | Uso formativo')
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "$output\pdf-report.js"), $pdf, [System.Text.UTF8Encoding]::new($false))

Copy-Item "$source\BETA-LICENSE.txt", "$source\THIRD_PARTY_NOTICES.txt", "$source\PRIVACY-BETA.html", "$source\_headers", "$source\README.md", 'GUIA-PRUEBA-BETA-WINDOWS.txt' -Destination $output -Force
Rename-Item "$output\BETA-LICENSE.txt" 'EDUCATIONAL-LICENSE.txt'
$license = Get-Content "$output\EDUCATIONAL-LICENSE.txt" -Raw
$license = $license.Replace('Versión Beta', 'Edición Educativa').Replace('Beta', 'Educativa').Replace('evaluación', 'uso formativo')
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "$output\EDUCATIONAL-LICENSE.txt"), $license, [System.Text.UTF8Encoding]::new($false))

Write-Host 'Edición educativa generada en dist-educativa' -ForegroundColor Green
