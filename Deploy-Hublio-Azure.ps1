# Deploy Hublio to Azure App Service (permanent public URL)
# Run in PowerShell:  cd C:\Projects\Hublio; .\Deploy-Hublio-Azure.ps1

$ErrorActionPreference = "Stop"
$AppName = "hublio-mivali-sampra"
$ResourceGroup = "rg-hublio-mivali"
$Location = "southafricanorth"

Write-Host "Checking Azure sign-in..."
az account show *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Sign in to Azure first:"
  az login --tenant "d8753712-9ca2-455f-bc33-0544f24db01b"
}

Set-Location $PSScriptRoot
Write-Host "Deploying Hublio to Azure (this may take a few minutes)..."
az webapp up `
  --name $AppName `
  --resource-group $ResourceGroup `
  --location $Location `
  --runtime "NODE:20-lts" `
  --sku F1 `
  --os-type Linux

$url = "https://$AppName.azurewebsites.net/login.html"
Write-Host ""
Write-Host "Permanent link:" $url
Start-Process $url
