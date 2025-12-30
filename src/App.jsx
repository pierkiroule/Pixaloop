import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Anchor,
  Camera,
  Cloud,
  Droplets,
  Eye,
  Globe,
  Image as ImageIcon,
  Menu,
  Monitor,
  Palette,
  Pause,
  Play,
  Sparkles,
  Stars,
  Trash2,
  Upload,
  Wand2,
  Wind,
  Zap,
} from './icons';
import { registerFloatingParticles } from './aframe/particles';
import './App.css';
import DrawingLooper from './DrawingLooper';
import BottomBar from './components/BottomBar';
import BottomSheet from './components/BottomSheet';
import QuickFab from './components/QuickFab';
import StatusStrip from './components/StatusStrip';

const CANVAS_SIZE = 1024;
const PREVIEW_SIZE = 512;
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

const clampToVortex = (point) => {
  const dx = point.x - 0.5;
  const dy = point.y - 0.5;
  const radius = Math.sqrt(dx * dx + dy * dy);
  const maxRadius = 0.5;

  if (radius > maxRadius) {
    const scale = maxRadius / radius;
    return {
      x: 0.5 + dx * scale,
      y: 0.5 + dy * scale,
    };
  }
  return point;
};

const cartesianToPolar = (point) => {
  const dx = point.x - 0.5;
  const dy = point.y - 0.5;
  return {
    angle: Math.atan2(dy, dx),
    radius: Math.min(Math.sqrt(dx * dx + dy * dy), 0.5),
  };
};

const polarToCartesian = (angle, radius) => ({
  x: 0.5 + Math.cos(angle) * radius,
  y: 0.5 + Math.sin(angle) * radius,
});

const blendAngle = (a, b, t) => {
  const diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + diff * t;
};

const curveTowardVortex = (nextPoint, previousPoint) => {
  const clamped = clampToVortex(nextPoint);
  const polarNext = cartesianToPolar(clamped);
  if (!previousPoint) {
    return polarToCartesian(polarNext.angle, polarNext.radius);
  }

  const polarPrev = cartesianToPolar(previousPoint);
  const easedAngle = blendAngle(polarPrev.angle, polarNext.angle, 0.65);
  const easedRadius = polarPrev.radius * 0.35 + polarNext.radius * 0.65;
  return polarToCartesian(easedAngle, Math.min(0.5, easedRadius));
};

