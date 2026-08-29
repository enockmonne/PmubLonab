param(
  [Parameter(Mandatory = $true)]
  [string]$HostAddress,
  [int]$FrontendPort = 8081,
  [int]$BackendPort = 8003,
  [int]$AdminPort = 5179,
  [switch]$RestartFrontend,
  [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $repoRoot "frontend"
$backendEnv = Join-Path $repoRoot "backend\.env"
$logDir = "C:\tmp"
$frontendOut = Join-Path $logDir "pmub-analysis-frontend.out.log"
$frontendErr = Join-Path $logDir "pmub-analysis-frontend.err.log"

if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

docker info --format "{{.ServerVersion}}" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Docker Desktop is not running or is not accessible. Start Docker Desktop, wait until it is ready, and run this script again."
}

if (-not (Test-Path $backendEnv)) {
  throw "Missing $backendEnv. Create it from backend/.env.analysis.example and restore secrets securely."
}

$env:CORS_ORIGINS = "http://localhost:${FrontendPort},http://${HostAddress}:${FrontendPort},http://localhost:${AdminPort},http://${HostAddress}:${AdminPort}"

Push-Location $repoRoot
try {
  docker compose --env-file $backendEnv -f docker-compose.analysis.yml up -d --build
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to start the analysis Docker services. Review the Compose output above."
  }
} finally {
  Pop-Location
}

if (-not $SkipFrontend) {
  $listeners = @(netstat -ano | Select-String ":$FrontendPort " | Select-String "LISTENING")
  if ($listeners.Count -gt 0) {
    $listenerPids = @(
      $listeners |
        ForEach-Object { ($_ -split "\s+")[-1] } |
        Where-Object { $_ -match "^\d+$" } |
        Select-Object -Unique
    )
    if ($RestartFrontend) {
      foreach ($processId in $listenerPids) {
        Stop-Process -Id ([int]$processId) -Force
      }
      Start-Sleep -Seconds 2
    } else {
      throw "Frontend port $FrontendPort is already in use by PID(s): $($listenerPids -join ', '). Re-run with -RestartFrontend to replace the existing dev server."
    }
  }

  $backendUrl = "http://${HostAddress}:${BackendPort}"
  $adminUrl = "http://${HostAddress}:${AdminPort}"
  $frontendCommand = "set EXPO_PUBLIC_BACKEND_URL=$backendUrl&& set EXPO_PUBLIC_ADMIN_WEB_URL=$adminUrl&& set EXPO_PUBLIC_APP_ENV=analysis-local&& set EXPO_PUBLIC_APP_PRODUCT=analysis&& set EXPO_PUBLIC_BETA_ACCESS_REQUIRED=false&& npx expo start --web --port $FrontendPort --clear"

  Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList @("/k", $frontendCommand) `
    -WorkingDirectory $frontendDir `
    -RedirectStandardOutput $frontendOut `
    -RedirectStandardError $frontendErr `
    -WindowStyle Hidden
}

Write-Host "Analysis backend: http://${HostAddress}:${BackendPort}"
Write-Host "Analysis frontend: http://${HostAddress}:${FrontendPort}"
Write-Host "Frontend logs: $frontendOut"
Write-Host "Run scripts/check-analysis-dev.ps1 to verify the environment."
