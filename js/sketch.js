let bot;
let messages = []; 
let sideButtons = ["Side 1", "Side 2", "Side 3", "Side 4"];
let rowButtons = ["Row 1", "Row 2", "Row 3", "Row 4"];
let currentSide = 1; 
let rowContainer; 
let myFont;
let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
let letterIndex = 0; // We beginnen bij 'A'

// right words
const SOLUTIONS = [
  ["ASIA", "BEER", "PAWN", "EDEN"], // Zijde 1 (S1)
  ["STAR", "WEEK", "LIMA", "YOLK"], // Zijde 2 (S2)
  ["COKE", "DELI", "MENU", "YOLO"], // zijde 3
  ["NEXT", "ALOE", "MACE", "KING"], // zijde 4
  // ... voeg toe voor zijde 3 en 4
];

// Kubus instellingen
const CUBE_X = 220;       
const CUBE_SIZE = 200;    
const HALF = CUBE_SIZE / 2;
const GRID_SIZE = 4;      
const CELL = CUBE_SIZE / GRID_SIZE;
const FACES = 4;          

let rotX = 0;
let rotY = 0;

// Chat-paneel layout
const PANEL = {
  x: -420, y: -190,
  w: 380,  h: 380,
  padX: 22, padY: 22,
  gap: 8,
};

let puzzles = [];
let arduinoLetter = 'A'; 
let hoveredCell = null;   
let wasDragged = false;
let mouseDownPos = { x: 0, y: 0 };

function preload() {
  // Zorg dat dit pad exact klopt in je VS Code map
  myFont = loadFont('assets/fonts/myfont.ttf');
}

function setup() {
  // Maak het canvas aan
  const cnv = createCanvas(900, 500, WEBGL);
  cnv.parent('canvas-wrap');
  rectMode(CORNER);
  
  // 1. Puzzels initialiseren
  puzzles = []; // Reset voor de zekerheid
  for (let f = 0; f < FACES; f++) {
    const grid = [];
    for (let r = 0; r < GRID_SIZE; r++) grid.push(new Array(GRID_SIZE).fill(''));
    puzzles.push(grid);
  }

  // 2. Bot laden
  bot = new RiveScript();
  bot.loadFile("brain/brain.rive").then(() => {
    bot.sortReplies();
    pushBotMessage("Hello! Welcome to our amazing 3D wordpuzzle. There's 4 sides, 4 horizontal rows, click some buttons! Words don't connect vertically, only horizontal. If your word is correct it will turn green.");
  }).catch(err => console.error("Bot Error:", err));

  // 3. Knoppen genereren (Side Buttons)
  const mainBtnDiv = select('#buttons');
  if (mainBtnDiv) {
    for (let i = 0; i < sideButtons.length; i++) {
      let btn = createButton(sideButtons[i]);
      btn.parent(mainBtnDiv);
      btn.addClass('side-btn');
      btn.mousePressed(() => {
        currentSide = i + 1;
        updateRowButtons(); 
      });
    }

    // Container voor de Row buttons
    rowContainer = createDiv('');
    rowContainer.parent(mainBtnDiv);
    rowContainer.id('row-buttons-wrap');
    updateRowButtons();

    // New Chat & Arduino
    const utilDiv = createDiv('');
    utilDiv.parent(mainBtnDiv);
    
    let nBtn = createButton('↻ New Chat');
    nBtn.parent(utilDiv);
    nBtn.addClass('row-btn ghost');
    nBtn.mousePressed(newChat);
  }
}

function updateRowButtons() {
  if (!rowContainer) return;
  rowContainer.html(''); 
  for (let i = 0; i < rowButtons.length; i++) {
    let label = rowButtons[i];
    let btn = createButton(label);
    btn.parent(rowContainer);
    btn.addClass('row-btn');
    let trigger = "S" + currentSide + " " + label;
    btn.mousePressed(() => askBot(trigger));
  }
}

