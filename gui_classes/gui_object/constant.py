# === ComfyUI API/Workflow constants ===
########################################
#   Constant Aesthetic
########################################
SCREEN_INDEX = 0

SHOW_LOGOS = True
GRID_WIDTH = 5

BTN_SCREEN_FACTOR = 0.08 # Size factor based on the smaller screen dimension
BTN_STYLE_ONE_ROW = 4
BTN_STYLE_TWO_ROW = 4

HUD_SIZE_RATIO = 0.0

COLORS = {
    "white": "#FFFFFF",
    "black": "#000000",
    "red": "#FF0000",
    "green": "#00FF00",
    "blue": "#0000FF",
    "yellow": "#FFFF00",
    "cyan": "#00FFFF",
    "magenta": "#FF00FF",
    "gray": "#888888",
    "darkgray": "#222222",
    "lightgray": "#CCCCCC",
    "orange": "#FFA500",
    "primary": "#1abc9c",
    "secondary": "#2ecc71",
    "accent": "#e67e22",
    "danger": "#e74c3c",
    "info": "#3498db",
    "warning": "#f1c40f",
    "success": "#27ae60",
    "background": "#23272e", 
    "panel": "#363b48",
    "highlight": "#9b59b6",
    "softblue": "#5dade2",
    "softgreen": "#58d68d",
    "softred": "#ec7063",
    "softyellow": "#eecc46",
    "hardorangee" : "#f7811a",
}

LABEL_WIDTH_RATIO = 0.8   
LABEL_HEIGHT_RATIO = 0.9  

WINDOW_TITLE = "Photo Booth"
WINDOW_ICON = '../../gui_template/btn_icons/take_selfie_passive.png'
WINDOW_BG_COLOR = "transparent"  # transparent au lieu d'une couleur
WINDOW_STYLE = """
    QWidget {
        background-color: transparent;
    }
    QLabel {
        background: transparent;
    }
    QPushButton {
        background-color: %s;
    }
""" % (COLORS["darkgray"])

APP_FONT_FAMILY = "Matter Bold"   
APP_FONT_SIZE = 14

TITLE_LABEL_TEXT = WINDOW_TITLE
TITLE_LABEL_FONT_SIZE = 40
TITLE_LABEL_FONT_FAMILY = "Matter Bold"
TITLE_LABEL_BOLD = True
TITLE_LABEL_ITALIC = False
TITLE_LABEL_COLOR = COLORS["white"]
TITLE_LABEL_BORDER_COLOR = COLORS["black"]
TITLE_LABEL_BORDER_WIDTH = 5  # px
TITLE_LABEL_BORDER_STYLE = "dashed"  # solid, dashed, etc.

TITLE_LABEL_STYLE = (
    f"color: {TITLE_LABEL_COLOR};"
    f"font-size: {TITLE_LABEL_FONT_SIZE}px;"
    f"font-family: {TITLE_LABEL_FONT_FAMILY};"
    f"{'font-weight: bold;' if TITLE_LABEL_BOLD else ''}"
    f"{'font-style: italic;' if TITLE_LABEL_ITALIC else ''}"
    f"text-align: center;"
    # f"text-shadow: {TITLE_LABEL_BORDER_WIDTH}px {TITLE_LABEL_BORDER_WIDTH}px 0 {TITLE_LABEL_BORDER_COLOR};" 
    f"border-bottom: {TITLE_LABEL_BORDER_WIDTH}px {TITLE_LABEL_BORDER_STYLE} {TITLE_LABEL_BORDER_COLOR};"
)

DISPLAY_BORDER_COLOR = COLORS["black"]
DISPLAY_BORDER_WIDTH = 4  # px  # Ajout de cette ligne
DISPLAY_BORDER_RADIUS = '100%'
DISPLAY_BACKGROUND_COLOR = COLORS["white"]
DISPLAY_TEXT_COLOR = COLORS["orange"]
DISPLAY_TEXT_SIZE = 18

DISPLAY_LABEL_STYLE = (
    f"background: {DISPLAY_BACKGROUND_COLOR};"
    f"border: {DISPLAY_BORDER_WIDTH}px solid {DISPLAY_BORDER_COLOR};"  # Modification ici
    f"border-radius: {DISPLAY_BORDER_RADIUS};"
    f"color: {DISPLAY_TEXT_COLOR};"
    f"font-size: {DISPLAY_TEXT_SIZE}px;"
)

