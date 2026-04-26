export class AudioManager {
  private context: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private initialized = false;

  async init() {
    if (this.initialized) return;
    this.context = new AudioContext();
    this.initialized = true;
  }

  async load(name: string, url: string): Promise<void> {
    if (!this.context) await this.init();
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
      this.buffers.set(name, audioBuffer);
    } catch {
      console.warn(`Failed to load sound: ${name} from ${url}`);
    }
  }

  play(name: string, volume = 0.7, pitchVariation = 0.05) {
    const buffer = this.buffers.get(name);
    if (!buffer || !this.context) return;

    // Resume context if suspended (browser autoplay policy)
    if (this.context.state === 'suspended') {
      this.context.resume();
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // Slight random pitch variation for natural feel
    source.playbackRate.value = 1.0 + (Math.random() - 0.5) * pitchVariation * 2;

    const gainNode = this.context.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode);
    gainNode.connect(this.context.destination);
    source.start(0);
  }

  // Generate a simple tone for when no audio files are available
  playTone(frequency: number, duration: number, volume = 0.3, type: OscillatorType = 'sine') {
    if (!this.context) return;
    if (this.context.state === 'suspended') this.context.resume();

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start(0);
    osc.stop(this.context.currentTime + duration);
  }

  playJump() {
    if (this.buffers.has('jump')) {
      this.play('jump', 0.6);
    } else {
      this.playTone(400, 0.15, 0.2, 'square');
      setTimeout(() => this.playTone(600, 0.1, 0.15, 'square'), 50);
    }
  }

  playHit() {
    if (this.buffers.has('hit')) {
      this.play('hit', 0.7);
    } else {
      this.playTone(80, 0.4, 0.3, 'sawtooth');
    }
  }

  playScore() {
    if (this.buffers.has('score')) {
      this.play('score', 0.5);
    } else {
      this.playTone(523, 0.1, 0.15, 'sine');
      setTimeout(() => this.playTone(659, 0.1, 0.15, 'sine'), 80);
      setTimeout(() => this.playTone(784, 0.15, 0.15, 'sine'), 160);
    }
  }
}
