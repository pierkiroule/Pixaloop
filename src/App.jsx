import { Anchor, Camera, Cloud, Droplets, Globe, Image as ImageIcon, Monitor, Pause, Play, Sparkles, Stars, Trash2, Wind, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';

const CANVAS_SIZE = 1024;
const MASTER_WIDTH = 3840;
const MASTER_HEIGHT = 1920;

const FILTERS = [
  { id: 0, label: 'Original', icon: 'image' },
  { id: 1, label: 'Tricolore', icon: 'zap' },
  { id: 2, label: 'Aurore', icon: 'cloud' },
  { id: 3, label: 'Aquarelle', icon: 'droplets' },
  { id: 4, label: 'Prisme', icon: 'stars' },
  { id: 5, label: 'Nébuleuse', icon: 'sparkles' },
  { id: 6, label: 'Verre Liquide', icon: 'droplets' },
  { id: 7, label: 'Ghost IR', icon: 'monitor' },
  { id: 8, label: 'Kaleido', icon: 'globe' },
  { id: 9, label: 'Monolithe', icon: 'anchor' },
  { id: 10, label: 'Electric Silk', icon: 'wind' },
];

const FX_PARTICLES = [
  {
    id: 'aurora',
    name: 'Aurora Veil',
    config: 'preset: dust; particleCount: 2400; size: 1.2; color: #22d3ee, #6366f1; opacity: 0.42; velocityValue: 0 0 -0.3; velocitySpread: 0.16 0.04 0.16; positionSpread: 10 2 10',
    position: '0 2.2 -4',
    rotation: '0 20 0',
  },
  {
    id: 'embers',
    name: 'Solar Embers',
    config: 'preset: default; particleCount: 1800; size: 1.1; color: #f97316, #fde68a; opacity: 0.6; direction: -1; velocityValue: 0 1.4 0; velocitySpread: 0.3 0.6 0.3; positionSpread: 4 0.5 4',
    position: '0 1 -1.8',
    rotation: '0 0 0',
  },
  {
    id: 'stardust',
    name: 'Stardust Wave',
    config: 'preset: stars; particleCount: 4200; size: 0.9; color: #a855f7, #c084fc, #67e8f9; opacity: 0.55; velocityValue: 0 0 -0.6; velocitySpread: 0.25 0.1 0.25; positionSpread: 14 5 14',
    position: '0 3 -6',
    rotation: '0 12 0',
  },
  {
    id: 'ion',
    name: 'Ion Trails',
    config: 'preset: fountain; particleCount: 2600; size: 1.3; color: #0ea5e9, #22c55e; opacity: 0.55; direction: -1; velocityValue: 0 1.6 0; velocitySpread: 0.1 0.2 0.1; accelerationValue: 0 -0.3 0; accelerationSpread: 0.05 0.1 0.05',
    position: '-1.5 1.4 -2.4',
    rotation: '0 -10 0',
  },
  {
    id: 'spiral',
    name: 'Nebula Spiral',
    config: 'preset: snow; particleCount: 3400; size: 1.15; color: #f472b6, #fca5a5, #fde047; opacity: 0.48; velocityValue: 0 0.2 -0.35; velocitySpread: 0.2 0.2 0.2; positionSpread: 8 3 8',
    position: '1.6 2.4 -3',
    rotation: '0 16 0',
  },
];

const ICONS = {
  image: ImageIcon,
  zap: Zap,
  cloud: Cloud,
  droplets: Droplets,
  stars: Stars,
  sparkles: Sparkles,
  monitor: Monitor,
  globe: Globe,
  anchor: Anchor,
  wind: Wind,
};

const vertexShader = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    vUv.y = 1.0 - vUv.y;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tSource;
  uniform sampler2D tFlow;
  uniform float time;
  uniform float active;
  uniform float duration;
  uniform int mode;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec4 flowData = texture2D(tFlow, vUv);
    vec2 flowDir = (flowData.rg - 0.5) * 2.0;
    float anchor = flowData.b;

    float t1 = fract(time / duration);
    float t2 = fract(time / duration + 0.5);
    float force = 0.25 * active * pow(1.0 - anchor, 4.0);

    vec2 uv1 = vUv - flowDir * t1 * force;
    vec2 uv2 = vUv - flowDir * t2 * force;

    vec4 col1 = texture2D(tSource, uv1);
    vec4 col2 = texture2D(tSource, uv2);

    float blend = smoothstep(0.0, 1.0, abs(t1 - 0.5) * 2.0);
    vec4 finalCol = mix(col1, col2, blend);

    float luma = dot(finalCol.rgb, vec3(0.299, 0.587, 0.114));

    if (mode == 1) {
      vec3 bg = vec3(0.02, 0.03, 0.12);
      vec3 mid = vec3(0.0, 1.0, 0.95);
      vec3 high = vec3(1.0, 0.0, 0.6);
      finalCol.rgb = mix(mix(bg, mid, smoothstep(0.0, 0.45, luma)), high, smoothstep(0.45, 1.0, luma));
    } else if (mode == 2) {
      float hue = fract(luma * 0.4 + time * 0.08 + length(flowDir) * active);
      finalCol.rgb = mix(finalCol.rgb, hsv2rgb(vec3(hue, 0.7, 0.9)), 0.5 * active * length(flowDir));
    } else if (mode == 3) {
      vec3 paper = vec3(0.98, 0.96, 0.92);
      finalCol.rgb = mix(paper, finalCol.rgb * 1.3, smoothstep(0.05, 0.85, luma));
    } else if (mode == 4) {
      float shift = 0.015 * active * luma;
      finalCol.r = mix(texture2D(tSource, uv1 + vec2(shift, 0.0)).r, texture2D(tSource, uv2 + vec2(shift, 0.0)).r, blend);
      finalCol.b = mix(texture2D(tSource, uv1 - vec2(shift, 0.0)).b, texture2D(tSource, uv2 - vec2(shift, 0.0)).b, blend);
      float star = pow(sin(vUv.x * 400.0 + time) * cos(vUv.y * 400.0 - time), 30.0);
      finalCol.rgb += star * 0.4 * luma;
    } else if (mode == 5) { // Nebula Pulse
      float swirl = sin(3.1415 * (vUv.x + vUv.y) + time * 0.8) * 0.01 * active;
      vec2 uvSwirl = vUv + flowDir * 0.02 * active + vec2(swirl, -swirl);
      vec3 neb = texture2D(tSource, uvSwirl).rgb;
      float glow = smoothstep(0.5, 1.0, luma) * 0.6;
      vec3 tint = hsv2rgb(vec3(fract(time * 0.05 + luma * 0.3), 0.8, 1.2));
      finalCol.rgb = mix(neb, tint, 0.35 * active) + glow * tint * 0.25;
    } else if (mode == 6) { // Liquid Glass
      float ripple = sin((vUv.x + vUv.y + time * 0.9) * 40.0) * 0.002 * active;
      vec2 rUv = vUv + flowDir * 0.03 * active + ripple;
      vec3 base = texture2D(tSource, rUv).rgb;
      vec3 chroma;
      chroma.r = texture2D(tSource, rUv + vec2(0.003, 0.0)).r;
      chroma.g = base.g;
      chroma.b = texture2D(tSource, rUv - vec2(0.003, 0.0)).b;
      finalCol.rgb = mix(base, chroma, 0.6) * 1.05;
    } else if (mode == 7) { // Ghost IR
      float heat = pow(luma, 0.7);
      vec3 ir = vec3(heat * 1.2, smoothstep(0.2, 0.8, heat), 1.0 - heat);
      vec3 halo = vec3(0.6, 0.8, 1.4) * smoothstep(0.0, 0.3, 1.0 - luma) * 0.4;
      finalCol.rgb = mix(finalCol.rgb, ir + halo, 0.8);
    } else if (mode == 8) { // Kaleido Prism
      vec2 center = vec2(0.5);
      vec2 p = vUv - center;
      float angle = atan(p.y, p.x);
      float radius = length(p);
      float folds = 6.0;
      angle = mod(angle, 6.28318 / folds);
      vec2 kUv = vec2(cos(angle), sin(angle)) * radius + center;
      vec3 kCol = texture2D(tSource, kUv).rgb;
      float pulse = 0.03 * sin(time * 1.1 + luma * 4.0) * active;
      vec3 prismatic = vec3(
        texture2D(tSource, kUv + vec2(pulse, 0.0)).r,
        texture2D(tSource, kUv).g,
        texture2D(tSource, kUv - vec2(pulse, 0.0)).b
      );
      finalCol.rgb = mix(kCol, prismatic, 0.7);
    } else if (mode == 9) { // Void Monolith
      float contrast = smoothstep(0.25, 0.85, luma);
      vec3 dark = vec3(0.04, 0.05, 0.08);
      vec3 light = vec3(1.2) * contrast;
      float cut = smoothstep(0.45, 0.55, vUv.y + flowDir.y * 0.1);
      finalCol.rgb = mix(dark, light, cut);
      float tilt = smoothstep(0.3, 0.7, vUv.x + sin(time * 0.2) * 0.02);
      finalCol.rgb = mix(finalCol.rgb, light * 1.2, tilt * 0.2);
    } else if (mode == 10) { // Electric Silk
      float streak = sin(vUv.y * 120.0 + time * 2.0 + flowDir.x * 20.0) * 0.5 + 0.5;
      float streak2 = cos(vUv.x * 150.0 - time * 1.6 + flowDir.y * 24.0) * 0.5 + 0.5;
      float energy = pow(streak * streak2, 2.0) * active;
      vec3 trail = hsv2rgb(vec3(fract(time * 0.1 + luma * 0.6), 0.9, 1.2));
      finalCol.rgb = mix(finalCol.rgb * 0.9, finalCol.rgb + trail * energy, 0.7);
    }

    gl_FragColor = finalCol;
  }
