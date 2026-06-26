# PrepGenius — recovery helper for Docker Desktop / WSL2 port-forward wedging.
# Run from PowerShell in the project root:  .\recover.ps1
# Use this when localhost:3000 or localhost:8000 stop responding even though
# `docker compose ps` shows the containers as "Up".

$ErrorActionPreference = "SilentlyContinue"
Write-Host "[1/5] Stopping Docker Desktop..." -ForegroundColor Cyan
Get-Process "Docker Desktop" | Stop-Process -Force
Start-Sleep -Seconds 6

Write-Host "[2/5] Full WSL shutdown (rebuilds the networking plane)..." -ForegroundColor Cyan
wsl --shutdown
Start-Sleep -Seconds 10

Write-Host "[3/5] Starting Docker Desktop..." -ForegroundColor Cyan
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
Write-Host "      waiting for the engine..."
$ok = $false
for ($i = 0; $i -lt 40; $i++) { docker info *> $null; if ($?) { $ok = $true; break }; Start-Sleep 5 }
if (-not $ok) { Write-Host "Engine did not come up; open Docker Desktop manually." -ForegroundColor Red; exit 1 }

Write-Host "[4/5] Bringing services up..." -ForegroundColor Cyan
docker compose up -d --no-build *> $null
Start-Sleep -Seconds 25

Write-Host "[5/5] Verifying host reachability..." -ForegroundColor Cyan
function Test-Port($url) { return (curl.exe -s -m 12 -o NUL -w "%{http_code}" $url 2>$null) }

# Restart (NOT --force-recreate) any container whose published port is wedged.
# A gentle restart keeps the container identity so the port-forward survives;
# --force-recreate gives a new container IP and churns the OTHER container's forward.
if ((Test-Port "http://localhost:8000/health") -ne "200") {
    Write-Host "  backend port stale -> restarting backend" -ForegroundColor Yellow
    docker compose restart backend *> $null; Start-Sleep -Seconds 14
}
if ((Test-Port "http://localhost:3000") -ne "200") {
    Write-Host "  frontend port stale -> restarting frontend" -ForegroundColor Yellow
    docker compose restart frontend *> $null; Start-Sleep -Seconds 14
}

Write-Host ""
Write-Host ("backend : HTTP " + (Test-Port "http://localhost:8000/health"))
Write-Host ("frontend: HTTP " + (Test-Port "http://localhost:3000"))
Write-Host ""
Write-Host "Done. App: http://localhost:3000   API: http://localhost:8000/docs" -ForegroundColor Green
