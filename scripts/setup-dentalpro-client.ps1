#Requires -RunAsAdministrator

[CmdletBinding()]
param(
    [string]$VmIp,
    [string]$CertificatePath,
    [string]$SshUser = 'dentalclinic',
    [string]$RemoteCertificatePath,
    [string]$HostName = 'dentalpro.clinic',
    [switch]$RefreshCertificateFromVm,
    [switch]$OpenBrowser
)

$ErrorActionPreference = 'Stop'

function Read-RequiredValue {
    param(
        [string]$Prompt,
        [string]$Value
    )

    if (-not [string]::IsNullOrWhiteSpace($Value)) {
        return $Value.Trim()
    }

    do {
        $Value = Read-Host $Prompt
    } while ([string]::IsNullOrWhiteSpace($Value))

    return $Value.Trim()
}

function Test-IPv4Address {
    param([string]$Address)

    $parsed = $null
    if (-not [System.Net.IPAddress]::TryParse($Address, [ref]$parsed)) {
        return $false
    }

    return $parsed.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork
}

$VmIp = Read-RequiredValue -Prompt 'IP privado da VM Ubuntu' -Value $VmIp
if (-not (Test-IPv4Address -Address $VmIp)) {
    throw "O IP '$VmIp' não é um endereço IPv4 válido."
}

if ([string]::IsNullOrWhiteSpace($CertificatePath)) {
    if ($RefreshCertificateFromVm) {
        $CertificatePath = Join-Path $env:USERPROFILE 'Desktop\dentalpro-caddy-root.crt'
    } else {
        $CertificatePath = Read-Host 'Caminho do certificado dentalpro-caddy-root.crt'
    }
}

$CertificatePath = [System.IO.Path]::GetFullPath($CertificatePath)

if ($RefreshCertificateFromVm) {
    $sshCommand = Get-Command ssh.exe -ErrorAction SilentlyContinue
    $scpCommand = Get-Command scp.exe -ErrorAction SilentlyContinue
    if (-not $sshCommand -or -not $scpCommand) {
        throw 'Para atualizar o certificado automaticamente são necessários ssh.exe e scp.exe (OpenSSH Client do Windows).'
    }

    if ([string]::IsNullOrWhiteSpace($RemoteCertificatePath)) {
        $RemoteCertificatePath = "/home/$SshUser/dentalpro-caddy-root.crt"
    }

    $remoteProjectDir = "/home/$SshUser/dentalpro"
    $remoteExportCommand = "cd '$remoteProjectDir' && DENTALPRO_PROJECT_DIR='$remoteProjectDir' DENTALPRO_COMPOSE_PROJECT_NAME='dentalpro-clinic' ./scripts/export-dentalpro-caddy-ca.sh '$RemoteCertificatePath'"
    Write-Host "A exportar o certificado atual da VM $VmIp..." -ForegroundColor Cyan
    # A exportação usa sudo dentro da VM; -tt garante um terminal interativo
    # para que o utilizador possa introduzir a palavra-passe do Ubuntu.
    & $sshCommand.Source '-tt' "$SshUser@$VmIp" $remoteExportCommand
    if ($LASTEXITCODE -ne 0) {
        throw 'Não foi possível exportar o certificado atual na VM.'
    }

    $remoteCertificate = "${SshUser}@${VmIp}:$RemoteCertificatePath"
    & $scpCommand.Source $remoteCertificate $CertificatePath
    if ($LASTEXITCODE -ne 0) {
        throw 'Não foi possível copiar o certificado atualizado da VM.'
    }
    Write-Host "Certificado atualizado copiado para: $CertificatePath" -ForegroundColor Green
}

if (-not (Test-Path -LiteralPath $CertificatePath -PathType Leaf)) {
    throw "Não encontrei o certificado em '$CertificatePath'."
}

$certificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($CertificatePath)
if ($certificate.NotAfter -lt (Get-Date)) {
    throw 'O certificado está expirado.'
}

$thumbprint = ($certificate.Thumbprint -replace '\s', '').ToUpperInvariant()
$fileHash = (Get-FileHash -LiteralPath $CertificatePath -Algorithm SHA256).Hash

