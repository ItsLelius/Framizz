import { useState, useRef, useEffect } from "react";

// ── Swap this path to change the frame ──────────────────
const FRAME_SRC = "/src/assets/frame.png";
const OUTPUT_SIZE = 1080;
const PREVIEW = 480;
// ────────────────────────────────────────────────────────

export default function App() {
  const [dark, setDark]       = useState(false);
  const [photo, setPhoto]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const canvasRef  = useRef(null);
  const frameRef   = useRef(null);
  const photoRef   = useRef(null);
  const dragStart  = useRef(null);

  const bg      = dark ? "#18191a" : "#f0f2f5";
  const surface = dark ? "#242526" : "#ffffff";
  const border  = dark ? "#3a3b3c" : "#dce1e7";
  const text    = dark ? "#e4e6eb" : "#1c1e21";
  const muted   = dark ? "#b0b3b8" : "#65676b";
  const blue    = "#1877F2";
  const blueDk  = "#166fe5";

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = FRAME_SRC;
    img.onload = () => { frameRef.current = img; draw(); };
  }, []);

  useEffect(() => { draw(); }, [transform, photo, dark]);

  function draw() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, PREVIEW, PREVIEW);

    const sq = 20;
    for (let r = 0; r < PREVIEW / sq; r++) {
      for (let col = 0; col < PREVIEW / sq; col++) {
        ctx.fillStyle = (r + col) % 2 === 0
          ? (dark ? "#2a2a2a" : "#e8e8e8")
          : (dark ? "#222"    : "#d8d8d8");
        ctx.fillRect(col * sq, r * sq, sq, sq);
      }
    }

    if (photoRef.current) {
      const img = photoRef.current;
      const s = transform.scale;
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
      const previewScale = scale * (PREVIEW / OUTPUT_SIZE);
      const x = (PREVIEW - img.naturalWidth * previewScale) / 2;
      const y = (PREVIEW - img.naturalHeight * previewScale) / 2;
      setTransform({ x, y, scale });
    };
    img.src = url;
    setPhoto(url);
  }

  function onMouseDown(e) {
    setDragging(true);
    dragStart.current = {
      mx: e.clientX, my: e.clientY,
      tx: transform.x, ty: transform.y
    };
  }
  function onMouseMove(e) {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setTransform(t => ({
      ...t,
      x: dragStart.current.tx + dx,
      y: dragStart.current.ty + dy
    }));
  }
  function onMouseUp() { setDragging(false); }

  function onTouchStart(e) {
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = {
      mx: t.clientX, my: t.clientY,
      tx: transform.x, ty: transform.y
    };
  }
  function onTouchMove(e) {
    if (!dragging || !dragStart.current) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - dragStart.current.mx;
    const dy = t.clientY - dragStart.current.my;
    setTransform(t => ({
      ...t,
      x: dragStart.current.tx + dx,
      y: dragStart.current.ty + dy
    }));
  }

  function onWheel(e) {
    e.preventDefault();
    const d = e.deltaY > 0 ? 0.95 : 1.05;
    setTransform(t => ({ ...t, scale: Math.max(0.2, t.scale * d) }));
  }

  function handleDownload() {
    const out = document.createElement("canvas");
    out.width = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    const ctx = out.getContext("2d");
    if (photoRef.current) {
      const img = photoRef.current;
      const ratio = OUTPUT_SIZE / PREVIEW;
      ctx.drawImage(img,
        transform.x * ratio,
        transform.y * ratio,
        img.naturalWidth * transform.scale,
        img.naturalHeight * transform.scale
      );
    }
    if (frameRef.current) {
      ctx.drawImage(frameRef.current, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    }
    const a = document.createElement("a");
    a.download = "framizz-output.png";
    a.href = out.toDataURL("image/png");
    a.click();
  }

  const MoonIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
  const SunIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
  const PhotoIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
      stroke={muted} strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );

  const canvasSize = Math.min(480, typeof window !== "undefined"
    ? window.innerWidth - 48 : 480);

  return (
    <div style={{
      minHeight: "100vh",
      background: bg,
      transition: "background 0.2s",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>

      {/* Nav */}
      <nav style={{
        background: surface,
        borderBottom: `1px solid ${border}`,
        padding: "0 16px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
        boxShadow: dark ? "none" : "0 1px 3px rgba(0,0,0,0.08)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: blue, display: "flex",
            alignItems: "center", justifyContent: "center"
          }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>F</span>
          </div>
          <span style={{ color: text, fontWeight: 800, fontSize: 20, letterSpacing: "-0.3px" }}>
            Framizz
          </span>
        </div>

        <button onClick={() => setDark(d => !d)} style={{
          background: dark ? "#3a3b3c" : "#e4e6eb",
          border: "none",
          borderRadius: "50%",
          width: 36, height: 36,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: text, cursor: "pointer"
        }}>
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </nav>

      {/* Main */}
      <main style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: "32px 16px 48px"
      }}>

        {/* Canvas card */}
        <div style={{
          background: surface,
          borderRadius: 16,
          border: `1px solid ${border}`,
          overflow: "hidden",
          marginBottom: 16
        }}>
          <div style={{
            display: "flex",
            justifyContent: "center",
            padding: photo ? 0 : "24px 24px 0"
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
              onWheel={onWheel}
              style={{
                display: "block",
                width: "100%",
                maxWidth: PREVIEW,
                aspectRatio: "1",
                cursor: dragging ? "grabbing" : photo ? "grab" : "default",
                borderRadius: photo ? 0 : 12,
                border: photo ? "none" : `2px dashed ${border}`
              }}
            />
          </div>

          {/* Upload area when no photo */}
          {!photo && (
            <div style={{
              padding: "20px 24px 28px",
              textAlign: "center"
            }}>
              <PhotoIcon />
              <p style={{ color: muted, fontSize: 14, margin: "12px 0 20px" }}>
                Choose a profile photo to get started
              </p>
              <label style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: blue,
                color: "#fff",
                padding: "10px 24px",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer"
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Choose Profile Picture
                <input
                  type="file" accept="image/*"
                  onChange={handleFile}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          )}

          {/* Controls after photo chosen */}
          {photo && (
            <div style={{
              padding: "14px 16px",
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              borderTop: `1px solid ${border}`,
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <p style={{ color: muted, fontSize: 12, margin: 0 }}>
                Drag to reposition · Scroll to zoom
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{
                  background: dark ? "#3a3b3c" : "#e4e6eb",
                  color: text,
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer"
                }}>
                  Change photo
                  <input type="file" accept="image/*"
                    onChange={handleFile} style={{ display: "none" }} />
                </label>
                <button onClick={handleDownload} style={{
                  background: blue,
                  color: "#fff",
                  border: "none",
                  padding: "8px 18px",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download 1080×1080
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer credit */}
        <div style={{
          background: surface,
          border: `1px solid ${border}`,
          borderRadius: 12,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: blue,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 15, color: "#fff", flexShrink: 0
          }}>LL</div>
          <div>
            <p style={{ color: text, fontSize: 14, fontWeight: 600, margin: 0 }}>
              Lelius Lawas
            </p>
            <p style={{ color: blue, fontSize: 13, margin: 0 }}>
              ItsLelius
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}