BUTTON_BG_COLOR = COLORS["softyellow"]
BUTTON_BG_HOVER = COLORS["yellow"]
BUTTON_BG_PRESSED = COLORS["hardorangee"]
BUTTON_TEXT_COLOR = COLORS["white"]
BUTTON_TEXT_SIZE = 16
BUTTON_BORDER_COLOR = COLORS["black"] 
BUTTON_BORDER_WIDTH = 50
BUTTON_BORDER_RADIUS = '100%'

BUTTON_STYLE = (
    f"QPushButton {{"
    f"background-color: {BUTTON_BG_COLOR};"
    f"color: {BUTTON_TEXT_COLOR};"
    f"font-size: {BUTTON_TEXT_SIZE}px;"
    f"font-family: Matter;"
    f"border: {BUTTON_BORDER_WIDTH}px solid {BUTTON_BORDER_COLOR};"
    f"border-radius: {BUTTON_BORDER_RADIUS};"
    f"font-weight: bold;"
    f"}}"
    f"QPushButton:hover {{"
    f"background-color: {BUTTON_BG_HOVER};"
    f"}}"
    f"QPushButton:pressed {{"
    f"background-color: {BUTTON_BG_PRESSED};"
    f"}}"
    f"QPushButton:checked {{"
    f"background-color: {COLORS['hardorangee']};"
    f"border: {BUTTON_BORDER_WIDTH}px solid {COLORS['black']};"
    f"}}"
)

SPECIAL_BUTTON_NAMES = [
    "Apply Style",
    "Save",
    "Print",
    "Back to Camera"
]

SPECIAL_BUTTON_STYLE = (
    f"QPushButton {{"
    f"background-color: {COLORS['red']};" 
    f"color: {COLORS['white']};"
    f"font-size: {BUTTON_TEXT_SIZE}px;"
    f"border: {BUTTON_BORDER_WIDTH}px solid {COLORS['black']};"
    f"border-radius: {BUTTON_BORDER_RADIUS};"
    f"font-weight: bold;"
    f"}}"
    f"QPushButton:hover {{"
    f"background-color: {COLORS['gray']};"  
    f"}}"
    f"QPushButton:pressed {{"
    f"background-color: {COLORS['black']};"  
    f"}}"
    f"QPushButton:checked {{"
    f"background-color: {COLORS['primary']};"
    f"border: {BUTTON_BORDER_WIDTH}px solid {COLORS['white']};"
    f"}}"
)

LOGO_SIZE = 64  

GRID_MARGIN_TOP = 20
GRID_MARGIN_BOTTOM = 40
GRID_MARGIN_LEFT = "AUTO"
GRID_MARGIN_RIGHT = "AUTO"
GRID_VERTICAL_SPACING = 20
GRID_HORIZONTAL_SPACING = 10

GRID_LAYOUT_MARGINS = (10, 10, 10, 10)  
GRID_LAYOUT_SPACING = 5

GRID_ROW_STRETCHES = {
    "title": 1,     # Row 0
    "display": 10,  # Row 1
    "buttons": 2    # Row 2
}

DISPLAY_SIZE_RATIO = (0.7, 0.6)  

INFO_BUTTON_SIZE = 32  # px
INFO_BUTTON_STYLE = (
    f"QPushButton {{"
    f"background-color: transparent;"
    f"border: none;"
    f"width: {INFO_BUTTON_SIZE}px;"
    f"height: {INFO_BUTTON_SIZE}px;"
    f"}}"
    f"QPushButton:hover {{"
    f"background-color: rgba(255, 255, 255, 0.1);"
    f"}}"
    f"QPushButton:pressed {{"
    f"background-color: rgba(0, 0, 0, 0.1);"
    f"}}"
)

DIALOG_BOX_STYLE = (
    "QDialog {"
    "position: absolute;"
    "background-color: rgba(24, 24, 24, 0.82);" 
    "border-radius: 18px;"
    "}"
    "QLabel {"
    "background: transparent;"
    "color: white;"
    "font-size: 18px;"
    "font-family: Matter;"
    "}"
    "QTextEdit {"
    "background: transparent;"
    "color: white;"
    "font-size: 16px;"
    "font-family: Matter;"
    "border: none;"
    "}"
    "QPushButton {"
    "background-color: #444;"
    "color: white;"
    "font-size: 16px;"
    "font-family: Matter;"
    "border-radius: 10px;"
    "padding: 8px 24px;"
    "margin-top: 12px;"
    "}"
    "QPushButton:hover {"
    "background-color: #666;"
    "}"
    "QPushButton:pressed {"
    "background-color: #222;"
    "}"
)

