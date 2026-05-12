// Crossword controller — stuurt de gekozen letter (A-Z) over Serial
// wanneer de potmeter van positie wisselt.
//
// Bedrading:
//   Potmeter middelste pin -> A0
//   Potmeter buitenste pinnen -> 5V en GND
//
// Anti-jitter:
//   - SAMPLES: middelt 16 metingen per cyclus
//   - STABLE_THRESHOLD: letter moet 3 cycli onveranderd zijn voor versturen
//
// Auto-kalibratie:
//   - Onthoudt de laagste/hoogste ADC-waarde die ooit gezien is
//   - Bij start: draai de pot 1× volledig heen en weer
//
// Debug log:
//   - Elke ~250ms een regel met raw/min/max/letter naar Serial Monitor
//   - Regels beginnen met "#" zodat de browser ze negeert
//     (de Web Serial helper accepteert alleen single A-Z lines)
//   - Open Serial Monitor (Tools -> Serial Monitor, 9600 baud) om mee te kijken

const int SAMPLES = 16;
const int STABLE_THRESHOLD = 3;
const int DEBUG_INTERVAL = 4; // ~elke 250ms een log-regel

int minRaw = 1023;
int maxRaw = 0;
int lastSentLetter = -1;
int candidateLetter = -1;
int stableCount = 0;
int debugCount = 0;

void setup() {
  Serial.begin(9600);
  delay(50);
  int first = analogRead(A0);
  minRaw = first;
  maxRaw = first;

  Serial.println("# === crossword_controller startup ===");
  Serial.print("# initial raw = ");
  Serial.println(first);
  Serial.println("# draai de potmeter 1x volledig links en rechts om te kalibreren");
}

void loop() {
  // Middel meerdere metingen om ADC-ruis te onderdrukken
  long sum = 0;
  for (int i = 0; i < SAMPLES; i++) {
    sum += analogRead(A0);
    delay(1);
  }
  int potValue = sum / SAMPLES;

  // Kalibratie: leer het bereik van deze pot
  if (potValue < minRaw) minRaw = potValue;
  if (potValue > maxRaw) maxRaw = potValue;
  int range = maxRaw - minRaw;

  // Bepaal kandidaat-letter (alleen geldig zodra we genoeg range hebben)
  int newLetter = -1;
  if (range >= 100) {
    newLetter = constrain(map(potValue, minRaw, maxRaw, 0, 25), 0, 25);

    if (newLetter == candidateLetter) {
      stableCount++;
    } else {
      candidateLetter = newLetter;
      stableCount = 1;
    }
  }

  // === DEBUG LOG ===
  debugCount++;
  if (debugCount >= DEBUG_INTERVAL) {
    debugCount = 0;
    Serial.print("# raw=");
    Serial.print(potValue);
    Serial.print("  min=");
    Serial.print(minRaw);
    Serial.print("  max=");
    Serial.print(maxRaw);
    Serial.print("  range=");
    Serial.print(range);
    if (newLetter >= 0) {
      Serial.print("  candidate=");
      Serial.print((char)('A' + newLetter));
      Serial.print("  stable=");
      Serial.print(stableCount);
      Serial.print("/");
      Serial.print(STABLE_THRESHOLD);
      Serial.print("  sent=");
      Serial.print(lastSentLetter >= 0 ? (char)('A' + lastSentLetter) : '-');
    } else {
      Serial.print("  (nog niet gekalibreerd, draai vol heen-en-weer)");
    }
    Serial.println();
  }

  // === Verstuur letter als hij echt veranderd en stabiel is ===
  if (newLetter >= 0 && stableCount >= STABLE_THRESHOLD && newLetter != lastSentLetter) {
    char letter = 'A' + newLetter;
    Serial.println(letter);  // <-- enige regel zonder "#" prefix, browser leest deze
    lastSentLetter = newLetter;
  }

  delay(40);
}
