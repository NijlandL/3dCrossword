// Crossword controller — stuurt de momenteel geselecteerde letter (A-Z)
// over Serial wanneer de potmeter van positie wisselt.
//
// Bedrading:
//   Potmeter middelste pin -> A0
//   Potmeter buitenste pinnen -> 5V en GND
//
// Serial: 9600 baud. Elke regel is één hoofdletter (A..Z).
// De browser leest dit in via de Web Serial API.

int lastLetterValue = -1;

void setup() {
  Serial.begin(9600);
}

void loop() {
  // Lees potmeter waarde (0 - 1023)
  int potValue = analogRead(A0);

  // Zet om naar 0 - 25 (26 letters)
  int currentLetterValue = map(potValue, 0, 1023, 0, 25);
  currentLetterValue = constrain(currentLetterValue, 0, 25);

  // Alleen sturen als de letter daadwerkelijk veranderd is
  if (currentLetterValue != lastLetterValue) {
    char letter = 'A' + currentLetterValue;
    Serial.println(letter);
    lastLetterValue = currentLetterValue;
  }

  delay(30);
}