Write-Host ''
Write-Host 'Certificado encontrado:' -ForegroundColor Cyan
Write-Host "  Ficheiro:  $CertificatePath"
Write-Host "  Subject:   $($certificate.Subject)"
Write-Host "  Validade:  $($certificate.NotBefore) - $($certificate.NotAfter)"
Write-Host "  Thumbprint: $thumbprint"
Write-Host "  SHA-256:   $fileHash"
Write-Host ''
Write-Host "Este certificado passará a ser confiável neste computador para o endereço $HostName." -ForegroundColor Yellow
$confirmation = Read-Host 'Escreve CONFIRMO para continuar'
if ($confirmation -cne 'CONFIRMO') {
    throw 'Operação cancelada. O certificado não foi instalado.'
}

$rootStorePath = 'Cert:\LocalMachine\Root'
$existingCertificate = Get-ChildItem -Path $rootStorePath | Where-Object {
    ($_.Thumbprint -replace '\s', '').ToUpperInvariant() -eq $thumbprint
} | Select-Object -First 1

if ($existingCertificate) {
    Write-Host 'O certificado já está instalado nas autoridades raiz confiáveis.' -ForegroundColor Green
} else {
    Import-Certificate -FilePath $CertificatePath -CertStoreLocation $rootStorePath | Out-Null
    Write-Host 'Certificado instalado nas autoridades raiz confiáveis.' -ForegroundColor Green
}

$hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
$hostsBackupPath = "$hostsPath.dentalpro-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$hostPattern = '^\s*(?!#)\S+\s+' + [regex]::Escape($HostName) + '(?:\s+#.*)?\s*$'
$hostLines = @(Get-Content -LiteralPath $hostsPath)
$hostLinesWithoutDentalPro = @($hostLines | Where-Object { $_ -notmatch $hostPattern })
$newHostLine = "$VmIp`t$HostName`t# DentalPro VM"

Copy-Item -LiteralPath $hostsPath -Destination $hostsBackupPath -Force
Set-Content -LiteralPath $hostsPath -Value @($hostLinesWithoutDentalPro + $newHostLine) -Encoding ascii
Write-Host "Entrada adicionada ao hosts: $newHostLine" -ForegroundColor Green
Write-Host "Cópia de segurança do hosts: $hostsBackupPath"

ipconfig /flushdns | Out-Null

$resolvedAddresses = @([System.Net.Dns]::GetHostAddresses($HostName) | ForEach-Object { $_.IPAddressToString })
if ($resolvedAddresses -notcontains $VmIp) {
    throw "O nome $HostName não resolveu para $VmIp. Resoluções obtidas: $($resolvedAddresses -join ', ')"
}

$portCheck = Test-NetConnection -ComputerName $VmIp -Port 443 -WarningAction SilentlyContinue
if (-not $portCheck.TcpTestSucceeded) {
    throw "Não foi possível contactar a porta 443 da VM ($VmIp). Verifica a rede e o firewall."
}

try {
    # A CA interna do Caddy não publica CRL/OCSP. O curl continua a validar
    # cadeia, validade e hostname, mas não pode exigir uma verificação de
    # revogação que não existe neste ambiente fechado.
    $curlCommand = Get-Command curl.exe -ErrorAction SilentlyContinue
    if (-not $curlCommand) {
        throw 'Não encontrei curl.exe para validar o HTTPS.'
    }

    $statusCode = & $curlCommand.Source '--noproxy' '*' '--ssl-no-revoke' '--fail' '--silent' '--show-error' '--output' 'NUL' '--write-out' '%{http_code}' "https://$HostName/health"
    if ($LASTEXITCODE -ne 0 -or $statusCode -ne '200') {
        throw "curl terminou com código $LASTEXITCODE e HTTP $statusCode."
    }

    Write-Host "HTTPS funcional: HTTP $statusCode em https://$HostName/health" -ForegroundColor Green
} catch {
    throw "O nome e a porta respondem, mas o pedido HTTPS falhou: $($_.Exception.Message)"
}

Write-Host ''
Write-Host "Configuração concluída. Abre https://$HostName" -ForegroundColor Green
if ($OpenBrowser) {
    Start-Process "https://$HostName"
}