function App() {
  const [imageUrl, setImageUrl] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [tool, setTool] = useState('flow');
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('scene');
  const [isDesktop, setIsDesktop] = useState(false);
  const [watercolorColor, setWatercolorColor] = useState('#6fb0ff');
  const [watercolorSize, setWatercolorSize] = useState(48);
  const [watercolorWetness, setWatercolorWetness] = useState(0.75);
  const [filterType, setFilterType] = useState(0);
  const [paths, setPaths] = useState([]);
  const [anchors, setAnchors] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [recordType, setRecordType] = useState('2D');
  const [vrEnabled, setVrEnabled] = useState(false);
  const [preview2DEnabled, setPreview2DEnabled] = useState(false);
  const [looperVideoUrl, setLooperVideoUrl] = useState(null);
  const [useLooperForSkybox, setUseLooperForSkybox] = useState(false);

  const canvasRef = useRef(null);
  const masterCanvasRef = useRef(null);
  const flowCanvasRef = useRef(null);
  const watercolorCanvasRef = useRef(null);
  const sourceCompositeRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const skyboxVideoRef = useRef(null);
  const panelVideoRef = useRef(null);
  const aframeReady = useRef(null);
  const previewFrameRef = useRef(null);
  const watercolorStrokeRef = useRef(null);
  const looperUrlRef = useRef(null);

  const engine = useRef({
    gl: null,
    program: null,
    sourceTex: null,
    flowTex: null,
    startTime: Date.now(),
    duration: 5,
    frameId: null,
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 900px)');
    const handleChange = () => setIsDesktop(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setIsNavOpen(true);
    }
  }, [isDesktop]);

  const drawImageToCanvas = useCallback((imageElement, target) => {
    const canvas = target;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const imgAspect = imageElement.width / imageElement.height;
    const canvasAspect = width / height;

    let drawWidth = width;
    let drawHeight = height;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspect > canvasAspect) {
      drawWidth = width;
      drawHeight = width / imgAspect;
      offsetY = (height - drawHeight) / 2;
    } else {
      drawHeight = height;
      drawWidth = height * imgAspect;
      offsetX = (width - drawWidth) / 2;
    }

    ctx.drawImage(imageElement, offsetX, offsetY, drawWidth, drawHeight);
  }, []);

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

  const refreshSourceTexture = useCallback(() => {
    const gl = engine.current.gl;
    const sourceTex = engine.current.sourceTex;
    const compositeCanvas = sourceCompositeRef.current;
    if (!gl || !sourceTex || !imgRef.current || !compositeCanvas) return;

    drawImageToCanvas(imgRef.current, compositeCanvas);
    const watercolorCanvas = watercolorCanvasRef.current;
    if (watercolorCanvas) {
      const ctx = compositeCanvas.getContext('2d');
      ctx.globalAlpha = 1;
      ctx.drawImage(watercolorCanvas, 0, 0);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, compositeCanvas);
  }, [drawImageToCanvas]);

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

  const splatWatercolor = useCallback(
    (point) => {
      const canvas = watercolorCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const px = point.x * CANVAS_SIZE;
      const py = point.y * CANVAS_SIZE;
      const radius = watercolorSize;
      const fade = Math.max(0.2, Math.min(0.95, watercolorWetness));
      const gradient = ctx.createRadialGradient(px, py, radius * 0.08, px, py, radius);
      gradient.addColorStop(0, `${watercolorColor}cc`);
      gradient.addColorStop(0.4, `${watercolorColor}80`);
      gradient.addColorStop(1, `${watercolorColor}00`);

      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = fade;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      refreshSourceTexture();
    },
    [refreshSourceTexture, watercolorColor, watercolorSize, watercolorWetness],
  );

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
      setPaths([]);
      setAnchors([]);
      const watercolorCanvas = watercolorCanvasRef.current;
      watercolorCanvas?.getContext('2d')?.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    };
    tempImg.src = url;
  };

  useEffect(() => {
    if (imageUrl && canvasRef.current && imgRef.current) {
      setupWebGL(imgRef.current);
      updateFlowMap();
      refreshSourceTexture();
    }
  }, [imageUrl, refreshSourceTexture, setupWebGL, updateFlowMap]);

  useEffect(() => {
    if (imageUrl) {
      updateFlowMap();
    }
  }, [anchors, paths, imageUrl, updateFlowMap]);

  const clearWatercolor = useCallback(() => {
    const watercolorCanvas = watercolorCanvasRef.current;
    if (watercolorCanvas) {
      watercolorCanvas.getContext('2d')?.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      refreshSourceTexture();
    }
  }, [refreshSourceTexture]);

  const startRecording = async (type) => {
    if (isRecording || !imageUrl) return;

    setRecordType(type);
    setRecordProgress(0);
    setIsRecording(true);
    setIsAnimating(true);

    const source = type === '360' ? masterCanvasRef.current : canvasRef.current;
    const stream = source.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: type === '360' ? 25000000 : 10000000,
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
    const clamped = clampToVortex({ x, y });

    if (tool === 'anchor') {
      setAnchors((prev) => [...prev, clamped]);
      return;
    }

    if (tool === 'watercolor') {
      setIsDrawing(true);
      watercolorStrokeRef.current = clamped;
      splatWatercolor(clamped);
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDrawing(true);
    setPaths((prev) => [...prev, [clamped]]);
  };

  const handlePointerMove = (event) => {
    if (!isDrawing || isAnimating) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const clamped = clampToVortex({ x, y });

    if (tool === 'watercolor') {
      const last = watercolorStrokeRef.current;
      const dx = clamped.x - (last?.x ?? clamped.x);
      const dy = clamped.y - (last?.y ?? clamped.y);
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.floor(dist / 0.01));
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        splatWatercolor({
          x: (last?.x ?? clamped.x) + dx * t,
          y: (last?.y ?? clamped.y) + dy * t,
        });
      }
      watercolorStrokeRef.current = clamped;
      return;
    }

    setPaths((prev) => {
      const updated = [...prev];
      const current = updated[updated.length - 1];
      if (!current) return prev;
      const lastPoint = current[current.length - 1];
      const curvedPoint = curveTowardVortex(clamped, lastPoint);
      const dist = Math.hypot(curvedPoint.x - lastPoint.x, curvedPoint.y - lastPoint.y);
      if (dist > 0.005) {
        current.push(curvedPoint);
        return updated;
      }
      return prev;
    });
  };

  const stopDrawing = (event) => {
    if (event?.currentTarget?.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    watercolorStrokeRef.current = null;
    setIsDrawing(false);
  };

  const ensureAFrameLoaded = useCallback(() => {
    if (aframeReady.current) return aframeReady.current;
    aframeReady.current = new Promise((resolve, reject) => {
      if (window.AFRAME) {
        registerFloatingParticles();
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://aframe.io/releases/1.5.0/aframe.min.js';
      script.async = true;
      script.onload = () => {
        registerFloatingParticles();
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
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
        const applyVideo = (videoEl, sourceUrl) => {
          if (!videoEl) return;
          stopVideoStream(videoEl);
          videoEl.src = sourceUrl;
          videoEl.loop = true;
          videoEl.muted = true;
          videoEl.playsInline = true;
          videoEl.play().catch(() => {});
        };

        const shouldRenderPanel = isDesktop;
        if (useLooperForSkybox && looperVideoUrl) {
          applyVideo(skyboxVideoRef.current, looperVideoUrl);
          if (shouldRenderPanel) {
            applyVideo(panelVideoRef.current, looperVideoUrl);
          } else {
            stopVideoStream(panelVideoRef.current);
          }
          return;
        }

        startVideoStream(masterCanvasRef.current, skyboxVideoRef.current);
        if (shouldRenderPanel) {
          startVideoStream(canvasRef.current, panelVideoRef.current);
        } else {
          stopVideoStream(panelVideoRef.current);
        }
      })
      .catch(() => {
        setVrEnabled(false);
      });
  }, [
    vrEnabled,
    ensureAFrameLoaded,
    startVideoStream,
    stopVideoStream,
    looperVideoUrl,
    useLooperForSkybox,
    isDesktop,
  ]);

  const renderPreviewLayer = useCallback(() => {
    const previewCanvas = previewCanvasRef.current;
    const sourceCanvas = canvasRef.current;
    if (!previewCanvas || !sourceCanvas) return;

    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.globalAlpha = 0.82;
    ctx.drawImage(sourceCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, previewCanvas.width - 16, previewCanvas.height - 16);

    previewFrameRef.current = requestAnimationFrame(renderPreviewLayer);
  }, []);

  useEffect(() => {
    if (!preview2DEnabled || !imageUrl) {
      if (previewFrameRef.current) {
        cancelAnimationFrame(previewFrameRef.current);
        previewFrameRef.current = null;
      }
      const previewCanvas = previewCanvasRef.current;
      if (previewCanvas) {
        previewCanvas.getContext('2d')?.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      }
      return undefined;
    }
    previewFrameRef.current = requestAnimationFrame(renderPreviewLayer);
    return () => {
      if (previewFrameRef.current) {
        cancelAnimationFrame(previewFrameRef.current);
        previewFrameRef.current = null;
      }
    };
  }, [imageUrl, preview2DEnabled, renderPreviewLayer]);

  const handleLooperReady = useCallback((url) => {
    if (looperUrlRef.current) {
      URL.revokeObjectURL(looperUrlRef.current);
    }
    looperUrlRef.current = url;
    setLooperVideoUrl(url);
    setUseLooperForSkybox(false);
  }, []);

  useEffect(() => () => {
    if (looperUrlRef.current) URL.revokeObjectURL(looperUrlRef.current);
  }, []);

  const tabs = [
    { id: 'media', label: 'Média', icon: ImageIcon },
    { id: 'scene', label: 'Mouvement', icon: Wind },
    { id: 'paint', label: 'Peinture', icon: Palette },
    { id: 'export', label: 'Export', icon: Camera },
  ];

  const watercolorPalette = ['#6fb0ff', '#f472b6', '#facc15', '#34d399', '#a78bfa', '#f97316'];

  const renderSheetContent = () => {
    switch (activeTab) {
      case 'media':
        return (
          <section className="panel-card">
            <div className="card-header">
              <div>
                <p className="chip">Média</p>
                <h3>Import & Setup</h3>
              </div>
              <Wand2 size={18} className="muted-icon" />
            </div>
            <p className="muted">Importez ou remplacez une image source, puis configurez vos flux.</p>
            <div className="inline-actions">
              <label className="inline-upload">
                <Upload size={16} />
                <span>{imageUrl ? 'Remplacer l’image' : 'Importer une image'}</span>
                <input type="file" accept="image/*" onChange={handleUpload} />
              </label>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setPaths([]);
                  setAnchors([]);
                  clearWatercolor();
                }}
              >
                <Trash2 size={16} />
                Réinitialiser la scène
              </button>
            </div>
          </section>
        );
      case 'scene':
        return (
          <>
            <section className="panel-card">
              <div className="card-header">
                <div>
                  <p className="chip">Mouvement</p>
                  <h3>Flux & Ancrages</h3>
                </div>
                <Wind size={18} className="muted-icon" />
              </div>
              <p className="muted">Activez l’outil de flux ou d’ancrage puis dessinez directement dans le vortex.</p>
              <div className="inline-actions subtle">
                <button className={`pill ${tool === 'flow' ? 'active' : ''}`} type="button" onClick={() => setTool('flow')}>
                  <Wind size={16} /> Dessin Flux
                </button>
                <button className={`pill ${tool === 'anchor' ? 'active' : ''}`} type="button" onClick={() => setTool('anchor')}>
                  <Anchor size={16} /> Ancrages
                </button>
              </div>
            </section>
            {imageUrl ? (
              <section className="panel-card">
                <div className="card-header">
                  <div>
                    <p className="chip">Direction</p>
                    <h3>Filtres & Styles</h3>
                  </div>
                  <Cloud size={18} className="muted-icon" />
                </div>
                <p className="muted">Dessinez les flux de mouvement ou ajoutez des ancres, puis sélectionnez un style visuel.</p>
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
              </section>
            ) : (
              <section className="panel-card">
                <p className="muted">Importez une image pour définir le mouvement et accéder aux filtres.</p>
              </section>
            )}
          </>
        );
      case 'paint':
        return (
          <section className="panel-card">
            <div className="card-header">
              <div>
                <p className="chip">Peinture</p>
                <h3>Pinceau Aquarelle</h3>
              </div>
              <Palette size={18} className="muted-icon" />
            </div>
            <p className="muted">
              Ajoutez des touches aquarelle directement sur la scène. Ces lavis seront animés et présents dans vos exports vidéo.
            </p>
            {imageUrl ? (
              <>
                <div className="inline-actions">
                  <button
                    type="button"
                    className={`primary-control ${tool === 'watercolor' ? 'active' : ''}`}
                    onClick={() => setTool('watercolor')}
                  >
                    <Droplets size={16} /> Activer le pinceau
                  </button>
                  <button type="button" className="ghost-button" onClick={clearWatercolor}>
                    <Trash2 size={16} /> Nettoyer la couche
                  </button>
                </div>
                <div className="color-palette">
                  {watercolorPalette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-chip ${watercolorColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setWatercolorColor(color)}
                      aria-label={`Couleur ${color}`}
                    />
                  ))}
                </div>
                <div className="slider-field">
                  <label htmlFor="brush-size">
                    Taille du pinceau
                    <span>{Math.round(watercolorSize)} px</span>
                  </label>
                  <input
                    id="brush-size"
                    type="range"
                    min="20"
                    max="120"
                    step="2"
                    value={watercolorSize}
                    onChange={(e) => setWatercolorSize(Number(e.target.value))}
                  />
                </div>
                <div className="slider-field">
                  <label htmlFor="brush-wet">
                    Humidité
                    <span>{Math.round(watercolorWetness * 100)}%</span>
                  </label>
                  <input
                    id="brush-wet"
                    type="range"
                    min="0.25"
                    max="1"
                    step="0.05"
                    value={watercolorWetness}
                    onChange={(e) => setWatercolorWetness(Number(e.target.value))}
                  />
                </div>
              </>
            ) : (
              <p className="muted subtle-text">Importez une image pour activer le pinceau aquarelle.</p>
            )}
          </section>
        );
      case 'export':
        return (
          <>
            <section className="panel-card">
              <div className="card-header">
                <div>
                  <p className="chip">Export</p>
                  <h3>Rendus & VR</h3>
                </div>
                <Camera size={18} className="muted-icon" />
              </div>
              <p className="muted">Lancez l’animation, exportez en 2D ou 360°, ou ouvrez la bulle VR.</p>
              <div className="inline-actions">
                <button
                  className={`primary-control ${isAnimating ? 'active' : ''}`}
                  type="button"
                  onClick={() => setIsAnimating((prev) => !prev)}
                  disabled={!imageUrl}
                  aria-pressed={isAnimating}
                  aria-label={isAnimating ? 'Arrêter l’animation' : 'Lancer l’animation'}
                >
                  {isAnimating ? <Pause size={16} /> : <Play size={16} />}
                  {isAnimating ? 'Stop' : 'Animer'}
                </button>
                <button className="primary-control" type="button" onClick={() => startRecording('2D')} disabled={!imageUrl}>
                  <Camera size={16} /> Export 2D
                </button>
                <button className="primary-control" type="button" onClick={() => startRecording('360')} disabled={!imageUrl}>
                  <Globe size={16} /> Export 360°
                </button>
              </div>
              <div className="inline-actions subtle">
                <button
                  className={`pill ${vrEnabled ? 'active' : ''}`}
                  type="button"
                  onClick={() => setVrEnabled((prev) => !prev)}
                  aria-pressed={vrEnabled}
                  aria-label={vrEnabled ? 'Désactiver la bulle VR' : 'Activer la bulle VR'}
                >
                  <Sparkles size={16} /> VR Bubble
                </button>
                <button
                  className={`pill ${preview2DEnabled ? 'active' : ''}`}
                  type="button"
                  onClick={() => setPreview2DEnabled((prev) => !prev)}
                  aria-pressed={preview2DEnabled}
                  aria-label={preview2DEnabled ? 'Désactiver l’aperçu 2D' : 'Activer l’aperçu 2D'}
                >
                  <Eye size={16} /> Aperçu 2D
                </button>
                <button
                  className={`pill ${useLooperForSkybox ? 'active' : ''}`}
                  type="button"
                  disabled={!looperVideoUrl}
                  onClick={() => {
                    if (!looperVideoUrl) return;
                    setUseLooperForSkybox((prev) => !prev);
                    setVrEnabled(true);
                  }}
                  aria-pressed={useLooperForSkybox}
                  aria-label={useLooperForSkybox ? 'Désactiver le skybox Looper' : 'Activer le skybox Looper'}
                >
                  <Sparkles size={16} /> Skybox Looper
                </button>
              </div>
            </section>
            <section className="panel-card looper-card">
              <div className="card-header">
                <div>
                  <p className="chip">Nouveau</p>
                  <h3>Drawing Looper</h3>
                </div>
                <Sparkles size={18} className="muted-icon" />
              </div>
              <p className="muted">
                Créez une boucle ping-pong 5s pour servir de texture skybox ou panneau VR. L’export 10s se télécharge et peut être routé vers la bulle VR.
              </p>
              <DrawingLooper onLoopReady={handleLooperReady} />
              {!looperVideoUrl && <p className="muted subtle-text">Générez une boucle pour activer le routage VR.</p>}
            </section>
          </>
        );
      default:
        return null;
    }
  };

  const activeSheet = tabs.find((tab) => tab.id === activeTab);
  const activeFilterLabel = FILTERS.find((filter) => filter.id === filterType)?.label || 'Original';

  return (
    <div className="app-shell">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden-file-input" onChange={handleUpload} />
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
          <button
            className={`nav-toggle ${isNavOpen ? 'active' : ''}`}
            type="button"
            onClick={() => setIsNavOpen((prev) => !prev)}
            title="Ouvrir le menu"
            aria-label={isNavOpen ? 'Fermer le panneau' : 'Ouvrir le panneau'}
            aria-pressed={isNavOpen}
          >
            <Menu size={18} />
          </button>
          {imageUrl && (
            <button
              className={`pill-button ${isAnimating ? 'secondary' : 'primary'}`}
              onClick={() => setIsAnimating((prev) => !prev)}
              type="button"
              aria-pressed={isAnimating}
              aria-label={isAnimating ? 'Arrêter l’animation' : 'Lancer l’animation'}
            >
              {isAnimating ? <Pause size={18} /> : <Play size={18} />}
              {isAnimating ? 'Stop' : 'Animer'}
            </button>
          )}
        </div>
      </header>

      <main className="stage">
        <BottomBar
          activeTab={activeTab}
          onChange={(tabId) => {
            setActiveTab(tabId);
            setIsNavOpen(true);
          }}
        />
        <StatusStrip hasFile={!!imageUrl} filterLabel={activeFilterLabel} isAnimating={isAnimating} vrEnabled={vrEnabled} />
        <div className="workspace-grid">
          <div className="vortex-shell">
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
                  {preview2DEnabled && (
                    <canvas ref={previewCanvasRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE} className="preview-layer" />
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
          </div>

        </div>

        <BottomSheet
          open={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          title={activeSheet?.label || 'Panneau'}
          icon={activeSheet?.icon}
          desktopMode={isDesktop}
        >
          {renderSheetContent()}
        </BottomSheet>

        <QuickFab
          hasImage={!!imageUrl}
          isPaintActive={activeTab === 'paint' || tool === 'watercolor'}
          isExportActive={activeTab === 'export'}
          onImport={() => fileInputRef.current?.click()}
          onPaint={() => {
            setTool('watercolor');
            setActiveTab('paint');
            setIsNavOpen(true);
          }}
          onExport={() => {
            setActiveTab('export');
            setIsNavOpen(true);
          }}
        />

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

              <a-entity id="vortex-rig" position="0 1.6 0">
                <a-camera wasd-controls-enabled="false" look-controls="magicWindowTrackingEnabled: true; touchEnabled: true">
                  {isDesktop && (
                    <a-entity id="panel-anchor" position="0 0 -1.8">
                      <a-circle
                        src="#panelVideo"
                        radius="1.2"
                        position="0 0 0"
                        material="side: double; transparent: true; opacity: 0.95"
                      />
                    </a-entity>
                  )}
                </a-camera>
              </a-entity>

              <a-videosphere src="#skyboxVideo" rotation="0 180 0" segments-height="64" segments-width="128" />

              <a-entity light="type: ambient; intensity: 0.35" />
              <a-entity light="type: point; intensity: 0.8; distance: 6" position="0 2 -1" />
              <a-entity floating-particles="density: 200; speed: 0.4; size: 0.03; color: #a8e6ff; vrOnly: true; active: true" />
            </a-scene>
          </div>
        )}
      </main>

      <canvas ref={flowCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="hidden-canvas" />
      <canvas ref={masterCanvasRef} width={MASTER_WIDTH} height={MASTER_HEIGHT} className="hidden-canvas" />
      <canvas ref={watercolorCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="hidden-canvas" />
      <canvas ref={sourceCompositeRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="hidden-canvas" />
    </div>
  );
}

export default App;
