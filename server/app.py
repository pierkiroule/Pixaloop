"""Flask API for Vortex UI processing."""

from __future__ import annotations

import base64
import typing as t

import cv2
import numpy as np
from flask import Flask, jsonify, request

from .vortex_renderer import VortexRenderer

app = Flask(__name__)
renderer = VortexRenderer()


def _decode_image(data: str) -> np.ndarray:
  """Decode a base64 PNG/JPEG into a BGR OpenCV image."""
  if "," in data:
    data = data.split(",", 1)[1]
  buf = base64.b64decode(data)
  arr = np.frombuffer(buf, dtype=np.uint8)
  image = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
  if image.shape[-1] == 4:
    image = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
  return image


@app.post("/process")
def process_flow() -> t.Tuple[t.Any, int]:
  payload = request.get_json(force=True)
  src = _decode_image(payload["image"])
  flow = _decode_image(payload["flow"])
  flow_norm = cv2.cvtColor(flow, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
  strength = float(payload.get("strength", 0.35))

  output = renderer.apply_flow_polar(src, flow_norm, strength=strength)
  return jsonify({"image": renderer.encode_base64(output)}), 200


@app.post("/export/equirect")
def export_equirect() -> t.Tuple[t.Any, int]:
  payload = request.get_json(force=True)
  vortex_frame = _decode_image(payload["image"])
  width = int(payload.get("width", 3840))
  height = int(payload.get("height", 1920))
  equi = renderer.export_equirectangular(vortex_frame, output_size=(width, height))
  return jsonify({"image": renderer.encode_base64(equi)}), 200


@app.get("/health")
def health() -> t.Tuple[str, int]:
  return "ok", 200


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=5001, debug=True)
