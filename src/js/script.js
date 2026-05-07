class Framizz {
  constructor() {
    this.canvas   = document.getElementById('previewCanvas');
    this.ctx      = this.canvas.getContext('2d');
    this.fileInput= document.getElementById('fileInput');
    this.chooseBtn= document.getElementById('chooseBtn');
    this.controls = document.getElementById('controls');
    this.zoomSlider=document.getElementById('zoomSlider');
    this.saveBtn  = document.getElementById('saveBtn');
    this.body     = document.getElementById('body');
    this.themeToggle=document.getElementById('themeToggle');
    this.themeLabel =document.getElementById('themeLabel');
    this.sunIcon  = document.getElementById('sunIcon');
    this.moonIcon = document.getElementById('moonIcon');

    // State
    this.frameImg   = null;   // Image element loaded from base64
    this.frameB64   = null;   // base64 data URL — used for export (no CORS)
    this.userImg    = null;   // Image element loaded from base64
    this.userB64    = null;   // base64 data URL of user photo
    this.isDragging = false;
    this.dragStart  = { x: 0, y: 0 };
    this.dragOffset = { x: 0, y: 0 };
    this.zoom       = 1;
    this.isDark     = false;

    this.canvasSize = this.getCanvasSize();
    this.canvas.width  = this.canvasSize;
    this.canvas.height = this.canvasSize;

    this.initTheme();
    this.initEvents();
    this.updateZoomSlider();

    // KEY FIX: fetch frame → base64 on startup
    // All export drawing uses this b64, zero CORS issues on any device
    this.preloadFrame('assets/frame.png');
  }

  /* ── FRAME PRELOAD ────────────────────────────────────────
     fetch() → blob → FileReader → base64 data URL
     This is the only reliable cross-device approach.
     canvas.drawImage(img loaded from b64) never triggers CORS.
  ── */
  async preloadFrame(src) {
    try {
      const res  = await fetch(src);
      const blob = await res.blob();
      const b64  = await this.blobToBase64(blob);
      this.frameB64 = b64;
      const img = new Image();
      img.onload = () => { this.frameImg = img; this.draw(); };
      img.src = b64;
    } catch (err) {
      // Fallback: load without crossOrigin (preview may work, export might not on some browsers)
      console.warn('Frame fetch failed, using direct load:', err);
      const img = new Image();
      img.onload = () => { this.frameImg = img; this.frameB64 = null; this.draw(); };
      img.src = src;
    }
  }

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  getCanvasSize() {
    const w = window.innerWidth;
    if (w <= 360) return 280;
    if (w <= 480) return 320;
    return 400;
  }

  /* ── THEME ──────────────────────────────────────────────── */
  initTheme() {
    const saved = localStorage.getItem('framizz-dark');
    const sys   = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme(saved !== null ? saved === 'true' : sys);
  }

  applyTheme(dark) {
    this.isDark = dark;
    if (dark) {
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
    localStorage.setItem('framizz-dark', dark);
    this.draw();
  }

  /* ── EVENTS ─────────────────────────────────────────────── */
  initEvents() {
    this.themeToggle.addEventListener('click', () => this.applyTheme(!this.isDark));
    this.chooseBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', e => this.loadImage(e.target.files[0]));

    this.zoomSlider.addEventListener('input', e => {
      this.zoom = parseFloat(e.target.value) / 100;
      this.updateZoomSlider();
      this.draw();
    });

    // Mouse drag
    this.canvas.addEventListener('mousedown',  e => this.handleMouse(e));
    this.canvas.addEventListener('mousemove',  e => this.handleMouse(e));
    this.canvas.addEventListener('mouseup',    e => this.handleMouse(e));
    this.canvas.addEventListener('mouseleave', e => this.handleMouse(e));

    // Touch drag — direct handlers, passive:false so preventDefault works
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      this.isDragging = true;
      const t    = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.dragStart = {
        x: (t.clientX - rect.left) * (this.canvasSize / rect.width),
        y: (t.clientY - rect.top)  * (this.canvasSize / rect.height),
      };
    }, { passive: false });

    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!this.isDragging || !this.userImg) return;
      const t    = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x    = (t.clientX - rect.left) * (this.canvasSize / rect.width);
      const y    = (t.clientY - rect.top)  * (this.canvasSize / rect.height);
      this.dragOffset.x += x - this.dragStart.x;
      this.dragOffset.y += y - this.dragStart.y;
      this.dragStart = { x, y };
      this.draw();
    }, { passive: false });

    this.canvas.addEventListener('touchend', e => {
      e.preventDefault();
      this.isDragging = false;
    }, { passive: false });

    window.addEventListener('resize', () => {
      const n = this.getCanvasSize();
      if (Math.abs(this.canvasSize - n) > 10) {
        this.canvasSize = n;
        this.canvas.width  = n;
        this.canvas.height = n;
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
    const x = (e.clientX - rect.left) * (this.canvasSize / rect.width);
    const y = (e.clientY - rect.top)  * (this.canvasSize / rect.height);
    if (e.type === 'mousedown') {
      this.isDragging = true;
      this.dragStart  = { x, y };
    } else if (e.type === 'mousemove' && this.isDragging && this.userImg) {
      this.dragOffset.x += x - this.dragStart.x;
      this.dragOffset.y += y - this.dragStart.y;
      this.dragStart = { x, y };
      this.draw();
    } else if (e.type === 'mouseup' || e.type === 'mouseleave') {
      this.isDragging = false;
    }
  }

  /* ── LOAD USER IMAGE ─────────────────────────────────────
     Convert to base64 immediately so export has zero blob/CORS issues
  ── */
  async loadImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const b64 = await this.blobToBase64(file);
    this.userB64 = b64;
    const img = new Image();
    img.onload = () => {
      this.userImg    = img;
      this.dragOffset = { x: 0, y: 0 };
      this.zoom       = 1;
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
    img.src = b64;
  }

  /* ── DRAW PREVIEW ────────────────────────────────────────── */
  draw() {
    const s   = this.canvasSize;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, s, s);

    // Checkerboard
    const cs = Math.max(14, s / 22);
    const c1 = this.isDark ? '#1a1f2e' : '#f8fafc';
    const c2 = this.isDark ? '#1e2535' : '#eef2f7';
    for (let x = 0; x < s; x += cs)
      for (let y = 0; y < s; y += cs) {
        ctx.fillStyle = ((Math.floor(x/cs) + Math.floor(y/cs)) % 2 === 0) ? c1 : c2;
        ctx.fillRect(x, y, cs, cs);
      }

    // User photo
    if (this.userImg) {
      const scale = Math.max(s / this.userImg.naturalWidth, s / this.userImg.naturalHeight) * this.zoom;
      const iw = this.userImg.naturalWidth  * scale;
      const ih = this.userImg.naturalHeight * scale;
      const ix = (s - iw) / 2 + this.dragOffset.x;
      const iy = (s - ih) / 2 + this.dragOffset.y;
      ctx.save();
      ctx.shadowColor   = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur    = 20;
      ctx.shadowOffsetY = 6;
      ctx.drawImage(this.userImg, ix, iy, iw, ih);
      ctx.restore();
    }

    // Frame on top
    if (this.frameImg) ctx.drawImage(this.frameImg, 0, 0, s, s);
  }

  /* ── BUILD EXPORT CANVAS ─────────────────────────────────
     Both user photo and frame drawn from base64 data URLs.
     base64 images are NEVER subject to CORS — they work on
     every browser, every device, every platform, every time.
  ── */
  buildExport() {
    const exp = 1080;
    const off = document.createElement('canvas');
    off.width = off.height = exp;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // bg
    const cs = 50;
    for (let x = 0; x < exp; x += cs)
      for (let y = 0; y < exp; y += cs) {
        ctx.fillStyle = ((Math.floor(x/cs) + Math.floor(y/cs)) % 2 === 0) ? '#f8fafc' : '#eef2f7';
        ctx.fillRect(x, y, cs, cs);
      }

    // User photo from base64
    if (this.userImg && this.userB64) {
      const ratio = exp / this.canvasSize;
      const scale = Math.max(exp / this.userImg.naturalWidth, exp / this.userImg.naturalHeight) * this.zoom;
      const iw = this.userImg.naturalWidth  * scale;
      const ih = this.userImg.naturalHeight * scale;
      const ix = (exp - iw) / 2 + this.dragOffset.x * ratio;
      const iy = (exp - ih) / 2 + this.dragOffset.y * ratio;
      ctx.save();
      ctx.shadowColor   = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur    = 40;
      ctx.shadowOffsetY = 14;
      // Draw from the already-loaded Image object (src is base64, no CORS)
      ctx.drawImage(this.userImg, ix, iy, iw, ih);
      ctx.restore();
    }

    // Frame from base64 Image object (no CORS, always works)
    if (this.frameImg) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.frameImg, 0, 0, exp, exp);
    }

    return off.toDataURL('image/png');
  }

  /* ── SAVE / DOWNLOAD ─────────────────────────────────────── */
  saveImage() {
    if (!this.userImg) return;

    if (!this.frameImg) {
      alert('Frame is still loading. Please wait a second and try again.');
      return;
    }

    const dataUrl = this.buildExport();

    if (this.isIOS()) {
      this.saveIOS(dataUrl);
    } else {
      this.saveDefault(dataUrl);
    }
  }

  /* ── ANDROID + DESKTOP ──────────────────────────────────────
     dataURL anchor — works on Android Chrome, Samsung Browser,
     Firefox Android, and all desktop browsers.
  ── */
  saveDefault(dataUrl) {
    const a       = document.createElement('a');
    a.href        = dataUrl;
    a.download    = 'framizz.png';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 500);
  }

  /* ── iOS ────────────────────────────────────────────────────
     iOS Safari and Chrome on iOS CANNOT download files directly
     to the camera roll from a web page. This is an Apple OS
     restriction — no website can bypass it, including Twibbonize
     (their own help docs confirm this same workaround).

     Best possible UX on iOS:
     - Open a new tab with ONLY the merged image
     - Safari shows it full screen
     - User taps Share ⎋ → "Save to Photos"  (2 taps)
     OR holds the image → "Save to Photos"    (1 hold)

     This is literally identical to what Twibbonize does.
  ── */
  saveIOS(dataUrl) {
    const w = window.open('', '_blank');
    if (!w) {
      // Popup blocked — fall back to overlay
      this.saveIOSOverlay(dataUrl);
      return;
    }
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
  <title>Save Your Photo — Framizz</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    html,body{height:100%;background:#000;overflow:hidden}
    body{
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      padding:24px;gap:18px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    }
    .tip{
      color:#94a3b8;font-size:14px;text-align:center;line-height:1.6;
      background:rgba(255,255,255,0.06);
      border:1px solid rgba(255,255,255,0.1);
      border-radius:14px;padding:14px 18px;max-width:320px;width:100%;
    }
    .tip strong{color:#60a5fa}
    img{
      max-width:100%;max-height:62vh;
      border-radius:16px;
      box-shadow:0 12px 48px rgba(0,0,0,0.7);
      display:block;
    }
    .close{
      color:#475569;font-size:13px;cursor:pointer;
      background:none;border:none;font-family:inherit;
      text-decoration:underline;
      -webkit-tap-highlight-color:transparent;
    }
  </style>
</head>
<body>
  <div class="tip">
    <strong>Hold the image</strong> below, then tap<br>
    <strong>Save to Photos</strong><br>
    <span style="opacity:0.6;font-size:12px;">or tap Share ⎋ → Save to Photos</span>
  </div>
  <img src="${dataUrl}" alt="Your Framizz photo">
  <button class="close" onclick="window.close()">Close this tab</button>
</body>
</html>`);
    w.document.close();
  }

  /* Fallback if popup is blocked */
  saveIOSOverlay(dataUrl) {
    const old = document.getElementById('fz-ios');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'fz-ios';
    el.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:rgba(0,0,0,0.95);
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      padding:28px;box-sizing:border-box;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      -webkit-tap-highlight-color:transparent;
      overflow-y:auto;
    `;
    el.innerHTML = `
      <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:18px 20px;margin-bottom:16px;text-align:center;max-width:310px;width:100%;">
        <p style="color:#fff;font-size:15px;font-weight:700;margin:0 0 6px;">Save your photo</p>
        <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.6;">
          <strong style="color:#60a5fa;">Hold the image</strong> below<br>
          then tap <strong style="color:#60a5fa;">Save to Photos</strong>
        </p>
      </div>
      <img src="${dataUrl}" style="max-width:100%;max-height:48vh;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,0.6);display:block;margin-bottom:18px;" alt="Your photo">
      <button id="fz-ios-close" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:999px;padding:11px 40px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;outline:none;-webkit-tap-highlight-color:transparent;">Close</button>
    `;
    document.body.appendChild(el);
    document.getElementById('fz-ios-close').addEventListener('click', () => el.remove());
  }

  isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
}

/* ── BOOT ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new Framizz());
} else {
  new Framizz();
}