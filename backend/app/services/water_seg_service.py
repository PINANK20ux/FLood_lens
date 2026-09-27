"""
FloodLens AI - Water Segmentation Service
=========================================
Production-grade YOLOv8 instance segmentation service for real-time flood monitoring.
Computes pixel-precise water coverage, severity classification, and renders
high-contrast visual overlays.
"""

from __future__ import annotations

import base64
import logging
import threading
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union

import cv2
import numpy as np
from ultralytics import YOLO

logger = logging.getLogger("floodlens.water_seg")

# Safely resolve model weights path relative to this file
MODEL_PATH: Path = Path(__file__).resolve().parent.parent / "weights" / "water_seg.pt"

# Thread-safe singleton model cache
_MODEL_LOCK = threading.Lock()
_CACHED_MODEL: Optional[YOLO] = None


def get_water_segmentation_model(custom_model_path: Optional[Union[str, Path]] = None) -> YOLO:
    """
    Retrieve or initialize the YOLOv8 water segmentation model instance.
    Uses double-checked locking for thread safety across FastAPI worker threads.

    Args:
        custom_model_path: Optional override path to model weights (.pt).

    Returns:
        YOLO: Loaded Ultralytics YOLO segmentation model instance.

    Raises:
        FileNotFoundError: If the resolved weights file does not exist.
    """
    global _CACHED_MODEL

    target_path = Path(custom_model_path) if custom_model_path else MODEL_PATH

    if not target_path.exists():
        raise FileNotFoundError(
            f"Water segmentation model weights not found at: {target_path}. "
            "Please ensure 'water_seg.pt' is present in backend/app/weights/."
        )

    # Return cached singleton if using the default model path
    if custom_model_path is None and _CACHED_MODEL is not None:
        return _CACHED_MODEL

    with _MODEL_LOCK:
        if custom_model_path is None and _CACHED_MODEL is not None:
            return _CACHED_MODEL

        logger.info("Loading YOLOv8 water segmentation model from: %s", target_path)
        loaded_model = YOLO(str(target_path))

        if custom_model_path is None:
            _CACHED_MODEL = loaded_model

        return loaded_model


