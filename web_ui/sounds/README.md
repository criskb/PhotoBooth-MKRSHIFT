# Optional audio assets

This folder supports optional **sound effects** and **background music**.

## Configure file names

Provide names in these text files (one name per line):

- `sfx-names.txt`
- `music-names.txt`

Use comments with `#` and leave blank lines if needed.

## Add files

Drop the referenced audio files into this same folder, for example:

- `style-select.mp3`
- `countdown-tick.mp3`
- `countdown-go.mp3`
- `gallery-open.mp3`
- `booth-loop.mp3`

If any listed file is missing, the app silently skips it (fallback behavior).
