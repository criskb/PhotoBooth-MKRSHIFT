![PhotoBooth Screenshot](photoboothscreenshotsmall.png)

<center><b>Welcome to PhotoBooth!</b><br>Strike a pose and have fun with AI-powered styles.</center>

# PhotoBooth

**PhotoBooth** takes a picture of you from the webcam and generate an imaginary version of your picture, in different styles, using AI. It is a Python-based GUI application which applies AI-powered artistic styles using Comfy.ui. It includes a Raspberry Pi–based hotspot system (optional) for offline image sharing via a captive portal.

---

## Features

- Capture images from a connected camera.
- Choose from multiple artistic styles.
- Apply styles using ComfyUI workflows. (styles are customizable)
- View, save, and share generated images.
- Local hotspot and captive portal for phone downloads without internet.

Photobooth has a log file where it records each times it generate an image. When an image is generated, it is saved for sharing via the Wifi hotspot, if activated. The image is deleted when Photobooth comes back to its welcome screen.

---

## Hardware requirements

A gamer PC with a GPU is required. It works with a Nvidia 3050 but a bit slow (~20 seconds to generate an image). It has been tested on Windows and Linux. It should work decently with recent Macs.
Connecting to a Raspberry Pi is optional and only required for sharing the generated pictures on a wifi hotspot run on the Raspberry Pi.

---

## Project Structure

```
PhotoBooth/
├── comfy_classes/           # ComfyUI API integration
│   └── comfy_class_API.py
├── gui_classes/            # GUI logic and components (Pyside6)
│   ├── gui_manager/        # Managers for background, language, standby, threads, windows
│   ├── gui_object/         # GUI widgets: buttons, overlays, toolbox, etc.
│   └── gui_window/         # Window classes: main, base, sleep screen
├── gui_template/           # UI assets: icons, textures, gradients, sleep images
├── hotspot_classes/        # Hotspot and captive portal integration (Raspberry Pi)
├── language_file/          # Language translations (norway.json, sami.json, uk.json)
├── workflows/              # ComfyUI workflow definitions (default.json, clay.json, etc.)
├── constant.py             # Application constants and settings
├── prompts.py              # Style prompts for AI transformations
├── main.py                 # Main entry point for the application
├── requirements.txt        # Python dependencies
└── README.md               # Project documentation
```
---

## Documentation

## Configuration Guide

PhotoBooth uses two key files for configuration:

- **`prompts.py`**: Contains the dictionary `dico_styles` for all available artistic style prompts. You can customize or add new styles by editing this file. Each style entry defines how the AI should transform images in that style.
- **`constant.py`**: This file contains, in particular:
  - Interface appearance settings (colors, fonts, button styles, dimensions)
  - The messages displayed on the screen
  - Paths to working folders (input/output)
  - ComfyUI connection settings
  - The location of the workflows associated with each AI transformation
  - It is possible to fine-tune the appearance and behavior of the application by modifying this file.
  - Important note: Some constants present in this file are no longer used in the current version of the interface, but have been retained to ensure compatibility with older imports and avoid runtime errors.

### Customization possible
Main elements you can edit in `constant.py`:
- **Colors:** The `COLORS` dictionary centralizes all the colors used.
- **Text and button styles:** Constants like `BUTTON_STYLE`, `TITLE_LABEL_STYLE`, `DISPLAY_LABEL_STYLE`, etc., precisely define the visual rendering.
- **Size and layout:** Ratios (`DISPLAY_SIZE_RATIO`, `HUD_SIZE_RATIO`) or margins (`GRID_MARGIN_TOP`, etc.) allow you to adjust the display on screens of various sizes.
- **Custom AI prompt:** The `dico_styles` variable allows you to associate each style with a unique prompt used in the build via ComfyUI.
- **Timeout settings:** `SLEEP_TIMER_SECONDS`, `COUNTDOWN_START`, etc.

### Enable debug logs
There are two constants that control the amount of logs displayed in the console or saved in log files:
- `DEBUG = False`
- `DEBUG_FULL = False`

Set `DEBUG = True` to enable standard logs for monitoring normal execution.
Set `DEBUG_FULL = True` to enable all logs, including frequent operations (e.g., refreshing the image), resulting in very verbose output.

### Change connection addresses (ComfyUI, Flask, WebSocket)
If you have changed the network configuration or launched the services on different ports/addresses, update the following constants:
- `WS_URL = "ws://127.0.0.1:8188/ws"`
- `HTTP_BASE_URL = "http://127.0.0.1:8188"`
- `HOTSPOT_URL = "https://192.168.10.2:5000/share"`

- `WS_URL`: The URL of the WebSocket to receive build notifications from ComfyUI.
- `HTTP_BASE_URL`: HTTP URL to send requests to ComfyUI.
- `HOTSPOT_URL`: Local address of the Raspberry Pi Flask server (see dedicated section).