// === Draw & Rendering ===

function draw() {
  background(80, 95, 95);
  
  // 1. Bepaal elk frame welk vakje onder de muis zit
  hoveredCell = pickCell(mouseX, mouseY);

  // 2. KUBUS tekenen in 3D-ruimte
  push();
  translate(CUBE_X, 0, 0);
  rotateX(rotX);
  rotateY(rotY);
  fill(255);
  stroke(0);
  strokeWeight(2);
  box(CUBE_SIZE);

  // Teken de puzzel-lagen op de zijden
  for (let f = 0; f < FACES; f++) {
    drawCubeFace(puzzles[f], f);
  }
  pop();

  // 3. CHAT-PANEEL tekenen (2D overlay)
  if (myFont) drawChatPanel();

  // 4. Update de HUD tekst (Zijde indicator)
  let sideDisplay = document.getElementById('side-indicator');
  if (sideDisplay) {
    sideDisplay.innerText = getCurrentFaceName().toUpperCase();
  }
}

function drawCubeFace(letters, faceIndex) {
  push();

  // Positioneer en oriënteer per zijde (kleine offset 0.5 tegen z-fighting)
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

  // Loop door het 4x4 grid van deze zijde
  for (let r = 0; r < GRID_SIZE; r++) {
    
    // Check of deze specifieke rij correct is (voor de groene kleur)
    let isRowCorrect = completedRows.some(cr => cr.face === faceIndex && cr.row === r);

    for (let c = 0; c < GRID_SIZE; c++) {
      const x = -HALF + c * CELL;
      const y = -HALF + r * CELL;

      // 1. Kleur de achtergrond van het vakje
      if (isRowCorrect) {
        fill(40, 200, 40, 180); // Groen als de rij klopt
      } else if (hoveredCell && hoveredCell.face === faceIndex && hoveredCell.row === r && hoveredCell.col === c) {
        fill(255, 244, 138, 200); // Geel bij muis-hover
      } else {
        noFill(); 
      }

      // 2. Teken de randen van het vakje
      stroke(0);
      strokeWeight(1);
      rect(x, y, CELL, CELL);

      // 3. Teken de letter in het vakje
      const letter = letters[r][c];
      if (letter) {
        fill(0);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(28);
        if (myFont) textFont(myFont);
        // Positioneer tekst in het midden van de cel
        text(letter, x + CELL / 2, y + CELL / 2 + 2);
      }
    }
  }
  pop();
}

// === Interactie Logica ===

function mousePressed() { 
  mouseDownPos = { x: mouseX, y: mouseY }; 
  wasDragged = false; 
}

function mouseDragged() {
  // Voorkom draaien als je buiten het scherm klikt
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;
  
  rotY += movedX * 0.01; 
  rotX -= movedY * 0.01;
  
  // Als de muis bewogen is, markeren we het als 'drag' zodat er geen letter geplaatst wordt
  if (dist(mouseX, mouseY, mouseDownPos.x, mouseDownPos.y) > 5) {
    wasDragged = true;
  }
}

function mouseReleased() {
  // Alleen een letter plaatsen als we niet gedraaid hebben en een cel raken
  if (!wasDragged && hoveredCell) {
    const { face, row, col } = hoveredCell;
    puzzles[face][row][col] = arduinoLetter;
    checkRow(face, row);
  }
}

function mouseWheel(event) {
  // Scroll door het alfabet
  if (event.delta > 0) letterIndex++;
  else letterIndex--;

  if (letterIndex >= alphabet.length) letterIndex = 0;
  if (letterIndex < 0) letterIndex = alphabet.length - 1;

  arduinoLetter = alphabet[letterIndex];

  // Update de HTML HUD direct
  let hudSpan = document.getElementById('current-letter');
  if (hudSpan) hudSpan.innerText = arduinoLetter;
  
  return false; // Voorkom dat de pagina mee-scrolt
}

