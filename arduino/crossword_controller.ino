// Crossword controller — stuurt de gekozen letter (A-Z) over Serial
// wanneer de potmeter van positie wisselt.
//
// Bedrading:
//   Potmeter middelste pin -> A0
//   Potmeter buitenste pinnen -> 5V en GND
//
// Anti-jitter:
//   - SAMPLES: middelt 16 metingen per cyclus om ADC-ruis te onderdrukken
//   - STABLE_THRESHOLD: letter moet 3 cycli onveranderd zijn voordat hij stuurt
//
// Auto-kalibratie:
//   - Niet elke potmeter haalt de volledige 0..1023 range
//   - We onthouden de laagste en hoogste waarde die we ooit hebben gezien,
//     en mappen daartussen naar A..Z
//   - Bij de start: draai de potmeter ÉÉN KEER volledig links en rechts om
//     het bereik te kalibreren. Daarna klopt links = A, rechts = Z.

const int SAMPLES = 16;
const int STABLE_THRESHOLD = 3;

int minRaw = 1023;
int maxRaw = 0;
int lastSentLetter = -1;
int candidateLetter = -1;
int stableCount = 0;

void setup() {
  Serial.begin(9600);
  // Initiële meting zodat min/max niet op 1023/0 blijft staan
  delay(50);
  int first = analogRead(A0);
  minRaw = first;
  maxRaw = first;
}

void loop() {
  // Middel meerdere metingen om ADC-ruis weg te filteren
  long sum = 0;
  for (int i = 0; i < SAMPLES; i++) {
    sum += analogRead(A0);
    delay(1);
  }
  int potValue = sum / SAMPLES;

  // Leer het bereik van DEZE potmeter (kalibratie)
  if (potValue < minRaw) minRaw = potValue;
  if (potValue > maxRaw) maxRaw = potValue;

  // Wacht totdat we genoeg bereik gezien hebben voordat we letters versturen
  int range = maxRaw - minRaw;
  if (range < 100) {
    delay(40);
    return;
  }

  // Zet om naar 0..25 -> A..Z, mappend over het geleerde bereik
  int newLetter = constrain(map(potValue, minRaw, maxRaw, 0, 25), 0, 25);

  // Stabiliteits-check — letter moet meerdere cycli hetzelfde blijven
  if (newLetter == candidateLetter) {
    stableCount++;
  } else {
    candidateLetter = newLetter;
    stableCount = 1;
  }

  if (stableCount >= STABLE_THRESHOLD && newLetter != lastSentLetter) {
    char letter = 'A' + newLetter;
    Serial.println(letter);
    lastSentLetter = newLetter;
  }

  delay(40);
}