TOOLTIP_STYLE = """
QToolTip {
    background-color: #2a2a2a;
    color: white;
    border: 1px solid white;
    border-radius: 4px;
    padding: 4px;
    font-size: 12px;
    font-family: Matter;
}
"""

COUNTDOWN_FONT_STYLE = "font-size: 120px; font-weight: bold; color: #fff; font-family: Matter; background: transparent;"

COLOR_LOADING_BAR = "rgba(169, 155, 253, 255)"

OVERLAY_TITLE_STYLE = ("color: black; font-size: 40px; font-weight: bold; font-family: Matter; background: transparent;")
OVERLAY_MSG_STYLE = ("color: black; font-size: 30px; background: transparent;")

OVERLAY_LOADING_TITLE_STYLE = (TITLE_LABEL_STYLE + "color: rgba(0, 0, 0, 255); border-bottom: none; text-decoration: none; background: transparent;")
OVERLAY_LOADING_MSG_STYLE = (
    "color: rgba(0, 0, 0, 255); "
    "font-size: 24px; "
    "font-family: Matter;"
    "background: transparent; "
    "line-height: 2.2;"
)

MAIN_WINDOW_MSG_STYLE = (   """
            background: rgba(80, 80, 80, 0.6);
            color: rgba(255, 255, 255, 1.0);
            font-size: 35px;
            font-family: Matter;
            border-radius: 18px;
            padding: 12px 24px;
        """)


BTN_SIZE = 1
BTN_SIZE_ONE = 2
BTN_STYLE_TWO_SIZE_COEFFICIENT = 1.6
BTN_STYLE_TWO_FONT_SIZE_PERCENT = 8 
BTN_STYLE_TWO_FONT_OUTLINE = 1
BTN_STYLE_TWO = (
    "QPushButton {{"
    "   background: transparent;"
    "   border: none;"
    "   background-image: url({texture});"
    "   background-position: center;"
    "   background-repeat: no-repeat;"
    "   background-size: contain;"  # Ensures proper scaling of transparent images
    "   color: white;"
    "   font-weight: 900;"
    "   font-size: 2.0em;"
    "   font-family: Matter;"
    "   text-transform: uppercase;"
    "   border-radius: 50px;"
    "}}"
    "QPushButton:pressed {{"
    "   background-color: rgba(100, 100, 100, 0.7);"  # Darker overlay for better press feedback
    "   border: 2px solid rgba(255, 255, 255, 0.7);"  # Thinner, semi-transparent border
    "   border-radius: 50px;"
    "}}"
    "QPushButton:checked {{"
    "   background-color: rgba(255, 255, 255, 0);"  # Subtle highlight for checked state
    "   border: 3px solid rgba(255, 255, 255, 0.9);"  # More prominent border
    "   border-radius: 50px;"
    "}}"
)

DIALOG_ACTION_BUTTON_STYLE = (
    "QPushButton {"
    "background-color: rgba(180,180,180,0);"
    "border: 2px solid #bbb;"
    "border-radius: 24px;"
    "min-width: 48px; min-height: 48px;"
    "max-width: 48px; max-height: 48px;"
    "font-size: 18px;"
    "color: white;"
    "font-weight: bold;"
    "}"
    "QPushButton:hover {"
    "border: 2.5px solid white;"
    "background-color: rgba(200,200,200,0.45);"
    "}"
    "QPushButton:pressed {"
    "background-color: rgba(220,220,220,0.55);"
    "border: 3px solid #eee;"
    "}"
)

ICON_BUTTON_STYLE = (
    "QPushButton {"
    "background-color: rgba(180,180,180,0);"
    "border: 2px solid #bbb;"
    "border-radius: 24px;"
    "min-width: 48px; min-height: 48px;"
    "max-width: 48px; max-height: 48px;"
    "}"
    "QPushButton:hover {"
    "border: 2.5px solid white;"
    "}"
    "QPushButton:pressed {"
    "background-color: rgba(220,220,220,0.55);"
    "border: 3px solid #eee;"
    "}"
)

