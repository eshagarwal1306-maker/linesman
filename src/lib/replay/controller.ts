import type { TxlineEvent } from "@/lib/txline/types";

export class ReplayController {
  private index = 0;
  private speed = 1;
  private timer?: ReturnType<typeof setTimeout>;
  private playing = false;

  constructor(
    private readonly events: readonly TxlineEvent[],
    private readonly onEvent: (event: TxlineEvent, index: number) => void,
  ) {}

  play(): void {
    if (this.playing || this.events.length === 0) return;
    if (this.index >= this.events.length) this.index = 0;
    this.playing = true;
    this.emitAndSchedule();
  }

  pause(): void {
    this.playing = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  seek(index: number): void {
    this.pause();
    this.index = Math.max(0, Math.min(Math.floor(index), this.events.length));
  }

  setSpeed(multiplier: number): void {
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      throw new Error("Replay speed must be positive");
    }
    this.speed = multiplier;
    if (this.playing) {
      this.pause();
      this.play();
    }
  }

  dispose(): void {
    this.pause();
  }

  private emitAndSchedule(): void {
    if (!this.playing || this.index >= this.events.length) {
      this.playing = false;
      return;
    }
    const currentIndex = this.index;
    this.onEvent(this.events[currentIndex], currentIndex);
    this.index += 1;
    if (this.index >= this.events.length) {
      this.playing = false;
      return;
    }
    const sourceDelay =
      this.events[this.index].timestamp - this.events[currentIndex].timestamp;
    const delay = Math.min(2_000, Math.max(0, sourceDelay / this.speed));
    this.timer = setTimeout(() => this.emitAndSchedule(), delay);
  }
}
