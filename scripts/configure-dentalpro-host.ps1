#Requires -RunAsAdministrator

[CmdletBinding()]
param(
    [string]$VmName = 'DentalPro-Clinic',
    [string]$TaskName = 'DentalPro Clinic - Start VM',
    [switch]$ConfigurePower
)

$ErrorActionPreference = 'Stop'

$vboxCommand = Get-Command VBoxManage.exe -ErrorAction SilentlyContinue
if ($vboxCommand) {
    $vboxManage = $vboxCommand.Source
} else {
    $defaultVBoxManage = Join-Path ${env:ProgramFiles} 'Oracle\VirtualBox\VBoxManage.exe'
    if (-not (Test-Path -LiteralPath $defaultVBoxManage)) {
        throw 'Não encontrei VBoxManage.exe. Instala o VirtualBox ou indica o caminho correto.'
    }
    $vboxManage = $defaultVBoxManage
}

$registeredVms = & $vboxManage list vms
if ($LASTEXITCODE -ne 0 -or -not ($registeredVms -match ('"' + [regex]::Escape($VmName) + '"'))) {
    throw "A VM '$VmName' não está registada neste utilizador do VirtualBox."
}

$currentUser = "$env:USERDOMAIN\$env:USERNAME"
$action = New-ScheduledTaskAction -Execute $vboxManage -Argument "startvm `"$VmName`" --type headless"
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description 'Inicia a VM DentalPro em modo headless quando o utilizador do servidor inicia sessão.' `
    -Force | Out-Null

Write-Host "Arranque automático configurado para a VM '$VmName'." -ForegroundColor Green
Write-Host "A tarefa será executada quando '$currentUser' iniciar sessão."

if ($ConfigurePower) {
    Write-Host ''
    Write-Host 'A configuração de energia será alterada apenas quando o computador estiver ligado à corrente:' -ForegroundColor Yellow
    Write-Host '- suspensão automática: desativada'
    Write-Host '- hibernação automática: desativada'
    $confirmation = Read-Host 'Escreve APLICAR para confirmar'

    if ($confirmation -eq 'APLICAR') {
        powercfg /change standby-timeout-ac 0
        powercfg /change hibernate-timeout-ac 0
        Write-Host 'Suspensão e hibernação em corrente desativadas.' -ForegroundColor Green
    } else {
        Write-Host 'Configuração de energia não alterada.'
    }
}

Write-Host ''
Write-Host 'Teste recomendado: reiniciar o Windows e confirmar que a VM fica Running.'
