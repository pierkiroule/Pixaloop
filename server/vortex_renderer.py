"""
Vortex UI processing helpers.

Uses polar coordinates and wrap-around sampling to keep circular textures seamless
when exported as skybox masters.
"""

from __future__ import annotations

import base64
import io
from typing import Tuple

import cv2
import numpy as np
from PIL import Image


class VortexRenderer:
  def __init__(self, canvas_size: int = 1024) -> None:
    self.canvas_size = canvas_size

  def _cartesian_to_polar(self, x: np.ndarray, y: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    dx = x - 0.5
    dy = y - 0.5
    theta = np.arctan2(dy, dx)
    radius = np.sqrt(dx * dx + dy * dy)
    return theta, radius

  def _polar_to_cartesian(self, theta: np.ndarray, radius: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    return 0.5 + np.cos(theta) * radius, 0.5 + np.sin(theta) * radius

  def apply_flow_polar(self, frame: np.ndarray, flow_map: np.ndarray, strength: float = 0.35) -> np.ndarray:
    """
    Apply a polar-aware remap so that pixels leaving at 360° wrap to 0° without seams.

    frame: BGR image (H, W, 3)
    flow_map: normalized flow texture (H, W, 2) where 0.5 = neutral
    """
    h, w = frame.shape[:2]
    if flow_map.shape[:2] != (h, w):
      flow_map = cv2.resize(flow_map, (w, h), interpolation=cv2.INTER_LINEAR)

    yy, xx = np.meshgrid(
      np.linspace(0, 1, h, dtype=np.float32),
      np.linspace(0, 1, w, dtype=np.float32),
      indexing="ij",
    )

    theta, radius = self._cartesian_to_polar(xx, yy)
    dir_x = (flow_map[..., 0] - 0.5) * 2.0
    dir_y = (flow_map[..., 1] - 0.5) * 2.0

    d_theta = dir_x * strength * np.clip(1.0 - radius * 2.0, 0.0, 1.0)
    d_radius = dir_y * strength * 0.5

    wrapped_theta = (theta + d_theta + np.pi * 2.0) % (np.pi * 2.0)
    warped_radius = np.clip(radius + d_radius, 0.0, 0.5)

    sample_x, sample_y = self._polar_to_cartesian(wrapped_theta, warped_radius)
    map_x = (sample_x * (w - 1)).astype(np.float32)
    map_y = (sample_y * (h - 1)).astype(np.float32)

    return cv2.remap(frame, map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)

  def export_equirectangular(self, vortex_frame: np.ndarray, output_size: Tuple[int, int] = (3840, 1920)) -> np.ndarray:
    """
    Project a circular vortex canvas onto an equirectangular skybox layout.
    """
    out_w, out_h = output_size
    yy, xx = np.meshgrid(
      np.linspace(-np.pi, np.pi, out_w, dtype=np.float32),
      np.linspace(-np.pi / 2, np.pi / 2, out_h, dtype=np.float32),
      indexing="xy",
    )
    # Convert spherical angles back to normalized polar coordinates inside the vortex circle.
    radius = np.clip(np.cos(xx), 0.0, 1.0) * 0.5
    sample_x = (np.cos(yy) * radius + 0.5) * vortex_frame.shape[1]
    sample_y = (np.sin(yy) * radius + 0.5) * vortex_frame.shape[0]

    remapped = cv2.remap(
      vortex_frame,
      sample_x.astype(np.float32),
      sample_y.astype(np.float32),
      interpolation=cv2.INTER_CUBIC,
      borderMode=cv2.BORDER_WRAP,
    )
    return remapped

  def encode_base64(self, frame: np.ndarray) -> str:
    """Return a base64 PNG suitable for the existing client pipeline."""
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    image = Image.fromarray(rgb)
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")
