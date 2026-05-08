# Local Reference SFX

This folder is for local-only audio experiments. Files here are ignored by git so recorded, licensed, or otherwise private test sounds do not become part of the publishable project by accident.

Supported file types are normal browser audio files such as `.wav`, `.ogg`, and `.mp3`.

To activate local overrides, create or edit `manifest.json` in this folder. The game will prefer entries in this manifest and automatically fall back to the built-in generated/curated sounds if a local file fails to play.

Useful event names:

- `card.draw`
- `card.flip`
- `unit.infantry.fire`
- `unit.armor.fire`
- `unit.helicopter.fire`
- `unit.artillery.fire`
- `unit.rocketArtillery.fire`
- `unit.heavyAa.fire`
- `unit.mobileAa.fire`
- `unit.drone.fire`
- `unit.fighter.fire`
- `unit.bomber.fire`
- `impact.heavyExplosion`
- `impact.armorPiercing`
- `impact.airburst`

Keep publishable assets in `curated/` or `generated/`. Keep local reference material in this folder.

