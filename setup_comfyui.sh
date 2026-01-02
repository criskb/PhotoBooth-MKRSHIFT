#!/bin/bash
set -e

# ============================================================================
# PhotoBooth - ComfyUI Setup Script for Linux/macOS
# ============================================================================
# This script automates the setup of ComfyUI for the PhotoBooth application.
# It downloads and installs all necessary custom nodes and models as
# described in the README.md file.
#
# Prerequisites:
# - Git must be installed and accessible from the command line.
# - wget is used for downloading files.
# - ComfyUI should be installed.
#
# Instructions:
# 1. Place this script in the root directory of your PhotoBooth project.
# 2. Make it executable by running: chmod +x setup_comfyui.sh
# 3. If your ComfyUI installation is not in '../ComfyUI', update the
#    'COMFYUI_PATH' variable below.
# 4. Run the script from your terminal: ./setup_comfyui.sh
# ============================================================================

# --- Configuration ---
# Set the path to your ComfyUI installation directory.
# The default path assumes the ComfyUI folder is located next to the PhotoBooth folder.
COMFYUI_PATH="../ComfyUI"
VENV_SKIPPED=false

# --- Helper Functions ---
info() {
    echo "[INFO] $1"
}

warn() {
    echo "[WARNING] $1"
}

error() {
    echo "[ERROR] $1" >&2
    exit 1
}

# --- Script Start ---
info "Starting ComfyUI setup for PhotoBooth."

# Check if ComfyUI directory exists
if [ ! -d "$COMFYUI_PATH" ]; then
    error "ComfyUI directory not found at: '$COMFYUI_PATH'. Please update the COMFYUI_PATH variable in this script."
fi

info "Using ComfyUI path: $COMFYUI_PATH"
echo

# --- 1. Install Custom Nodes ---
info "==================================="
info "1. Installing Custom Nodes..."
info "==================================="
CUSTOM_NODES_PATH="$COMFYUI_PATH/custom_nodes"
mkdir -p "$CUSTOM_NODES_PATH"
cd "$CUSTOM_NODES_PATH"

clone_repo() {
    local repo_url=$1
    local repo_name=$(basename "$repo_url" .git)
    if [ ! -d "$repo_name" ]; then
        info "  - Cloning $repo_name..."
        git clone "$repo_url"
    else
        info "  - '$repo_name' already exists. Skipping clone."
    fi
}

clone_repo https://github.com/cubiq/ComfyUI_IPAdapter_plus.git
clone_repo https://github.com/Fannovel16/comfyui_controlnet_aux.git
clone_repo https://github.com/pythongosssss/ComfyUI-Custom-Scripts.git
clone_repo https://github.com/jags111/efficiency-nodes-comfyui.git
clone_repo https://github.com/ltdrdata/was-node-suite-comfyui.git

cd - > /dev/null # Go back to the previous directory
info "Custom Nodes installed."
echo

# --- 2. Download and Install Models ---
info "======================================="
info "2. Downloading and installing models..."
info "======================================="

# Helper function to download files
download_file() {
    local url=$1
    local filepath=$2
    local filename=$(basename "$filepath")
    info "  Downloading $filename..."
    if [ ! -f "$filepath" ]; then
        # Use wget with -c to continue downloads
        wget -c "$url" -O "$filepath"
        if [ $? -ne 0 ]; then
            error "Failed to download $filename. Please check the URL and your connection."
            rm -f "$filepath" # Clean up partial file on error
        else
            info "  Download complete."
        fi
    else
        info "  File already exists. Skipping."
    fi
}

# ControlNet Models
CONTROLNET_15_PATH="$COMFYUI_PATH/models/controlnet/1.5"
mkdir -p "$CONTROLNET_15_PATH"
echo
info "Downloading ControlNet models..."
download_file "https://huggingface.co/comfyanonymous/ControlNet-v1-1_fp16_safetensors/resolve/main/control_v11e_sd15_ip2p_fp16.safetensors" "$CONTROLNET_15_PATH/control_v11e_sd15_ip2p_fp16.safetensors"
download_file "https://huggingface.co/comfyanonymous/ControlNet-v1-1_fp16_safetensors/resolve/main/control_v11f1p_sd15_depth_fp16.safetensors" "$CONTROLNET_15_PATH/control_v11f1p_sd15_depth_fp16.safetensors"
download_file "https://huggingface.co/comfyanonymous/ControlNet-v1-1_fp16_safetensors/resolve/main/control_v11p_sd15_lineart_fp16.safetensors" "$CONTROLNET_15_PATH/control_v11p_sd15_lineart_fp16.safetensors"

