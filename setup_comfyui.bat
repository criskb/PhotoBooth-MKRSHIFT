@echo off
setlocal

:: ============================================================================
:: PhotoBooth - ComfyUI Setup Script for Windows
:: ============================================================================
:: This script automates the setup of ComfyUI for the PhotoBooth application.
:: It downloads and installs all necessary custom nodes and models as
:: described in the README.md file.
::
:: Prerequisites:
:: - Git for Windows must be installed and accessible from the command line.
:: - curl (included in Windows 10/11) is used for downloading files.
:: - ComfyUI should be installed.
::
:: Instructions:
:: 1. Place this script in the root directory of your PhotoBooth project.
:: 2. If your ComfyUI installation is not in '..\ComfyUI', update the
::    'COMFYUI_PATH' variable below.
:: 3. Double-click the script to run it.
:: ============================================================================

:: --- Configuration ---
:: Set the path to your ComfyUI installation directory.
:: The default path assumes the ComfyUI folder is located next to the PhotoBooth folder.
set "COMFYUI_PATH=..\ComfyUI"
set "VENV_SKIPPED=false"

:: --- Script Start ---
echo [INFO] Starting ComfyUI setup for PhotoBooth.

:: Check if ComfyUI directory exists
if not exist "%COMFYUI_PATH%" (
    echo [ERROR] ComfyUI directory not found at: "%COMFYUI_PATH%"
    echo Please update the COMFYUI_PATH variable in this script to point to your ComfyUI installation.
    pause
    goto :eof
)

echo [INFO] Using ComfyUI path: %COMFYUI_PATH%
echo.

:: --- 1. Install Custom Nodes ---
echo [INFO] ===================================
echo [INFO] 1. Installing Custom Nodes...
echo [INFO] ===================================
set "CUSTOM_NODES_PATH=%COMFYUI_PATH%\custom_nodes"
if not exist "%CUSTOM_NODES_PATH%" mkdir "%CUSTOM_NODES_PATH%"
cd /d "%CUSTOM_NODES_PATH%"

echo [INFO]   - Cloning ComfyUI_IPAdapter_plus...
if not exist "ComfyUI_IPAdapter_plus" git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus.git

echo [INFO]   - Cloning comfyui_controlnet_aux...
if not exist "comfyui_controlnet_aux" git clone https://github.com/Fannovel16/comfyui_controlnet_aux.git

echo [INFO]   - Cloning ComfyUI-Custom-Scripts...
if not exist "ComfyUI-Custom-Scripts" git clone https://github.com/pythongosssss/ComfyUI-Custom-Scripts.git

echo [INFO]   - Cloning efficiency-nodes-comfyui...
if not exist "efficiency-nodes-comfyui" git clone https://github.com/jags111/efficiency-nodes-comfyui.git

echo [INFO]   - Cloning was-node-suite-comfyui...
if not exist "was-node-suite-comfyui" git clone https://github.com/ltdrdata/was-node-suite-comfyui.git

cd /d "%~dp0"
echo [INFO] Custom Nodes installed.
echo.

:: --- 2. Download and Install Models ---
echo [INFO] =======================================
echo [INFO] 2. Downloading and installing models...
echo [INFO] =======================================

:: Helper function to download files
:: Usage: call :downloadFile "URL" "OutputFile"
goto :skip_download_function
:downloadFile
echo [INFO]   Downloading %~2...
if not exist "%~2" (
    curl -L "%~1" -o "%~2"
    if errorlevel 1 (
        echo [ERROR] Failed to download %~2.
        del "%~2" 2>nul
    ) else (
        echo [INFO]   Download complete.
    )
) else (
    echo [INFO]   File already exists. Skipping.
)
exit /b
:skip_download_function

:: ControlNet Models
set "CONTROLNET_PATH=%COMFYUI_PATH%\models\controlnet"
set "CONTROLNET_15_PATH=%CONTROLNET_PATH%\1.5"
if not exist "%CONTROLNET_PATH%" mkdir "%CONTROLNET_PATH%"
if not exist "%CONTROLNET_15_PATH%" mkdir "%CONTROLNET_15_PATH%"
echo.
echo [INFO] Downloading ControlNet models...
call :downloadFile "https://huggingface.co/comfyanonymous/ControlNet-v1-1_fp16_safetensors/resolve/main/control_v11e_sd15_ip2p_fp16.safetensors" "%CONTROLNET_15_PATH%\control_v11e_sd15_ip2p_fp16.safetensors"
call :downloadFile "https://huggingface.co/comfyanonymous/ControlNet-v1-1_fp16_safetensors/resolve/main/control_v11f1p_sd15_depth_fp16.safetensors" "%CONTROLNET_15_PATH%\control_v11f1p_sd15_depth_fp16.safetensors"
call :downloadFile "https://huggingface.co/comfyanonymous/ControlNet-v1-1_fp16_safetensors/resolve/main/control_v11p_sd15_lineart_fp16.safetensors" "%CONTROLNET_15_PATH%\control_v11p_sd15_lineart_fp16.safetensors"