def get_style_button_style(style_name):
    import os
    texture_path = f"gui_template/styles_textures/{style_name}.png"
    checked = (
        "QPushButton:checked {"
        "background-color: #f7811a;"
        "border: 3px solid #fff;"
        "color: #fff;"
        "}"
    )
    if os.path.exists(texture_path):
        return (
            "QPushButton {"
            "border: 2px solid black;"
            "border-radius: 16px;"
            f"background-image: url('{texture_path}');"
            "background-repeat: no-repeat;"
            "background-position: center;"
            # "background-size: cover;" 
            "background-color: black;"
            "color: white;"
            "font-size: 18px;"
            "font-weight: bold;"
            "min-width: 80px; min-height: 80px;"
            "max-width: 120px; max-height: 120px;"
            "}"
            "QPushButton:hover {"
            "border: 2px solid gray;"
            "}"
            "QPushButton:pressed {"
            "border: 4px solid white;"
            "}"
            + checked
        )
    else:
        return (
            "QPushButton {"
            "border: 2px solid black;"
            "border-radius: 16px;"
            "background-color: black;"
            "color: white;"
            "font-size: 18px;"
            "font-weight: bold;"
            "min-width: 80px; min-height: 80px;"
            "max-width: 120px; max-height: 120px;"
            "}"
            "QPushButton:hover {"
            "border: 2px solid gray;"
            "}"
            "QPushButton:pressed {"
            "border: 4px solid white;"
            "}"
            + checked
        )

FIRST_BUTTON_STYLE = (
    "QPushButton {"
    "background-color: rgba(180,180,180,0);"
    "border: 2px solid #888;"
    "border-radius: 24px;"
    "min-width: 48px; min-height: 48px;"
    "max-width: 48px; max-height: 48px;"
    "font-size: 30px;"
    "color: white;"
    "font-weight: bold;"
    "}"
    "QPushButton:hover {"
    "border: 2.5px solid white;"
    "}"
    "QPushButton:pressed {"
    "border: 3px solid black;"
    "}"
)

GENERIC_BUTTON_STYLE = FIRST_BUTTON_STYLE 
############################################
# Technical Constant
############################################

