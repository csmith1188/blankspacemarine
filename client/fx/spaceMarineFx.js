/**
 * Space Marine visual effects (inline SVG commander, Canvas plasma lasers & sparks)
 * and Web Audio API synthesized sci-fi sound effects.
 */

export function buildMarineSvg() {
  return `
    <svg viewBox="0 0 120 120" width="88" height="88" xmlns="http://www.w3.org/2000/svg">
      <!-- Shoulder Pauldrons -->
      <path d="M14 96 C14 74 30 66 44 68 L76 68 C90 66 106 74 106 96 L106 112 L14 112 Z" fill="#1b3554" stroke="#28d7ff" stroke-width="2.5"/>
      <path d="M22 86 L38 86 L34 106 L20 106 Z" fill="#102238" stroke="#28d7ff" stroke-width="1.5"/>
      <path d="M98 86 L82 86 L86 106 L100 106 Z" fill="#102238" stroke="#28d7ff" stroke-width="1.5"/>
      <!-- Chest Core -->
      <polygon points="60,78 70,90 60,102 50,90" fill="#28d7ff" opacity="0.85"/>
      <!-- Helmet -->
      <rect x="34" y="20" width="52" height="50" rx="16" fill="#214066" stroke="#28d7ff" stroke-width="2.5"/>
      <!-- Helmet Crest -->
      <path d="M54 14 L66 14 L64 26 L56 26 Z" fill="#28d7ff"/>
      <!-- Visor -->
      <path class="marine-visor" d="M40 38 L80 38 L76 54 L44 54 Z" fill="#28d7ff" opacity="0.92"/>
      <line x1="45" y1="43" x2="73" y2="43" stroke="#ffffff" stroke-width="2" opacity="0.6"/>
      <!-- Respirator Grille -->
      <rect x="49" y="58" width="22" height="8" rx="3" fill="#0b1829" stroke="#5b84b1" stroke-width="1.5"/>
      <line x1="55" y1="58" x2="55" y2="66" stroke="#5b84b1" stroke-width="1.5"/>
      <line x1="60" y1="58" x2="60" y2="66" stroke="#5b84b1" stroke-width="1.5"/>
      <line x1="65" y1="58" x2="65" y2="66" stroke="#5b84b1" stroke-width="1.5"/>
      <!-- Plasma Blaster Barrel (right side) -->
      <rect x="88" y="64" width="24" height="10" rx="3" fill="#102238" stroke="#2cf59e" stroke-width="2"/>
      <circle class="marine-muzzle" cx="112" cy="69" r="3.5" fill="#2cf59e"/>
    </svg>
  `;
}

export class SpaceMarineFx {
  constructor(canvasEl, avatarEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl ? canvasEl.getContext('2d') : null;
    this.avatarEl = avatarEl;

    this.particles = [];
    this.beams = [];
    this.muted = false;
    this.audioCtx = null;
    this.masterOut = null;
    this.animating = false;
    this.stateTimer = null;
    this.lastTickAt = 0;

    if (this.avatarEl) {
      this.avatarEl.innerHTML = buildMarineSvg();
    }

    this._onResize = this._resize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._resize();
  }

