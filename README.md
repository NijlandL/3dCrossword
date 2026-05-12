# 3D Crossword Chatbot

An interactive 3D crossword clue viewer built with **p5.js** and a **RiveScript** chatbot.
No npm, no bundler — just open with Live Server and go.

## Project structure

```
3dCrossword/
├── index.html              ← entry point (loads CSS, libraries, your JS)
├── style.css               ← page styles
├── README.md
├── .gitignore
│
├── js/                     ← your JavaScript
│   ├── sketch.js           ← p5.js sketch: 3D cube, buttons, draw loop
│   └── chat.js             ← reusable ChatBot class (pattern / reference)
│
├── libraries/              ← local fallback copies of CDN libraries
│   ├── p5.js
│   └── rivescript.min.js
│
├── assets/
│   └── fonts/
│       └── myfont.ttf      ← font used inside the canvas
│
├── brain/
│   └── brain.rive          ← RiveScript brain (edit your clues here)
│
└── arduino/
    └── crossword_controller.ino  ← reads 4 buttons, sends row N over Serial
```

## How to run

1. Install the **Live Server** VS Code extension (`ritwickdey.LiveServer`).
2. Open the `3dCrossword` folder in VS Code (`File → Open Folder`).
3. Right-click `index.html` → **Open with Live Server**
   *(or click **Go Live** in the bottom-right status bar).*
4. Your browser opens at `http://127.0.0.1:5500` and auto-reloads on every save.

## Editing crossword clues

Open `brain/brain.rive` — each row is two lines:

```
+ row 1
- clue for row 1 horizontal: orange president
```

The `+` line is what the user (or button) sends; the `-` line is the bot's reply.

## Adding more rows / buttons

In `js/sketch.js`, edit the `buttons` array at the top:

```js
let buttons = ["Row 1", "Row 2", "Row 3", "Row 4"];
```

Then add matching `+ row N` / `- ...` pairs in `brain/brain.rive`.

## Working offline

`index.html` loads p5.js and RiveScript from CDN.
To run without internet, swap the two `<script>` tags in `index.html` to:

```html
<script src="libraries/p5.js"></script>
<script src="libraries/rivescript.min.js"></script>
```

## Arduino (optional)

Upload `arduino/crossword_controller.ino` to your board, wire buttons to pins 2–5,
and read the Serial output from `sketch.js` using the Web Serial API to trigger `askBot()`.

## Dependencies (CDN)

| Library    | Version | Source |
|------------|---------|--------|
| p5.js      | 1.4.0   | cdnjs  |
| RiveScript | latest  | unpkg  |