### Disable hotspot image sharing
If you don't have a Raspberry Pi connected or you don't want to enable Wi-Fi sharing (captive portal), disable this option in `constant.py`:
- `ShareByHotspot = False`


After making changes, restart PhotoBooth to apply your new configuration.

---

## Installation

Follow these steps to install and set up PhotoBooth.

### 1. Prerequisites

Hardware:

- Camera connected to your computer
- Optional: Raspberry Pi OS (for hotspot features, if using Raspberry Pi)

Software:

- [comfyUI](https://www.comfy.org/) (see below for more details on installing ComfyUI),
- [Git](https://git-scm.com/) required by ComfyUI and photobooth, (install with default parameters)
- on Windows, ComfyUI requires Visual C++ and/or Visual Studio Community, you may need to install/re-install it (from Microsoft Store),
- Python 3.10, 3.11 or 3.12, also required by ComfyUI and photobooth,
- The installation process of ComfyUI and Photobooth will install the additional python packages needed for them to run,
- recommended: Visual Studio Code to modify the code (prompts and settings) and adapt it to your needs.

### 2. Clone the Repository

On Windows open a Terminal with by pressing the keys "Windows + r" and type in `cmd` and then press enter. In the Terminal, type `cd Documents` then:
```bash
git clone https://github.com/uitml/PhotoBooth.git
cd PhotoBooth
```

### 3. Install Python Dependencies

It is recommended to use a virtual environment, in the Photobooth folder run:

Windows (with Python 3.12)
```bash
python -p3.12 -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
```

Linux / Mac
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```


### 4. Install Qt (Qt6) and System Libraries
On Windows, Qt is installed automatically via the installation of PySide6 in the `pip install -r requirement.txt`.
#### Linux

```bash
sudo apt update
sudo apt install qt6-base-dev
sudo apt install libxcb-cursor0 #may be needed
```

### 5. Configure ComfyUI

#### ComfyUI Installation & Model Setup

Comfy is assumed to be in the same folder as Photobooth. If this is not the case, be sure to set the correct path in `constant.py`.

#### Automated Setup using Scripts

To simplify the setup of ComfyUI's custom nodes and models, we have provided automation scripts for both Windows and Linux. These scripts will download and place all the required files for you.

-   **For Windows:** Run the `setup_comfyui.bat` script by double-clicking it.
-   **For Linux/macOS:** First, make the script executable by running `chmod +x setup_comfyui.sh`, then run it with `./setup_comfyui.sh`.

If you encounter any issues with the scripts or prefer to set up your environment manually, please follow the detailed steps below.

---

1. **Install ComfyUI**
	 - Follow instructions at: https://www.comfy.org/ or https://github.com/comfyanonymous/ComfyUI
	 - On Windows ComfyUI installs by default in a folder `ComfyUI` in the `Documents` folder,
	 - If you install ComfyUI from source using the Github repo you may go to your `Documents` folder and run these command lines (Linux):
		 ```bash
		 git clone https://github.com/comfyanonymous/ComfyUI.git
		 cd ComfyUI
		 python3 -m venv venv
		 source venv/bin/activate
		 pip install -r requirements.txt
		 python main.py
		 ```


2. **Install Custom Nodes and Extensions**
	 - For enhanced features, search for and install the following ComfyUI custom nodes:
		 - [ComfyUI_IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus)
		 - [comfyui_controlnet_aux](https://github.com/Fannovel16/comfyui_controlnet_aux)
		 - [ComfyUI-Custom-Scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts)
		 - [efficiency-nodes-comfyui](https://github.com/jags111/efficiency-nodes-comfyui)
		 - [was-node-suite-comfyui](https://github.com/ltdrdata/was-node-suite-comfyui)

	 - **Automatic installation:**
		 - Use the ComfyUI Manager or extension installer (if available) to search for and install these nodes.

	 - **Manual installation:**
		 - Go to the `ComfyUI/custom_nodes` directory and run:
			 ```bash
			 git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus.git
			 git clone https://github.com/Fannovel16/comfyui_controlnet_aux.git
			 git clone https://github.com/pythongosssss/ComfyUI-Custom-Scripts.git
			 git clone https://github.com/jags111/efficiency-nodes-comfyui.git
			 git clone https://github.com/ltdrdata/was-node-suite-comfyui.git
			 ```
		 - Restart ComfyUI after installing new nodes.

3. **Download Required Models**
	 - **ControlNet Models:**
		 - In `ComfyUI/models/controlnet/` create the folder `1.5/` and place the 3 following safetensor files:
		 -	`control_v11e_sd15_ip2p_fp16.safetensors`, `control_v11f1p_sd15_depth_fp16.safetensors`, `control_v11p_sd15_lineart_fp16.safetensors`.
		 - You can download them from:
		 	 - [HuggingFace](https://huggingface.co/comfyanonymous/ControlNet-v1-1_fp16_safetensors/tree/main) and find the original documentation here: [Depth](https://huggingface.co/lllyasviel/control_v11f1p_sd15_depth) and [IP2P](https://huggingface.co/lllyasviel/control_v11e_sd15_ip2p).
	 - **Stable Diffusion Checkpoints:**
		 - In `ComfyUI/models/checkpoints/` place the Dreamshaper model, download the safetensor file: dreamshaper_8.safetensors from [HuggingFace](https://huggingface.co/digiplay/DreamShaper_8/blob/main/dreamshaper_8.safetensors) or [Civitai](https://civitai.com/models/4384/dreamshaper) (any SD 1.5 model can be used)
	 - **Upscale model**
	 	 - In `ComfyUI/models/upscale_models/` place the file `RealESRGAN_x2.pth`, you can find it on [HuggingFace](https://huggingface.co/ai-forever/Real-ESRGAN/tree/main)
	 - **Other Models:**
		 - For IP-Adapter, follow the procedure in the [ComfyUI_IPAdapter_plus documentation](https://github.com/cubiq/ComfyUI_IPAdapter_plus). Make sure you have in your folder `ComfyUI/models/clip_vision` and place the following files:
			 - `CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors`
			 - `clip-vit-large-patch14.safetensors`
		 - In folder `ComfyUI/models/ipadapter` (create folder if it does not exist):
			 - `ip-adapter-faceid-plusv2_sd15.bin`
			 - `ip-adapter-faceid-portrait-v11_sd15.bin`
			 - `ip-adapter-faceid_sd15.bin`
			 - `ip-adapter-plus-face_sd15.safetensors`
			 - `ip-adapter_sd15.safetensors`
		 - In folder `ComfyUI/models/loras`:
			 - `ip-adapter-faceid-plusv2_sd15_lora.safetensors`
			 - `ip-adapter-faceid_sd15_lora.safetensors`



You may need the following additional AI/FaceID dependencies, if you have the error "No module named 'insightface'" when you try to run one of the Photobooth workflows (see below 'Test ComfyUI'),

For Windows, in the Terminal, go to the Comfy folder and run:
```bash
.venv\Scripts\activate.bat
pip3 install insightface
pip3 install onnxruntime
```

for Linux inside th evirtual environment of ComfyUI:
```bash
pip install insightface
pip install onnxruntime
pip install onnxruntime-gpu
```


4. **Test ComfyUI**
Start ComfyUI and verify that models in the `workflows` directory of PhotoBooth can be loaded correctly in ComfyUI and run on a test image (use a test image with a face present in it).
	

### 6. Hotspot & Captive Portal Setup (Raspberry Pi)

This is optional and only necessary if you want to use the Rasberry Pi to share images using Wifi. Follow the steps in the PDF to set up the hotspot and captive portal. Place configuration files in `hotspot_classes/in_py/configuration_files/` as described.

### 7. Run PhotoBooth

Open a Terminal or use the one opened previously, in the PhotoBooth folder, run:

#### Linux/macOS
be sure to have your virtual environment activated (`source venv/bin/activate`) and run:
```bash
python main.py
```

#### Windows
```bash
venv\Scripts\activate.bat
python main.py
```

You can use a `.bat` script to automate launching PhotoBooth and ComfyUI (change the paths to your correct comfy and photobooth paths):

```bat
@echo off
del /f /q "C:\Users\USERNAME\Documents\PhotoBooth\app.log"
start "" "C:\Users\USERNAME\AppData\Local\Programs\ComfyUI\ComfyUI.exe"
cd /d "C:\Users\USERNAME\Documents\PhotoBooth"
call venv\Scripts\activate.bat
python .\main.py
pause
```

**This script does the following:**
- Deletes the previous log file.
- Launches the ComfyUI executable (via ComfyUI Electron).
- Starts the PhotoBooth app.
- Leaves the window open (useful for checking for any error messages).

**Note:**
Adapt this `.bat` file to your own configuration, including the paths to `ComfyUI.exe` and the PhotoBooth folder.

#### Communication between PhotoBooth and ComfyUI

Photobooth assumes that ComfyUI is running and accessible at the local url `HTTP_BASE_URL = "http://127.0.0.1:8188"`.
If it is serving another url, you can modify the `constant.py` to point to the correct one. More generally, the communication between the PhotoBooth app and ComfyUI is set in the `constant.py` file (see config details). Check it if PhotoBooth does not work after ComfyUI is set. Restart PhotoBooth after any modification of the configuration file.



### 8. Quit Photobooth

Just press the keys alt and F4 to close the window. The Photobooth window is configured to be always in front.

---

## Credits

Developed as part of the **Machine Learning Group – UiT Tromsø** demonstration projects.  
Full list of contributors and acknowledgements are included in the PDF documentation **`CR_Installation_Photobooth_2025_V3_en.pdf`**.