  _resize() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
  }

  setMarineState(state, durationMs = 0) {
    if (!this.avatarEl) return;
    if (this.stateTimer) {
      clearTimeout(this.stateTimer);
      this.stateTimer = null;
    }
    this.avatarEl.classList.remove('state-idle', 'state-firing', 'state-alert', 'state-celebrate');
    this.avatarEl.classList.add(`state-${state}`);

    const visor = this.avatarEl.querySelector('.marine-visor');
    if (visor) {
      if (state === 'alert') visor.setAttribute('fill', '#ff4769');
      else if (state === 'celebrate') visor.setAttribute('fill', '#2cf59e');
      else visor.setAttribute('fill', '#28d7ff');
    }

    if (durationMs > 0) {
      this.stateTimer = setTimeout(() => {
        this.setMarineState('idle');
      }, durationMs);
    }
  }

  /**
   * Fires a plasma beam from the Space Marine portrait to the vaporized whitespace position.
   */
  fireVaporize({ x, y, isTab = false, playSound = true }) {
    this.setMarineState('firing', 220);
    if (playSound) {
      this._playLaserZap({ heavy: isTab });
    }

    if (!this.ctx) return;

    // Origin at Space Marine muzzle
    let originX = 160;
    let originY = 160;
    if (this.avatarEl) {
      const rect = this.avatarEl.getBoundingClientRect();
      originX = rect.right - 8;
      originY = rect.top + rect.height * 0.58;
    }

    const color = isTab ? '#ff6b4a' : '#28d7ff';
    this.beams.push({
      x1: originX,
      y1: originY,
      x2: x,
      y2: y,
      color,
      alpha: 0.95
    });

    const count = isTab ? 16 : 9;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.8 + Math.random() * 2.4,
        color: i % 2 === 0 ? color : '#2cf59e',
        alpha: 1
      });
    }

    this._ensureAnimationLoop();
  }

  playDeployIndent({ x, y, playSound = true }) {
    if (playSound) {
      // Tactile sci-fi blip when adding spaces/indents
      this._playTone(420, 580, 0.055, 'triangle', 0.81);
    }
    if (!this.ctx) return;

    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 2.2,
        vy: -1 - Math.random() * 1.8,
        radius: 1.6,
        color: '#2cf59e',
        alpha: 0.85
      });
    }
    this._ensureAnimationLoop();
  }

  playCursorTick() {
    if (this.muted) return;
    const now = performance.now();
    if (now - this.lastTickAt < 24) return;
    this.lastTickAt = now;
    // Crisp HUD tick on cursor movement
    this._playTone(940, 620, 0.032, 'triangle', 0.81);
  }

  playBlocked() {
    this._playTone(150, 110, 0.09, 'square', 0.47);
  }

  playErrorAlarm() {
    this.setMarineState('alert', 900);
    this._playTone(220, 140, 0.16, 'sawtooth', 0.71);
    setTimeout(() => this._playTone(180, 115, 0.18, 'sawtooth', 0.71), 130);
  }

  playMissionClear() {
    this.setMarineState('celebrate', 1100);
    this._playTone(440, 440, 0.09, 'triangle', 0.76);
    setTimeout(() => this._playTone(554, 554, 0.09, 'triangle', 0.76), 80);
    setTimeout(() => this._playTone(659, 659, 0.14, 'triangle', 0.82), 160);
    setTimeout(() => this._playTone(880, 880, 0.22, 'triangle', 0.88), 250);
  }

  playPowerupCollected({ x, y }) {
    this.setMarineState('celebrate', 900);
    // Laser blast on deleting the power-up + ascending sci-fi power-up chime
    this._playLaserZap({ heavy: true, pitchBoost: 1.18 });
    setTimeout(() => this._playTone(523, 659, 0.09, 'triangle', 0.76), 45);
    setTimeout(() => this._playTone(659, 880, 0.11, 'triangle', 0.82), 115);
    setTimeout(() => this._playTone(880, 1175, 0.16, 'sine', 0.88), 195);

    if (!this.ctx) return;

    // Gold plasma beam from Space Marine muzzle to the power-up orb
    let originX = 160;
    let originY = 160;
    if (this.avatarEl) {
      const rect = this.avatarEl.getBoundingClientRect();
      originX = rect.right - 8;
      originY = rect.top + rect.height * 0.58;
    }
    this.beams.push({
      x1: originX,
      y1: originY,
      x2: x,
      y2: y,
      color: '#ffbe3b',
      alpha: 1
    });

    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 2.0 + Math.random() * 4.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2.2 + Math.random() * 2.2,
        color: i % 2 === 0 ? '#ffbe3b' : '#28d7ff',
        alpha: 1
      });
    }
    this._ensureAnimationLoop();
  }

  playBonusPointsCollected({ x, y }) {
    this.setMarineState('celebrate', 650);
    // Crisp laser zap + bright emerald bonus pickup chime
    this._playLaserZap({ heavy: false, pitchBoost: 1.25 });
    setTimeout(() => this._playTone(659, 988, 0.08, 'triangle', 0.78), 40);
    setTimeout(() => this._playTone(988, 1319, 0.13, 'sine', 0.85), 105);

    if (!this.ctx) return;

    let originX = 160;
    let originY = 160;
    if (this.avatarEl) {
      const rect = this.avatarEl.getBoundingClientRect();
      originX = rect.right - 8;
      originY = rect.top + rect.height * 0.58;
    }
    this.beams.push({
      x1: originX,
      y1: originY,
      x2: x,
      y2: y,
      color: '#2cf59e',
      alpha: 1
    });

    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const speed = 1.8 + Math.random() * 4.0;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2.0 + Math.random() * 2.0,
        color: i % 2 === 0 ? '#2cf59e' : '#ffffff',
        alpha: 1
      });
    }
    this._ensureAnimationLoop();
  }

  /**
   * Layered sci-fi plasma laser sweep (oscillator + resonant low-pass filter).
   */
  _playLaserZap({ heavy = false, pitchBoost = 1 } = {}) {
    if (this.muted) return;
    const ctx = this._ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const dur = heavy ? 0.15 : 0.115;

      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      sub.type = 'triangle';

      const startFreq = (heavy ? 1180 : 1420) * pitchBoost;
      const endFreq = (heavy ? 130 : 185) * pitchBoost;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + dur);

      sub.frequency.setValueAtTime(startFreq * 0.5, now);
      sub.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq * 0.5), now + dur);

      filter.type = 'lowpass';
      filter.Q.setValueAtTime(4.5, now);
      filter.frequency.setValueAtTime(2800 * pitchBoost, now);
      filter.frequency.exponentialRampToValueAtTime(320, now + dur);

      const peakVol = heavy ? 1.0 : 0.76;
      gain.gain.setValueAtTime(peakVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(filter);
      sub.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterOut || ctx.destination);

      osc.start(now);
      sub.start(now);
      osc.stop(now + dur + 0.01);
      sub.stop(now + dur + 0.01);
    } catch {
      // Ignore audio scheduling errors in restricted browser contexts
    }
  }

  _ensureAudioContext() {
    if (this.muted) return null;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
        // Master limiter prevents clipping when normalized sounds overlap
        const limiter = this.audioCtx.createDynamicsCompressor();
        limiter.threshold.setValueAtTime(-2, this.audioCtx.currentTime);
        limiter.knee.setValueAtTime(6, this.audioCtx.currentTime);
        limiter.ratio.setValueAtTime(12, this.audioCtx.currentTime);
        limiter.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
        limiter.release.setValueAtTime(0.08, this.audioCtx.currentTime);
        limiter.connect(this.audioCtx.destination);
        this.masterOut = limiter;
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  _playTone(startFreq, endFreq, durationSec, type = 'sine', volume = 0.06) {
    if (this.muted) return;
    const ctx = this._ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + durationSec);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      osc.connect(gain);
      gain.connect(this.masterOut || ctx.destination);
      osc.start(now);
      osc.stop(now + durationSec + 0.01);
    } catch {
      // Ignore audio scheduling errors in restricted browser contexts
    }
  }

  _ensureAnimationLoop() {
    if (this.animating) return;
    this.animating = true;
    requestAnimationFrame(() => this._tick());
  }

  _tick() {
    if (!this.ctx || !this.canvas) {
      this.animating = false;
      return;
    }

    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // Render plasma beams
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      this.ctx.save();
      this.ctx.globalAlpha = b.alpha;
      this.ctx.strokeStyle = b.color;
      this.ctx.lineWidth = 3;
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = b.color;
      this.ctx.beginPath();
      this.ctx.moveTo(b.x1, b.y1);
      this.ctx.lineTo(b.x2, b.y2);
      this.ctx.stroke();
      this.ctx.restore();

      b.alpha -= 0.11;
      if (b.alpha <= 0) this.beams.splice(i, 1);
    }

    // Render particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.alpha -= 0.045;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    if (this.beams.length > 0 || this.particles.length > 0) {
      requestAnimationFrame(() => this._tick());
    } else {
      this.animating = false;
    }
  }
}
