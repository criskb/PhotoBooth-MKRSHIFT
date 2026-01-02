@echo off
REM ============================================================================
REM         PhotoBooth Launcher Script
REM ============================================================================
REM This script automates launching ComfyUI and the PhotoBooth application.
REM
REM --- IMPORTANT ---
REM Before running, you MUST edit the two paths below to match your system.
REM ============================================================================

REM 1. Set the full path to your PhotoBooth folder.
REM    Example: set "PHOTOBOOTH_DIR=C:\Users\YourName\Documents\PhotoBooth"
set "PHOTOBOOTH_DIR=C:\path\to\your\PhotoBooth"

REM 2. Set the command to run ComfyUI.
REM    This is usually a .exe file.
REM    Example: set "COMFYUI_RUN=C:\Users\USERNAME\AppData\Local\Programs\ComfyUI\ComfyUI.exe"
set "COMFYUI_RUN=C:\path\to\your\ComfyUI\ComfyUI.exe"


REM ============================================================================
REM         (You should not need to edit below this line)
REM ============================================================================

REM Change to the PhotoBooth directory
cd /d "%PHOTOBOOTH_DIR%"
if not exist "main.py" (
    echo ERROR: PhotoBooth directory not found.
    echo Please edit the PHOTOBOOTH_DIR path in this script.
    pause
    exit /b
)

REM Delete the previous log file
if exist "app.log" del /f /q "app.log"

REM Activate the Python virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    echo Activating Python virtual environment...
    call venv\Scripts\activate.bat
)

REM Launch ComfyUI in a new window
echo Starting ComfyUI...
start "ComfyUI" "%COMFYUI_RUN%"

echo.
echo Waiting 10 seconds for ComfyUI to start...
timeout /t 10 >nul

REM Start the PhotoBooth app
echo.
echo Starting PhotoBooth...
python main.py

echo.
echo PhotoBooth has closed. Press any key to exit.
pause
