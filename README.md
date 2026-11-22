# Ember Pact — Elemental Card Duel

[![make.fun competition](https://make.fun/badge/competition/best-card-game-20261122-1826)](https://make.fun/competitions/best-card-game-20261122-1826)
[![make.fun rank](https://make.fun/badge/rank/Zikri167/makefun-best-card-game-20261122-0559)](https://make.fun/competitions/best-card-game-20261122-1826)
[![make.fun reward](https://make.fun/badge/reward/best-card-game-20261122-1826)](https://make.fun/competitions/best-card-game-20261122-1826)

A complete original card duel for the [best-card-game-20261122-1826](https://make.fun/competitions/best-card-game-20261122-1826) bounty on make.fun. You face Rook, a greedy AI, across a green baize table. Twenty Life each, a 30-card deck, ember that grows every turn — and every hand is a decision.

## How it plays

- **Elements:** Flame beats Thorn, Thorn beats Tide, Tide beats Flame. Attacking with an advantage deals +2.
- **Resonance:** play two cards of one element in a turn and both get +1 power.
- **Elemental Charge (v2):** play a card that *loses* to Rook's last element and you earn +1 Charge (max 3). Spend it on **POWER** (+2 on your next card, Q) or **WARD** (fizzle Rook's next telegraphed strike, W). Rook earns Charge the same way and spends it on POWER when it wins him the game.
- **Rook reads:** before Rook strikes, his target flashes yellow with a "ROOK AIMS HERE" warning — answer with a Guardian. He thinks out loud, taunts you per element, and charges his cards before they fly.
- **Cards:** Strike (direct damage, guardians block first), Guardian (stays on the table with Health), Trick (draw 2, steal 1 ember, heal 3, or draw 1 + ember 1).
- **In-game legend:** the element cycle, trick list, deck count, and Charge rules are always on the table edge.

## Controls

Click a card to play it (or keys 1–5), click a Rook Guardian or Rook himself to aim a strike, **Space** ends the turn, **Q** POWER, **W** WARD, **R** restart, **M** mute, **P** pause. Sound is synthesized WebAudio — no audio files, no network, no outside assets.

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

Screenshots are staged deterministically from the real game (`?shot=play|title|win|loss&seed=7`); the build copies `game/` and `screenshots/` and writes `dossier.json`:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `game/index.html` — canvas + status line
- `game/src/config.js` — rules, elements, layout
- `game/src/random.js` — seeded RNG
- `game/src/cards.js` — the 15 original card designs (x2 = 30)
- `game/src/deck.js` — shuffle / draw / reshuffle
- `game/src/ai.js` — Rook's greedy brain, taunts, Charge spending
- `game/src/world.js` — match state machine, turns, combat, Charge
- `game/src/input.js` — mouse + keyboard
- `game/src/render.js` — table, cards, legend, banners
- `game/src/audio.js` — WebAudio synth
- `game/src/shots.js` — deterministic screenshot staging
- `game/src/main.js` — boot + loop + `?shot=` mode
