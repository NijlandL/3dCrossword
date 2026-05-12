let bot;
let messages = []; // { from: 'user'|'bot', text, displayLength, typing }
let buttons = ["Row 1", "Row 2", "Row 3", "Row 4"];
let myFont;

// kubus
const CUBE_X = 220;       // wereld-positie x van het kubuscentrum
const CUBE_SIZE = 200;    // afmeting van de kubus
const HALF = CUBE_SIZE / 2;
const GRID_SIZE = 4;      // 4x4 cellen per zijde
const CELL = CUBE_SIZE / GRID_SIZE;
const FACES = 4;          // voor, rechts, achter, links

let rotX = 0;
let rotY = 0;

// chat-paneel layout
const PANEL = {
  x: -420, y: -190,
  w: 380,  h: 380,
  padX: 22, padY: 22,
  gap: 8,
};

// puzzelstatus: 4 zijden, elk een 4x4 raster met letters ('' = leeg)
let puzzles = [];

// hover/klik staat voor 3D picking
let hoveredCell = null;   // { face, row, col } of null
let wasDragged = false;
let mouseDownPos = { x: 0, y: 0 };

function preload() {
  myFont = loadFont('assets/fonts/myfont.ttf');
}

function setup() {
  const cnv = createCanvas(900, 500, WEBGL);
  cnv.parent('canvas-wrap');
  rectMode(CORNER);
  textAlign(LEFT, TOP);

  // lege puzzels initialiseren
  for (let f = 0; f < FACES; f++) {
    const grid = [];
    for (let r = 0; r < GRID_SIZE; r++) grid.push(new Array(GRID_SIZE).fill(''));
    puzzles.push(grid);
  }

  bot = new RiveScript();
  bot.loadFile("brain/brain.rive").then(() => {
    bot.sortReplies();
    pushBotMessage("Welcome! Click a row to get a clue.");
  }).catch(err => {
    console.error("Bot loading failed:", err);
    pushBotMessage("Error loading brain/brain.rive");
  });

  // row-knoppen
  for (const label of buttons) {
    const btn = createButton(label);
    btn.parent('buttons');
    btn.addClass('row-btn');
    btn.mousePressed(() => askBot(label));
  }

  // new-chat
  const newBtn = createButton('↻ New Chat');
  newBtn.parent('buttons');
  newBtn.addClass('row-btn');
  newBtn.addClass('ghost');
  newBtn.mousePressed(newChat);

  // Connect Arduino
  const connectBtn = document.getElementById('connect-arduino');
  if (connectBtn) connectBtn.addEventListener('click', connectArduino);
}

// === Muis-interactie ===

function mousePressed() {
  mouseDownPos = { x: mouseX, y: mouseY };
  wasDragged = false;
}

function mouseDragged() {
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;
  rotY += movedX * 0.01;
  rotX -= movedY * 0.01;
  const dx = mouseX - mouseDownPos.x;
  const dy = mouseY - mouseDownPos.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) wasDragged = true;
}

function mouseReleased() {
  // Tel als een echte klik (niet een drag) -> plaats letter
  if (!wasDragged && hoveredCell) {
    const { face, row, col } = hoveredCell;
    puzzles[face][row][col] = arduinoLetter;
  }
}

// === 3D mouse picking ===
// Cast een ray vanuit de camera door de muis en kijk welke kubuszijde + cel
// als eerste geraakt wordt.

