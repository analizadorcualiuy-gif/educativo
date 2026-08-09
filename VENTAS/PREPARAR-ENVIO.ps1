#requires -Version 5.1
$ErrorActionPreference = 'Stop'

function Required([string]$Prompt) {
    do { $value = (Read-Host $Prompt).Trim() } while ([string]::IsNullOrWhiteSpace($value))
    return $value
}
function SafeName([string]$Value) {
    $clean = ($Value -replace '[\\/:*?"<>|]', '-' -replace '\s+', '-').Trim('-')
    return $clean.Substring(0, [Math]::Min(60, $clean.Length))
}

$root = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $root 'entregas-comerciales'
$versions = @(Get-ChildItem $releaseRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending)
if ($versions.Count -eq 0) { throw 'No hay una entrega comercial. Primero ejecute build-release.ps1.' }

Write-Host 'Versiones disponibles:' -ForegroundColor Cyan
for ($i = 0; $i -lt $versions.Count; $i++) { Write-Host "[$($i + 1)] $($versions[$i].Name)" }
do { $selected = Read-Host 'Número de versión' } while ($selected -notmatch '^\d+$' -or [int]$selected -lt 1 -or [int]$selected -gt $versions.Count)
$release = $versions[[int]$selected - 1]
$buyer = Required 'Nombre de la persona, equipo o institución'

Write-Host '[1] Instalador recomendado  [2] Portable  [3] Ambos' -ForegroundColor Cyan
do { $delivery = Read-Host 'Opción' } while ($delivery -notin @('1','2','3'))

$output = Join-Path $PSScriptRoot ("SALIDAS\INSTALADORES\Entrega-Pro-$(Get-Date -Format 'yyyy-MM-dd')-$(SafeName $buyer)")
if (Test-Path $output) { throw "Ya existe: $output. No se sobrescribió nada." }
New-Item -ItemType Directory -Path $output -Force | Out-Null

$setup = Get-ChildItem $release.FullName -File -Filter '*-Setup-*.exe' | Select-Object -First 1
$portable = Get-ChildItem $release.FullName -File -Filter '*-Portable-*.zip' | Select-Object -First 1
if ($delivery -in @('1','3')) { if (-not $setup) { throw 'No se encontró el instalador.' }; Copy-Item $setup.FullName $output }
if ($delivery -in @('2','3')) { if (-not $portable) { throw 'No se encontró la versión portable.' }; Copy-Item $portable.FullName $output }

@('GUIA-INSTALACION-Y-ACTIVACION-WINDOWS.txt','GUIA-INSTALACION-WINDOWS.txt','GUIA-ACTIVACION-LICENCIA.txt','EULA.txt','PRIVACY.md','THIRD_PARTY_NOTICES.txt') | ForEach-Object {
    $source = Join-Path $release.FullName $_
    if (-not (Test-Path $source)) { $source = Join-Path $root $_ }
    if (Test-Path $source) { Copy-Item $source $output }
}
Get-ChildItem $output -File | Where-Object { $_.Extension -in @('.exe','.zip') } | ForEach-Object {
    "$((Get-FileHash $_.FullName -Algorithm SHA256).Hash)  $($_.Name)"
} | Set-Content (Join-Path $output 'VERIFICACION-SHA256.txt') -Encoding UTF8

@"
ENTREGA INICIAL — ANALIZADORCUALIUY PRO
Destinatario: $buyer
Versión: $($release.Name)

Esta carpeta contiene el programa y la documentación, pero no una licencia.
La persona compradora debe instalar, abrir Pro, copiar el código de dispositivo
mostrado y enviarlo junto con el nombre del titular. Luego recibirá el archivo
.acuy-license. No debe enviar documentos de investigación.
"@ | Set-Content (Join-Path $output 'LEER-PRIMERO.txt') -Encoding UTF8

Compress-Archive -Path "$output\*" -DestinationPath "$output.zip" -CompressionLevel Optimal
Write-Host 'Paquete listo para enviar:' -ForegroundColor Green
Write-Host "$output.zip"
Write-Host 'No envíe una licencia antes de recibir el código de dispositivo.' -ForegroundColor Yellow

