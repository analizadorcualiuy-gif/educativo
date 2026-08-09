#requires -Version 5.1
$ErrorActionPreference = 'Stop'

function Required([string]$Prompt) {
    do { $value = (Read-Host $Prompt).Trim() } while ([string]::IsNullOrWhiteSpace($value))
    return $value
}
function DeviceCode([string]$Prompt) {
    do {
        $value = (Read-Host $Prompt).Trim().ToLowerInvariant()
        if ($value -notmatch '^[0-9a-f]{32}$') { Write-Host 'Debe tener 32 caracteres hexadecimales.' -ForegroundColor Yellow }
    } while ($value -notmatch '^[0-9a-f]{32}$')
    return $value
}

$root = Split-Path -Parent $PSScriptRoot
$issuer = Join-Path $env:LOCALAPPDATA 'AnalizadorCualiUY-LicenseAdmin\issuer.license-key'
$public = Join-Path $root 'src-tauri\license-public-key.txt'
if (-not (Test-Path $issuer)) { throw 'No se encontró la clave emisora privada. No se emitió ninguna licencia.' }
if (-not (Test-Path $public)) { throw 'No se encontró la clave pública del producto.' }

$holder = Required 'Titular de la licencia'
$saleId = Required 'ID de venta (ejemplo: ACUY-2026-0001)'
if ($saleId -notmatch '^[A-Za-z0-9_-]{4,64}$') { throw 'ID de venta inválido.' }
Write-Host '[1] Pro Individual   [2] Pro Equipo (3 licencias)' -ForegroundColor Cyan
do { $plan = Read-Host 'Modalidad' } while ($plan -notin @('1','2'))
$count = if ($plan -eq '1') { 1 } else { 3 }
$planLabel = if ($count -eq 1) { 'Pro Individual' } else { 'Pro Equipo (3 licencias)' }

$output = Join-Path $PSScriptRoot "SALIDAS\LICENCIAS\$saleId"
if (Test-Path $output) { throw "Ya existe: $output. No se sobrescribió ninguna licencia." }
New-Item -ItemType Directory -Path $output -Force | Out-Null
$issued = @()

Push-Location $root
try {
    for ($i = 1; $i -le $count; $i++) {
        Write-Host "Computadora $i de $count" -ForegroundColor Cyan
        $device = DeviceCode 'Código de dispositivo recibido'
        $licenseId = if ($count -eq 1) { $saleId } else { "$saleId-$('{0:d2}' -f $i)" }
        $file = Join-Path $output "$licenseId.acuy-license"

        & cargo run --quiet --manifest-path 'license-admin\Cargo.toml' -- issue $issuer $file $licenseId $holder $device never
        if ($LASTEXITCODE -ne 0) { throw "Falló la emisión de $licenseId." }
        & cargo run --quiet --manifest-path 'license-admin\Cargo.toml' -- verify $file $public $device
        if ($LASTEXITCODE -ne 0) { throw "La verificación de $licenseId falló. No envíe ese archivo." }
        $issued += [PSCustomObject]@{ Id = $licenseId; Archivo = (Split-Path $file -Leaf); Dispositivo = $device }
    }
}
finally { Pop-Location }

@"
LICENCIAS LISTAS PARA ENVIAR
Titular: $holder
Modalidad: $planLabel
ID de venta: $saleId
Fecha: $(Get-Date -Format 'yyyy-MM-dd')

Cada archivo fue emitido y verificado para el código de dispositivo indicado.
Envíe a cada persona únicamente su archivo .acuy-license junto con
GUIA-ACTIVACION-LICENCIA.txt.

Nunca envíe esta carpeta VENTAS, estos scripts ni la clave emisora.
"@ | Set-Content (Join-Path $output 'LEER-ANTES-DE-ENVIAR.txt') -Encoding UTF8
$issued | Format-Table -AutoSize | Out-String | Set-Content (Join-Path $output 'REGISTRO-PRIVADO-DE-EMISION.txt') -Encoding UTF8
Copy-Item (Join-Path $root 'GUIA-ACTIVACION-LICENCIA.txt') $output

Write-Host 'Licencias emitidas y verificadas:' -ForegroundColor Green
Get-ChildItem $output -Filter '*.acuy-license' | ForEach-Object { Write-Host $_.Name }
Write-Host "Carpeta privada: $output" -ForegroundColor Yellow

