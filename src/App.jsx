import { useState, useRef, useEffect, useCallback } from "react";

// ── Swap this to change the frame ─────────────────────────────
const FRAME_SRC = "/src/assets/frame.png";
const OUTPUT_SIZE = 1080;
const PREVIEW = 400;
// ─────────────────────────────────────────────────────────────

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function App() {
  const [dark, setDark]         = useState(false);
  const [photo, setPhoto]       = useState(null);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom]         = useState(1);
  const [iosMsg, setIosMsg]     = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  const canvasRef  = useRef(null);
  const frameRef   = useRef(null);
  const photoRef   = useRef(null);
  const dragStart  = useRef(null);
  const fileRef    = useRef(null);

  const C = {
    bg:      dark ? "#0f0f13" : "#f0f2f5",
    surface: dark ? "#1c1c24" : "#ffffff",
    border:  dark ? "#2a2a36" : "#dce1e7",
    text:    dark ? "#e4e6eb" : "#1c1e21",
    muted:   dark ? "#8a8f9a" : "#65676b",
    blue:    "#1877F2",
    card:    dark ? "#16161e" : "#f7f8fa",
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
      const scale = Math.max(
        OUTPUT_SIZE / img.naturalWidth,
        OUTPUT_SIZE / img.naturalHeight
      );
      const pr = PREVIEW / OUTPUT_SIZE;
      const x = (PREVIEW - img.naturalWidth * scale * pr) / 2;
      const y = (PREVIEW - img.naturalHeight * scale * pr) / 2;
      setTransform({ x, y, scale });
      setZoom(1);
    };
    img.src = url;
    setPhoto(url);
  }

  const onMouseDown = (e) => {
    setDragging(true);
    dragStart.current = {
      mx: e.clientX, my: e.clientY,
      tx: transform.x, ty: transform.y
    };
  };
  const onMouseMove = (e) => {
    if (!dragging || !dragStart.current) return;
    setTransform(t => ({
      ...t,
      x: dragStart.current.tx + (e.clientX - dragStart.current.mx),
      y: dragStart.current.ty + (e.clientY - dragStart.current.my)
    }));
  };
  const onMouseUp = () => setDragging(false);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = {
      mx: t.clientX, my: t.clientY,
      tx: transform.x, ty: transform.y
    };
  };
  const onTouchMove = (e) => {
    if (!dragging || !dragStart.current) return;
    e.preventDefault();
    const t = e.touches[0];
    setTransform(tr => ({
      ...tr,
      x: dragStart.current.tx + (t.clientX - dragStart.current.mx),
      y: dragStart.current.ty + (t.clientY - dragStart.current.my)
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
        transform.x * ratio,
        transform.y * ratio,
        img.naturalWidth * s,
        img.naturalHeight * s
      );
    }
    if (frameRef.current) {
      ctx.drawImage(frameRef.current, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    }

    if (isIOS()) {
      // iOS: open in new tab so user can long-press Save
      const dataUrl = out.toDataURL("image/png");
      const win = window.open();
      win.document.write(
        '<style>body{margin:0;background:#000;display:flex;' +
        'align-items:center;justify-content:center;min-height:100vh}</style>' +
        '<img src="' + dataUrl + '" style="max-width:100%;max-height:100vh"/>'
      );
      setIosMsg(true);
      setTimeout(() => setIosMsg(false), 5000);
    } else {
      const a = document.createElement("a");
      a.download = "framizz.png";
      a.href = out.toDataURL("image/png");
      a.click();
    }
  }

  const ToggleIcon = () => dark ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
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
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );

  const UploadIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );

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
      boxSizing: "border-box",
    }}>

      {/* Inner container */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}>

        {/* Top row: logo left, toggle right */}
        <div style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: C.blue,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 16, fontStyle: "italic" }}>F</span>
            </div>
            <span style={{ color: C.text, fontWeight: 800, fontSize: 22, letterSpacing: "-0.5px" }}>
              Framizz
            </span>
          </div>

          {/* Toggle pill */}
          <button onClick={() => setDark(d => !d)} style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: dark ? "#2a2a36" : "#e4e6eb",
            border: "none",
            borderRadius: 20,
            padding: "6px 12px 6px 8px",
            cursor: "pointer",
            color: C.text,
            fontSize: 12,
            fontWeight: 600,
            transition: "background 0.2s",
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: dark ? C.blue : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
            }}>
              <ToggleIcon />
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
            ? "0 4px 24px rgba(0,0,0,0.5)"
            : "0 2px 16px rgba(0,0,0,0.08)"
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

        {/* iOS message */}
        {iosMsg && (
          <div style={{
            background: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            color: "#856404",
            width: "100%",
            boxSizing: "border-box",
            textAlign: "center",
          }}>
            Image opened in new tab — long press it to Save to Photos
          </div>
        )}

        {/* Controls */}
        <div style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}>

          {/* Choose photo */}
          <label style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: photo ? (dark ? "#2a2a36" : "#e4e6eb") : C.blue,
            color: photo ? C.text : "#fff",
            padding: "11px 0",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 15,
            cursor: "pointer",
            transition: "background 0.2s",
          }}>
            <UploadIcon />
            {photo ? "Change Photo" : "Choose Profile Picture"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              style={{ display: "none" }}
            />
          </label>

          {/* Zoom + Download — only after photo chosen */}
          {photo && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* Zoom slider */}
              <div style={{
                flex: 1,
                background: dark ? "#2a2a36" : "#e4e6eb",
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke={C.muted} strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  <line x1="11" y1="8" x2="11" y2="14"/>
                  <line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
                <input
                  type="range"
                  min="50" max="300" value={Math.round(zoom * 100)}
                  onChange={e => setZoom(Number(e.target.value) / 100)}
                  style={{
                    flex: 1, accentColor: C.blue,
                    height: 4, cursor: "pointer"
                  }}
                />
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke={C.muted} strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>

              {/* Download */}
              <button onClick={handleDownload} style={{
                background: C.blue,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 18px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Save
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p style={{
          color: C.muted,
          fontSize: 11,
          margin: 0,
          textAlign: "center",
          letterSpacing: "0.1px",
        }}>
          © 2026 Designed and Developed by{" "}
          <span style={{ color: C.blue, fontWeight: 600 }}>Lelius Lawas</span>
        </p>

      </div>
    </div>
  );
}