`;

function App() {
  const [imageUrl, setImageUrl] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [tool, setTool] = useState('flow');
  const [filterType, setFilterType] = useState(0);
  const [paths, setPaths] = useState([]);
  const [anchors, setAnchors] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [recordType, setRecordType] = useState('2D');
  const [vrEnabled, setVrEnabled] = useState(false);
  const [fxEnabled, setFxEnabled] = useState(() => Object.fromEntries(FX_PARTICLES.map((fx) => [fx.id, true])));

  const canvasRef = useRef(null);
  const masterCanvasRef = useRef(null);
  const flowCanvasRef = useRef(null);
  const imgRef = useRef(null);
  const skyboxVideoRef = useRef(null);
  const panelVideoRef = useRef(null);
  const aframeReady = useRef(null);

  const engine = useRef({
    gl: null,
    program: null,
    sourceTex: null,
    flowTex: null,
    startTime: Date.now(),
    duration: 5,
    frameId: null,
  });

  const setupWebGL = useCallback((imageElement) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageElement) return;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: true });
    if (!gl) return;

    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertexShader));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fragmentShader));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const sourceTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageElement);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const srcLocation = gl.getUniformLocation(program, 'tSource');
    const flowLocation = gl.getUniformLocation(program, 'tFlow');
    gl.uniform1i(srcLocation, 0);
    gl.uniform1i(flowLocation, 1);

    engine.current.gl = gl;
    engine.current.program = program;
    engine.current.sourceTex = sourceTexture;
    engine.current.startTime = Date.now();
  }, []);

  const updateFlowMap = useCallback(() => {
    const gl = engine.current.gl;
    const flowCanvas = flowCanvasRef.current;
    if (!gl || !flowCanvas) return;

    const ctx = flowCanvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = 'rgb(127, 127, 0)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    paths.forEach((path) => {
      if (path.length < 2) return;
      for (let i = 0; i < path.length - 1; i += 1) {
        const p1 = path[i];
        const p2 = path[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const r = Math.floor(((dx / len + 1) * 127.5));
        const g = Math.floor(((dy / len + 1) * 127.5));
        const radius = 130;
        const grad = ctx.createRadialGradient(
          p1.x * CANVAS_SIZE,
          p1.y * CANVAS_SIZE,
          0,
          p1.x * CANVAS_SIZE,
          p1.y * CANVAS_SIZE,
          radius,
        );
        grad.addColorStop(0, `rgba(${r},${g},0,0.3)`);
        grad.addColorStop(1, `rgba(${r},${g},0,0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p1.x * CANVAS_SIZE, p1.y * CANVAS_SIZE, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    anchors.forEach((anchor) => {
      const radius = 90;
      const grad = ctx.createRadialGradient(
        anchor.x * CANVAS_SIZE,
        anchor.y * CANVAS_SIZE,
        0,
        anchor.x * CANVAS_SIZE,
        anchor.y * CANVAS_SIZE,
        radius,
      );
      grad.addColorStop(0, 'rgba(0,0,255,1)');
      grad.addColorStop(1, 'rgba(0,0,255,0)');
      ctx.fillStyle = grad;
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(anchor.x * CANVAS_SIZE, anchor.y * CANVAS_SIZE, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    });

    if (engine.current.flowTex) {
      gl.deleteTexture(engine.current.flowTex);
    }

    const flowTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, flowTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, flowCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    engine.current.flowTex = flowTexture;
  }, [anchors, paths]);

  useEffect(() => {
    const renderLoop = () => {
      const { gl, program, sourceTex, flowTex, duration } = engine.current;
      if (gl && program && sourceTex && flowTex && masterCanvasRef.current) {
        const time = (Date.now() - engine.current.startTime) / 1000;
        gl.viewport(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        gl.useProgram(program);
        gl.uniform1f(gl.getUniformLocation(program, 'time'), time);
        gl.uniform1f(gl.getUniformLocation(program, 'active'), isAnimating ? 1 : 0);
        gl.uniform1f(gl.getUniformLocation(program, 'duration'), duration);
        gl.uniform1i(gl.getUniformLocation(program, 'mode'), filterType);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sourceTex);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, flowTex);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        const masterCanvas = masterCanvasRef.current;
        const masterCtx = masterCanvas.getContext('2d');

        masterCtx.fillStyle = '#ffffff';
        masterCtx.fillRect(0, 0, MASTER_WIDTH, MASTER_HEIGHT);

        const domeSize = MASTER_HEIGHT * 0.94;
        const x = (MASTER_WIDTH - domeSize) / 2;
        const y = (MASTER_HEIGHT - domeSize) / 2;

        masterCtx.save();
        masterCtx.beginPath();
        masterCtx.arc(MASTER_WIDTH / 2, MASTER_HEIGHT / 2, domeSize / 2, 0, Math.PI * 2);
        masterCtx.clip();
        masterCtx.imageSmoothingQuality = 'high';
        masterCtx.drawImage(gl.canvas, x, y, domeSize, domeSize);
        masterCtx.restore();

        const vignette = masterCtx.createRadialGradient(
          MASTER_WIDTH / 2,
          MASTER_HEIGHT / 2,
          (domeSize / 2) * 0.65,
          MASTER_WIDTH / 2,
          MASTER_HEIGHT / 2,
          domeSize / 2,
        );
        vignette.addColorStop(0, 'rgba(255,255,255,0)');
        vignette.addColorStop(0.99, 'white');
        masterCtx.fillStyle = vignette;
        masterCtx.fillRect(0, 0, MASTER_WIDTH, MASTER_HEIGHT);
      }

      engine.current.frameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => cancelAnimationFrame(engine.current.frameId);
  }, [filterType, isAnimating]);

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const tempImg = new Image();
    tempImg.onload = () => {
      imgRef.current = tempImg;
      setImageUrl(url);
    };
    tempImg.src = url;
  };

  useEffect(() => {
    if (imageUrl && canvasRef.current && imgRef.current) {
      setupWebGL(imgRef.current);
      updateFlowMap();
    }
  }, [imageUrl, setupWebGL, updateFlowMap]);

  useEffect(() => {
    if (imageUrl) {
      updateFlowMap();
    }
  }, [anchors, paths, imageUrl, updateFlowMap]);

  const startRecording = async (type) => {
    if (isRecording) return;

    setRecordType(type);
    setRecordProgress(0);
    setIsRecording(true);
    setIsAnimating(true);

    const source = type === '360' ? masterCanvasRef.current : canvasRef.current;
    const stream = source.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: type === '360' ? 25_000_000 : 10_000_000,
    });

    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `horizon_${type}_loop.webm`;
      anchor.click();
      setIsRecording(false);
      setIsAnimating(false);
    };

    recorder.start();
    const start = Date.now();
    const timer = setInterval(() => {
      const progress = Math.min(100, ((Date.now() - start) / (engine.current.duration * 1000)) * 100);
      setRecordProgress(progress);
      if (progress >= 100) {
        clearInterval(timer);
        recorder.stop();
      }
    }, 100);
  };

  const handlePointerDown = (event) => {
    if (!imageUrl || isAnimating) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    if (tool === 'anchor') {
      setAnchors((prev) => [...prev, { x, y }]);
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDrawing(true);
    setPaths((prev) => [...prev, [{ x, y }]]);
  };

  const handlePointerMove = (event) => {
    if (!isDrawing || isAnimating) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    setPaths((prev) => {
      const updated = [...prev];
      const current = updated[updated.length - 1];
      if (!current) return prev;
      const lastPoint = current[current.length - 1];
      const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
      if (dist > 0.005) {
        current.push({ x, y });
        return updated;
      }
      return prev;
    });
  };

  const stopDrawing = (event) => {
    if (event?.currentTarget?.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDrawing(false);
  };

  const ensureAFrameLoaded = useCallback(() => {
    if (aframeReady.current) return aframeReady.current;
    const loadScript = (src) => new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing?.dataset?.loaded === 'true') {
        resolve();
        return;
      }
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.loaded = 'false';
      script.onload = () => {
        script.dataset.loaded = 'true';
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });

    aframeReady.current = (async () => {
      if (!window.AFRAME) {
        await loadScript('https://aframe.io/releases/1.5.0/aframe.min.js');
      }
      if (!window.AFRAME?.components?.['particle-system']) {
        await loadScript('https://cdn.jsdelivr.net/gh/aframevr/aframe-particle-system-component@1.1.1/dist/aframe-particle-system-component.min.js');
      }
    })();
    return aframeReady.current;
  }, []);

  const startVideoStream = useCallback((canvas, videoEl) => {
    if (!canvas || !videoEl) return;
    const stream = canvas.captureStream(30);
    videoEl.srcObject = stream;
    videoEl.muted = true;
    videoEl.loop = true;
    videoEl.playsInline = true;
    videoEl.autoplay = true;
    const play = () => videoEl.play().catch(() => {});
    videoEl.addEventListener('loadeddata', play, { once: true });
    play();
  }, []);

  const stopVideoStream = useCallback((videoEl) => {
    if (videoEl?.srcObject) {
      videoEl.srcObject.getTracks().forEach((t) => t.stop());
    }
    if (videoEl) {
      videoEl.pause();
      videoEl.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!vrEnabled) {
      stopVideoStream(skyboxVideoRef.current);
      stopVideoStream(panelVideoRef.current);
      return;
    }
    ensureAFrameLoaded()
      .then(() => {
        startVideoStream(masterCanvasRef.current, skyboxVideoRef.current);
        startVideoStream(canvasRef.current, panelVideoRef.current);
      })
      .catch(() => {
        setVrEnabled(false);
      });
  }, [vrEnabled, ensureAFrameLoaded, startVideoStream, stopVideoStream]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="branding">
          <div className="logo-chip">
            <Zap size={22} />
          </div>
          <div>
            <p className="chip">Skybox Production Studio</p>
            <h1>Horizon V34</h1>
          </div>
        </div>
        <div className="header-actions">
          {imageUrl && (
            <button className={`pill-button ${isAnimating ? 'secondary' : 'primary'}`} onClick={() => setIsAnimating((prev) => !prev)} type="button">
              {isAnimating ? <Pause size={18} /> : <Play size={18} />}
              {isAnimating ? 'Stop' : 'Animer'}
            </button>
          )}
        </div>
      </header>

      <main className="stage">
        <div
          className="canvas-area"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
        >
          {imageUrl ? (
            <div className="canvas-stack">
              <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="flow-canvas" />

              <div className="skybox-monitor">
                <canvas
                  ref={(el) => {
                    if (!el) return;
                    const draw = () => {
                      if (masterCanvasRef.current) {
                        const ctx = el.getContext('2d');
                        ctx.drawImage(
                          masterCanvasRef.current,
                          0,
                          0,
                          MASTER_WIDTH,
                          MASTER_HEIGHT,
                          0,
                          0,
                          el.width,
                          el.height,
                        );
                      }
                      requestAnimationFrame(draw);
                    };
                    draw();
                  }}
                  width={240}
                  height={120}
                  className="monitor-canvas"
                />
                <div className="monitor-label">
                  <Globe size={12} /> 4K Skybox Master
                </div>
              </div>

              {!isAnimating && (
                <svg className="flow-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                  {anchors.map((anchor, index) => (
                    <circle
                      key={`anchor-${index}`}
                      cx={anchor.x * 1000}
                      cy={anchor.y * 1000}
                      r="15"
                      fill="#ef4444"
                      stroke="white"
                      strokeWidth="4"
                    />
                  ))}
                  {paths.map((path, index) => (
                    <polyline
                      // eslint-disable-next-line react/no-array-index-key
                      key={`path-${index}`}
                      points={path.map((p) => `${p.x * 1000},${p.y * 1000}`).join(' ')}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="30"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.4"
                    />
                  ))}
                </svg>
              )}
            </div>
          ) : (
            <label className="upload-drop">
              <Monitor size={72} />
              <div>
                <p className="eyebrow">Importer Image</p>
                <p className="muted">Démarrer une production 360° VR</p>
              </div>
              <input type="file" accept="image/*" onChange={handleUpload} />
            </label>
          )}
        </div>

        {imageUrl && (
          <div className="controls-shell">
            {!isAnimating && (
              <div className="toolbar">
                <div className="toolbar-group">
                  <button className={`tool ${tool === 'flow' ? 'active' : ''}`} type="button" onClick={() => setTool('flow')}>
                    <Wind size={20} /> Flux
                  </button>
                  <button className={`tool ${tool === 'anchor' ? 'active' : ''}`} type="button" onClick={() => setTool('anchor')}>
                    <Anchor size={20} /> Ancre
                  </button>
                </div>
                <div className="toolbar-divider" />
                <div className="toolbar-actions">
                  <button className="icon" type="button" title="Export 2D Loop" onClick={() => startRecording('2D')}>
                    <Camera size={22} />
                  </button>
                  <button className="icon" type="button" title="Record 360 Skybox Loop" onClick={() => startRecording('360')}>
                    <Globe size={22} />
                  </button>
                  <button
                    className={`icon ${vrEnabled ? 'active' : ''}`}
                    type="button"
                    title="Basculer bulle VR A-Frame"
                    onClick={() => setVrEnabled((prev) => !prev)}
                  >
                    <Sparkles size={20} />
                  </button>
                  <button className="icon" type="button" title="Reset Canvas" onClick={() => { setPaths([]); setAnchors([]); }}>
                    <Trash2 size={22} />
                  </button>
                </div>
              </div>
            )}

            <div className="filter-rail">
              {FILTERS.map((filter) => {
                const Icon = ICONS[filter.icon] || ImageIcon;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    className={`filter ${filterType === filter.id ? 'active' : ''}`}
                    onClick={() => setFilterType(filter.id)}
                    title={filter.label}
                  >
                    <Icon size={18} />
                    <span className="filter-label">{filter.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isRecording && (
          <div className="record-overlay">
            <div className="record-card">
              <div className="ring">
                <svg viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="92" className="ring-bg" />
                  <circle
                    cx="100"
                    cy="100"
                    r="92"
                    className="ring-progress"
                    style={{ strokeDashoffset: `${2 * Math.PI * 92 * (1 - recordProgress / 100)}` }}
                  />
                </svg>
                <div className="ring-label">
                  <span className="percent">{Math.round(recordProgress)}%</span>
                  <span className="small">Rendering {recordType}</span>
                </div>
              </div>
              <div className="record-text">
                <h2>Capture {recordType} Master</h2>
                <p>
                  {recordType === '360'
                    ? 'Fusion sphérique 2:1 et lissage 4K...'
                    : 'Génération de la boucle carrée haute-vitesse...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {imageUrl && vrEnabled && (
          <div className="vr-shell">
            <div className="vr-header">
              <div className="vr-pill">VR Bubble • A-Frame</div>
              <p className="vr-note">Skybox 360 equirect + panneau 2D flottant. Autorisez le gyro sur mobile.</p>
            </div>
            <div className="vr-fx-rail">
              <div className="vr-fx-label">
                <Sparkles size={14} />
                FX Particles (toggle)
              </div>
              <div className="vr-fx-grid">
                {FX_PARTICLES.map((fx) => (
                  <button
                    key={fx.id}
                    type="button"
                    className={`fx-toggle ${fxEnabled[fx.id] ? 'active' : ''}`}
                    onClick={() => setFxEnabled((prev) => ({ ...prev, [fx.id]: !prev[fx.id] }))}
                    title={fx.name}
                  >
                    <span className="fx-name">{fx.name}</span>
                    <span className="fx-state">{fxEnabled[fx.id] ? 'ON' : 'OFF'}</span>
                  </button>
                ))}
              </div>
            </div>
            <a-scene
              embedded
              vr-mode-ui="enabled: true"
              renderer="antialias: true; colorManagement: true"
              device-orientation-permission-ui="enabled: true"
            >
              <a-assets>
                <video id="skyboxVideo" ref={skyboxVideoRef} crossOrigin="anonymous" playsInline muted loop />
                <video id="panelVideo" ref={panelVideoRef} crossOrigin="anonymous" playsInline muted loop />
              </a-assets>

              <a-videosphere src="#skyboxVideo" radius="500" rotation="0 180 0" segments-height="64" segments-width="128" />
              <a-entity id="viewerRig" position="0 1.6 0">
                <a-camera wasd-controls-enabled="false" look-controls="magicWindowTrackingEnabled: true; touchEnabled: true" />
                <a-circle
                  src="#panelVideo"
                  radius="1.25"
                  position="0 0 -2.15"
                  rotation="-2 0 0"
                  material="side: double; transparent: true; opacity: 0.96"
                />
              </a-entity>

              {FX_PARTICLES.filter((fx) => fxEnabled[fx.id]).map((fx) => (
                // eslint-disable-next-line react/no-unknown-property
                <a-entity
                  key={fx.id}
                  position={fx.position}
                  rotation={fx.rotation}
                  particle-system={fx.config}
                />
              ))}

              <a-entity light="type: ambient; intensity: 0.35" />
              <a-entity light="type: point; intensity: 0.8; distance: 6" position="0 2 -1" />
            </a-scene>
          </div>
        )}
      </main>

      <canvas ref={flowCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="hidden-canvas" />
      <canvas ref={masterCanvasRef} width={MASTER_WIDTH} height={MASTER_HEIGHT} className="hidden-canvas" />
    </div>
  );
}

export default App;