// === Logica & Berekeningen ===

let completedRows = []; 

function checkRow(face, row) {
  let currentRowContent = puzzles[face][row].join("").toUpperCase();
  let solution = SOLUTIONS[face][row].toUpperCase();

  if (currentRowContent === solution) {
    // Check of we dit niet al goed hadden gemeld
    if (!completedRows.some(r => r.face === face && r.row === row)) {
      completedRows.push({ face, row });
      pushBotMessage(`Well done! "${solution}" is correct!`);
    }
  }
}

function getCurrentFaceName() {
  let normalizedRot = rotY % (Math.PI * 2);
  if (normalizedRot < 0) normalizedRot += (Math.PI * 2);

  const PI = Math.PI;
  // Bepaal welke kant naar voren wijst op basis van de rotatie-hoek
  if (normalizedRot < PI/4 || normalizedRot > 1.75 * PI) return "Side 1";
  if (normalizedRot >= PI/4 && normalizedRot < 0.75 * PI) return "Side 4";
  if (normalizedRot >= 0.75 * PI && normalizedRot < 1.25 * PI) return "Side 3";
  if (normalizedRot >= 1.25 * PI && normalizedRot < 1.75 * PI) return "Side 2";
  
  return "Side 1";
}

// === 3D Mouse Picking (Raycasting) ===

function pickCell(mx, my) {
  const cameraZ = (height / 2) / Math.tan(Math.PI / 6);
  let o = { x: 0, y: 0, z: cameraZ };
  let d = { x: mx - width / 2, y: my - height / 2, z: -cameraZ };

  o = { x: o.x - CUBE_X, y: o.y, z: o.z };
  o = applyRotX(o, -rotX);
  o = applyRotY(o, -rotY);
  d = applyRotX(d, -rotX);
  d = applyRotY(d, -rotY);

  let best = null;

  function tryFace(faceIdx, axis, sign, mapFn) {
    const axes = ['x', 'y', 'z'];
    const a = axes[axis];
    if (Math.abs(d[a]) < 1e-6) return;
    const t = (sign * HALF - o[a]) / d[a];
    if (t <= 0) return;
    const hit = { x: o.x + t * d.x, y: o.y + t * d.y, z: o.z + t * d.z };
    for (const i of [0, 1, 2]) {
      if (i === axis) continue;
      if (hit[axes[i]] < -HALF || hit[axes[i]] > HALF) return;
    }
    if (!best || t < best.t) {
      const { fx, fy } = mapFn(hit);
      best = { face: faceIdx, t, fx, fy };
    }
  }

  tryFace(0, 2, +1, h => ({ fx:  h.x, fy: h.y })); 
  tryFace(1, 0, +1, h => ({ fx: -h.z, fy: h.y })); 
  tryFace(2, 2, -1, h => ({ fx: -h.x, fy: h.y })); 
  tryFace(3, 0, -1, h => ({ fx:  h.z, fy: h.y })); 

  if (!best) return null;

  const col = Math.floor((best.fx + HALF) / CELL);
  const row = Math.floor((best.fy + HALF) / CELL);
  return { face: best.face, row, col };
}

