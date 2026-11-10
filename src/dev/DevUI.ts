import type { Film } from '../engine/Film';

/**
 * Development transport. Lives in the DOM beside the canvas — it never draws
 * into the film, and is not created at all in film mode (?film=1).
 *
 * Playback advances a playhead using wall-clock time, but every displayed
 * image is still `film.renderFrame(n)`, i.e. identical to the exported frame.
 */
export class DevUI {
  private playing = false;
  private playhead = 0; // seconds
  private lastTick = 0;
  private loopScene = false;
  private readonly scrub: HTMLInputElement;
  private readonly readout: HTMLSpanElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly sceneSel: HTMLSelectElement;

  constructor(
    private readonly film: Film,
    root: HTMLElement,
    startTime = 0,
  ) {
    const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, string> = {}): HTMLElementTagNameMap[K] => {
      const node = document.createElement(tag);
      Object.assign(node, props);
      return node;
    };

    // --- row 1: scrubber with scene ticks
    const row1 = el('div', { className: 'row' });
    const scrubWrap = el('div', { className: 'scrub' });
    const ticks = el('div', { className: 'ticks' });
    for (const seg of film.segments) {
      const tick = el('i', { textContent: `${String(seg.index + 1).padStart(2, '0')} ${seg.title}` });
      tick.style.left = `${(seg.start / film.duration) * 100}%`;
      tick.style.width = `${((seg.end - seg.start) / film.duration) * 100}%`;
      if (!seg.scene.built) tick.classList.add('pending');
      ticks.append(tick);
    }
    this.scrub = el('input', { type: 'range', min: '0', max: String(film.totalFrames - 1), step: '1', value: '0' });
    scrubWrap.append(ticks, this.scrub);
    row1.append(scrubWrap);

    // --- row 2: transport
    const row2 = el('div', { className: 'row' });
    this.playBtn = el('button', { textContent: '▶ play', title: 'Space' });
    const back = el('button', { textContent: '◀', title: 'Previous frame (←, Shift = 10)' });
    const fwd = el('button', { textContent: '▶', title: 'Next frame (→, Shift = 10)' });
    this.sceneSel = el('select', { title: 'Jump to scene' });
    for (const seg of film.segments) {
      const built = seg.scene.built ? '' : ' — not built';
      this.sceneSel.append(
        el('option', { value: String(seg.index), textContent: `${String(seg.index + 1).padStart(2, '0')} · ${seg.title}${built}` }),
      );
    }
    const loopLabel = el('label');
    const loopBox = el('input', { type: 'checkbox' });
    loopLabel.append(loopBox, 'loop scene');
    const qualSel = el('select', { title: 'Preview resolution (export is always per --scale)' });
    for (const [v, label] of [['0.5', '540p'], ['0.75', '810p'], ['1', '1080p']] as const) {
      qualSel.append(el('option', { value: v, textContent: label }));
    }
    qualSel.value = String(film.scale);
    if (qualSel.selectedIndex < 0) {
      qualSel.append(el('option', { value: String(film.scale), textContent: `${film.height}p` }));
      qualSel.value = String(film.scale);
    }
    const shot = el('button', { textContent: 'screenshot', title: 'Save the current frame as PNG (S)' });
    this.readout = el('span', { className: 'readout' });
    row2.append(this.playBtn, back, fwd, this.sceneSel, loopLabel, qualSel, shot, el('span', { className: 'spacer' }), this.readout);

    root.append(row1, row2);

    // --- wiring
    this.playBtn.onclick = () => this.toggle();
    back.onclick = (e) => this.step(e.shiftKey ? -10 : -1);
    fwd.onclick = (e) => this.step(e.shiftKey ? 10 : 1);
    this.scrub.oninput = () => this.seekFrame(Number(this.scrub.value));
    this.sceneSel.onchange = () => this.seekTime(film.segments[Number(this.sceneSel.value)].start);
    loopBox.onchange = () => (this.loopScene = loopBox.checked);
    qualSel.onchange = () => {
      film.setScale(Number(qualSel.value));
      this.draw();
    };
    shot.onclick = () => this.screenshot();
    // hand focus back to the page after using a control, so Space / arrows / digits
    // keep driving the transport instead of the last-clicked widget
    for (const node of root.querySelectorAll<HTMLElement>('button, select, input[type=checkbox]')) {
      node.addEventListener(node instanceof HTMLButtonElement ? 'click' : 'change', () => node.blur());
    }
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Space') { e.preventDefault(); this.toggle(); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); this.step(e.shiftKey ? -10 : -1); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); this.step(e.shiftKey ? 10 : 1); }
      else if (e.code === 'Home') this.seekTime(0);
      else if (e.code === 'KeyS') this.screenshot();
      else if (/^Digit[1-9]$/.test(e.code)) {
        const seg = film.segments[Number(e.code.slice(5)) - 1];
        if (seg) this.seekTime(seg.start);
      }
    });

    this.seekTime(startTime);
    requestAnimationFrame((now) => this.tick(now));
  }

  private toggle(): void {
    this.playing = !this.playing;
    this.playBtn.textContent = this.playing ? '❚❚ pause' : '▶ play';
    if (this.playing && this.playhead >= this.film.duration - 1 / this.film.fps) this.playhead = 0;
  }

  private step(frames: number): void {
    if (this.playing) this.toggle();
    this.seekFrame(this.film.frame + frames);
  }

  private seekFrame(frame: number): void {
    this.seekTime(Math.min(this.film.totalFrames - 1, Math.max(0, frame)) / this.film.fps);
  }

  private seekTime(time: number): void {
    this.playhead = Math.min(this.film.duration, Math.max(0, time));
    this.draw();
  }

  private tick(now: number): void {
    const dt = Math.min(0.25, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (this.playing) {
      const before = this.film.segmentAt(this.playhead);
      this.playhead += dt;
      if (this.loopScene && this.playhead >= before.end) this.playhead = before.start;
      if (this.playhead >= this.film.duration) {
        this.playhead = this.film.duration;
        this.toggle();
      }
      this.draw();
    }
    requestAnimationFrame((n) => this.tick(n));
  }

  private draw(): void {
    const { film } = this;
    const frame = film.timeToFrame(this.playhead);
    film.renderFrame(frame);
    const t = frame / film.fps;
    const seg = film.segmentAt(t);
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = (t % 60).toFixed(2).padStart(5, '0');
    this.scrub.value = String(frame);
    this.sceneSel.value = String(seg.index);
    this.readout.innerHTML =
      `${mm}:${ss} · f${String(frame).padStart(4, '0')}/${film.totalFrames} · ` +
      `<span class="dim">${film.width}×${film.height} · ${film.lastFrameMs.toFixed(1)} ms</span>` +
      (seg.scene.built ? '' : ' · <span class="pending-badge">scene not built</span>');
  }

  private screenshot(): void {
    const { film } = this;
    film.renderFrame(film.frame);
    film.renderer.domElement.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `eidolon_f${String(film.frame).padStart(5, '0')}_${film.height}p.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  }
}
