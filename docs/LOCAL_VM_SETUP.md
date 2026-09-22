# Teste local com VirtualBox, Ubuntu e Docker

Este procedimento prepara uma VM para testar a arquitetura com dois computadores. O perfil usado é `docker-compose.local.yml`, que está configurado para desenvolvimento e HTTP. Usa apenas dados fictícios.

## 1. Preparar o Windows

No Windows 11 Home, instala o VirtualBox através de [Windows hosts](https://www.virtualbox.org/wiki/Downloads). Não é necessário instalar o Extension Pack para este teste.

Confirma também que a virtualização Intel VT-x/AMD-V está ativa na BIOS/UEFI.

Abre PowerShell na raiz do projeto e executa:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup-dentalpro-vm.ps1
```

O script:

- descarrega e valida o Ubuntu Server 24.04.5;
- deteta as interfaces bridge reconhecidas pelo VirtualBox;
- cria uma VM VirtualBox com rede bridge;
- cria um disco virtual de 60 GB;
- inicia a instalação do Ubuntu.

Se o computador tiver apenas 8 GB de RAM, usa `-MemoryMb 3072`. Se tiver 16 GB ou mais, mantém os 4096 MB predefinidos:

```powershell
.\scripts\setup-dentalpro-vm.ps1 -MemoryMb 3072
```

O script não substitui uma VM com o mesmo nome nem apaga discos automaticamente.

## 2. Instalar o Ubuntu

Durante a instalação:

- cria um utilizador administrativo próprio;
- ativa OpenSSH Server;
- usa o disco inteiro da VM;
- não instales Ubuntu Desktop.

Depois de o Ubuntu arrancar, copia `scripts/bootstrap-dentalpro-ubuntu.sh` para a VM. Por exemplo, a partir do Windows, com o endereço apresentado pelo Ubuntu:

```powershell
scp .\scripts\bootstrap-dentalpro-ubuntu.sh utilizador@IP_DA_VM:/home/utilizador/
```

Na VM:

```bash
chmod +x bootstrap-dentalpro-ubuntu.sh
./bootstrap-dentalpro-ubuntu.sh
```

O script instala Docker, clona o branch `master`, cria o `.env` local, gera uma chave de cifragem para os backups, pede a pasta da segunda cópia e inicia os containers. Se o `.env` já tiver estas definições, preserva-as.

Para um teste simples, pode aceitar-se a pasta predefinida. Na clínica, indique uma pasta num disco ou suporte separado e aprovado; o script não consegue escolher esse suporte automaticamente.

## 3. Testar os dois computadores

Descobre o IP da VM:

```bash
hostname -I
```

Abre `http://IP_DA_VM:5000` no computador onde está a VM e no segundo computador da rede local.

Confirma:

1. que ambos veem os mesmos dados fictícios;
2. que uma consulta criada num computador aparece no outro;
3. que os dois utilizadores conseguem iniciar sessão em simultâneo;
4. que uploads, agenda, pacientes e registos clínicos funcionam;
5. que a aplicação continua acessível depois de reiniciar a VM.

## Limites

Este perfil não é o deployment final da clínica. Antes de dados reais ainda são necessários HTTPS interno, firewall, cifragem do host/VM, secrets fora do repositório, backups cifrados da base e documentos, cópia externa e teste de restauro.
