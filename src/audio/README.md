# Word audio files

Place your pre-recorded MP3 files here under `words/`.

- Folder: `src/audio/words/`
- File name: the exact word in lowercase, with `.mp3` extension
  - Examples:
    - `булочка.mp3`
    - `молоко.mp3`
    - `малина.mp3`
- Encoding: UTF-8 filenames are supported. The app URL-encodes paths automatically.
- Format: MP3 (recommended, small size). 44.1 kHz mono is fine.

How it works
- On click (pointerdown) of a wagon in the assemble phase, the app will try to play `src/audio/words/{word}.mp3`.
- It cancels the previous sound before playing a new one to avoid overlapping.
- Rapid clicks are debounced to avoid errors or duplicate triggers.

Troubleshooting
- If a file is missing, nothing critical happens; the app logs a message and continues.
- If names include spaces or uppercase, please rename to lowercase without extra spaces.
