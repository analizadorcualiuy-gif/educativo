#requires -Version 5.1
$ErrorActionPreference = 'Stop'

function SafeName([string]$Value) {
    $clean = ($Value -replace '[\\/:*?"<>|]', '-' -replace '\s+', '-').Trim('-')
    return $clean.Substring(0, [Math]::Min(60, $clean.Length))
}

$root = Split-Path -Parent $PSScriptRoot
$builder = Join-Path $root 'build-beta.ps1'
if (-not (Test-Path $builder)) { throw 'No se encontró build-beta.ps1.' }

Write-Host 'Actualizando la Beta...' -ForegroundColor Cyan
Push-Location $root
try {
    & $builder
    if ($LASTEXITCODE -ne 0) { throw 'La Beta no pudo construirse.' }
}
finally { Pop-Location }

$campaign = (Read-Host 'Nombre corto de campaña o publicación (opcional)').Trim()
if ([string]::IsNullOrWhiteSpace($campaign)) { $campaign = 'Demo' }

$output = Join-Path $PSScriptRoot ("SALIDAS\AnalizadorCualiUY-Beta-$(Get-Date -Format 'yyyy-MM-dd')-$(SafeName $campaign)")
if (Test-Path $output) { throw "Ya existe: $output. No se sobrescribió nada." }
New-Item -ItemType Directory -Path $output -Force | Out-Null
Copy-Item (Join-Path $root 'dist-beta') -Destination (Join-Path $output 'Beta') -Recurse

@'
@echo off
setlocal
cd /d "%~dp0"
where python >nul 2>&1
if errorlevel 1 (
  echo Esta demo local necesita Python instalado.
  echo Solicite un enlace web si no cuenta con Python.
  pause
  exit /b 1
)
start "AnalizadorCualiUY Beta" http://localhost:4173
echo La Beta se abrira en el navegador. Para cerrarla, cierre esta ventana.
python -m http.server 4173 --directory "%~dp0Beta"
'@ | Set-Content (Join-Path $output 'ABRIR-DEMO-BETA-WINDOWS.cmd') -Encoding ASCII

@"
DEMO DE ANALIZADORCUALIUY BETA

1. Extraiga el ZIP completo.
2. Haga doble clic en ABRIR-DEMO-BETA-WINDOWS.cmd.
3. Espere a que se abra el navegador.
4. Para cerrar la demo, cierre la ventana negra.

La Beta permite 1 documento, hasta 10.000 palabras y 4 categorías.
La exportación PDF se identifica como versión de evaluación.

Para enviar por mensajería, comparta el ZIP. Esta demo local requiere Python.
Para LinkedIn y redes, publique el contenido de la carpeta Beta en un sitio web
estático y comparta el enlace. Nunca publique el proyecto Pro ni VENTAS.
"@ | Set-Content (Join-Path $output 'LEER-PRIMERO.txt') -Encoding UTF8

Compress-Archive -Path "$output\*" -DestinationPath "$output.zip" -CompressionLevel Optimal
Write-Host 'Demo lista para compartir:' -ForegroundColor Green
Write-Host "$output.zip"

