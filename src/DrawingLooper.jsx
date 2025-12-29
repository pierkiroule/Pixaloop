import { useEffect, useRef, useState } from 'react';
import PropTypes from './propTypesStub';

const LOOP_DURATION = 5000;
const paletteColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#0f172a', '#ffffff'];
const toolsConfig = {
  watercolor: { softness: 0.85, jitter: 0.6 },
  ink: { softness: 0.45, jitter: 0.35 },
  dry: { softness: 0.2, jitter: 0.15 },
};

function DrawingLooper({ onLoopReady }) {
  const canvasRef = useRef(null);
  const textRef = useRef(null);
  const rafRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const strokesRef = useRef([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const exportModeRef = useRef('none');
  const cycleStartRef = useRef(Date.now());
  const dimsRef = useRef({ width: 720, height: 420 });

  const [tool, setTool] = useState('watercolor');
  const [blend, setBlend] = useState('source-over');
  const [color, setColor] = useState('#3b82f6');
  const [size, setSize] = useState(42);
  const [stamp, setStamp] = useState('🌀');
  const [loopProgress, setLoopProgress] = useState(0);
  const [loopDirection, setLoopDirection] = useState('ALLER');
  const [status, setStatus] = useState('Boucle prête');
  const [waitingExport, setWaitingExport] = useState(false);
  const [lastExportUrl, setLastExportUrl] = useState(null);

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = dimsRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#fdfdf9';
    ctx.fillRect(0, 0, width, height);
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    dimsRef.current = { width: Math.max(640, Math.floor(bounds.width)), height: Math.max(380, Math.floor(bounds.height)) };
    resetCanvas();
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const drawBrush = (x, y, stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const softness = toolsConfig[stroke.tool]?.softness ?? 0.6;
    const jitter = toolsConfig[stroke.tool]?.jitter ?? 0.25;
    const radius = stroke.size * (0.6 + Math.random() * 0.4);
    ctx.save();
    ctx.globalCompositeOperation = stroke.blend;
    const grad = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius * 0.9);
    grad.addColorStop(0, `${stroke.color}d8`);
    grad.addColorStop(0.5, `${stroke.color}99`);
    grad.addColorStop(1, `${stroke.color}00`);
    ctx.fillStyle = grad;
    ctx.globalAlpha = softness;
    ctx.beginPath();
    ctx.arc(
      x + (Math.random() - 0.5) * jitter * stroke.size,
      y + (Math.random() - 0.5) * jitter * stroke.size,
      radius,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  };

  const drawText = (x, y, stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = stroke.blend;
    ctx.fillStyle = stroke.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = stroke.tool === 'stamp' ? `${stroke.size}px serif` : `bold ${stroke.size}px Inter, sans-serif`;
    ctx.fillText(stroke.content, x, y);
    ctx.restore();
  };

  const registerStroke = (stroke) => {
    strokesRef.current.push({ ...stroke, triggered: true });
  };

  const handlePointerDown = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const now = Date.now();
    const time = now - cycleStartRef.current;

    if (tool === 'text' || tool === 'stamp') {
      const content = tool === 'text' ? textRef.current?.value || 'Squiggle' : stamp;
      const stroke = { x, y, color, size, tool, blend, content, t: time };
      drawText(x, y, stroke);
      registerStroke(stroke);
      return;
    }

    isDrawingRef.current = true;
    lastPointRef.current = { x, y };
    const stroke = { x, y, color, size, tool, blend, t: time };
    drawBrush(x, y, stroke);
    registerStroke(stroke);
    canvas.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const last = lastPointRef.current || { x, y };
    const dist = Math.hypot(x - last.x, y - last.y);
    if (dist < 2) return;

    const steps = Math.max(1, Math.floor(dist / 6));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const ix = last.x + (x - last.x) * t;
      const iy = last.y + (y - last.y) * t;
      const stroke = { x: ix, y: iy, color, size, tool, blend, t: Date.now() - cycleStartRef.current };
      drawBrush(ix, iy, stroke);
      registerStroke(stroke);
    }
    lastPointRef.current = { x, y };
  };

  const handlePointerUp = (event) => {
    if (event?.currentTarget?.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const startExport = () => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.captureStream || !window.MediaRecorder) {
      setStatus('Export non supporté par ce navigateur');
      exportModeRef.current = 'none';
      setWaitingExport(false);
      return;
    }

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 6000000,
    });
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setLastExportUrl(url);
      setStatus('Export ping-pong prêt');
      setWaitingExport(false);
      exportModeRef.current = 'none';
      onLoopReady?.(url, blob);
    };

    recorder.start();
    setStatus('Enregistrement 10s ping-pong');
    exportModeRef.current = 'recording';
    cycleStartRef.current = Date.now();
  };

  const requestExport = () => {
    if (exportModeRef.current !== 'none') return;
    setWaitingExport(true);
    setStatus('Attente du prochain cycle complet');
    exportModeRef.current = 'waiting';
  };

  const resetLoop = () => {
    strokesRef.current = [];
    setStatus('Boucle nettoyée');
    setLastExportUrl(null);
    resetCanvas();
  };

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      let elapsed = now - cycleStartRef.current;
      let virtualTime = elapsed;
      let direction = 'ALLER';

      if (exportModeRef.current === 'recording') {
        if (elapsed >= LOOP_DURATION * 2) {
          recorderRef.current?.stop();
        } else if (elapsed >= LOOP_DURATION) {
          virtualTime = LOOP_DURATION - (elapsed - LOOP_DURATION);
          direction = 'RETOUR';
        }
      } else if (elapsed >= LOOP_DURATION) {
        cycleStartRef.current = now;
        elapsed = 0;
        virtualTime = 0;
        strokesRef.current = strokesRef.current.map((stroke) => ({ ...stroke, triggered: false }));
        if (exportModeRef.current === 'waiting') {
          startExport();
        }
        resetCanvas();
      }

      strokesRef.current.forEach((stroke) => {
        if (Math.abs(stroke.t - virtualTime) < 70) {
          if (!stroke.triggered) {
            if (stroke.tool === 'text' || stroke.tool === 'stamp') {
              drawText(stroke.x, stroke.y, stroke);
            } else {
              drawBrush(stroke.x, stroke.y, stroke);
            }
            stroke.triggered = true;
          }
        } else if (Math.abs(stroke.t - virtualTime) > 160) {
          stroke.triggered = false;
        }
      });

      setLoopDirection(direction);
      setLoopProgress(((elapsed % LOOP_DURATION) / LOOP_DURATION) * 100);
      rafRef.current = requestAnimationFrame(animate);
    };

    resetCanvas();
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
    };
  }, []);

  return (
    <div className="looper-shell">
      <div className="looper-toolbar">
        <div className="looper-meta">
          <div className="loop-ring">
            <svg viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="26" className="loop-ring-bg" />
              <circle cx="30" cy="30" r="26" className="loop-ring-fg" style={{ strokeDashoffset: 163 - (163 * loopProgress) / 100 }} />
            </svg>
            <div className={`loop-dot ${exportModeRef.current === 'recording' ? 'active' : ''}`} />
          </div>
          <div>
            <p className="chip">Drawing Looper</p>
            <h4 className="looper-title">Ping-Pong 5s</h4>
            <p className="looper-sub">{loopDirection} • {status}</p>
          </div>
        </div>
        <div className="looper-actions">
          <button type="button" className="ghost-button" onClick={resetLoop}>
            Reset
          </button>
          <button type="button" className="primary-control" onClick={requestExport} disabled={exportModeRef.current !== 'none' && !waitingExport}>
            Export ping-pong
          </button>
        </div>
      </div>

      <div className="looper-controls">
        <div className="tool-grid">
          {['watercolor', 'ink', 'dry', 'text', 'stamp'].map((key) => (
            <button key={key} type="button" className={`tool-chip ${tool === key ? 'active' : ''}`} onClick={() => setTool(key)}>
              {key === 'watercolor' && 'Aquarelle'}
              {key === 'ink' && 'Encre'}
              {key === 'dry' && 'Sec'}
              {key === 'text' && 'Texte'}
              {key === 'stamp' && 'Emoji'}
            </button>
          ))}
        </div>
        {tool === 'text' && <input ref={textRef} type="text" className="looper-input" placeholder="Votre message" />}
        {tool === 'stamp' && (
          <div className="stamp-row">
            {['🌀', '🌌', '✨', '💠', '🎆'].map((s) => (
              <button key={s} type="button" className={`stamp-btn ${stamp === s ? 'active' : ''}`} onClick={() => setStamp(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="blend-row">
          <span>Mélange</span>
          <div className="blend-switch">
            {['source-over', 'multiply', 'overlay'].map((mode) => (
              <button key={mode} type="button" className={`pill ${blend === mode ? 'active' : ''}`} onClick={() => setBlend(mode)}>
                {mode === 'source-over' ? 'Normal' : mode}
              </button>
            ))}
          </div>
        </div>

        <div className="slider-field">
          <label htmlFor="looper-size">
            Taille
            <span>{Math.round(size)} px</span>
          </label>
          <input id="looper-size" type="range" min="12" max="140" value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </div>

        <div className="palette-row">
          {paletteColors.map((c) => (
            <button
              key={c}
              type="button"
              style={{ backgroundColor: c }}
              className={`color-chip ${color === c ? 'active' : ''}`}
              onClick={() => setColor(c)}
              aria-label={`Couleur ${c}`}
            />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="looper-color" aria-label="Couleur personnalisée" />
        </div>
      </div>

      <div className="looper-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="looper-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {waitingExport && <div className="looper-wait">Capture au prochain cycle…</div>}
      </div>

      {lastExportUrl && (
        <div className="looper-preview">
          <video src={lastExportUrl} controls loop muted playsInline />
          <div>
            <p className="chip">Dernier export</p>
            <p className="muted">Boucle 10s prête pour la skybox ou le panneau VR.</p>
            <a className="pill download-pill" href={lastExportUrl} download>
              Télécharger .webm
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default DrawingLooper;

DrawingLooper.propTypes = {
  onLoopReady: PropTypes.func,
};
