// Crossword controller — stuurt de gekozen letter (A-Z) over Serial
// wanneer de potmeter van positie wisselt.
//
// Bedrading:
//   Potmeter middelste pin -> A0
//   Potmeter buitenste pinnen -> 5V en GND
//
// Serial: 9600 baud. Elke regel is één hoofdletter (A..Z).
//
// Anti-jitter (om wild flikkeren tussen letters te voorkomen):
//   - SAMPLES: gemiddelde van meerdere ADC-metingen onderdrukt ruis
//   - STABLE_THRESHOLD: letter moet meerdere cycli onveranderd blijven
//     voordat hij verstuurd wordt — voorkomt heen-en-weer flippen op
//     de grens tussen twee letters

const int SAMPLES = 16;
const int STABLE_THRESHOLD = 3;

int lastSentLetter = -1;
int candidateLetter = -1;
int stableCount = 0;

void setup() {
  Serial.begin(9600);
}

void loop() {
  // Middel meerdere metingen om ADC-ruis weg te filteren
  long sum = 0;
  for (int i = 0; i < SAMPLES; i++) {
    sum += analogRead(A0);
    delay(1);
  }
  int potValue = sum / SAMPLES;

  // Zet om naar 0..25 -> A..Z
  int newLetter = constrain(map(potValue, 0, 1023, 0, 25), 0, 25);

  // Tel hoe lang de kandidaat-letter al stabiel is
  if (newLetter == candidateLetter) {
    stableCount++;
  } else {
    candidateLetter = newLetter;
    stableCount = 1;
  }

  // Alleen versturen als de letter ECHT veranderd is én een tijdje stabiel
  if (stableCount >= STABLE_THRESHOLD && newLetter != lastSentLetter) {
    char letter = 'A' + newLetter;
    Serial.println(letter);
    lastSentLetter = newLetter;
  }

  delay(40);
}
