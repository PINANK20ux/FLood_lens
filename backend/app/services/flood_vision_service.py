"""
FloodLens AI - Dual-Stream Flood Vision Service
===============================================
Two-stream computer vision engine combining:
  - Stream 1: YOLOv8 custom instance segmentation for floodwater (water_seg.pt)
  - Stream 2: YOLOv8 pretrained detector for common COCO entities (yolov8n.pt)

Computes pixel-precise water coverage, calculates bounding-box submersion/overlap,
identifies submerged vehicles and stranded civilians, and renders an aesthetic
translucent blue water overlay and distinct status-coded bounding boxes.
"""

from __future__ import annotations

import base64
import logging
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import cv2
import numpy as np
from ultralytics import YOLO

logger = logging.getLogger("floodlens.flood_vision")

# Model Paths
WEIGHTS_DIR: Path = Path(__file__).resolve().parent.parent / "weights"
WATER_SEG_MODEL_PATH: Path = WEIGHTS_DIR / "water_seg.pt"
COCO_DET_MODEL_NAME: str = "yolov8n.pt"

# Thread-safe model caches
_MODEL_LOCK = threading.Lock()
_WATER_SEG_MODEL: Optional[YOLO] = None
_COCO_DET_MODEL: Optional[YOLO] = None

# Target COCO classes for flood-relevant entity monitoring:
# 0: person, 2: car, 3: motorcycle, 5: bus, 7: truck, 8: boat
TARGET_CLASS_IDS = [0, 2, 3, 5, 7, 8]
VEHICLE_CLASSES = {"car", "motorcycle", "bus", "truck"}
CLASS_NAMES = {
    0: "person",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
    8: "boat",
}

# Aesthetic styling constants
# Vibrant Water Blue in BGR (Pure electric ocean blue: Blue=255, Green=140, Red=0 -> RGB: #008cff)
WATER_BLUE_BGR: Tuple[int, int, int] = (255, 140, 0)
WATER_CONTOUR_BGR: Tuple[int, int, int] = (255, 215, 60)
COLOR_DANGER_RED_BGR: Tuple[int, int, int] = (40, 40, 235)
COLOR_SAFE_GREEN_BGR: Tuple[int, int, int] = (50, 205, 50)
COLOR_BOAT_AMBER_BGR: Tuple[int, int, int] = (0, 200, 255)


def get_water_seg_model(custom_path: Optional[Union[str, Path]] = None) -> YOLO:
    """
    Thread-safe retrieval of the YOLOv8 floodwater segmentation model.
    """
    global _WATER_SEG_MODEL
    target_path = Path(custom_path) if custom_path else WATER_SEG_MODEL_PATH

    if not target_path.is_file():
        raise FileNotFoundError(
            f"Water segmentation model weights not found at: {target_path}. "
            "Please ensure 'water_seg.pt' is present in backend/app/weights/."
        )

    if custom_path is None and _WATER_SEG_MODEL is not None:
        return _WATER_SEG_MODEL

    with _MODEL_LOCK:
        if custom_path is None and _WATER_SEG_MODEL is not None:
            return _WATER_SEG_MODEL

        logger.info("Loading YOLOv8 water segmentation model from: %s", target_path)
        loaded = YOLO(str(target_path))
        if custom_path is None:
            _WATER_SEG_MODEL = loaded
        return loaded


def get_coco_detector_model() -> YOLO:
    """
    Thread-safe retrieval of the YOLOv8 COCO object detector model.
    Checks weights/yolov8n.pt first, falling back to ultralytics auto-download.
    """
    global _COCO_DET_MODEL
    if _COCO_DET_MODEL is not None:
        return _COCO_DET_MODEL

    with _MODEL_LOCK:
        if _COCO_DET_MODEL is not None:
            return _COCO_DET_MODEL

        local_coco_path = WEIGHTS_DIR / "yolov8n.pt"
        model_target = str(local_coco_path) if local_coco_path.is_file() else COCO_DET_MODEL_NAME

        logger.info("Loading YOLOv8 COCO object detector (%s)...", model_target)
        loaded = YOLO(model_target)
        _COCO_DET_MODEL = loaded
        return loaded


