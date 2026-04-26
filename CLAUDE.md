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

### Scene (`src/scene/`)
- Not yet extracted from main.ts. Main contains scene setup inline.

### Entities (`src/entities/`)
- Not yet extracted. Player and obstacle geometry are in main.ts and ProceduralGeo.ts.

### Systems (`src/systems/`)
- `ObstacleSpawner.ts` — Object-pooled pillar spawning with random gaps
- `CollisionSystem.ts` — AABB collision detection
- `ParticleSystem.ts` — Generic particle engine for fireflies, effects
- `ParallaxScroller.ts` — Unused, placeholder for future parallax refactor

### Rendering (`src/rendering/`)
- `ToonMaterial.ts` — Cel-shading gradient map generator

### Audio (`src/audio/`)
- `AudioManager.ts` — Web Audio API wrapper with fallback tone synthesis

### Utils (`src/utils/`)
- `ProceduralGeo.ts` — Tree, mountain, bush, rock geometry generators

## Key Design Decisions

- **2.5D side-scroller**: Camera at right, looking left at ~15° angle
- **Cel/toon shading**: MeshToonMaterial with 4-step gradient map on all objects
- **Procedural geometry**: No external 3D models — everything is built from Three.js primitives
- **All original mechanics preserved**: Same gravity, jump velocity, gap sizes, state machine
- **Sound**: Web Audio API with oscillator fallbacks when audio files aren't available
