#requires -Version 5.1
$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
Push-Location $root
try {
    Write-Host "Construyendo edicion Beta..." -ForegroundColor Cyan
    & "$root\build-beta.ps1"

    $tmp = Join-Path $env:TEMP "gh-pages-beta-deploy"
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    New-Item -ItemType Directory -Path $tmp -Force | Out-Null

    Copy-Item "$root\dist-beta\*" -Destination $tmp -Recurse -Force

    Push-Location $tmp
    try {
        & git init
        & git checkout -b main
        & git add .
        & git commit -m "deploy: publicar edicion beta en github pages"
        & git remote add origin https://github.com/analizadorcualiuy-gif/analizadorcualuybeta.git
        & git push origin main --force
        & git checkout -b gh-pages
        & git push origin gh-pages --force
        Write-Host "Publicacion exitosa de la Beta en GitHub Pages!" -ForegroundColor Green
    }
    finally {
        Pop-Location
        Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
finally {
    Pop-Location
}