def decode_image_bytes(raw_bytes: bytes) -> np.ndarray:
    """
    Decodes raw image bytes into a 3-channel OpenCV BGR image matrix.
    """
    if not raw_bytes or len(raw_bytes) == 0:
        raise ValueError("Provided image bytes buffer is empty.")

    img_array = np.frombuffer(raw_bytes, dtype=np.uint8)
    image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    if image is None or image.size == 0 or len(image.shape) != 3:
        raise ValueError("Failed to decode image bytes into valid 3-channel BGR matrix.")

    return image


def decode_image_input(image_input: Union[str, Path, bytes, bytearray, np.ndarray]) -> np.ndarray:
    """
    Decodes diverse image input formats into an OpenCV BGR image matrix.
    """
    if isinstance(image_input, (bytes, bytearray)):
        return decode_image_bytes(bytes(image_input))
    elif isinstance(image_input, (str, Path)):
        p = Path(image_input)
        if not p.is_file():
            raise FileNotFoundError(f"Image file does not exist: {p}")
        with open(p, "rb") as f:
            return decode_image_bytes(f.read())
    elif isinstance(image_input, np.ndarray):
        img = image_input.copy()
        if len(img.shape) == 2:
            return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        elif len(img.shape) == 3 and img.shape[2] == 4:
            return cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
        return img
    else:
        raise TypeError(f"Unsupported image input type: {type(image_input)}")


