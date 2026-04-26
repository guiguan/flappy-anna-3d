export const TILE_SIZE = 1.0;

// Physics — all values are per-second (not per-frame)
export const GRAVITY = -8.0;         // units/sec² downward
export const JUMP_VELOCITY = 5.0;    // units/sec upward on flap
export const MAX_FALL_SPEED = 5.0;   // terminal fall speed
export const SCROLL_SPEED = 3.0;     // world units per second

// Obstacles (matching original proportions: gap=5 tiles, interval=8 tiles, start=8 tiles)
export const OBSTACLE_GAP = 5.0;
export const OBSTACLE_INTERVAL = 8.0;
export const OBSTACLE_START_DISTANCE = 12.0; // increased from 8 to give more run-up
export const OBSTACLE_WIDTH = 2.0;

// World bounds
export const CEILING_Y = 15.0;
export const GROUND_Y = 0.5;

// Player
export const PLAYER_HALF_WIDTH = 0.5;
export const PLAYER_HALF_HEIGHT = 1.0;
export const PLAYER_HALF_DEPTH = 0.4;

// Camera
export const CAMERA_FOV = 55;

// Game
export const DEATH_DELAY_FRAMES = 30;
