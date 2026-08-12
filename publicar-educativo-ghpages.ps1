#requires -Version 5.1
$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
Push-Location $root
try {
    Write-Host "Construyendo edicion educativa..." -ForegroundColor Cyan
    & "$root\build-educational.ps1"

    $tmp = Join-Path $env:TEMP "gh-pages-educativo-deploy"
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    New-Item -ItemType Directory -Path $tmp -Force | Out-Null

    Copy-Item "$root\dist-educativa\*" -Destination $tmp -Recurse -Force

    Push-Location $tmp
    try {
        & git init
        & git checkout -b gh-pages
        & git add .
        & git commit -m "deploy: publicar edicion educativa gratuita en gh-pages"
        & git remote add origin https://github.com/analizadorcualiuy-gif/educativo.git
        & git push origin gh-pages --force
        Write-Host "Publicacion exitosa en la rama gh-pages del repositorio educativo.git!" -ForegroundColor Green
    }
    finally {
        Pop-Location
        Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
finally {
    Pop-Location
}
