# Ember Pact — Elemental Card Duel

[![Make the best card game](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![Rank](https://make.fun/badge/best-card-game-20261122-1826/Zikri167/makefun-best-card-game-20261122-0559/rank.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![Reward](https://make.fun/badge/best-card-game-20261122-1826/Zikri167/makefun-best-card-game-20261122-0559/reward.svg)](https://make.fun/c/best-card-game-20261122-1826)

An original card duel for the make.fun "Make the best card game" bounty.
You face Rook, a rival duelist, across a wooden table: 20 Life each,
a 30-card deck, a hand of 5, and ember that grows by 1 every turn (max 10).

## The rules

- **Three elements, one cycle:** Flame beats Thorn beats Tide beats Flame.
  A Strike against a Guardian of the element it beats deals **+2 power**.
  Elements are told apart by colour *and* shape (flame / leaf / drop).
- **Strike** — damage, hitting an enemy Guardian first if one stands.
  A standing Guardian hits back for its power.
- **Guardian** — stays on the table, blocks Strikes, has Health.
- **Trick** — draw 2, steal 1 ember, heal 3, or draw 1 and gain 1 ember.
- **Resonance** — play 2 cards of the same element in one turn and both
  get +1 power. Every hand is a decision about which pair to fire.
- **Rook telegraphs** every Strike: the target glows yellow with a
  "ROOK AIMS HERE" label for a full second, so you can answer with a
  Guardian. Rook plays greedily and sometimes banks ember for a big Trick.

## Controls

Click a card to play it (or press **1–5**), **Space** ends your turn,
**R** restarts, **M** mutes, **P** pauses. Synthesized WebAudio sounds,
no assets, no network — the whole game is static files under `game/`.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshots are staged from the game itself (`?shot=play|title|win|loss`),
seeded so they render identically every time.
