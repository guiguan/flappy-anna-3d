export class InputManager {
  jumpPressed = false;
  jumpJustPressed = false;

  private keys: Set<string> = new Set();
  private prevJumpPressed = false;

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'Enter') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('mousedown', () => this.jumpJustPressed = true);
    window.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.jumpJustPressed = true;
    }, { passive: false });
  }

  update() {
    this.prevJumpPressed = this.jumpPressed;
    this.jumpPressed = this.keys.has('Space') || this.keys.has('Enter') || this.jumpJustPressed;
    this.jumpJustPressed = false;
  }

  get jumpStarted(): boolean {
    return this.jumpPressed && !this.prevJumpPressed;
  }
}
