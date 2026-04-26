import type { GameState } from './Game';
import { Mode } from './Game';
import type { InputManager } from './InputManager';
import {
  GRAVITY, JUMP_VELOCITY, MAX_FALL_SPEED, SCROLL_SPEED,
  OBSTACLE_START_DISTANCE, OBSTACLE_INTERVAL,
  CEILING_Y, GROUND_Y, DEATH_DELAY_FRAMES, DEATH_KNOCKBACK_VELOCITY,
} from './constants';

export function createInitialState(): GameState {
  return {
    mode: Mode.Title,
    worldOffset: 0,
    score: 0,
    playerY: 5,
    playerVelocityY: 0,
    playerRotation: 0,
    gameoverTimer: 0,
  };
}

export function updateState(
  state: GameState,
  input: InputManager,
  dt: number,
): GameState {
  const next = { ...state };

  switch (next.mode) {
    case Mode.Title: {
      next.playerY = 5 + Math.sin(Date.now() * 0.003) * 0.5;
      next.playerRotation = Math.sin(Date.now() * 0.003) * 0.1;
      next.worldOffset += SCROLL_SPEED * 0.2 * dt;

      if (input.jumpStarted) {
        console.log('Game start triggered');
        return startGame();
      }
      break;
    }

    case Mode.Game: {
      if (input.jumpStarted) {
        next.playerVelocityY = JUMP_VELOCITY;
      }

      next.playerVelocityY += GRAVITY * dt;
      next.playerVelocityY = Math.max(-MAX_FALL_SPEED, Math.min(MAX_FALL_SPEED, next.playerVelocityY));
      next.playerY += next.playerVelocityY * dt;

      next.playerRotation = (next.playerVelocityY / MAX_FALL_SPEED) * (Math.PI / 6);
      next.worldOffset += SCROLL_SPEED * dt;

      const playerX = next.worldOffset;
      next.score = Math.max(0, Math.floor((playerX - OBSTACLE_START_DISTANCE) / OBSTACLE_INTERVAL));

      if (next.playerY > CEILING_Y || next.playerY < GROUND_Y) {
        console.warn(`Bounds death: playerY=${next.playerY.toFixed(2)} ceiling=${CEILING_Y} ground=${GROUND_Y} vy=${next.playerVelocityY.toFixed(2)} dt=${dt.toFixed(4)}`);
        return startGameOver(state);
      }
      break;
    }

    case Mode.GameOver: {
      next.playerVelocityY += GRAVITY * dt;
      next.playerVelocityY = Math.max(-MAX_FALL_SPEED, next.playerVelocityY);
      next.playerY += next.playerVelocityY * dt;
      next.playerY = Math.max(next.playerY, GROUND_Y);
      next.playerRotation += 2.0 * dt;
      next.gameoverTimer += dt * 60; // count frames (normalized to 60fps)

      if (next.gameoverTimer >= DEATH_DELAY_FRAMES && input.jumpStarted) {
        return { ...createInitialState(), mode: Mode.Title };
      }
      break;
    }
  }

  return next;
}

function startGame(): GameState {
  return {
    mode: Mode.Game,
    worldOffset: 0,
    score: 0,
    playerY: 5,
    playerVelocityY: 0,
    playerRotation: 0,
    gameoverTimer: 0,
  };
}

function startGameOver(prev: GameState): GameState {
  return {
    ...prev,
    mode: Mode.GameOver,
    playerVelocityY: DEATH_KNOCKBACK_VELOCITY,
    gameoverTimer: 0,
  };
}