class FloodVisionService:
    """
    Two-stream computer vision service for urban flood intelligence.
    """

    def __init__(self):
        # Lazy/on-demand loading ensures fast startup
        pass

    def process_image(
        self,
        image: np.ndarray,
        seg_conf: float = 0.25,
        det_conf: float = 0.25,
    ) -> Dict[str, Any]:
        """
        Processes an OpenCV BGR image through both vision streams:
          1. Water Segmentation (water_seg.pt) -> combined binary mask & coverage %
          2. Target Object Detection (yolov8n.pt) -> persons, vehicles, boats
          3. Submersion analysis & risk classification
          4. Visual rendering with translucent water overlay & color-coded bounding boxes

        Returns structured analytics dictionary.
        """
        if image is None or image.size == 0:
            raise ValueError("Input image is invalid or empty.")

        height, width = image.shape[:2]
        total_pixels = int(height * width)
        if total_pixels == 0:
            raise ValueError(f"Invalid image dimensions: {width}x{height}")

        # -------------------------------------------------------------
        # Stream 1: Water Segmentation (custom YOLOv8 weights)
        # -------------------------------------------------------------
        water_model = get_water_seg_model()
        combined_water_mask = np.zeros((height, width), dtype=np.uint8)

        try:
            seg_results = water_model.predict(
                source=image,
                conf=seg_conf,
                retina_masks=True,
                verbose=False,
            )

            if seg_results and len(seg_results) > 0 and seg_results[0].masks is not None:
                result = seg_results[0]
                for mask_tensor in result.masks.data:
                    mask_np = mask_tensor.detach().cpu().numpy()
                    bin_mask = (mask_np > 0.5).astype(np.uint8) * 255

                    if bin_mask.shape[:2] != (height, width):
                        bin_mask = cv2.resize(
                            bin_mask,
                            (width, height),
                            interpolation=cv2.INTER_NEAREST,
                        )

                    combined_water_mask = cv2.bitwise_or(combined_water_mask, bin_mask)
        except Exception as e:
            logger.error(f"Error during water segmentation stream: {e}", exc_info=True)

        # Quantitative water coverage
        water_pixel_count = int(cv2.countNonZero(combined_water_mask))
        water_percentage = round((water_pixel_count / float(total_pixels)) * 100.0, 2)

        if water_percentage > 40.0:
            water_severity = "Critical"
        elif water_percentage >= 15.0:
            water_severity = "Moderate"
        else:
            water_severity = "Low"

        # -------------------------------------------------------------
        # Stream 2: Object Detection (COCO pretrained YOLOv8n)
        # -------------------------------------------------------------
        det_model = get_coco_detector_model()
        detected_objects: List[Dict[str, Any]] = []
        stranded_people_count = 0
        submerged_vehicles_count = 0

        try:
            det_results = det_model.predict(
                source=image,
                conf=det_conf,
                classes=TARGET_CLASS_IDS,
                verbose=False,
            )

            if det_results and len(det_results) > 0 and det_results[0].boxes is not None:
                boxes = det_results[0].boxes
                for i in range(len(boxes)):
                    box = boxes[i]
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    xyxy = box.xyxy[0].detach().cpu().numpy().tolist()
                    x1, y1, x2, y2 = xyxy

                    raw_class_name = CLASS_NAMES.get(cls_id, det_model.names.get(cls_id, "object"))

                    # Compute overlap with water mask
                    ix1 = max(0, min(width - 1, int(round(x1))))
                    iy1 = max(0, min(height - 1, int(round(y1))))
                    ix2 = max(0, min(width, int(round(x2))))
                    iy2 = max(0, min(height, int(round(y2))))

                    box_area = max(1, (ix2 - ix1) * (iy2 - iy1))
                    box_mask_patch = combined_water_mask[iy1:iy2, ix1:ix2]
                    overlap_pixels = int(cv2.countNonZero(box_mask_patch))
                    overlap_fraction = overlap_pixels / float(box_area)

                    # Submersion & Risk Logic
                    is_submerged = False
                    assigned_label = raw_class_name

                    if raw_class_name in VEHICLE_CLASSES and overlap_fraction > 0.30:
                        is_submerged = True
                        assigned_label = "submerged_vehicle"
                        submerged_vehicles_count += 1
                    elif raw_class_name == "person" and overlap_fraction > 0.10:
                        is_submerged = True
                        assigned_label = "stranded_civilian"
                        stranded_people_count += 1

                    detected_objects.append({
                        "label": assigned_label,
                        "base_class": raw_class_name,
                        "confidence": round(conf, 3),
                        "is_submerged": is_submerged,
                        "overlap_fraction": round(overlap_fraction, 3),
                        "bbox": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                    })
        except Exception as e:
            logger.error(f"Error during object detection stream: {e}", exc_info=True)

        total_objects_detected = len(detected_objects)

        # -------------------------------------------------------------
        # Visualization: Translucent Water Overlay & Bounding Boxes
        # -------------------------------------------------------------
        annotated_image = self._render_composite_overlay(
            image=image,
            combined_water_mask=combined_water_mask,
            detected_objects=detected_objects,
            water_percentage=water_percentage,
            water_severity=water_severity,
            stranded_count=stranded_people_count,
            submerged_count=submerged_vehicles_count,
        )

        # Encode composite image to Base64 JPEG data URL
        success, buffer = cv2.imencode(".jpg", annotated_image, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
        if not success:
            raise RuntimeError("Failed to encode composite image to JPEG format.")

        b64_str = base64.b64encode(buffer).decode("utf-8")
        annotated_image_url = f"data:image/jpeg;base64,{b64_str}"

        # Clean detected objects for public API output
        clean_detected_objects = [
            {
                "label": obj["label"],
                "confidence": obj["confidence"],
                "is_submerged": obj["is_submerged"],
                "bbox": obj["bbox"],
            }
            for obj in detected_objects
        ]

        # Real-time flood depth and status calculation
        if water_percentage < 2.0:
            water_depth_cm = 0.0
            depth_label = "Dry (0 cm)"
            flood_status = "Clear"
        elif water_percentage < 15.0:
            water_depth_cm = round(5.0 + (water_percentage - 2.0) * (10.0 / 13.0), 1)
            depth_label = f"Ankle Deep (~{int(round(water_depth_cm))} cm)"
            flood_status = "Caution"
        elif water_percentage < 35.0:
            water_depth_cm = round(16.0 + (water_percentage - 15.0) * (29.0 / 20.0), 1)
            depth_label = f"Wheel Deep (~{int(round(water_depth_cm))} cm)"
            flood_status = "Flooded" if (stranded_people_count > 0 or submerged_vehicles_count > 0) else "Caution"
        else:
            water_depth_cm = round(48.0 + (water_percentage - 35.0) * 1.5, 1)
            depth_label = f"Submerged / Danger (~{int(round(water_depth_cm))} cm)"
            flood_status = "Flooded"

        return {
            "water_percentage": water_percentage,
            "water_severity": water_severity,
            "water_depth_cm": water_depth_cm,
            "depth_label": depth_label,
            "status": flood_status,
            "stranded_people_count": stranded_people_count,
            "submerged_vehicles_count": submerged_vehicles_count,
            "total_objects_detected": total_objects_detected,
            "annotated_image": annotated_image_url,
            "detected_objects": clean_detected_objects,
        }

    def process_image_bytes(
        self,
        raw_bytes: bytes,
        seg_conf: float = 0.25,
        det_conf: float = 0.25,
    ) -> Dict[str, Any]:
        """
        Decodes raw bytes and processes through the dual-stream vision pipeline.
        """
        image = decode_image_bytes(raw_bytes)
        return self.process_image(image, seg_conf=seg_conf, det_conf=det_conf)

    def process_image_input(
        self,
        image_input: Union[str, Path, bytes, bytearray, np.ndarray],
        seg_conf: float = 0.25,
        det_conf: float = 0.25,
    ) -> Dict[str, Any]:
        """
        Processes any supported image input format through the vision pipeline.
        """
        image = decode_image_input(image_input)
        return self.process_image(image, seg_conf=seg_conf, det_conf=det_conf)

    def _render_composite_overlay(
        self,
        image: np.ndarray,
        combined_water_mask: np.ndarray,
        detected_objects: List[Dict[str, Any]],
        water_percentage: float,
        water_severity: str,
        stranded_count: int,
        submerged_count: int,
    ) -> np.ndarray:
        """
        Renders an aesthetic, publication-grade composite overlay:
          - Clean translucent blue tint over water mask regions (alpha=0.35 tint, 0.65 original)
          - Subtle water boundary contours
          - Distinct, neat bounding boxes with clear label pill badges:
            * Red for submerged_vehicle & stranded_civilian
            * Green for normal vehicles & persons
            * Yellow/Amber for boats
          - Elegant bottom/top telemetry HUD status bar
        """
        annotated = image.copy()
        height, width = annotated.shape[:2]

        # 1. Blend Water Mask with Translucent Blue Tint
        if cv2.countNonZero(combined_water_mask) > 0:
            mask_indices = combined_water_mask > 0

            # Create solid water-blue tint layer
            tint_layer = np.zeros_like(annotated, dtype=np.uint8)
            tint_layer[mask_indices] = WATER_BLUE_BGR

            # Alpha blend only where mask is active: 52% original + 48% vibrant blue tint
            blended_roi = cv2.addWeighted(
                annotated[mask_indices], 0.52,
                tint_layer[mask_indices], 0.48,
                0.0
            )
            annotated[mask_indices] = blended_roi

            # Crisp contour edge around water
            contours, _ = cv2.findContours(
                combined_water_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )
            cv2.drawContours(annotated, contours, -1, WATER_CONTOUR_BGR, 2, cv2.LINE_AA)

        # 2. Draw Detected Objects
        for obj in detected_objects:
            x1, y1, x2, y2 = [int(round(coord)) for coord in obj["bbox"]]
            x1 = max(0, min(width - 1, x1))
            y1 = max(0, min(height - 1, y1))
            x2 = max(0, min(width, x2))
            y2 = max(0, min(height, y2))

            label = obj["label"]
            conf = obj["confidence"]
            is_submerged = obj["is_submerged"]
            base_class = obj.get("base_class", label)

            # Determine box and tag colors
            if is_submerged or label in {"submerged_vehicle", "stranded_civilian"}:
                box_color = COLOR_DANGER_RED_BGR
                tag_bg_color = (25, 25, 210)
                display_title = "STRANDED PERSON" if label == "stranded_civilian" else "SUBMERGED VEHICLE"
            elif base_class == "boat":
                box_color = COLOR_BOAT_AMBER_BGR
                tag_bg_color = (0, 160, 210)
                display_title = f"BOAT ({base_class.upper()})"
            else:
                box_color = COLOR_SAFE_GREEN_BGR
                tag_bg_color = (35, 140, 45)
                display_title = base_class.upper()

            # Bounding box rectangle with rounded corners or crisp 2px line
            cv2.rectangle(annotated, (x1, y1), (x2, y2), box_color, 2, cv2.LINE_AA)

            # Corner accents for sleek modern UI appearance
            accent_len = min(12, max(6, (x2 - x1) // 5), max(6, (y2 - y1) // 5))
            cv2.line(annotated, (x1, y1), (x1 + accent_len, y1), (255, 255, 255), 2, cv2.LINE_AA)
            cv2.line(annotated, (x1, y1), (x1, y1 + accent_len), (255, 255, 255), 2, cv2.LINE_AA)
            cv2.line(annotated, (x2, y1), (x2 - accent_len, y1), (255, 255, 255), 2, cv2.LINE_AA)
            cv2.line(annotated, (x2, y1), (x2, y1 + accent_len), (255, 255, 255), 2, cv2.LINE_AA)

            # Label text
            caption = f"{display_title} {int(conf * 100)}%"
            font_scale = max(0.36, min(0.50, width / 1200.0))
            (text_w, text_h), baseline = cv2.getTextSize(caption, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)

            # Draw label tag pill above box if room, else below
            tag_y1 = max(0, y1 - text_h - 8)
            tag_y2 = tag_y1 + text_h + 8
            tag_x2 = min(width, x1 + text_w + 10)

            # Tag background
            cv2.rectangle(annotated, (x1, tag_y1), (tag_x2, tag_y2), tag_bg_color, -1)
            cv2.rectangle(annotated, (x1, tag_y1), (tag_x2, tag_y2), box_color, 1, cv2.LINE_AA)

            # Text string
            cv2.putText(
                annotated,
                caption,
                (x1 + 5, tag_y2 - 4),
                cv2.FONT_HERSHEY_SIMPLEX,
                font_scale,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )

        # 3. Top Telemetry HUD Badge
        hud_h = max(34, int(height * 0.065))
        hud_bg = annotated[0:hud_h, 0:width].copy()
        cv2.rectangle(annotated, (0, 0), (width, hud_h), (15, 17, 23), -1)
        cv2.addWeighted(hud_bg, 0.25, annotated[0:hud_h, 0:width], 0.75, 0, dst=annotated[0:hud_h, 0:width])

        hud_font_scale = max(0.35, min(0.50, width / 1300.0))
        hud_text_left = f"FLOODLENS AI | WATER: {water_percentage:.1f}% [{water_severity.upper()}]"

        # Severity color dot
        sev_color = COLOR_DANGER_RED_BGR if water_severity == "Critical" else (
            (0, 165, 255) if water_severity == "Moderate" else COLOR_SAFE_GREEN_BGR
        )
        cv2.circle(annotated, (14, hud_h // 2), 5, sev_color, -1, cv2.LINE_AA)
        cv2.putText(
            annotated,
            hud_text_left,
            (26, int(hud_h * 0.65)),
            cv2.FONT_HERSHEY_SIMPLEX,
            hud_font_scale,
            (240, 240, 245),
            1,
            cv2.LINE_AA,
        )

        # Right HUD stats: Stranded & Submerged counts
        if width >= 500:
            hud_text_right = f"STRANDED: {stranded_count} | SUBMERGED: {submerged_count}"
            (tw_r, _), _ = cv2.getTextSize(hud_text_right, cv2.FONT_HERSHEY_SIMPLEX, hud_font_scale, 1)
            cv2.putText(
                annotated,
                hud_text_right,
                (width - tw_r - 12, int(hud_h * 0.65)),
                cv2.FONT_HERSHEY_SIMPLEX,
                hud_font_scale,
                (220, 220, 225),
                1,
                cv2.LINE_AA,
            )

        return annotated


# Global service singleton instance
flood_vision_service = FloodVisionService()