# Stable Diffusion Checkpoints
CHECKPOINTS_PATH="$COMFYUI_PATH/models/checkpoints"
mkdir -p "$CHECKPOINTS_PATH"
echo
info "Downloading Stable Diffusion checkpoint (dreamshaper_8)..."
download_file "https://huggingface.co/digiplay/DreamShaper_8/resolve/main/dreamshaper_8.safetensors" "$CHECKPOINTS_PATH/dreamshaper_8.safetensors"

# Upscale model
UPSCALE_PATH="$COMFYUI_PATH/models/upscale_models"
mkdir -p "$UPSCALE_PATH"
echo
info "Downloading Upscale model (RealESRGAN_x2)..."
download_file "https://huggingface.co/ai-forever/Real-ESRGAN/resolve/main/RealESRGAN_x2.pth" "$UPSCALE_PATH/RealESRGAN_x2.pth"

# IP-Adapter Models
CLIP_VISION_PATH="$COMFYUI_PATH/models/clip_vision"
mkdir -p "$CLIP_VISION_PATH"
echo
info "Downloading CLIP Vision models for IP-Adapter..."
download_file "https://huggingface.co/laion/CLIP-ViT-H-14-laion2B-s32B-b79K/resolve/main/open_clip_pytorch_model.safetensors" "$CLIP_VISION_PATH/CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors"
download_file "https://huggingface.co/openai/clip-vit-large-patch14/resolve/main/model.safetensors" "$CLIP_VISION_PATH/clip-vit-large-patch14.safetensors"

IPADAPTER_PATH="$COMFYUI_PATH/models/ipadapter"
mkdir -p "$IPADAPTER_PATH"
echo
info "Downloading IP-Adapter models..."
download_file "https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter-faceid-plusv2_sd15.bin" "$IPADAPTER_PATH/ip-adapter-faceid-plusv2_sd15.bin"
download_file "https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter-faceid-portrait-v11_sd15.bin" "$IPADAPTER_PATH/ip-adapter-faceid-portrait-v11_sd15.bin"
download_file "https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter-faceid_sd15.bin" "$IPADAPTER_PATH/ip-adapter-faceid_sd15.bin"
download_file "https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter-plus-face_sd15.safetensors" "$IPADAPTER_PATH/ip-adapter-plus-face_sd15.safetensors"
download_file "https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter_sd15.safetensors" "$IPADAPTER_PATH/ip-adapter_sd15.safetensors"

LORAS_PATH="$COMFYUI_PATH/models/loras"
mkdir -p "$LORAS_PATH"
echo
info "Downloading LoRA models for IP-Adapter..."
download_file "https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter-faceid-plusv2_sd15_lora.safetensors" "$LORAS_PATH/ip-adapter-faceid-plusv2_sd15_lora.safetensors"
download_file "https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter-faceid_sd15_lora.safetensors" "$LORAS_PATH/ip-adapter-faceid_sd15_lora.safetensors"

info "NOTE: InsightFace models will be downloaded automatically by ComfyUI on first use."
echo

# --- 3. Install Python Dependencies for Custom Nodes ---
info "================================================================="
info "3. Installing Python dependencies (insightface, onnxruntime)..."
info "================================================================="
if [ -f "$COMFYUI_PATH/venv/bin/activate" ]; then
    # shellcheck source=/dev/null
    source "$COMFYUI_PATH/venv/bin/activate"
    info "Upgrading pip..."
    python -m pip install --upgrade pip
    info "Installing packages..."
    pip install insightface onnxruntime onnxruntime-gpu
    deactivate
    info "Python dependencies installed successfully."
else
    VENV_SKIPPED=true
    warn "ComfyUI Python virtual environment not found at '$COMFYUI_PATH/venv'."
    warn "Skipping Python dependency installation."
    warn "Please manually install 'insightface', 'onnxruntime', and 'onnxruntime-gpu' in your ComfyUI Python environment."
fi
echo

# --- Finalization ---
info "================================================================="
info "SUCCESS: ComfyUI setup for PhotoBooth is complete!"
if [ "$VENV_SKIPPED" = true ]; then
    echo
    info "#################################################################"
    warn "IMPORTANT: The Python virtual environment was not found."
    warn "Please ensure you manually install 'insightface' and 'onnxruntime'"
    warn "in your ComfyUI's Python environment before running PhotoBooth."
    info "#################################################################"
fi
info "You can now start ComfyUI and then run the PhotoBooth application."
info "================================================================="
echo
