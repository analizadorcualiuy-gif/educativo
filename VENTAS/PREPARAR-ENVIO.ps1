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
$releaseRoots = @(Join-Path $root 'entregas-comerciales', Join-Path $root 'compilaciones-internas')
$versions = @(
    Get-ChildItem $releaseRoots -Directory -ErrorAction SilentlyContinue |
    Group-Object Name | ForEach-Object {
        $comm = $_.Group | Where-Object { $_.Parent.Name -eq 'entregas-comerciales' }
        if ($comm) { $comm[0] } else { $_.Group[0] }
    } | Sort-Object {
        try { [version]$_.Name } catch { $_.Name }
    } -Descending
)
if ($versions.Count -eq 0) { throw 'No hay entregas comerciales ni compilaciones internas. Primero ejecute build-release.ps1.' }

$latestVersion = $versions[0]
$release = $null

Write-Host "Última versión disponible: $($latestVersion.Name)" -ForegroundColor Cyan
$inputVal = (Read-Host "¿Desea usar la versión $($latestVersion.Name)? [S/n] (Enter para Sí, N para elegir otra versión, o ingrese número/versión directamente)").Trim()

if ([string]::IsNullOrWhiteSpace($inputVal) -or $inputVal -match '^(s|si|sí|y|yes)$') {
    $release = $latestVersion
} elseif ($inputVal -match '^\d+$' -and [int]$inputVal -ge 1 -and [int]$inputVal -le $versions.Count) {
    $release = $versions[[int]$inputVal - 1]
} else {
    $matchedByName = $versions | Where-Object { $_.Name -ieq $inputVal }
    if ($matchedByName) {
        $release = $matchedByName[0]
    }
}

if (-not $release) {
    do {
        Write-Host 'Versiones disponibles:' -ForegroundColor Cyan
        for ($i = 0; $i -lt $versions.Count; $i++) { Write-Host "[$($i + 1)] $($versions[$i].Name)" }
        $selected = (Read-Host "Seleccione por número (ej. 1) o escriba la versión (ej. $($latestVersion.Name))").Trim()

        if ($selected -match '^\d+$' -and [int]$selected -ge 1 -and [int]$selected -le $versions.Count) {
            $release = $versions[[int]$selected - 1]
        } else {
            $matchedByName = $versions | Where-Object { $_.Name -ieq $selected }
            if ($matchedByName) {
                $release = $matchedByName[0]
            }
        }

        if (-not $release) {
            Write-Host "Opción o versión no válida: '$selected'. Intente nuevamente." -ForegroundColor Yellow
        }
    } while (-not $release)
}

Write-Host "Versión seleccionada: $($release.Name)" -ForegroundColor Green
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