function applyRotX(p, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

function applyRotY(p, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

// === Chat Paneel Rendering  gefixt===

function drawChatPanel() {
  push();
  translate(PANEL.x, PANEL.y);
  noStroke();
  
  // Achtergrond van het paneel
  fill(122, 142, 134);
  rect(0, 0, PANEL.w, PANEL.h, 40);

  const innerW = PANEL.w - PANEL.padX * 2;
  const innerH = PANEL.h - PANEL.padY * 2;
  const bubbleMaxW = innerW * 0.85; // Iets breder voor meer ruimte

  // Update de typ-animatie voor bot berichten
  for (let m of messages) {
    if (m.from === 'bot' && !m.typing && m.displayLength < m.text.length) {
      m.displayLength += 0.8; // Snelheid van verschijnen
    }
  }

  // Bereken de hoogte van alle berichten voor scrolling
  let totalH = 0;
  let layouts = [];
  for (let m of messages) {
    let lay = layoutMessage(m, bubbleMaxW);
    layouts.push(lay);
    totalH += lay.bubbleH + PANEL.gap;
  }

  const scrollY = Math.max(0, totalH - innerH);

  // Teken de berichten binnen een 'clip' (handmatig via translate)
  push();
  translate(PANEL.padX, PANEL.padY - scrollY);
  
  let currentY = 0;
  for (let i = 0; i < messages.length; i++) {
    let m = messages[i];
    let lay = layouts[i];
    
    // Alleen tekenen als het binnen het zichtveld van het paneel valt
    if (currentY + lay.bubbleH >= scrollY && currentY <= scrollY + innerH) {
      drawBubble(m, lay, currentY, innerW);
    }
    currentY += lay.bubbleH + PANEL.gap;
  }
  pop();
  pop();
}

function layoutMessage(m, bubbleMaxW) {
  // Voorbereiding van fonts en maten
  textFont(myFont);
  textSize(14);

  if (m.typing) return { lines: [], bubbleW: 60, bubbleH: 30 };
  
  // Welk deel van de tekst laten we zien?
  let txt = (m.from === 'bot') ? m.text.substring(0, Math.floor(m.displayLength)) : m.text;
  
  let lines = wrapText(txt, bubbleMaxW - 25);
  let maxW = 20;
  for (let l of lines) {
    maxW = Math.max(maxW, textWidth(l));
  }

  return {
    lines: lines,
    bubbleW: maxW + 25,
    bubbleH: lines.length * 20 + 15
  };
}

function drawBubble(m, lay, y, innerW) {
  const isUser = m.from === 'user';
  let x = isUser ? innerW - lay.bubbleW : 0;

  // De ballon
  noStroke();
  if (isUser) {
    fill(242, 209, 215); // Roze voor user
  } else {
    fill(248, 246, 240); // Gebroken wit voor bot
  }
  rect(x, y, lay.bubbleW, lay.bubbleH, 15);

  // De tekst
  if (m.typing) {
    drawTypingDots(x + lay.bubbleW / 2, y + lay.bubbleH / 2);
  } else {
    fill(40); // Donkergrijze tekst
    textAlign(LEFT, TOP);
    let ty = y + 8;
    for (let line of lay.lines) {
      text(line, x + 12, ty);
      ty += 20;
    }
  }
}

function drawTypingDots(cx, cy) {
  const t = frameCount * 0.18;
  for (let i = 0; i < 3; i++) {
    fill(60, 60, 60, 140 + Math.sin(t + i * 0.6) * 100);
    circle(cx - 10 + i * 10, cy + Math.sin(t + i * 0.6) * 2.5, 5);
  }
}

function wrapText(str, maxWidth) {
  const words = str.split(' ');
  const lines = [];
  let curr = '';
  for (const w of words) {
    let t = curr ? curr + ' ' + w : w;
    if (textWidth(t) > maxWidth && curr) {
      lines.push(curr);
      curr = w;
    } else curr = t;
  }
  if (curr) lines.push(curr);
  return lines;
}

function pushBotMessage(text) { messages.push({ from: 'bot', text, displayLength: 0, typing: false }); }
function pushUserMessage(text) { messages.push({ from: 'user', text, displayLength: Infinity, typing: false }); }
function newChat() { messages = []; pushBotMessage("New chat started. Pick a row."); }
async function askBot(topic) {
  pushUserMessage(topic);
  const tMsg = { from: 'bot', text: '', displayLength: 0, typing: true };
  messages.push(tMsg);
  const reply = await bot.reply("local-user", topic);
  setTimeout(() => { tMsg.typing = false; tMsg.text = reply; }, 600);
}