def _decode_image_input(image_input: Union[str, Path, bytes, bytearray, np.ndarray]) -> np.ndarray:
    """
    Robustly decode diverse image input types into an OpenCV BGR numpy array.

    Args:
        image_input: Filepath (str/Path), raw bytes/bytearray, or existing cv2 np.ndarray.

    Returns:
        np.ndarray: Validated 3-channel OpenCV image matrix in BGR format.

    Raises:
        FileNotFoundError: If a given filepath does not exist.
        TypeError: If input type is unsupported.
        ValueError: If bytes or file cannot be decoded into a valid image matrix.
    """
    if isinstance(image_input, (str, Path)):
        file_path = Path(image_input)
        if not file_path.is_file():
            raise FileNotFoundError(f"Image file does not exist: {file_path}")

        # Use binary read + imdecode to prevent Windows Unicode path parsing bugs
        try:
            with open(file_path, "rb") as f:
                raw_bytes = f.read()
            img = cv2.imdecode(np.frombuffer(raw_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
        except Exception as e:
            raise ValueError(f"Failed to read image file from {file_path}: {e}") from e

    elif isinstance(image_input, (bytes, bytearray)):
        if len(image_input) == 0:
            raise ValueError("Provided image bytes buffer is empty.")
        img = cv2.imdecode(np.frombuffer(image_input, dtype=np.uint8), cv2.IMREAD_COLOR)

    elif isinstance(image_input, np.ndarray):
        img = image_input.copy()
        if len(img.shape) == 2:
            # Grayscale to BGR
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        elif len(img.shape) == 3 and img.shape[2] == 4:
            # BGRA to BGR
            img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)

    else:
        raise TypeError(
            f"Unsupported image input type: {type(image_input)}. "
            "Expected filepath (str, Path), raw bytes, or np.ndarray."
        )

    if img is None or img.size == 0 or len(img.shape) != 3:
        raise ValueError("Failed to decode image input into a valid 3-channel image matrix.")

    return img


def _render_visual_overlay(
    image: np.ndarray,
    combined_mask: np.ndarray,
    water_surface_percentage: float,
    severity_level: str,
    flood_detected: bool,
    water_pixel_count: int,
    total_pixels: int,
) -> np.ndarray:
    """
    Renders a high-contrast visual overlay on top of the original image:
    - Color-coded semi-transparent water mask highlighting submerged zones
    - Glowing contour boundary lines for water edges
    - Top telemetry HUD banner displaying operational flood telemetry

    Args:
        image: Original BGR image matrix.
        combined_mask: Single-channel uint8 binary mask (0 or 255).
        water_surface_percentage: Water coverage percentage.
        severity_level: "Low", "Moderate", or "Critical".
        flood_detected: Boolean flood flag.
        water_pixel_count: Active water pixels.
        total_pixels: Total image pixels.

    Returns:
        np.ndarray: Annotated BGR image matrix.
    """
    annotated = image.copy()
    height, width = annotated.shape[:2]

    # Color definitions in BGR format
    if severity_level == "Critical":
        tint_color = (36, 40, 235)       # Crimson / Vibrant Red
        contour_color = (0, 0, 255)      # Pure Red
        badge_bg_color = (36, 40, 215)   # Red badge
    elif severity_level == "Moderate":
        tint_color = (0, 165, 255)       # Amber / Orange
        contour_color = (0, 140, 255)    # Orange
        badge_bg_color = (0, 140, 240)   # Orange badge
    else:
        tint_color = (235, 175, 40)      # Electric Cyan / Flood Blue
        contour_color = (255, 200, 50)   # Cyan border
        badge_bg_color = (40, 160, 60)   # Green / Safe badge

    # 1. Semi-transparent mask overlay (alpha blending over water pixels only)
    if water_pixel_count > 0:
        mask_indices = combined_mask > 0
        tint_layer = np.zeros_like(annotated, dtype=np.uint8)
        tint_layer[mask_indices] = tint_color

        # Alpha blend masked region: 45% tint, 55% original
        alpha = 0.45
        annotated[mask_indices] = cv2.addWeighted(
            annotated[mask_indices], 1.0 - alpha,
            tint_layer[mask_indices], alpha,
            0.0
        )

        # 2. Draw crisp segmentation boundary contours
        contours, _ = cv2.findContours(
            combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        cv2.drawContours(annotated, contours, -1, contour_color, 2, cv2.LINE_AA)

    # 3. Dynamic Telemetry HUD Banner
    hud_height = max(42, int(height * 0.09))
    hud_bg = annotated[0:hud_height, 0:width].copy()
    # Darken top area for HUD background with translucent dark tone
    cv2.rectangle(annotated, (0, 0), (width, hud_height), (18, 18, 22), -1)
    cv2.addWeighted(hud_bg, 0.35, annotated[0:hud_height, 0:width], 0.65, 0, dst=annotated[0:hud_height, 0:width])

    # Status labels
    if flood_detected:
        flood_label = "FLOOD DETECTED"
        flood_color = badge_bg_color
    else:
        flood_label = "NORMAL / SAFE"
        flood_color = (40, 160, 60)

    # Determine layout and font scale dynamically to ensure no overlap
    target_scale = max(0.36, min(0.65, width / 1150.0))
    thickness = 1 if target_scale < 0.6 else 2

    title_text = "FLOODLENS AI | WATER SEGMENTATION" if width >= 720 else ("FLOODLENS AI" if width >= 480 else "FLOODLENS")
    title_size, _ = cv2.getTextSize(title_text, cv2.FONT_HERSHEY_SIMPLEX, target_scale, thickness)

    if width >= 650:
        stats_str = f"{flood_label} | WATER: {water_surface_percentage:.2f}% [{severity_level.upper()}]"
    else:
        stats_str = f"WATER: {water_surface_percentage:.1f}% [{severity_level.upper()}]"

    text_size, _ = cv2.getTextSize(stats_str, cv2.FONT_HERSHEY_SIMPLEX, target_scale, thickness)

    # If title and badge would collide, adapt scale or shorten title
    if title_size[0] + text_size[0] + 40 > width:
        target_scale = max(0.32, target_scale * 0.85)
        thickness = 1
        stats_str = f"WATER: {water_surface_percentage:.1f}% [{severity_level[:3].upper()}]"
        text_size, _ = cv2.getTextSize(stats_str, cv2.FONT_HERSHEY_SIMPLEX, target_scale, thickness)
        title_text = "FLOODLENS AI" if width >= 460 else "FLOODLENS"
        title_size, _ = cv2.getTextSize(title_text, cv2.FONT_HERSHEY_SIMPLEX, target_scale, thickness)

    # Render Left Title
    cv2.putText(
        annotated,
        title_text,
        (12, int(hud_height * 0.64)),
        cv2.FONT_HERSHEY_SIMPLEX,
        target_scale,
        (255, 255, 255),
        thickness,
        cv2.LINE_AA,
    )

    # Render Right Badge
    text_x = width - text_size[0] - 14
    badge_pad = 6
    badge_rect_top = int(hud_height * 0.16)
    badge_rect_bottom = int(hud_height * 0.84)
    cv2.rectangle(
        annotated,
        (text_x - badge_pad, badge_rect_top),
        (text_x + text_size[0] + badge_pad, badge_rect_bottom),
        flood_color,
        -1,
    )

    cv2.putText(
        annotated,
        stats_str,
        (text_x, int(hud_height * 0.64)),
        cv2.FONT_HERSHEY_SIMPLEX,
        target_scale,
        (255, 255, 255),
        thickness,
        cv2.LINE_AA,
    )

    return annotated


def process_image(
    image_input: Union[str, Path, bytes, bytearray, np.ndarray],
    conf_threshold: float = 0.25,
    custom_model_path: Optional[Union[str, Path]] = None,
) -> Dict[str, Any]:
    """
    Run YOLOv8 water instance segmentation on an input image and calculate
    hydrological metrics and visualizations.

    Metrics calculated:
    - water_pixel_count: Total active water mask pixels.
    - total_pixels: Image height * image width.
    - water_surface_percentage: (water_pixel_count / total_pixels) * 100 rounded to 2 decimal places.
    - severity_level: "Low" (<15%), "Moderate" (15% - 40%), "Critical" (>40%).
    - flood_detected: boolean (True if water_surface_percentage > 5.0).
    - overlay_image: Annotated OpenCV BGR numpy array.
    - overlay_base64: Base64-encoded JPEG string of the overlay image.
    - binary_mask: Binary mask uint8 array (0 or 255) of combined water regions.

    Args:
        image_input: Image filepath, raw bytes buffer, or existing OpenCV matrix.
        conf_threshold: Minimum detection confidence for water mask segments.
        custom_model_path: Optional override path for weights file.

    Returns:
        Dict[str, Any]: Dictionary containing all computed metrics, arrays, and base64 strings.

    Raises:
        FileNotFoundError: If input path or model weights path is invalid.
        ValueError: If image fails to decode or has zero dimensions.
        Exception: On underlying inference or processing failures.
    """
    try:
        # 1. Safely decode image
        image = _decode_image_input(image_input)
        height, width = image.shape[:2]
        total_pixels = int(height * width)

        if total_pixels == 0:
            raise ValueError(f"Invalid image dimensions: {width}x{height}")

        # 2. Retrieve YOLO segmentation model
        model = get_water_segmentation_model(custom_model_path)

        # 3. Perform YOLO segmentation inference
        # retina_masks=True ensures predicted masks are upscaled to original image resolution
        results = model.predict(
            source=image,
            conf=conf_threshold,
            retina_masks=True,
            verbose=False,
        )

        # 4. Extract and combine segmentation masks using optimized OpenCV bitwise operations
        combined_mask = np.zeros((height, width), dtype=np.uint8)

        if results and len(results) > 0 and results[0].masks is not None:
            result = results[0]
            for mask_tensor in result.masks.data:
                # Convert torch tensor to uint8 binary mask (0 or 255)
                mask_np = mask_tensor.detach().cpu().numpy()
                binary_mask = (mask_np > 0.5).astype(np.uint8) * 255

                # Robust fallback resizing if retina_masks didn't match source resolution
                if binary_mask.shape[:2] != (height, width):
                    binary_mask = cv2.resize(
                        binary_mask,
                        (width, height),
                        interpolation=cv2.INTER_NEAREST,
                    )

                # Optimized OpenCV bitwise OR to merge multiple water instance masks
                combined_mask = cv2.bitwise_or(combined_mask, binary_mask)

        # 5. Compute quantitative flood metrics
        water_pixel_count = int(cv2.countNonZero(combined_mask))
        water_surface_percentage = round((water_pixel_count / total_pixels) * 100.0, 2)

        # Severity categorization rules:
        # "Low" (<15%), "Moderate" (15% - 40%), "Critical" (>40%)
        if water_surface_percentage > 40.0:
            severity_level = "Critical"
        elif water_surface_percentage >= 15.0:
            severity_level = "Moderate"
        else:
            severity_level = "Low"

        # Flood detection flag: True if coverage > 5.0%
        flood_detected = bool(water_surface_percentage > 5.0)

        # 6. Generate visual overlay
        overlay_image = _render_visual_overlay(
            image=image,
            combined_mask=combined_mask,
            water_surface_percentage=water_surface_percentage,
            severity_level=severity_level,
            flood_detected=flood_detected,
            water_pixel_count=water_pixel_count,
            total_pixels=total_pixels,
        )

        # 7. Encode overlay to base64 JPEG string
        success, encoded_buf = cv2.imencode(
            ".jpg", overlay_image, [int(cv2.IMWRITE_JPEG_QUALITY), 92]
        )
        if not success:
            raise ValueError("Failed to encode visual overlay image to JPEG format.")
        overlay_base64 = base64.b64encode(encoded_buf).decode("utf-8")

        return {
            "water_pixel_count": water_pixel_count,
            "total_pixels": total_pixels,
            "water_surface_percentage": water_surface_percentage,
            "severity_level": severity_level,
            "flood_detected": flood_detected,
            "overlay_image": overlay_image,
            "overlay_base64": overlay_base64,
            "binary_mask": combined_mask,
        }

    except Exception as e:
        logger.error("Error processing image in water_seg_service: %s", e, exc_info=True)
        raise
