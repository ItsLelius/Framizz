import { useState, useRef, useEffect } from "react";

// ── Swap this to change the frame ─────────────────────────────
import frameSrc from "./assets/frame.png";
import logoSrc from "./assets/logo.png";

const FRAME_SRC = frameSrc;
const OUTPUT_SIZE = 1080;
const PREVIEW = 400;
// ─────────────────────────────────────────────────────────────

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function App() {
  const [dark, setDark]               = useState(false);
  const [photo, setPhoto]             = useState(null);
  const [dragging, setDragging]       = useState(false);
  const [zoom, setZoom]               = useState(1);
  const [hoverChoose, setHoverChoose] = useState(false);
  const [hoverSave, setHoverSave]     = useState(false);
  const [hoverToggle, setHoverToggle] = useState(false);
  const [transform, setTransform]     = useState({ x: 0, y: 0, scale: 1 });

  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  const photoRef  = useRef(null);
  const dragStart = useRef(null);

  const C = {
    bg:      dark ? "#0f0f13" : "#f0f2f5",
    surface: dark ? "#1c1c24" : "#ffffff",
    border:  dark ? "#2a2a36" : "#dce1e7",
    text:    dark ? "#e4e6eb" : "#1c1e21",
    muted:   dark ? "#8a8f9a" : "#65676b",
    blue:    "#1877F2",
    blueDk:  "#1464d8",
    pill:    dark ? "#2a2a36" : "#e4e6eb",
  };

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = FRAME_SRC;
    img.onload = () => { frameRef.current = img; draw(); };
  }, []);

  useEffect(() => { draw(); }, [transform, photo, dark, zoom]);

  function draw() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, PREVIEW, PREVIEW);
    const sq = 16;
    for (let r = 0; r < PREVIEW / sq; r++) {
      for (let col = 0; col < PREVIEW / sq; col++) {
        ctx.fillStyle = (r + col) % 2 === 0
          ? (dark ? "#222230" : "#e0e0e0")
          : (dark ? "#1a1a28" : "#d0d0d0");
        ctx.fillRect(col * sq, r * sq, sq, sq);
      }
    }
    if (photoRef.current) {
      const img = photoRef.current;
      const s = transform.scale * zoom;
      const ratio = PREVIEW / OUTPUT_SIZE;
      ctx.drawImage(img,
        transform.x, transform.y,
        img.naturalWidth * s * ratio,
        img.naturalHeight * s * ratio
      );
    }
    if (frameRef.current) {
      ctx.drawImage(frameRef.current, 0, 0, PREVIEW, PREVIEW);
    }
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      photoRef.current = img;
      const scale = Math.max(OUTPUT_SIZE / img.naturalWidth, OUTPUT_SIZE / img.naturalHeight);
      const pr = PREVIEW / OUTPUT_SIZE;
      setTransform({
        x: (PREVIEW - img.naturalWidth * scale * pr) / 2,
        y: (PREVIEW - img.naturalHeight * scale * pr) / 2,
        scale,
      });
      setZoom(1);
    };
    img.src = url;
    setPhoto(url);
  }

  const onMouseDown = e => {
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, tx: transform.x, ty: transform.y };
  };
  const onMouseMove = e => {
    if (!dragging || !dragStart.current) return;
    setTransform(t => ({
      ...t,
      x: dragStart.current.tx + (e.clientX - dragStart.current.mx),
      y: dragStart.current.ty + (e.clientY - dragStart.current.my),
    }));
  };
  const onMouseUp = () => setDragging(false);

  const onTouchStart = e => {
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = { mx: t.clientX, my: t.clientY, tx: transform.x, ty: transform.y };
  };
  const onTouchMove = e => {
    if (!dragging || !dragStart.current) return;
    e.preventDefault();
    const t = e.touches[0];
    setTransform(tr => ({
      ...tr,
      x: dragStart.current.tx + (t.clientX - dragStart.current.mx),
      y: dragStart.current.ty + (t.clientY - dragStart.current.my),
    }));
  };

  function handleDownload() {
    const out = document.createElement("canvas");
    out.width = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    const ctx = out.getContext("2d");

    if (photoRef.current) {
      const img = photoRef.current;
      const s = transform.scale * zoom;
      const ratio = OUTPUT_SIZE / PREVIEW;
      ctx.drawImage(img,
        transform.x * ratio, transform.y * ratio,
        img.naturalWidth * s, img.naturalHeight * s
      );
    }
    if (frameRef.current) {
      ctx.drawImage(frameRef.current, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    }

    const dataUrl = out.toDataURL("image/png");

    if (isIOS()) {
      // iOS: inject fullscreen overlay — no window.open timing issues
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0,0,0,0.93);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 28px; box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;

      overlay.innerHTML = `
        <p style="
          color: #fff; font-size: 15px; font-weight: 600;
          margin: 0 0 6px; text-align: center; line-height: 1.5;
        ">Hold the image below</p>
        <p style="
          color: #8a8f9a; font-size: 13px;
          margin: 0 0 20px; text-align: center;
        ">then tap <strong style="color:#1877F2;">Save to Photos</strong></p>
        <img src="${dataUrl}" style="
          max-width: 100%; max-height: 55vh;
          border-radius: 14px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.6);
        "/>
        <button id="ios-close" style="
          margin-top: 24px;
          background: #2a2a36; color: #fff;
          border: none; border-radius: 10px;
          padding: 12px 40px; font-size: 15px;
          font-weight: 600; cursor: pointer;
          font-family: inherit;
          -webkit-tap-highlight-color: transparent;
        ">Close</button>
      `;

      overlay.querySelector("#ios-close").addEventListener("click", () => {
        document.body.removeChild(overlay);
      });

      document.body.appendChild(overlay);
    } else {
      const a = document.createElement("a");
      a.download = "framizz.png";
      a.href = dataUrl;
      a.click();
    }
  }

  const SunIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );

  const MoonIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );

  const UploadIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );

  const DownloadIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );

  const btnReset = {
    border: "none",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
    WebkitAppearance: "none",
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      height: "100vh",
      width: "100vw",
      overflow: "hidden",
      background: C.bg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      transition: "background 0.25s",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "0 16px",
      WebkitUserSelect: "none",
      userSelect: "none",
      WebkitTapHighlightColor: "transparent",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}>

        {/* Logo row */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <img
              src="/src/assets/logo.png"
              alt="Framizz"
              style={{
                width: 34, height: 34, borderRadius: "50%",
                objectFit: "cover",
                boxShadow: "0 2px 8px rgba(24,119,242,0.35)",
              }}
              onError={e => {
                // fallback to blue F circle if logo.png not found
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
            <div style={{
              display: "none",
              width: 34, height: 34, borderRadius: "50%",
              background: C.blue,
              alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(24,119,242,0.35)",
            }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 16, fontStyle: "italic" }}>F</span>
            </div>
            <span style={{ color: C.text, fontWeight: 800, fontSize: 22, letterSpacing: "-0.5px" }}>
              Framizz
            </span>
          </div>

          {/* Dark/light toggle pill */}
          <button
            onClick={() => setDark(d => !d)}
            onMouseEnter={() => setHoverToggle(true)}
            onMouseLeave={() => setHoverToggle(false)}
            style={{
              ...btnReset,
              display: "flex", alignItems: "center", gap: 7,
              background: hoverToggle ? (dark ? "#333344" : "#d4d6dc") : C.pill,
              borderRadius: 20,
              padding: "6px 12px 6px 6px",
              color: C.text,
              fontSize: 12,
              fontWeight: 600,
              transition: "background 0.18s, box-shadow 0.18s, transform 0.1s",
              boxShadow: hoverToggle
                ? "0 3px 12px rgba(0,0,0,0.13)"
                : "0 1px 4px rgba(0,0,0,0.07)",
              transform: hoverToggle ? "translateY(-1px)" : "none",
            }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: dark ? C.blue : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
              transition: "background 0.2s",
            }}>
              {dark ? <SunIcon /> : <MoonIcon />}
            </div>
            {dark ? "Light" : "Dark"}
          </button>
        </div>

        {/* Canvas */}
        <div style={{
          width: "100%",
          maxWidth: PREVIEW,
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${C.border}`,
          background: C.surface,
          boxShadow: dark
            ? "0 8px 40px rgba(0,0,0,0.55), 0 2px 10px rgba(0,0,0,0.3)"
            : "0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
          transition: "box-shadow 0.25s",
        }}>
          <canvas
            ref={canvasRef}
            width={PREVIEW}
            height={PREVIEW}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onMouseUp}
            style={{
              display: "block",
              width: "100%",
              aspectRatio: "1 / 1",
              cursor: dragging ? "grabbing" : photo ? "grab" : "default",
              touchAction: "none",
            }}
          />
        </div>

        {/* Choose photo */}
        <label
          onMouseEnter={() => setHoverChoose(true)}
          onMouseLeave={() => setHoverChoose(false)}
          style={{
            ...btnReset,
            width: "100%",
            padding: "12px 0",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: photo
              ? (hoverChoose ? (dark ? "#333344" : "#d4d6dc") : C.pill)
              : (hoverChoose ? C.blueDk : C.blue),
            color: photo ? C.text : "#fff",
            boxShadow: photo
              ? (hoverChoose ? "0 3px 12px rgba(0,0,0,0.11)" : "0 1px 4px rgba(0,0,0,0.06)")
              : (hoverChoose
                  ? "0 6px 20px rgba(24,119,242,0.45)"
                  : "0 2px 10px rgba(24,119,242,0.28)"),
            transform: hoverChoose ? "translateY(-1px)" : "none",
            transition: "background 0.15s, box-shadow 0.15s, transform 0.1s",
          }}>
          <UploadIcon />
          {photo ? "Change Photo" : "Choose Profile Picture"}
          <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        </label>

        {/* Zoom + Download — only after photo chosen */}
        {photo && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", width: "100%" }}>
            {/* Zoom slider */}
            <div style={{
              flex: 1,
              background: C.pill,
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke={C.muted} strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
              <input
                type="range" min="50" max="300"
                value={Math.round(zoom * 100)}
                onChange={e => setZoom(Number(e.target.value) / 100)}
                style={{ flex: 1, accentColor: C.blue, cursor: "pointer" }}
              />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke={C.muted} strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>

            {/* Save button */}
            <button
              onClick={handleDownload}
              onMouseEnter={() => setHoverSave(true)}
              onMouseLeave={() => setHoverSave(false)}
              style={{
                ...btnReset,
                background: hoverSave ? C.blueDk : C.blue,
                color: "#fff",
                borderRadius: 10,
                padding: "10px 20px",
                fontWeight: 700,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
                boxShadow: hoverSave
                  ? "0 6px 20px rgba(24,119,242,0.50)"
                  : "0 2px 10px rgba(24,119,242,0.28)",
                transform: hoverSave ? "translateY(-1px)" : "none",
                transition: "background 0.15s, box-shadow 0.15s, transform 0.1s",
              }}>
              <DownloadIcon />
              Save
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 4 }}>
          <p style={{ color: C.muted, fontSize: 11, margin: "0 0 2px", lineHeight: 1.7 }}>
            © 2026 Developed by{" "}
            <a
              href="https://lelius.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: C.blue,
                fontWeight: 600,
                textDecoration: "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Lelius Lawas
            </a>
          </p>
          <p style={{ color: C.muted, fontSize: 11, margin: 0, opacity: 0.6, lineHeight: 1.7 }}>
            College of Computing and Information Sciences
          </p>
        </div>

      </div>
    </div>
  );
}