# flappy-anna-3d

3D Flappy Bird game with Zelda-inspired anime aesthetic. Built with Three.js + Vite + TypeScript.

## Quick Start

```bash
npm run dev     # Development server with HMR
npm run build   # Production build to dist/
npm run preview # Preview production build
```

## Architecture

- **`src/main.ts`** — Entry point: scene setup, game loop, all wiring
- **`src/Game.ts`** — State machine (Title/Game/GameOver modes) and state interface
- **`src/gameState.ts`** — State update logic (physics, transitions, scoring)
- **`src/constants.ts`** — All gameplay and rendering constants
- **`src/InputManager.ts`** — Keyboard, mouse, touch input abstraction

### Systems (`src/systems/`)
- `ObstacleSpawner.ts` — Object-pooled pillar spawning with random gaps
- `CollisionSystem.ts` — AABB collision detection
- `ParticleSystem.ts` — Generic particle engine for fireflies, effects
- `EnvironmentSpawner.ts` — Chunk-based terrain decoration: mountains, trees, bushes, grass with atmospheric perspective fading
- `TerrainSpawner.ts` — Dynamic procedural ground terrain with chunk recycling
- `AnimalSpawner.ts` — Sheep and cows with target-based wander AI and obstacle avoidance
- `BoatSpawner.ts` — Cruise ships on ocean with wave-following physics and smooth steering

### Rendering (`src/rendering/`)
- `ToonMaterial.ts` — Cel-shading 4-step gradient map generator
- `WaterMaterial.ts` — Animated ocean shader with vertex waves and z-distance fading

### Audio (`src/audio/`)
- `AudioManager.ts` — Web Audio API wrapper with oscillator fallback tone synthesis, one-shot init guard

### Utils (`src/utils/`)
- `ProceduralGeo.ts` — All procedural geometry: trees (cone + round canopy), mountains, bushes (cluster + wide), rocks, sheep, cows (per-face black/white spots), cruise ships, pillar pairs, terrain height with 2D contour hills

## Key Design Decisions

- **2.5D side-scroller**: Camera at right, looking left at ~15° angle
- **Cel/toon shading**: `MeshToonMaterial` with 4-step gradient map on all objects
- **Procedural geometry**: No external 3D models — everything is built from Three.js primitives
- **Chunk-based spawning**: Environment, terrain, animals, and boats all use chunked generation with VIEW_AHEAD/VIEW_BEHIND recycling
- **Atmospheric perspective**: Mountains fade via per-frame camera-distance color lerp (near=dark, far=light). Trees/bushes fade each child mesh from its original color toward misty gray. All objects use `FogExp2` for additional Z-depth fading.
- **Object-on-terrain placement**: All spawned objects sample `getTerrainHeight()` for Y positioning. Mountains sunk by `w * 0.15` to prevent floating edges.
- **Sound**: Web Audio API with oscillator fallbacks when audio files aren't available. Audio init runs once on first interaction.
- **Wander AI**: Target-based steering with exponential velocity smoothing (boats) or direct steering (animals). Animals avoid environment obstacles when picking targets.
