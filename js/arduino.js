// js/arduino.js — Web Serial-verbinding met de potmeter-controller.
// Exporteert een globale `arduinoLetter` die wordt bijgewerkt
// telkens de Arduino een nieuwe letter stuurt.
//
// Werkt in Chrome of Edge op http://localhost (zoals Live Server).

let arduinoLetter = 'A';
let arduinoPort = null;

async function connectArduino() {
  if (!('serial' in navigator)) {
    alert('Web Serial werkt alleen in Chrome of Edge.');
    return;
  }

  try {
    arduinoPort = await navigator.serial.requestPort();
    await arduinoPort.open({ baudRate: 9600 });
    setArduinoStatus(true);

    const decoder = new TextDecoderStream();
    arduinoPort.readable.pipeTo(decoder.writable);
    const reader = decoder.readable.getReader();

    // Lees regel-voor-regel uit (Arduino stuurt elke letter met Serial.println())
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^[A-Z]$/.test(trimmed)) {
          arduinoLetter = trimmed;
          const hud = document.getElementById('current-letter');
          if (hud) hud.textContent = trimmed;
        }
      }
    }
  } catch (err) {
    console.error('Arduino verbinding mislukt:', err);
    setArduinoStatus(false);
  }
}

function setArduinoStatus(connected) {
  const status = document.getElementById('arduino-status');
  if (status) {
    status.textContent = connected ? '● connected' : '○ disconnected';
    status.classList.toggle('connected', connected);
  }
}
