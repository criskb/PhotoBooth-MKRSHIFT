# Delete app.log in the same folder as this script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$appLog = Join-Path $scriptDir "app.log"

if (Test-Path $appLog) {
    Write-Host "Deleting previous log file..."
    Remove-Item $appLog -Force
} else {
    Write-Host "No previous log file found. Continuing..."
}

# Start ComfyUI.exe using the user's AppData folder silently and redirect output to NUL
$comfyExe = Join-Path $env:LOCALAPPDATA "Programs\@comfyorgcomfyui-electron\ComfyUI.exe"
Start-Process $comfyExe -ArgumentList "--verbose" -WindowStyle Hidden -PassThru | Out-Null

# Timer with loading bar before starting Photo Booth
$progress = 10
Write-Host "Loading Photo Booth..."
for ($i = 1; $i -le $progress; $i++) {
    $percent = [int](($i / $progress) * 100)
    $bar = ('#' * $i).PadRight($progress, '-')
    Write-Host -NoNewline "`r[$bar] $percent% ($i/$progress %)`r" -ForegroundColor Green
    Start-Sleep -second 1
}
Write-Host ""

# Run main.py in the same folder as this script
Write-Host "Starting Photo Booth..."
python (Join-Path $scriptDir "main.py")

Pause