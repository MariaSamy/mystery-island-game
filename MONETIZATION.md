# Mystery Island — Monetization Preparation

This branch is the monetization-ready build. The public GitHub Pages game on `main` remains the clean testing version.

## Ad placement plan

The game already has natural breaks suitable for platform advertising:

- Start / splash screen
- Level-complete reward screen
- Chapter transitions
- Optional rewarded ad for an extra heart later

Ads must never interrupt an active puzzle.

## CrazyGames

Use the current HTML5 v3 SDK:

```html
<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
```

Initialize before gameplay:

```js
await window.CrazyGames.SDK.init();
```

The adapter in `monetization.js` already supports gameplay start/stop events and midgame/rewarded ad hooks.

Important: CrazyGames Basic Launch does not share ad revenue. Ads become relevant for Full Launch. The game must continue normally when ads are unavailable.

Official docs:
- https://docs.crazygames.com/sdk/intro/
- https://docs.crazygames.com/sdk/video-ads/
- https://docs.crazygames.com/requirements/ads/

## GameDistribution

GameDistribution requires its SDK and a real `gameId` from the developer dashboard. Do not add a fake ID.

After the game is uploaded to the GD dashboard:
1. Copy the assigned gameId.
2. Add the official GD SDK snippet to `index.html`.
3. Connect GD's pause/start events to the game's pause/mute and resume/unmute hooks.
4. Verify a preroll and midroll in GD's iframe test.
5. Submit for QA.

Official docs:
- https://gamedistribution.com/developers/sdk/html5/
- https://gamedistribution.com/developers/quality-guidelines/
- https://gamedistribution.com/developers/partnership/

## Current status

- Public test build: `main`
- Monetization build: `monetization-ready`
- Platform-neutral adapter: `monetization.js`
- No fake ad IDs or fake earnings logic
- Existing player flow is preserved

## Next external step

Create a developer account and upload the game to the chosen platform. Once the platform gives us the game ID / submission record, finish the platform-specific SDK connection and QA testing.
