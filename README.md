# Mystery Island — The Lost Treasure ✨🏝️

A browser puzzle adventure guided by Lumi, with saved progress, rewards, treasures, achievements, daily challenges, and printable certificates.

## Four chapters

| Chapter | Levels | Journey |
| --- | --- | --- |
| I · Emerald Coast | 1–5 | Whispering Gate, Firefly Grove, Moon Bridge, Crystal Cave, Ancient Vault |
| II · Beyond the Vault | 6–10 | Enchanted Forest, Mermaid Lagoon, Dragon Mountain, Sky Temple, Island Heart |
| III · Realm of Dreams | 11–15 | Dream Garden, Mirror Lake, Cloud Library, Clockwork Tower, Palace of Dreams |
| IV · Celestial Isles | 16–20 | Starlight Lighthouse, Aurora Steps, Celestial Scales, Comet Crossing, Starfire Sanctuary |

## Chapter IV

- Align three lighthouse beams to their beacon arrows.
- Tap five named stars in aurora order; names accompany colours.
- Select weights to balance three target totals.
- Find a safe orthogonal path through a 4 × 4 comet grid.
- Read five clues and place the celestial seals in order.

Finishing level 15 unlocks Chapter IV. Existing saves keep their name, progress, coins, stars, treasures, and daily challenge status. The Keeper of Dreams certificate remains available after level 15; finishing level 20 earns the Celestial Guardian certificate. Replay rewards are not duplicated.

## Play locally

Open `index.html` in a browser. Keep `monetization.js` alongside it. No build or external libraries are required.

## Automated checks

With Node.js installed:

```sh
node --test tests/*.test.cjs
```

Tests cover the Lagoon regressions, puzzle callback cancellation, pattern round locks, levels 9–20, saved-progress migration, chapter gating, rewards, mistakes, timeout resets, and certificates. The Chapter IV suite executes the shipped game script with a small DOM and timer harness. It does not verify browser layout, device touch behaviour, or advertising SDK behaviour.

Before publishing, check Chapter IV on desktop and a phone: map tabs, beam buttons, colour names, weight selection, path squares, sanctuary seals, Lumi, timer resets, rewards, certificates, and return to the map.
