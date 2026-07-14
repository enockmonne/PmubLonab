param(
  [string]$HostAddress = "192.168.50.131",
  [int]$FrontendPort = 8081,
  [int]$BackendPort = 8003
)

$ErrorActionPreference = "Stop"

function Assert-Ok($Condition, $Message) {
  if (-not $Condition) {
    throw "Check failed: $Message"
  }
  Write-Host "[ok] $Message"
}

function Read-Json($Url) {
  $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 15
  Assert-Ok ($response.StatusCode -eq 200) "$Url returned 200"
  return $response.Content | ConvertFrom-Json
}

$backendBase = "http://${HostAddress}:${BackendPort}"
$frontendBase = "http://${HostAddress}:${FrontendPort}"

$listeners = @(netstat -ano | Select-String ":$FrontendPort " | Select-String "LISTENING")
Assert-Ok ($listeners.Count -gt 0) "frontend port $FrontendPort is listening"

$health = Invoke-WebRequest -UseBasicParsing -Uri "$backendBase/api/races?limit=1" -TimeoutSec 15
Assert-Ok ($health.StatusCode -eq 200) "$backendBase/api/races is reachable"

$horseStats = Read-Json "$backendBase/api/stats/horses"
Assert-Ok ($null -ne $horseStats.leaderboard) "horse stats endpoint is available on analysis backend"

$sourceStats = Read-Json "$backendBase/api/stats/tipsters"
Assert-Ok ($null -ne $sourceStats.leaderboard) "source stats endpoint is available on analysis backend"

$containers = docker ps --format "{{.Names}}"
if ($LASTEXITCODE -ne 0) {
  throw "Docker is not accessible. Start Docker Desktop and run this script from a shell that can access Docker."
}
Assert-Ok ($containers -contains "pmub_analysis_api") "pmub_analysis_api container is running"
Assert-Ok ($containers -contains "pmub_analysis_mongo") "pmub_analysis_mongo container is running"

$containerEnv = docker inspect pmub_analysis_api --format "{{json .Config.Env}}" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) {
  throw "Unable to inspect pmub_analysis_api. Re-run scripts/start-analysis-dev.ps1."
}
$appProduct = ($containerEnv | Where-Object { $_ -like "APP_PRODUCT=*" }) -replace "^APP_PRODUCT=", ""
$appEnv = ($containerEnv | Where-Object { $_ -like "APP_ENV=*" }) -replace "^APP_ENV=", ""
$dbName = ($containerEnv | Where-Object { $_ -like "DB_NAME=*" }) -replace "^DB_NAME=", ""

Assert-Ok ($appProduct -eq "analysis") "backend APP_PRODUCT is analysis"
Assert-Ok ($appEnv -like "analysis*") "backend APP_ENV is analysis"
Assert-Ok ($dbName -like "*analysis*") "backend DB_NAME is analysis-specific"

Write-Host ""
Write-Host "Analysis dev environment is ready:"
Write-Host "Frontend: $frontendBase"
Write-Host "Backend:  $backendBase"