dico_styles = {
    "clay": 'Change the style to Textured stop-motion claymation with visible fingerprints, tool marks, and matte surfaces. Background: {{Whimsical|Cozy|Fun|} {Clay|Cardboard|Yarn|Fabric} {Castle|Village|Forest|Landscape|City}} environment sculpted from clay, cardboard, balsa wood, felt, and miniature props. Clothes: {forest ranger|fantasy|royal guard|white knight|ruffled|Fairy|Queen|king} attire crafted from **sculpted polymer clay, fabric scraps, and hand-painted details** (e.g., stitched seams, visible glue). Text: {Speech bubble saying {"Neerds!!"|"Game on!"|"Kreativ Teknologi"}|fancy banner saying "Kultur natt!"|fancy large Sign saying "Kultur natt!"} made of clay letters, cardstock, or wire-reinforced paper. Retain subject\'s identity, proportions, looks, and gender. Big googly eyes or hand-sculpted glass eyes. Soft directional lighting with subtle shadows. Slight focus imperfections. Render in tactile, handmade claymation style.',
    "comic": 'change the style to {art nouveau comic decorative elements with a vibrant and bustling metropolis in the background|retro comic|hyper realistic anime|retro anime|colored manga|western cartoon} style and background to {high fantasy glowing landscape and castles with intricate elements|rpg dungeon|fantasy {cafe|forest|throne room|ball room} with cute mosnters floating in the background} environment and change the clothes to {game styled intricate clothes|tactical rpg armour| futuristic high fantasy {armour|intricate dress|medieval clothes}| medieval armour|epic and futuristic heroic costume, elegant lines, floral patterns}, add text in a large font {"TVIBIT, Kultur natt!"|"Neerds!!"|"Game on!"|"Kreativ Teknologi"} in a {speech bubble|fancy banner behind subject|grafitti|sign in the background}, retain subjects identity and porportions and look.',
    "oil paint": 'Change the style to Textured oil {Realism|Impressionism|Expressionism|Abstract|Surrealism} painting with visible brushstrokes, impasto technique, and rich varnished surfaces. Background: {{Epic|Cool|Fun|relaxed}  {Castle|Village|Forest|Landscape|City}} environment rendered in thick impasto, palette knife textures, and visible canvas weave. Clothes: {forest ranger|fantasy|royal guard|white knight|ruffled|Fairy|Queen|king} attire depicted with heavy pigment application, visible brushwork on fabrics, and chiaroscuro lighting (e.g., deep folds, satin highlights). Retain subject\'s identity, proportions, looks, and gender. Highly detailed, light-catching eyes with wet-on-wet blending. Soft Rembrandt lighting with dramatic shadows. Slight canvas texture visible. Render in traditional oil painting style with rich, saturated pigments and subtle varnish glow.',
    "tvibit": 'Edit the image remove wrinkles and give brown color to the hair, smooth skin, de-aged, same facial structure and ethnicity, smooth youthful skin, confident relaxed expression. Wearing authentic 90s hip-hop streetwear oversized FUBU hoodie or Starter jacket, baggy denim jeans, Timberland boots, large oversized gold chain, snapback cap tilted slightly, Walkman headphones around neck. 1990s Polaroid aesthetic, Kodak Ultramax tones, timestamp (\'95 08 22), subtle grain, poster wall, slight motion blur for candid realism, authentic analog imperfections, (retain skin tone and ethnicity:1.5).',
    "cyberpunk": 'change the style to cyberpunk with holographic glitches, and tech-noir grit. Background: {{Dystopic|Neon|grid|spaceship} {City|spaceport|space|interior}} environment Clothes: {forest ranger|fantasy|royal guard|white knight|ruffled|Fairy|Queen|king} attire redesigned as tech-wear with augmented reality overlays Text: {Hologram Speech bubble saying {"Neerds!!"|"Game on!"|"Kreativ Teknologi"}|fancy hologram banner saying "Kultur natt!"|fancy large neon Sign saying "Kultur natt!"} augmented reality tags. Retain subject\'s identity, proportions, looks and gender  do not change the face and the subject is well lit no hard shadows. Cybernetic enhancements (glowing retinal implants, data-jack ports). Lighting: {acid-rain reflections|neon sign glow|laser grids}. Atmosphere: {gentle rainbows (holographic prisms)|soft snowfall (toxic ash)|sparkling dew (condensation on chrome)|magical sparkles (data corruption artifacts)|colorful fog (smog with RGB pollution)|floating bubbles (energy shields)|stardust showers (falling satellites)|glimmering ice (frozen coolant)|sunset (polluted violet haze)}. Render in high-contrast digital grunge with chromatic aberration and scanlines.',
    "steampunk": 'change style to Textured steampunk with visible rivets, brass patina, grease stains, and functional machinery. Background: {steampunk {Whimsical|crazy|epic|} {Brass|Iron|Glass|Wood} {airballon|airship|Sky Ship|Village|Landscape|City|workshop|hangar}} environment Wearing {Ranger|fantasy|royal guard|white knight|ruffled|Queen|king} attire crafted from worn leather, brass buckles, canvas straps, and clockwork accessories (e.g., riveted armor, gear-embroidered capes, steam-powered prosthetics). add text in a large font in a{Speech bubble saying {"Neerds!!"|"Game on!"|"Kreativ Teknologi"}|fancy banner saying "Kultur natt!"|fancy large Sign saying "Kultur natt!"} made of engraved brass plates, typewriter-stamped metal, or flickering neon tubes. Retain subject\'s identity, proportions, looks, and gender. Goggles or monocles with magnifying lenses. Render in Victorian industrial steampunk style with functional, weathered details.',
    "voxel": 'Change style to Blocky voxel art with 16x16 pixel textures, visible cube edges, and no curved surfaces. Background: {{Whimsical|Cozy|Fun|}  {Castle|Village|Forest|vulcano|Landscape|City}} environment built from Minecraft-style blocks Clothes: {forest ranger|fantasy|royal guard|white knight|ruffled|Fairy|Queen|king|{diamond|gold|iron}armour, robe} attire designed with blocky pixelated patterns, and simple color blocking. Text: {Speech bubble saying {"Neerds!!"|"Game on!"|"Kreativ Teknologi"}|fancy banner saying "Kultur natt!"|fancy large Sign saying "Kultur natt!"} Retain subject\'s identity, proportions, looks, and gender but make them low poly. Blocky facial features (square eyes, flat nose). Day/night cycle lighting with block-based shadows. Render in low-poly voxel style soft light 3d',
    "pixel art": 'Change the style to Retro pixel art with {8-bit|16-bit|32-bit} resolution, visible pixels, no anti-aliasing, and limited color palettes. Background: {{Whimsical|Cozy|Fun|} {Clay|Wood|Stone|Glass} {Castle|Village|Forest|Landscape|City}} environment rendered in tile-based graphics Clothes: {forest ranger|fantasy|royal guard|white knight|ruffled|Fairy|Queen|king} attire designed with color-blocking, sprite patterns, and limited-detail accessories Text: {Speech bubble saying {"Neerds!!"|"Game on!"|"Kreativ Teknologi"}|fancy banner saying "Kultur natt!"|fancy large Sign saying "Kultur natt!"} in bitmap fonts (e.g., 8x8px pixel font) on {pixelated signs|dithered banners|CRT-screen overlays}. Retain subject\'s identity, proportions, looks, and gender. Dot eyes or simple 2-pixel expressions. Lighting: {global illumination|directional shadows|palette-cycling glows}. Atmosphere: {gentle rainbows (color-band gradients)|soft snowfall (1-pixel flakes)|sparkling dew (single-pixel glints)|magical sparkles (particle sprites)|colorful fog (dithered transparency)|floating bubbles (3x3px circles)|stardust showers (star-shaped sprites)|glimmering ice (crystal tiles)|sunset (dithered sky gradient)}. Render in authentic pixel art style** with visible grid lines and no smooth curves.',
    "watercolor": 'Change the style to Flowing watercolor with translucent washes, pigment granulation, and paper texture. Background: {{Whimsical|Cozy|Fun|} {Clay|Wood|Stone|Glass} {Castle|Village|Forest|Landscape|City}} environment rendered in soft bleeds, wet-on-wet blends, and salt-textured effects (e.g., cloud-like skies, diffused foliage, blurred horizons). Clothes: {forest ranger|fantasy|royal guard|white knight|ruffled|Fairy|Queen|king} attire depicted with transparent layers, color blooms, and ink outlines (e.g., water-soluble pencil details, pigment pooling in fabric folds). Retain subject\'s identity, proportions, looks, and gender. Soft-focus features with expressive watercolor eyes. Lighting: {diffused daylight|moonlit washes|backlit silhouettes}. Atmosphere: {gentle rainbows (prism refraction)|soft snowfall (masked splatters)|sparkling dew (salt textures)|magical sparkles (iridescent mica)|colorful fog (lifted pigment)|floating bubbles (soap-resist)|stardust showers (gold leaf)|glimmering ice (frosted washes)|sunset (variegated wash)}. Render on rough cold-press paper with visible brush strokes and unpainted white space.',
    "disney": 'Change the style to disney stylized 3D style and background to {{Whimsical|Cozy|Fun|Magical|Underwater|sky} {Wizzards|Fairy|Candy|Toy|Giants|Midgets|Mermaid|Troll} {Castle|Village|Forest|Landscape|fantasy Place}} environment and change the clothes to {forest ranger|fantasy|royal guard|pirate|white knight|ruffled|Mermaid|Fairy|queen|king} attire, add text in a large font in a {Speech bubble saying {"Neerds!!"|"Game on!"|"Kreativ Teknologi"}|fancy banner saying"Kultur natt!" in the background|fancy large Sign saying"Kultur natt!" in the background}, retain subjects identity, porportions, looks and gender. with a atmosphere that has{gentle rainbows|soft snowfall|sparkling dew|magical sparkles|colorful fog|floating bubbles|stardust showers|glimmering ice|sunset}, big eyes, soft light, render'
}

EASY_KID_ACCESS = True

SLEEP_TIMER_SECONDS = 20 
SLEEP_TIMER_SECONDS_QRCODE_OVERLAY = 90

TOOLTIP_DURATION_MS = 3000 

DEBUG = False
DEBUG_FULL = False

WS_URL = "ws://127.0.0.1:8188/ws"
HTTP_BASE_URL = "http://127.0.0.1:8188"
HOTSPOT_URL = "https://192.168.10.2:5000/share"

import os
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
COMFY_OUTPUT_FOLDER = os.path.abspath(
    os.path.join(BASE_DIR, "../../../ComfyUI/output")
)
INPUT_IMAGE_PATH = os.path.abspath(
    os.path.join(BASE_DIR, "../../../ComfyUI/input/input.png")
)
COMFY_WORKFLOW_DIR = os.path.abspath(
    os.path.join(BASE_DIR, "../../workflows")
)

COMFY_CLEAR_OUTPUT = False

ShareByHotspot = False  

try:
    from config_local import CAMERA_ID # type: ignore
except ImportError:
    CAMERA_ID = 0  
TEMP_IMAGE = "temp.jpg"

VALIDATION_OVERLAY_MESSAGE = "" 


COUNTDOWN_START = 2  