:: Stable Diffusion Checkpoints
set "CHECKPOINTS_PATH=%COMFYUI_PATH%\models\checkpoints"
if not exist "%CHECKPOINTS_PATH%" mkdir "%CHECKPOINTS_PATH%"
echo.
echo [INFO] Downloading Stable Diffusion checkpoint (dreamshaper_8)...
call :downloadFile "https://huggingface.co/digiplay/DreamShaper_8/resolve/main/dreamshaper_8.safetensors" "%CHECKPOINTS_PATH%\dreamshaper_8.safetensors"

:: Upscale model
set "UPSCALE_PATH=%COMFYUI_PATH%\models\upscale_models"
if not exist "%UPSCALE_PATH%" mkdir "%UPSCALE_PATH%"
echo.
echo [INFO] Downloading Upscale model (RealESRGAN_x2)...
call :downloadFile "https://huggingface.co/ai-forever/Real-ESRGAN/resolve/main/RealESRGAN_x2.pth" "%UPSCALE_PATH%\RealESRGAN_x2.pth"

:: IP-Adapter Models
set "CLIP_VISION_PATH=%COMFYUI_PATH%\models\clip_vision"
if not exist "%CLIP_VISION_PATH%" mkdir "%CLIP_VISION_PATH%"
echo.
echo [INFO] Downloading CLIP Vision models for IP-Adapter...
call :downloadFile "https://huggingface.co/laion/CLIP-ViT-H-14-laion2B-s32B-b79K/resolve/main/open_clip_pytorch_model.safetensors" "%CLIP_VISION_PATH%\CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors"
call :downloadFile "https://huggingface.co/openai/clip-vit-large-patch14/resolve/main/model.safetensors" "%CLIP_VISION_PATH%\clip-vit-large-patch14.safetensors"

set "IPADAPTER_PATH=%COMFYUI_PATH%\models\ipadapter"
if not exist "%IPADAPTER_PATH%" mkdir "%IPADAPTER_PATH%"
echo.
echo [INFO] Downloading IP-Adapter models...
call :downloadFile "https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter-faceid-plusv2_sd15.bin" "%IPADAPTER_PATH%\ip-adapter-faceid-plusv2_sd15.bin"
call :downloadFile "https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter-faceid-portrait-v11_sd15.bin" "%IPADAPTER_PATH%\ip-adapter-faceid-portrait-v11_sd15.bin"
call :downloadFile "https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter-faceid_sd15.bin" "%IPADAPTER_PATH%\ip-adapter-faceid_sd15.bin"
call :downloadFile "https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter-plus-face_sd15.safetensors" "%IPADAPTER_PATH%\ip-adapter-plus-face_sd15.safetensors"
call :downloadFile "https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter_sd15.safetensors" "%IPADAPTER_PATH%\ip-adapter_sd15.safetensors"

set "LORAS_PATH=%COMFYUI_PATH%\models\loras"
if not exist "%LORAS_PATH%" mkdir "%LORAS_PATH%"
echo.
echo [INFO] Downloading LoRA models for IP-Adapter...
call :downloadFile "https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter-faceid-plusv2_sd15_lora.safetensors" "%LORAS_PATH%\ip-adapter-faceid-plusv2_sd15_lora.safetensors"
call :downloadFile "https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter-faceid_sd15_lora.safetensors" "%LORAS_PATH%\ip-adapter-faceid_sd15_lora.safetensors"
echo [INFO] Model downloads complete.
echo.
echo [INFO] NOTE: InsightFace models will be downloaded automatically by ComfyUI on first use.
echo.

:: --- 3. Install Python Dependencies for Custom Nodes ---
echo [INFO] =================================================================
echo [INFO] 3. Installing Python dependencies (insightface, onnxruntime)...
echo [INFO] =================================================================
if exist "%COMFYUI_PATH%\.venv\Scripts\activate.bat" (
    call "%COMFYUI_PATH%\.venv\Scripts\activate.bat"
    echo [INFO] Upgrading pip...
    python -m pip install --upgrade pip
    echo [INFO] Installing packages...
    pip install insightface onnxruntime
    call "%COMFYUI_PATH%\.venv\Scripts\deactivate.bat"
    echo [INFO] Python dependencies installed successfully.
) else (    set "VENV_SKIPPED=true"    echo [WARNING] ComfyUI Python virtual environment not found at '%COMFYUI_PATH%\.venv'.
    echo [WARNING] Skipping Python dependency installation.
    echo [WARNING] Please manually install 'insightface' and 'onnxruntime' in your ComfyUI Python environment.
)
echo.

:: --- Finalization ---
echo =================================================================
echo [SUCCESS] ComfyUI setup for PhotoBooth is complete!
if "%VENV_SKIPPED%"=="true" (
    echo.
    echo [IMPORTANT] The Python virtual environment was not found.
    echo [IMPORTANT] Please ensure you manually install 'insightface' and 'onnxruntime'
    echo [IMPORTANT] in your ComfyUI's Python environment before running PhotoBooth.
)
echo You can now start ComfyUI and then run the PhotoBooth application.
echo =================================================================
echo.
pause
endlocal
