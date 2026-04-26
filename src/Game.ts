export const Mode = {
  Title: 0,
  Game: 1,
  GameOver: 2,
} as const;
export type Mode = (typeof Mode)[keyof typeof Mode];

export interface GameState {
  mode: Mode;
  worldOffset: number;
  score: number;
  playerY: number;
  playerVelocityY: number;
  playerRotation: number;
  gameoverTimer: number;
}
