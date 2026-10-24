# Creates .env (for Docker) and backend\.env (for running Flask without Docker)
# with random secrets. Run it once from the project folder, in PowerShell:
#   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

function New-Secret([int]$length) {
    $chars = [char[]]"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    $bytes = New-Object byte[] $length
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

# Writes UTF-8 without BOM and with LF line endings, which Docker Compose reads reliably.
function Write-EnvFile([string]$path, [string[]]$lines) {
    $text = ($lines -join "`n") + "`n"
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) $path), $text, (New-Object System.Text.UTF8Encoding $false))
}

if (Test-Path ".env") {
    Write-Host ".env exists already: left as it is."
} else {
    $dbPassword = New-Secret 24
    $lines = Get-Content ".env.example" | ForEach-Object {
        if ($_ -like "SECRET_KEY=*") { "SECRET_KEY=$(New-Secret 64)" }
        elseif ($_ -like "POSTGRES_PASSWORD=*") { "POSTGRES_PASSWORD=$dbPassword" }
        else { $_ }
    }
    Write-EnvFile ".env" $lines
    Write-Host "Created .env"
}

if (Test-Path "backend\.env") {
    Write-Host "backend\.env exists already: left as it is."
} else {
    $envLines = Get-Content ".env"
    $dbPassword = ($envLines | Where-Object { $_ -like "POSTGRES_PASSWORD=*" }) -replace "^POSTGRES_PASSWORD=", ""
    $dbPort = ($envLines | Where-Object { $_ -like "DB_PORT=*" }) -replace "^DB_PORT=", ""
    if (-not $dbPort) { $dbPort = "5432" }
    $lines = Get-Content "backend\.env.example" | ForEach-Object {
        if ($_ -like "SECRET_KEY=*") { "SECRET_KEY=$(New-Secret 64)" }
        elseif ($_ -like "DATABASE_URL=*") { "DATABASE_URL=postgresql+psycopg://library:$dbPassword@localhost:$dbPort/library" }
        else { $_ }
    }
    Write-EnvFile "backend\.env" $lines
    Write-Host "Created backend\.env (uses the Docker database on localhost:$dbPort)"
}
Write-Host "Next: docker compose up --build   ->  http://localhost:8000"
