class Framizz {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.fileInput = document.getElementById('fileInput');
    this.chooseBtn = document.getElementById('chooseBtn');
    this.controls = document.getElementById('controls');
    this.zoomSlider = document.getElementById('zoomSlider');
    this.saveBtn = document.getElementById('saveBtn');
    this.body = document.getElementById('body');
    this.themeToggle = document.getElementById('themeToggle');
    this.themeLabel = document.getElementById('themeLabel');
    this.sunIcon = document.getElementById('sunIcon');
    this.moonIcon = document.getElementById('moonIcon');

    this.frameImg = new Image();
    this.userImg = null;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragOffset = { x: 0, y: 0 };
    this.zoom = 1;

    this.canvasSize = this.getCanvasSize();
    this.canvas.width = this.canvasSize;
    this.canvas.height = this.canvasSize;

    this.loadFrame();
    this.initTheme();
    this.initEvents();
    this.updateZoomSlider();
    this.draw();
  }

  getCanvasSize() {
    const w = window.innerWidth;
    if (w <= 360) return 280;
    if (w <= 480) return 320;
    return 400;
  }

  loadFrame() {
    this.frameImg.onload = () => this.draw();
    this.frameImg.crossOrigin = 'anonymous';
    this.frameImg.src = 'assets/frame.png';
  }

  initTheme() {
    const saved = localStorage.getItem('framizz-dark');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.isDark = saved !== null ? saved === 'true' : prefersDark;
    this.applyTheme(this.isDark);
  }

  applyTheme(isDark) {
    this.isDark = isDark;
    if (isDark) {
      this.body.classList.add('dark');
      this.sunIcon.classList.add('hidden');
      this.moonIcon.classList.remove('hidden');
      this.themeLabel.textContent = 'Dark';
      this.themeLabel.style.color = '#93c5fd';
    } else {
      this.body.classList.remove('dark');
      this.sunIcon.classList.remove('hidden');
      this.moonIcon.classList.add('hidden');
      this.themeLabel.textContent = 'Light';
      this.themeLabel.style.color = '#64748b';
    }
    localStorage.setItem('framizz-dark', isDark);
    this.draw();
  }

  initEvents() {
    this.themeToggle.addEventListener('click', () => this.applyTheme(!this.isDark));

    this.chooseBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.loadImage(e.target.files[0]));

    this.zoomSlider.addEventListener('input', (e) => {
      this.zoom = parseFloat(e.target.value) / 100;
      this.updateZoomSlider();
      this.draw();
    });

    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouse(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouse(e));
    this.canvas.addEventListener('mouseup',   (e) => this.handleMouse(e));
    this.canvas.addEventListener('mouseleave',(e) => this.handleMouse(e));

    // Touch events — direct handlers, no synthetic MouseEvent dispatch
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.isDragging = true;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvasSize / rect.width;
      const scaleY = this.canvasSize / rect.height;
      this.dragStart = {
        x: (t.clientX - rect.left) * scaleX,
        y: (t.clientY - rect.top)  * scaleY,
      };
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.isDragging || !this.userImg) return;
      const t = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvasSize / rect.width;
      const scaleY = this.canvasSize / rect.height;
      const x = (t.clientX - rect.left) * scaleX;
      const y = (t.clientY - rect.top)  * scaleY;
      this.dragOffset.x += x - this.dragStart.x;
      this.dragOffset.y += y - this.dragStart.y;
      this.dragStart = { x, y };
      this.draw();
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.isDragging = false;
    }, { passive: false });

    window.addEventListener('resize', () => {
      const newSize = this.getCanvasSize();
      if (Math.abs(this.canvasSize - newSize) > 10) {
        this.canvasSize = newSize;
        this.canvas.width = newSize;
        this.canvas.height = newSize;
        this.draw();
      }
    });

    this.saveBtn.addEventListener('click', () => this.saveImage());
  }

  updateZoomSlider() {
    const pct = ((this.zoom * 100 - 50) / 250 * 100).toFixed(1);
    this.zoomSlider.style.setProperty('--val', `${pct}%`);
    this.zoomSlider.value = this.zoom * 100;
  }

  handleMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvasSize / rect.width;
    const scaleY = this.canvasSize / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top)  * scaleY;

    if (e.type === 'mousedown') {
      this.isDragging = true;
      this.dragStart = { x, y };
    } else if (e.type === 'mousemove' && this.isDragging && this.userImg) {
      this.dragOffset.x += x - this.dragStart.x;
      this.dragOffset.y += y - this.dragStart.y;
      this.dragStart = { x, y };
      this.draw();
    } else if (e.type === 'mouseup' || e.type === 'mouseleave') {
      this.isDragging = false;
    }
  }

  async loadImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const img = new Image();
    img.onload = () => {
      this.userImg = img;
      this.dragOffset = { x: 0, y: 0 };
      this.zoom = 1;
      this.updateZoomSlider();
      this.controls.classList.remove('hidden');
      this.controls.style.display = 'flex';

      this.chooseBtn.className = 'btn-secondary w-full h-12 flex items-center justify-center gap-2 text-[15px]';
      this.chooseBtn.style.maxWidth = '380px';
      this.chooseBtn.innerHTML = `
        <svg class="flex-shrink-0" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <span>Change Photo</span>
      `;
      this.draw();
    };
    img.src = URL.createObjectURL(file);
  }

  draw() {
    const size = this.canvasSize;
    this.ctx.clearRect(0, 0, size, size);

    // Checkerboard background
    const cs = Math.max(14, size / 22);
    const c1 = this.isDark ? '#1a1f2e' : '#f8fafc';
    const c2 = this.isDark ? '#1e2535' : '#eef2f7';
    for (let x = 0; x < size; x += cs) {
      for (let y = 0; y < size; y += cs) {
        this.ctx.fillStyle = ((Math.floor(x / cs) + Math.floor(y / cs)) % 2 === 0) ? c1 : c2;
        this.ctx.fillRect(x, y, cs, cs);
      }
    }

    if (this.userImg) {
      const baseScale = Math.max(size / this.userImg.naturalWidth, size / this.userImg.naturalHeight) * this.zoom;
      const iw = this.userImg.naturalWidth * baseScale;
      const ih = this.userImg.naturalHeight * baseScale;
      const ix = (size - iw) / 2 + this.dragOffset.x;
      const iy = (size - ih) / 2 + this.dragOffset.y;

      this.ctx.save();
      this.ctx.shadowColor = 'rgba(0,0,0,0.15)';
      this.ctx.shadowBlur = 20;
      this.ctx.shadowOffsetY = 6;
      this.ctx.drawImage(this.userImg, ix, iy, iw, ih);
      this.ctx.restore();
    }

    if (this.frameImg.complete && this.frameImg.naturalWidth > 0) {
      this.ctx.drawImage(this.frameImg, 0, 0, size, size);
    }
  }

  saveImage() {
    const exp = 1080;
    const off = document.createElement('canvas');
    off.width = off.height = exp;
    const ctx = off.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Light checkerboard for export
    const cs = 50;
    for (let x = 0; x < exp; x += cs) {
      for (let y = 0; y < exp; y += cs) {
        ctx.fillStyle = ((Math.floor(x / cs) + Math.floor(y / cs)) % 2 === 0) ? '#f8fafc' : '#eef2f7';
        ctx.fillRect(x, y, cs, cs);
      }
    }

    if (this.userImg) {
      const ratio = exp / this.canvasSize;
      const baseScale = Math.max(exp / this.userImg.naturalWidth, exp / this.userImg.naturalHeight) * this.zoom;
      const iw = this.userImg.naturalWidth * baseScale;
      const ih = this.userImg.naturalHeight * baseScale;
      const ix = (exp - iw) / 2 + this.dragOffset.x * ratio;
      const iy = (exp - ih) / 2 + this.dragOffset.y * ratio;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 14;
      ctx.drawImage(this.userImg, ix, iy, iw, ih);
      ctx.restore();
    }

    // Reload frame fresh for export
    const frame = new Image();
    frame.crossOrigin = 'anonymous';
    frame.onload = () => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(frame, 0, 0, exp, exp);

      // ── UNIVERSAL EXPORT ──────────────────────────────────────
      // Use toDataURL (not toBlob + createObjectURL) — works on
      // iOS Safari, Android Chrome, and desktop browsers.
      const dataUrl = off.toDataURL('image/png');

      if (this.isIOS()) {
        // iOS Safari cannot trigger downloads at all.
        // Show fullscreen overlay — user long-presses → Save to Photos.
        this.showIOSOverlay(dataUrl);
      } else if (this.isAndroid()) {
        // Android Chrome blocks createObjectURL downloads from canvas.
        // dataURL anchor download works reliably instead.
        this.triggerDataUrlDownload(dataUrl);
      } else {
        // Desktop: standard anchor download
        this.triggerDataUrlDownload(dataUrl);
      }
    };
    frame.onerror = () => {
      // Frame failed to reload — export without it
      const dataUrl = off.toDataURL('image/png');
      if (this.isIOS()) {
        this.showIOSOverlay(dataUrl);
      } else {
        this.triggerDataUrlDownload(dataUrl);
      }
    };
    frame.src = this.frameImg.src + '?v=' + Date.now(); // bust cache
  }

  // ── Works on Android Chrome and all desktop browsers ──
  triggerDataUrlDownload(dataUrl) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'framizz.png';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Small delay before removing to ensure the click registers
    setTimeout(() => document.body.removeChild(a), 300);
  }

  isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  isAndroid() {
    return /android/i.test(navigator.userAgent);
  }

  // ── iOS: fullscreen overlay — long press image → Save to Photos ──
  showIOSOverlay(dataUrl) {
    // Remove any existing overlay first
    const existing = document.getElementById('framizz-ios-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'framizz-ios-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.93);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 28px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-tap-highlight-color: transparent;
    `;

    overlay.innerHTML = `
      <p style="
        color: #ffffff;
        font-size: 17px;
        font-weight: 700;
        margin: 0 0 6px;
        text-align: center;
        line-height: 1.4;
      ">Hold the image below</p>

      <p style="
        color: #8a8f9a;
        font-size: 14px;
        margin: 0 0 22px;
        text-align: center;
        line-height: 1.5;
      ">then tap <strong style="color: #60a5fa;">Save to Photos</strong></p>

      <img
        src="${dataUrl}"
        style="
          max-width: 100%;
          max-height: 52vh;
          border-radius: 16px;
          box-shadow: 0 12px 48px rgba(0,0,0,0.65);
          display: block;
        "
        alt="Your framed photo"
      />

      <button id="framizz-ios-close" style="
        margin-top: 26px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: #ffffff;
        border-radius: 999px;
        padding: 12px 44px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        -webkit-tap-highlight-color: transparent;
        outline: none;
      ">Close</button>
    `;

    document.body.appendChild(overlay);

    document.getElementById('framizz-ios-close').addEventListener('click', () => {
      overlay.remove();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new Framizz());
} else {
  new Framizz();
}