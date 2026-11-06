"""Find a bold font for captions/posters without hardcoding machine paths.

Order: $CAPTION_FONT (path to a .ttf/.otf) -> fontconfig (`fc-match`) for a few common bold
families -> None (callers fall back to Pillow's built-in font).
"""
import os
import shutil
import subprocess

CANDIDATES = ("Poppins:bold", "Montserrat:bold", "DejaVu Sans:bold", "Liberation Sans:bold", "Arial:bold")


def bold_font():
    env = os.environ.get("CAPTION_FONT")
    if env and os.path.exists(env):
        return env
    if shutil.which("fc-match"):
        for fam in CANDIDATES:
            try:
                path = subprocess.run(["fc-match", "-f", "%{file}", fam], capture_output=True, text=True,
                                      timeout=10).stdout.strip()
            except (OSError, subprocess.SubprocessError):
                continue
            if path and os.path.exists(path):
                return path
    return None


def load(size):
    from PIL import ImageFont
    f = bold_font()
    return ImageFont.truetype(f, size) if f else ImageFont.load_default(size)