function pickCell(mx, my) {
  // p5 default camera: PI/3 FOV, camera op z = (height/2) / tan(PI/6)
  const cameraZ = (height / 2) / Math.tan(Math.PI / 6);
  let o = { x: 0, y: 0, z: cameraZ };
  let d = { x: mx - width / 2, y: my - height / 2, z: -cameraZ };

  // Transformeer ray naar kubus-lokale ruimte
  // Forward: world = T(CUBE_X) * Rx(rotX) * Ry(rotY) * local
  // Inverse: local = Ry(-rotY) * Rx(-rotX) * (world - T)
  o = { x: o.x - CUBE_X, y: o.y, z: o.z };
  o = applyRotX(o, -rotX);
  o = applyRotY(o, -rotY);
  d = applyRotX(d, -rotX);
  d = applyRotY(d, -rotY);

  // Test elk vlak en bewaar de dichtsbijzijnde geldige hit
  let best = null;

  function tryFace(faceIdx, axis, sign, mapFn) {
    const axes = ['x', 'y', 'z'];
    const a = axes[axis];
    if (Math.abs(d[a]) < 1e-6) return;
    const t = (sign * HALF - o[a]) / d[a];
    if (t <= 0) return;
    const hit = {
      x: o.x + t * d.x,
      y: o.y + t * d.y,
      z: o.z + t * d.z
    };
    // Binnen face-bounds?
    for (const i of [0, 1, 2]) {
      if (i === axis) continue;
      const v = hit[axes[i]];
      if (v < -HALF || v > HALF) return;
    }
    if (!best || t < best.t) {
      const { fx, fy } = mapFn(hit);
      best = { face: faceIdx, t, fx, fy };
    }
  }

  // Mapping per zijde: zie drawCubeFace() voor de oriëntatie van elke face
  tryFace(0, 2, +1, h => ({ fx:  h.x, fy: h.y })); // voor  (+Z)
  tryFace(1, 0, +1, h => ({ fx: -h.z, fy: h.y })); // rechts (+X)
  tryFace(2, 2, -1, h => ({ fx: -h.x, fy: h.y })); // achter (-Z)
  tryFace(3, 0, -1, h => ({ fx:  h.z, fy: h.y })); // links  (-X)

  if (!best) return null;

  const col = Math.floor((best.fx + HALF) / CELL);
  const row = Math.floor((best.fy + HALF) / CELL);
  if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) return null;

  return { face: best.face, row, col };
}

function applyRotX(p, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: p.x,
    y: p.y * c - p.z * s,
    z: p.y * s + p.z * c
  };
}

function applyRotY(p, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: p.x * c + p.z * s,
    y: p.y,
    z: -p.x * s + p.z * c
  };
}

// === chat-helpers ===

function pushBotMessage(text) {
  messages.push({ from: 'bot', text, displayLength: 0, typing: false });
}

function pushUserMessage(text) {
  messages.push({ from: 'user', text, displayLength: Infinity, typing: false });
}

function newChat() {
  messages = [];
  pushBotMessage("New chat started. Pick a row.");
}

async function askBot(topic) {
  pushUserMessage(topic);
  const typingMsg = { from: 'bot', text: '', displayLength: 0, typing: true };
  messages.push(typingMsg);
  const reply = await bot.reply("local-user", topic);
  const delay = 600 + Math.min(reply.length * 12, 700);
  await new Promise(r => setTimeout(r, delay));
  typingMsg.typing = false;
  typingMsg.text = reply;
  typingMsg.displayLength = 0;
}

// === draw ===

function draw() {
  background(80, 95, 95);

  // hoveredCell elke frame opnieuw bepalen (cube draait, dus posities veranderen)
  hoveredCell = pickCell(mouseX, mouseY);

  // KUBUS met puzzelraster + letters op elke zijde
  push();
  translate(CUBE_X, 0, 0);
  rotateX(rotX);
  rotateY(rotY);
  fill(255);
  stroke(0);
  strokeWeight(2);
  box(CUBE_SIZE);

  for (let f = 0; f < FACES; f++) {
    drawCubeFace(puzzles[f], f);
  }
  pop();

  // CHAT-PANEEL
  if (myFont) drawChatPanel();
}

function drawCubeFace(letters, faceIndex) {
  push();

  // Positioneer en oriënteer per zijde (kleine offset tegen z-fighting)
  if (faceIndex === 0) {
    translate(0, 0, HALF + 0.5);
  } else if (faceIndex === 1) {
    translate(HALF + 0.5, 0, 0);
    rotateY(HALF_PI);
  } else if (faceIndex === 2) {
    translate(0, 0, -HALF - 0.5);
    rotateY(PI);
  } else if (faceIndex === 3) {
    translate(-HALF - 0.5, 0, 0);
    rotateY(-HALF_PI);
  }

  // Highlight de gehoverde cel (geel)
  if (hoveredCell && hoveredCell.face === faceIndex) {
    noStroke();
    fill(255, 244, 138, 230);
    const hx = -HALF + hoveredCell.col * CELL;
    const hy = -HALF + hoveredCell.row * CELL;
    rect(hx, hy, CELL, CELL);
  }

  // Rasterlijnen op de zijde
  stroke(0);
  strokeWeight(1);
  noFill();
  for (let i = 1; i < GRID_SIZE; i++) {
    const o = -HALF + i * CELL;
    line(o, -HALF, o, HALF);
    line(-HALF, o, HALF, o);
  }

  // Letters in de cellen
  noStroke();
  fill(0);
  textFont(myFont);
  textAlign(CENTER, CENTER);
  textSize(28);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const letter = letters[r][c];
      if (letter) {
        const x = -HALF + (c + 0.5) * CELL;
        const y = -HALF + (r + 0.5) * CELL;
        text(letter, x, y);
      }
    }
  }
  pop();
}

