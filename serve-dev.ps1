[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
& (Join-Path $root "build-frontend.ps1") -OutputDirectory "dist-dev"

$python = Get-Command "python" -ErrorAction SilentlyContinue
if (-not $python) {
    throw "Python no está disponible para servir el frontend de desarrollo."
}

# La raíz contiene únicamente artefactos públicos y el socket sólo escucha en
# loopback. Así no se exponen el repositorio, las claves de desarrollo ni docs.
& $python.Source -m http.server 1420 --bind 127.0.0.1 --directory (Join-Path $root "dist-dev")
exit $LASTEXITCODE
