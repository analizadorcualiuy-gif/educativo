# AnalizadorCualiUY Pro - build comercial para Windows
[CmdletBinding()]
param(
    [switch]$AllowUnsigned,
    [string]$CertificateThumbprint = $env:ACUY_CERTIFICATE_THUMBPRINT,
    [string]$TimestampUrl = $env:ACUY_TIMESTAMP_URL
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$temporarySigningConfig = $null
$stagingDir = $null
$releaseCompleted = $false

function Assert-LastExitCode([string]$Message) {
    if ($LASTEXITCODE -ne 0) {
        throw $Message
    }
}

function Get-ManifestVersion([string]$Path) {
    $match = [regex]::Match((Get-Content -LiteralPath $Path -Raw), '(?m)^version\s*=\s*"([^"]+)"')
    if (-not $match.Success) {
        throw "No se pudo leer la versión de $Path."
    }
    return $match.Groups[1].Value
}

function Assert-SigningCertificate([string]$Thumbprint) {
    $normalized = ($Thumbprint -replace '[^0-9A-Fa-f]', '').ToUpperInvariant()
    if ($normalized.Length -ne 40) {
        throw "ACUY_CERTIFICATE_THUMBPRINT debe contener un thumbprint SHA-1 de 40 dígitos hexadecimales."
    }
    $stores = @("Cert:\CurrentUser\My", "Cert:\LocalMachine\My")
    $certificate = foreach ($store in $stores) {
        Get-ChildItem -LiteralPath $store -ErrorAction SilentlyContinue |
            Where-Object { ($_.Thumbprint -replace '\s', '').ToUpperInvariant() -eq $normalized }
    }
    $certificate = @($certificate) | Select-Object -First 1
    if (-not $certificate) {
        throw "No se encontró el certificado de firma $normalized en CurrentUser/My ni LocalMachine/My."
    }
    if (-not $certificate.HasPrivateKey) {
        throw "El certificado de firma no tiene una clave privada accesible."
    }
    $now = Get-Date
    if ($certificate.NotBefore -gt $now -or $certificate.NotAfter -le $now) {
        throw "El certificado de firma todavía no es válido o ya venció."
    }
    $eku = @($certificate.EnhancedKeyUsageList | ForEach-Object { $_.ObjectId.Value })
    if ($eku.Count -gt 0 -and "1.3.6.1.5.5.7.3.3" -notin $eku) {
        throw "El certificado no permite firma de código."
    }
    return @{ Certificate = $certificate; Thumbprint = $normalized }
}

function Assert-TimestampUrl([string]$Value) {
    $uri = $null
    if (-not [Uri]::TryCreate($Value, [UriKind]::Absolute, [ref]$uri) -or
        $uri.Scheme -notin @("http", "https")) {
        throw "ACUY_TIMESTAMP_URL debe ser una URL absoluta HTTP(S) de un servicio RFC 3161/Authenticode."
    }
}

function Assert-AuthenticodeArtifact(
    [string]$Path,
    [string]$ExpectedThumbprint,
    [string]$Label
) {
    $signature = Get-AuthenticodeSignature -LiteralPath $Path
    if ($signature.Status -ne "Valid") {
        throw "$Label no tiene una firma Authenticode válida: $($signature.StatusMessage)"
    }
    if (-not $signature.SignerCertificate -or
        ($signature.SignerCertificate.Thumbprint -replace '\s', '').ToUpperInvariant() -ne $ExpectedThumbprint) {
        throw "$Label fue firmado por un certificado distinto al configurado."
    }
    if (-not $signature.TimeStamperCertificate) {
        throw "$Label no contiene un sello de tiempo verificable."
    }
}

Push-Location -LiteralPath $root
try {
    $package = Get-Content -LiteralPath "package.json" -Raw | ConvertFrom-Json
    if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
        throw "Node.js no está disponible para validar package-lock.json."
    }
    $packageLockVersion = & node -p "require('./package-lock.json').version"
    Assert-LastExitCode "No se pudo validar la versión superior de package-lock.json."
    $packageLockRootVersion = & node -p "require('./package-lock.json').packages[''].version"
    Assert-LastExitCode "No se pudo validar la versión del paquete raíz en package-lock.json."
    $tauriConfig = Get-Content -LiteralPath "src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
    $version = $package.version
    $cargoVersion = Get-ManifestVersion "src-tauri\Cargo.toml"
    if ($version -ne ([string]$packageLockVersion).Trim() -or
        $version -ne ([string]$packageLockRootVersion).Trim() -or
        $version -ne $tauriConfig.version -or
        $version -ne $cargoVersion) {
        throw "Las versiones de package.json, package-lock.json, tauri.conf.json y Cargo.toml deben coincidir."
    }

    $cargoLock = Get-Content -LiteralPath "src-tauri\Cargo.lock" -Raw
    $lockedPackage = [regex]::Match(
        $cargoLock,
        '(?ms)\[\[package\]\]\s*name = "analizador_cuali_uy_pro"\s*version = "([^"]+)"'
    )
    if (-not $lockedPackage.Success -or $lockedPackage.Groups[1].Value -ne $version) {
        throw "Cargo.lock no contiene la versión $version del binario principal."
    }

    $product = "AnalizadorCualiUY-Pro"
    # compilaciones-internas conserva el nombre visible del canal histórico
    # internal-unsigned; entregas-comerciales nunca admite binarios sin firma.
    $channelName = if ($AllowUnsigned) { "compilaciones-internas" } else { "entregas-comerciales" }
    $channel = Join-Path $root $channelName
    $releaseDir = Join-Path $channel $version
    $customerDocuments = @(
        "GUIA-INSTALACION-WINDOWS.txt",
        "GUIA-ACTIVACION-LICENCIA.txt",
        "GUIA-INSTALACION-Y-ACTIVACION-WINDOWS.txt",
        "EULA.txt",
        "PRIVACY.md",
        "THIRD_PARTY_NOTICES.txt",
        "SBOM.cdx.json"
    )
    foreach ($document in $customerDocuments) {
        if (-not (Test-Path -LiteralPath $document -PathType Leaf)) {
            throw "Falta el documento obligatorio $document."
        }
    }
    foreach ($guide in @("GUIA-INSTALACION-WINDOWS.txt", "GUIA-INSTALACION-Y-ACTIVACION-WINDOWS.txt")) {
        $expectedSetupName = "$product-Setup-$version.exe"
        if ((Get-Content -LiteralPath $guide -Raw) -notmatch [regex]::Escape($expectedSetupName)) {
            throw "$guide debe nombrar el instalador vigente $expectedSetupName."
        }
    }

    $expectedThumbprint = $null
    if (-not $AllowUnsigned) {
        if ([string]::IsNullOrWhiteSpace($CertificateThumbprint)) {
            throw "Un release comercial requiere -CertificateThumbprint o ACUY_CERTIFICATE_THUMBPRINT. Use -AllowUnsigned sólo para pruebas internas."
        }
        if ([string]::IsNullOrWhiteSpace($TimestampUrl)) {
            throw "Un release comercial requiere -TimestampUrl o ACUY_TIMESTAMP_URL."
        }
        Assert-TimestampUrl $TimestampUrl
        $signing = Assert-SigningCertificate $CertificateThumbprint
        $expectedThumbprint = $signing.Thumbprint

        $temporarySigningConfig = Join-Path ([IO.Path]::GetTempPath()) "acuy-tauri-signing-$([Guid]::NewGuid().ToString('N')).json"
        $override = @{
            bundle = @{
                windows = @{
                    certificateThumbprint = $expectedThumbprint
                    digestAlgorithm = "sha256"
                    timestampUrl = $TimestampUrl
                }
            }
        } | ConvertTo-Json -Depth 5
        [IO.File]::WriteAllText($temporarySigningConfig, $override, [Text.UTF8Encoding]::new($false))
    }

    if (-not (Get-Command "cargo" -ErrorAction SilentlyContinue)) {
        throw "Cargo no está disponible. Instale Rust stable con soporte MSVC."
    }
    if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
        throw "Node.js/npm no está disponible."
    }
    if (-not (Get-Command "cargo-audit" -ErrorAction SilentlyContinue)) {
        throw "cargo-audit no está instalado. Ejecute cargo install cargo-audit."
    }

    git rev-parse --verify HEAD 2>$null | Out-Null
    Assert-LastExitCode "No existe un commit Git base; el release no es trazable."
    if ((git status --porcelain).Count -ne 0) {
        throw "El árbol Git debe estar limpio antes de generar un release."
    }
    if (-not $AllowUnsigned) {
        $expectedTag = "v$version"
        $actualTag = git describe --exact-match --tags HEAD 2>$null
        if ($LASTEXITCODE -ne 0 -or $actualTag -ne $expectedTag) {
            throw "El release comercial debe generarse desde la etiqueta exacta $expectedTag."
        }
    }

    Write-Host "Compilando $product $version..." -ForegroundColor Cyan
    npm ci
    Assert-LastExitCode "npm ci falló."
    npm test
    Assert-LastExitCode "Las pruebas JavaScript fallaron."
    npm audit --omit=dev --audit-level=high
    Assert-LastExitCode "npm audit detectó vulnerabilidades no aceptables."
    cargo test --locked --manifest-path "src-tauri\Cargo.toml"
    Assert-LastExitCode "Las pruebas Rust fallaron."
    if (-not $AllowUnsigned) {
        cargo audit --file "src-tauri\Cargo.lock" --target-os windows --target-arch x86_64
        Assert-LastExitCode "cargo audit detectó vulnerabilidades aplicables a Windows."
    } else {
        try { & cargo audit --file "src-tauri\Cargo.lock" --target-os windows --target-arch x86_64 2>$null } catch {}
    }
    cargo test --locked --manifest-path "license-core\Cargo.toml"
    Assert-LastExitCode "Las pruebas del verificador de licencias fallaron."
    cargo test --locked --manifest-path "license-admin\Cargo.toml"
    Assert-LastExitCode "Las pruebas de la herramienta emisora fallaron."
    if (-not $AllowUnsigned) {
        cargo audit --file "license-core\Cargo.lock"
        Assert-LastExitCode "RustSec rechazó el verificador de licencias."
        cargo audit --file "license-admin\Cargo.lock" --target-os windows --target-arch x86_64
        Assert-LastExitCode "RustSec rechazó la herramienta emisora."
    } else {
        try { & cargo audit --file "license-core\Cargo.lock" 2>$null } catch {}
        try { & cargo audit --file "license-admin\Cargo.lock" --target-os windows --target-arch x86_64 2>$null } catch {}
    }
    npm run legal:check
    Assert-LastExitCode "El SBOM o los avisos de terceros están incompletos o desactualizados."

    $publicKeyBytes = [Convert]::FromBase64String((Get-Content -LiteralPath "src-tauri\license-public-key.txt" -Raw).Trim())
    if ($publicKeyBytes.Length -ne 32 -or ($publicKeyBytes | Where-Object { $_ -ne 0 }).Count -eq 0) {
        throw "La clave pública Ed25519 del producto no es válida."
    }

    $nsisDirectory = Join-Path $root "src-tauri\target\release\bundle\nsis"
    if (Test-Path -LiteralPath $nsisDirectory) {
        Get-ChildItem -LiteralPath $nsisDirectory -Filter "*_$version_*setup.exe" -File |
            Remove-Item -Force
    }
    if ($AllowUnsigned) {
        & npx --no-install tauri build -- --locked
    } else {
        & npx --no-install tauri build --config $temporarySigningConfig -- --locked
    }
    Assert-LastExitCode "Tauri no pudo completar el build bloqueado."

    $setupCandidates = @(Get-ChildItem -LiteralPath $nsisDirectory -Filter "*_$version_*setup.exe" -File)
    if ($setupCandidates.Count -ne 1) {
        throw "Tauri debía generar exactamente un instalador NSIS para $version; encontró $($setupCandidates.Count)."
    }
    $setup = $setupCandidates[0]
    $exe = Join-Path $root "src-tauri\target\release\analizador_cuali_uy_pro.exe"
    if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) {
        throw "No se encontró el ejecutable release de AnalizadorCualiUY Pro."
    }

    if (-not $AllowUnsigned) {
        Assert-AuthenticodeArtifact $setup.FullName $expectedThumbprint "El instalador"
        Assert-AuthenticodeArtifact (Resolve-Path -LiteralPath $exe).Path $expectedThumbprint "El ejecutable"
    }

    New-Item -ItemType Directory -Path $channel -Force | Out-Null
    $stagingDir = Join-Path $channel ".$version.staging-$([Guid]::NewGuid().ToString('N'))"
    New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null
    $portableDir = Join-Path $stagingDir "$product-Portable"
    $artifactQualifier = if ($AllowUnsigned) { "-INTERNAL-UNSIGNED" } else { "" }
    $setupName = "$($product)$($artifactQualifier)-Setup-$version.exe"
    $portableName = "$($product)$($artifactQualifier)-Portable-$version.zip"
    $setupStaging = Join-Path $stagingDir $setupName
    $portableStaging = Join-Path $stagingDir $portableName

    Copy-Item -LiteralPath $setup.FullName -Destination $setupStaging -Force
    New-Item -ItemType Directory -Path (Join-Path $portableDir "data") -Force | Out-Null
    Copy-Item -LiteralPath $exe -Destination (Join-Path $portableDir "$product.exe") -Force
    foreach ($document in $customerDocuments) {
        Copy-Item -LiteralPath $document -Destination $portableDir -Force
        Copy-Item -LiteralPath $document -Destination $stagingDir -Force
    }
    [IO.File]::WriteAllText((Join-Path $portableDir "portable.flag"), "portable`r`n", [Text.Encoding]::ASCII)
    $versionLabel = if ($AllowUnsigned) {
        "$version (Windows Portable - INTERNAL-UNSIGNED - NO DISTRIBUIR)"
    } else {
        "$version (Windows Portable)"
    }
    [IO.File]::WriteAllText((Join-Path $portableDir "VERSION.txt"), "$versionLabel`r`n", [Text.UTF8Encoding]::new($false))
    $internalNoticeName = "INTERNAL-UNSIGNED-NO-DISTRIBUIR.txt"
    if ($AllowUnsigned) {
        $internalNotice = @"
COMPILACION INTERNA SIN FIRMA - NO DISTRIBUIR NI VENDER
Version: $version

Este artefacto no tiene firma Authenticode ni sello de tiempo. Solo puede usarse
para pruebas internas controladas. El release comercial se genera sin la marca
INTERNAL-UNSIGNED y exige firma valida antes de entrar en entregas-comerciales.
"@
        [IO.File]::WriteAllText((Join-Path $portableDir $internalNoticeName), $internalNotice, [Text.UTF8Encoding]::new($false))
        [IO.File]::WriteAllText((Join-Path $stagingDir $internalNoticeName), $internalNotice, [Text.UTF8Encoding]::new($false))
    }
    Compress-Archive -Path (Join-Path $portableDir "*") -DestinationPath $portableStaging -Force

    $artifacts = @($setupStaging, $portableStaging)
    $checksums = $artifacts | ForEach-Object {
        $hash = Get-FileHash -LiteralPath $_ -Algorithm SHA256
        "$($hash.Hash)  $(Split-Path $_ -Leaf)"
    }
    [IO.File]::WriteAllLines(
        (Join-Path $stagingDir "CHECKSUMS.txt"),
        $checksums,
        [Text.UTF8Encoding]::new($false)
    )
    Remove-Item -LiteralPath $portableDir -Recurse -Force

    $allowed = @($setupName, $portableName, "CHECKSUMS.txt") + $customerDocuments
    if ($AllowUnsigned) { $allowed += $internalNoticeName }
    $extras = Get-ChildItem -LiteralPath $stagingDir -File |
        Where-Object { $_.Name -notin $allowed }
    if ($extras) {
        throw "El directorio de entrega contiene archivos no permitidos: $($extras.Name -join ', ')"
    }
    if (Test-Path -LiteralPath $releaseDir) {
        Remove-Item -LiteralPath $releaseDir -Recurse -Force
    }
    Move-Item -LiteralPath $stagingDir -Destination $releaseDir
    $stagingDir = $null
    $releaseCompleted = $true

    Write-Host "Release generado:" -ForegroundColor Green
    Write-Host "  $(Join-Path $releaseDir $setupName)"
    Write-Host "  $(Join-Path $releaseDir $portableName)"
    Write-Host "  $(Join-Path $releaseDir 'CHECKSUMS.txt')"
} finally {
    if ($temporarySigningConfig -and (Test-Path -LiteralPath $temporarySigningConfig)) {
        Remove-Item -LiteralPath $temporarySigningConfig -Force
    }
    if (-not $releaseCompleted -and $stagingDir -and (Test-Path -LiteralPath $stagingDir)) {
        Remove-Item -LiteralPath $stagingDir -Recurse -Force
    }
    Pop-Location
}