// === Chat-paneel ===

function drawChatPanel() {
  push();
  translate(PANEL.x, PANEL.y);

  noStroke();
  fill(122, 142, 134);
  rect(0, 0, PANEL.w, PANEL.h, 40);

  textFont(myFont);
  textSize(14);

  const innerW = PANEL.w - PANEL.padX * 2;
  const innerH = PANEL.h - PANEL.padY * 2;
  const bubbleMaxW = innerW * 0.78;

  for (const m of messages) {
    if (m.from === 'bot' && !m.typing && m.displayLength < m.text.length) {
      m.displayLength = Math.min(m.text.length, m.displayLength + 0.7);
    }
  }

  const layouts = messages.map(m => layoutMessage(m, bubbleMaxW));
  const totalH = layouts.reduce((s, l) => s + l.bubbleH + PANEL.gap, 0) - PANEL.gap;
  const scrollY = Math.max(0, totalH - innerH);

  push();
  translate(PANEL.padX, PANEL.padY - scrollY);

  let y = 0;
  for (let i = 0; i < messages.length; i++) {
    const lay = layouts[i];
    const bubbleTop = y;
    const bubbleBottom = y + lay.bubbleH;
    if (bubbleBottom >= scrollY && bubbleTop <= scrollY + innerH) {
      drawBubble(messages[i], lay, y, innerW);
    }
    y += lay.bubbleH + PANEL.gap;
  }
  pop();

  pop();
}

function layoutMessage(m, bubbleMaxW) {
  if (m.typing) return { lines: [], bubbleW: 50, bubbleH: 24 };
  if (m.from === 'user') return { lines: [m.text], bubbleW: 70, bubbleH: 22 };

  const shown = m.text.substring(0, Math.floor(m.displayLength));
  const paragraphs = shown.split('\n');
  let lines = [];
  for (const p of paragraphs) lines = lines.concat(wrapText(p, bubbleMaxW - 20));
  if (lines.length === 0) lines = [''];

  let maxLineW = 10;
  for (const line of lines) maxLineW = Math.max(maxLineW, textWidth(line));

  const bubbleW = Math.min(bubbleMaxW, maxLineW + 22);
  const bubbleH = lines.length * 19 + 12;
  return { lines, bubbleW, bubbleH };
}

function drawBubble(m, lay, y, innerW) {
  const isUser = m.from === 'user';
  const rightInset = 30;
  let x = isUser ? innerW - lay.bubbleW - rightInset : 0;
  if (x < 0) x = 0;

  noStroke();
  if (isUser) {
    fill(242, 209, 215);
    rect(x, y, lay.bubbleW, lay.bubbleH);
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(12);
    text(lay.lines[0], x + lay.bubbleW / 2, y + lay.bubbleH / 2 + 1);
    return;
  }

  fill(248, 246, 240);
  rect(x, y, lay.bubbleW, lay.bubbleH, 14);

  if (m.typing) {
    drawTypingDots(x + lay.bubbleW / 2, y + lay.bubbleH / 2);
  } else {
    fill(28);
    textAlign(LEFT, TOP);
    textSize(14);
    let ty = y + 7;
    for (const line of lay.lines) {
      text(line, x + 11, ty);
      ty += 19;
    }
  }
}

function drawTypingDots(cx, cy) {
  noStroke();
  const t = frameCount * 0.18;
  for (let i = 0; i < 3; i++) {
    const yOff = Math.sin(t + i * 0.6) * 2.5;
    const a = 140 + Math.sin(t + i * 0.6) * 100;
    fill(60, 60, 60, a);
    circle(cx - 10 + i * 10, cy + yOff, 5);
  }
}

function wrapText(str, maxWidth) {
  if (!str) return [''];
  const words = str.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (textWidth(test) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
