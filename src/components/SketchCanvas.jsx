import { useEffect, useRef, useState } from 'react';
import PropTypes from '../propTypesStub';

const palette = ['#111827', '#0ea5e9', '#f43f5e', '#f59e0b', '#22c55e', '#a855f7', '#ffffff'];

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

function SketchCanvas({ onChange }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const stampRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

  const [brush, setBrush] = useState('pencil');
  const [color, setColor] = useState('#111827');
  const [size, setSize] = useState(12);
  const [textValue, setTextValue] = useState('Hello Horizon');
  const [stampLabel, setStampLabel] = useState('Aucun tampon');
  const [dimensions, setDimensions] = useState({ w: 900, h: 900 });

  const emitImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange?.(canvas.toDataURL('image/png'));
  };

  const pushHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    historyRef.current = [...historyRef.current.slice(-18), ctx.getImageData(0, 0, canvas.width, canvas.height)];
    redoRef.current = [];
  };

  const restoreState = (imageData) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;
    canvas.getContext('2d').putImageData(imageData, 0, 0);
    emitImage();
  };

  const handleUndo = () => {
    const stack = historyRef.current;
    if (!stack.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    redoRef.current = [current, ...redoRef.current].slice(0, 20);
    const previous = stack.pop();
    restoreState(previous);
  };

  const handleRedo = () => {
    if (!redoRef.current.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const next = redoRef.current.shift();
    historyRef.current = [...historyRef.current, ctx.getImageData(0, 0, canvas.width, canvas.height)].slice(-20);
    restoreState(next);
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const side = Math.min(1024, Math.max(640, Math.floor(wrapper.clientWidth)));
    canvas.width = side;
    canvas.height = side;
    setDimensions({ w: side, h: side });
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fdfdf9';
    ctx.fillRect(0, 0, side, side);
    emitImage();
  };

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, []);

  const stampFromFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      stampRef.current = img;
      setStampLabel(file.name);
    };
    img.src = url;
  };

  const getPoint = (evt) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((evt.clientX - rect.left) / rect.width) * canvas.width,
      y: ((evt.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const drawStroke = (from, to) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (brush === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = clamp(size * 1.4, 8, 120);
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = brush === 'pencil' ? clamp(size * 0.6, 2, 40) : clamp(size * 1.2, 4, 140);
      ctx.globalAlpha = brush === 'pencil' ? 0.9 : 0.75;
    }

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  const handlePointerDown = (evt) => {
    const point = getPoint(evt);
    pushHistory();
    if (brush === 'fill') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      emitImage();
      return;
    }
    if (brush === 'text') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.max(18, size * 2)}px Inter, sans-serif`;
      ctx.fillText(textValue, point.x, point.y);
      emitImage();
      return;
    }
    if (brush === 'stamp') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const stampImg = stampRef.current;
      const stampSize = clamp(size * 8, 60, canvas.width * 0.9);
      if (stampImg) {
        const ratio = stampImg.width / stampImg.height;
        const w = ratio >= 1 ? stampSize : stampSize * ratio;
        const h = ratio >= 1 ? stampSize / ratio : stampSize;
        ctx.drawImage(stampImg, point.x - w / 2, point.y - h / 2, w, h);
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, stampSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      emitImage();
      return;
    }
    isDrawingRef.current = true;
    lastPointRef.current = point;
  };

  const handlePointerMove = (evt) => {
    if (!isDrawingRef.current) return;
    const point = getPoint(evt);
    const last = lastPointRef.current || point;
    drawStroke(last, point);
    lastPointRef.current = point;
  };

  const handlePointerUp = () => {
    if (isDrawingRef.current) {
      emitImage();
    }
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    pushHistory();
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fdfdf9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    emitImage();
  };

  return (
    <div className="sketch-shell" ref={wrapperRef}>
      <div className="sketch-toolbar">
        <div className="tool-group">
          {[
            { id: 'pencil', label: 'Crayon' },
            { id: 'brush', label: 'Pinceau' },
            { id: 'fill', label: 'Remplir' },
            { id: 'stamp', label: 'Tampon' },
            { id: 'eraser', label: 'Gomme' },
            { id: 'text', label: 'Texte' },
          ].map((item) => (
            <button key={item.id} type="button" className={`pill ${brush === item.id ? 'active' : ''}`} onClick={() => setBrush(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="tool-group">
          <button type="button" className="ghost-button" onClick={handleUndo}>
            Undo
          </button>
          <button type="button" className="ghost-button" onClick={handleRedo}>
            Redo
          </button>
          <button type="button" className="ghost-button" onClick={clearAll}>
            Nouveau canevas
          </button>
        </div>
      </div>

      <div className="sketch-controls">
        <div className="palette-row">
          {palette.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-chip ${color === c ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
              aria-label={`Couleur ${c}`}
            />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="looper-color" aria-label="Couleur personnalisée" />
        </div>
        <div className="slider-field">
          <label htmlFor="sketch-size">
            Taille / Opacité
            <span>{Math.round(size)} px</span>
          </label>
          <input
            id="sketch-size"
            type="range"
            min="4"
            max="120"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </div>
        {brush === 'text' && (
          <input
            type="text"
            className="looper-input"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Texte à placer"
          />
        )}
        {brush === 'stamp' && (
          <div className="stamp-upload">
            <label className="pill upload-pill">
              Importer une image tampon
              <input
                type="file"
                accept="image/*"
                onChange={(e) => stampFromFile(e.target.files?.[0])}
              />
            </label>
            <p className="muted subtle-text">{stampLabel}</p>
          </div>
        )}
      </div>

      <div className="sketch-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="sketch-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        <div className="sketch-meta">
          <span>{dimensions.w} x {dimensions.h}</span>
          <span>Zone circulaire</span>
        </div>
      </div>
    </div>
  );
}

SketchCanvas.propTypes = {
  onChange: PropTypes.func,
};

export default SketchCanvas;
