# Aetheria – Chronik der vier Kristalle

Ein Pixelart-Rollenspiel im Stil der klassischen Final-Fantasy-Teile (NES/SNES-Ära).
Läuft direkt im Browser – **keine Installation, kein Build, keine externen Dateien.**

## Starten

`index.html` im Browser öffnen. Das war's.

Alle Grafiken, Töne und Karten werden zur Laufzeit erzeugt: Sprites aus
Pixel-Daten im Code, Kacheln prozedural gezeichnet, Musik über die WebAudio-API
als Chiptune synthetisiert. Es gibt keine Bild-, Audio- oder Font-Dateien.

## Steuerung

| Taste | Funktion |
|---|---|
| Pfeiltasten / WASD | Bewegen, Menü-Navigation |
| Enter / Z / Leertaste | Bestätigen, Reden, Truhen öffnen |
| Esc / X | Hauptmenü, Zurück |
| Shift | Rennen · im Kampf: Animationen vorspulen |
| M | Musik an/aus |

Auf Mobilgeräten erscheinen automatisch ein Steuerkreuz und A/B-Tasten.

## Das Spiel

Vier Kristalle hielten Aetheria im Gleichgewicht. Malkoth, der Schattenfürst,
hat sie entweiht – Flüsse versiegen, Felder verdorren. König Aldric schickt
seinen Hauptmann Alric aus, die vier Kristallwächter zu besiegen. Erst wenn
alle vier Kristalle wieder leuchten, fällt die Barriere um die Finsterburg.

### Gruppe

Vier Charaktere mit eigenen Werten, Ausrüstungsarten und Fertigkeitsbäumen.
Zwei starten mit, zwei schließen sich unterwegs an.

| Charakter | Klasse | Rolle | Kann |
|---|---|---|---|
| **Alric** | Ritter | Nahkampf, Schutzwall | Kraftschlag, Provozieren, Schildwall, Sturmangriff, Klingenwirbel, Letzte Bastion |
| **Lyra** | Weißmagierin | Heilung, Wiederbelebung | Heilung, Schutz, Reinigung, Vitalstrom, Wiederbelebung, Aura, Judicium |
| **Faelan** | Schwarzmagier | Elementarschaden | Feuer/Eis/Blitz in drei Stufen, Schlaflied, Beben, Meteor |
| **Nyx** | Schurkin | Tempo, Diebstahl | Doppelschlag, Stehlen, Giftdolch, Rauchbombe, Schwachpunkt, Tausend Klingen |

Faelan wartet in Hafen Selvia, Nyx in Nordheim – beide schließen sich auf dem
Level der Gruppe an, man verpasst also nichts.

### Kampfsystem

Rundenbasiert im FF1/FF3-Stil: erst wählt die ganze Gruppe ihre Befehle, dann
werden alle Aktionen – Verbündete wie Gegner – nach Tempo sortiert ausgeführt.

* **Befehle:** Angriff · Magie · Fähigkeit · Item · Verteidigen · Fliehen
* **Elemente:** Feuer, Eis, Blitz, Erde, Wind, Heilig, Dunkel – jeder Gegner hat
  Schwächen (×1,65) und Resistenzen (×0,5). „Schwachpunkt!" wird angezeigt.
* **Statuseffekte:** Gift, Schlaf, Stumm, Blind, Langsam – dazu Auf- und
  Abwertungen von Angriff und Abwehr
* **Kritische Treffer**, Ausweichen, Provozieren, Lebensentzug, Diebstahl
* Vor Bossen ist Fliehen gesperrt

### Welt

* Eine begehbare Weltkarte mit Wald, Wüste, Schneeland, Vulkanregion, Sumpf,
  Gebirgspässen und dem verfluchten Finsterland in der Mitte
* **3 Städte** mit Gasthaus (Rasten + Speichern), Item-Laden, Schmiede und
  bewohnten Häusern
* **5 Dungeons** mit insgesamt 12 Ebenen, Schatztruhen und Fackelschein-Beleuchtung
* **Zufallskämpfe** mit regionsabhängigen Gegnertabellen – im Schnee lauern
  andere Wesen als in der Wüste
* 24 Gegnertypen und 5 Bosse

### Bosse

| Boss | Ort | Belohnung |
|---|---|---|
| **Ignarok**, Feuerdrache | Feuerhöhle | Feuerkristall |
| **Glacius**, Eiskoloss | Eistempel | Eiskristall |
| **Sylphara**, Sturmhexe | Windturm | Windkristall |
| **Terramoth**, Erdtitan | Erdruinen | Erdkristall |
| **Malkoth**, Schattenfürst | Finsterburg | Das Ende |

Jeder Boss hat ein eigenes Angriffsmuster und schaltet unterhalb von ~35 % KP
einen verheerenden Spezialangriff frei.

### Orientierung

Im Hauptmenü zeigt **Karte** die ganze Welt mit allen Städten und
Kristallkammern, der Position der Gruppe und dem nächsten Etappenziel. Auch
König Aldric nennt auf Nachfrage das aktuelle Ziel. Wege auf der Weltkarte sind
sicher – Zufallskämpfe gibt es nur abseits davon.

### Fortschritt

Stufen bis 50, Ausrüstung in vier Qualitätsstufen (Waffen, Rüstungen,
Accessoires), Läden zum Kaufen und Verkaufen, Spielstand im Browser
(`localStorage`) – speichern über das Hauptmenü oder im Gasthaus.

## Balance

Zwei Dinge wurden gerechnet statt geschätzt:

* **Bosskämpfe:** Monte-Carlo-Simulation der Kampfformeln (300 Durchläufe je
  Szenario). Auf dem vorgesehenen Level mit zeitgemäßer Ausrüstung liegen die
  Siegquoten bei 70–90 % über 5–7 Runden.
* **Levelkurve:** Die EXP-Kurve ist an einen typischen Spielverlauf angepasst
  (rund 260 Kämpfe). Wer die Dungeons normal durchläuft, steht ohne Grinden
  etwa auf Stufe 11 / 19 / 26 / 31 / 39 vor den fünf Bossen.

Die Gegend um Aldenmark und das Aschland vor der Feuerhöhle sind bewusst
einsteigerfreundlich; Wüste, Osthochland und Finsterland sind es nicht.

## Technik

| Datei | Inhalt |
|---|---|
| `js/font.js` | 5×7-Bitmap-Pixelfont inkl. Umlauten |
| `js/gfx.js` | Renderer (320×240, ganzzahliges Hochskalieren), prozeduraler Kachel-Atlas |
| `js/sprites.js` | Pixeldaten für Helden, NPCs, Gegner und Bosse |
| `js/audio.js` | Chiptune-Sequencer und Soundeffekte (WebAudio) |
| `js/data.js` | Klassen, Zauber, Fähigkeiten, Items, Ausrüstung, Gegner |
| `js/maps.js` | Weltkarten-, Stadt- und Dungeon-Generierung (fester Seed) |
| `js/ui.js` | Fenster, Dialoge, Menüs, Balken |
| `js/battle.js` | Kampfsystem |
| `js/world.js` | Erkundung, Kollision, Warps, Zufallskämpfe |
| `js/game.js` | Spielzustand, Menüs, Story, Speichern, Hauptschleife |

Interne Auflösung 320×240, nächster-Nachbar-Skalierung auf ganzzahlige
Faktoren – dadurch bleiben alle Pixel scharf und quadratisch. Karten werden
deterministisch aus festen Seeds erzeugt: Jeder Spielstand findet dieselbe Welt
vor, ohne dass Kartendaten gespeichert werden müssen.
