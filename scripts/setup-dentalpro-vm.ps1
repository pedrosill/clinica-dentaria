[CmdletBinding()]
param(
  [string]$VmName = 'DentalPro-Test',
  [ValidateRange(2048, 16384)]
  [int]$MemoryMb = 4096,
  [ValidateRange(1, 4)]
  [int]$CpuCount = 2,
  [ValidateRange(30, 200)]
  [int]$DiskSizeGb = 60,
  [string]$IsoDirectory = (Join-Path $PSScriptRoot '..\tmp\ubuntu'),
  [string]$NetworkAdapterName = '',
  [switch]$SkipIsoDownload
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$UbuntuVersion = '24.04.5'
$IsoFileName = "ubuntu-$UbuntuVersion-live-server-amd64.iso"
$IsoUrl = "https://releases.ubuntu.com/$UbuntuVersion/$IsoFileName"
$ChecksumsUrl = "https://releases.ubuntu.com/$UbuntuVersion/SHA256SUMS"

function Invoke-VBoxManage {
  param([Parameter(Mandatory)][string[]]$Arguments)

  & $script:VBoxManage @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "VBoxManage falhou com o código ${LASTEXITCODE}: $($Arguments -join ' ')"
  }
}

function Resolve-VBoxManage {
  $command = Get-Command VBoxManage.exe -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $knownPath = Join-Path ${env:ProgramFiles} 'Oracle\VirtualBox\VBoxManage.exe'
  if (Test-Path $knownPath) { return $knownPath }

  throw 'Não encontrei VBoxManage. Instala primeiro o VirtualBox através de Windows hosts e volta a executar este script.'
}

function Select-NetworkAdapter {
  if ($NetworkAdapterName) {
    $adapter = Get-NetAdapter -Name $NetworkAdapterName -ErrorAction SilentlyContinue
    if (-not $adapter) { throw "O adaptador '$NetworkAdapterName' não foi encontrado." }
    if ($adapter.Status -ne 'Up') { throw "O adaptador '$NetworkAdapterName' não está ativo." }
    return $adapter.Name
  }

  $adapters = @(Get-NetAdapter | Where-Object Status -eq 'Up' | Sort-Object ifIndex)
  if ($adapters.Count -eq 0) { throw 'Não encontrei nenhum adaptador de rede ativo.' }
  if ($adapters.Count -eq 1) { return $adapters[0].Name }

  Write-Host 'Adaptadores de rede ativos:'
  for ($index = 0; $index -lt $adapters.Count; $index++) {
    Write-Host "[$($index + 1)] $($adapters[$index].Name) ($($adapters[$index].InterfaceDescription))"
  }

  $selection = [int](Read-Host 'Escolhe o número do adaptador ligado à rede da clínica')
  if ($selection -lt 1 -or $selection -gt $adapters.Count) {
    throw 'Seleção de adaptador inválida.'
  }

  return $adapters[$selection - 1].Name
}

function Get-VerifiedIso {
  New-Item -ItemType Directory -Path $IsoDirectory -Force | Out-Null
  $isoPath = Join-Path (Resolve-Path $IsoDirectory) $IsoFileName
  $checksumPath = Join-Path (Resolve-Path $IsoDirectory) 'SHA256SUMS'

  if (-not $SkipIsoDownload -and -not (Test-Path $isoPath)) {
    Write-Host "A descarregar Ubuntu Server $UbuntuVersion..."
    Invoke-WebRequest -Uri $IsoUrl -OutFile $isoPath
  }

  if (-not (Test-Path $isoPath)) {
    throw "ISO não encontrado: $isoPath"
  }

  if (-not $SkipIsoDownload -or -not (Test-Path $checksumPath)) {
    Invoke-WebRequest -Uri $ChecksumsUrl -OutFile $checksumPath
  }

  $checksumLine = Get-Content $checksumPath | Where-Object { $_ -match [regex]::Escape($IsoFileName) } | Select-Object -First 1
  if (-not $checksumLine) { throw "Não encontrei o checksum do ISO $IsoFileName." }

  $expectedHash = ($checksumLine -split '\s+')[0].ToLowerInvariant()
  $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $isoPath).Hash.ToLowerInvariant()
  if ($expectedHash -ne $actualHash) {
    throw "O checksum do ISO não corresponde. Esperado: $expectedHash; obtido: $actualHash"
  }

  Write-Host "ISO verificado: $isoPath"
  return (Resolve-Path $isoPath).Path
}

function Test-VmExists {
  $output = & $VBoxManage list vms
  return [bool]($output | Where-Object { $_ -match ('"' + [regex]::Escape($VmName) + '"') })
}

$VBoxManage = Resolve-VBoxManage
$networkAdapter = Select-NetworkAdapter
$isoPath = Get-VerifiedIso

if (Test-VmExists) {
  throw "A VM '$VmName' já existe. Para evitar apagar dados, o script não a substitui. Usa outro -VmName ou remove a VM manualmente depois de confirmares que não contém dados importantes."
}

$vmDirectory = Join-Path (Join-Path $env:USERPROFILE 'VirtualBox VMs') $VmName
$diskPath = Join-Path $vmDirectory "$VmName.vdi"
$diskSizeMb = $DiskSizeGb * 1024

Write-Host "A criar VM '$VmName' com $CpuCount CPU(s), $MemoryMb MB RAM e disco de $DiskSizeGb GB..."
Invoke-VBoxManage @('createvm', '--name', $VmName, '--ostype', 'Ubuntu_64', '--register')
Invoke-VBoxManage @('modifyvm', $VmName, '--memory', $MemoryMb, '--cpus', $CpuCount, '--vram', '16', '--ioapic', 'on', '--firmware', 'efi', '--boot1', 'dvd', '--boot2', 'disk', '--nic1', 'bridged', '--bridgeadapter1', $networkAdapter, '--audio-enabled', 'off', '--usb', 'off')
Invoke-VBoxManage @('storagectl', $VmName, '--name', 'SATA', '--add', 'sata', '--controller', 'IntelAhci')
Invoke-VBoxManage @('createhd', '--filename', $diskPath, '--size', $diskSizeMb, '--format', 'VDI', '--variant', 'Standard')
Invoke-VBoxManage @('storageattach', $VmName, '--storagectl', 'SATA', '--port', '0', '--device', '0', '--type', 'hdd', '--medium', $diskPath)
Invoke-VBoxManage @('storageattach', $VmName, '--storagectl', 'SATA', '--port', '1', '--device', '0', '--type', 'dvddrive', '--medium', $isoPath)

Write-Host ''
Write-Host 'VM criada. O Ubuntu Server vai iniciar agora.' -ForegroundColor Green
Write-Host 'Durante a instalação do Ubuntu:'
Write-Host '- cria um utilizador administrativo próprio;'
Write-Host '- ativa OpenSSH Server quando for sugerido;'
Write-Host '- usa o disco inteiro da VM;'
Write-Host '- não instales ambiente gráfico.'
Write-Host ''
Write-Host 'Depois da instalação, remove o ISO no VirtualBox e executa na VM:'
Write-Host '  bash bootstrap-dentalpro-ubuntu.sh'

Invoke-VBoxManage @('startvm', $VmName, '--type', 'gui')
