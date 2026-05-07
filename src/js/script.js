 
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
        this.frameImg.src = '/assets/frame.png';
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

        ['mousedown', 'mousemove', 'mouseup', 'mouseleave'].forEach(ev => {
          this.canvas.addEventListener(ev, (e) => this.handleMouse(e));
        });

        ['touchstart', 'touchmove', 'touchend'].forEach(ev => {
          this.canvas.addEventListener(ev, (e) => {
            e.preventDefault();
            const touch = e.touches[0] || e.changedTouches[0];
            const mapped = { touchstart: 'mousedown', touchmove: 'mousemove', touchend: 'mouseup' }[ev];
            this.canvas.dispatchEvent(new MouseEvent(mapped, { clientX: touch.clientX, clientY: touch.clientY, bubbles: true }));
          });
        });

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
        const y = (e.clientY - rect.top) * scaleY;

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

        // Soft checkerboard background
        const cs = Math.max(14, size / 22);
        const c1 = this.isDark ? '#1a1f2e' : '#f8fafc';
        const c2 = this.isDark ? '#1e2535' : '#eef2f7';
        for (let x = 0; x < size; x += cs) {
          for (let y = 0; y < size; y += cs) {
            this.ctx.fillStyle = ((Math.floor(x/cs) + Math.floor(y/cs)) % 2 === 0) ? c1 : c2;
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

        // Light checkerboard for export
        const cs = 50;
        for (let x = 0; x < exp; x += cs) {
          for (let y = 0; y < exp; y += cs) {
            ctx.fillStyle = ((Math.floor(x/cs) + Math.floor(y/cs)) % 2 === 0) ? '#f8fafc' : '#eef2f7';
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
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.shadowColor = 'rgba(0,0,0,0.12)';
          ctx.shadowBlur = 40;
          ctx.shadowOffsetY = 14;
          ctx.drawImage(this.userImg, ix, iy, iw, ih);
          ctx.restore();
        }

        const frame = new Image();
        frame.crossOrigin = 'anonymous';
        frame.onload = () => {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(frame, 0, 0, exp, exp);
          this.exportImage(off);
        };
        frame.src = this.frameImg.src;
      }

      exportImage(canvas) {
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          if (this.isIOS()) {
            this.showIOSOverlay(url);
          } else {
            const a = document.createElement('a');
            a.href = url;
            a.download = 'framizz.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }, 'image/png', 0.98);
      }

      isIOS() {
        return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      }

      showIOSOverlay(dataUrl) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 9999;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 2rem; gap: 2rem; backdrop-filter: blur(24px);
        `;
        overlay.innerHTML = `
          <div style="text-align:center;color:white;font-size:clamp(18px,4vw,22px);font-weight:700;line-height:1.4;">
            <div style="opacity:.8;margin-bottom:6px;">Hold the image below</div>
            <div style="color:#60a5fa;font-size:clamp(20px,5vw,26px);">then tap <strong>Save Image</strong></div>
          </div>
          <img src="${dataUrl}" style="max-height:50vh;max-width:88vw;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
          <button id="closeOverlay" style="
            background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);
            color:white;padding:12px 32px;border-radius:999px;font-size:16px;font-weight:600;cursor:pointer;">
            Close
          </button>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#closeOverlay').onclick = () => document.body.removeChild(overlay);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => new Framizz());
    } else {
      new Framizz();
    }
  