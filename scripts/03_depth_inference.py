"""
FloodLens Dual-YOLO Real-Time Depth & Water Segmentation Inference Engine
Optimized for 30+ FPS Throughput on NVIDIA RTX Hardware.
"""

import argparse
import os
import sys
import time
from pathlib import Path
from typing import Optional, Tuple, List, Any

import cv2
import numpy as np
import torch
from ultralytics import YOLO

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  HARDWARE ACCELERATION VERIFICATION & PRECISION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def init_device(force_cpu: bool = False) -> Tuple[Any, bool]:
    if not force_cpu and torch.cuda.is_available():
        torch.backends.cudnn.benchmark = True
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True
        gpu_name = torch.cuda.get_device_name(0)
        vram = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f"[CUDA] Initialized NVIDIA GPU: {gpu_name} (VRAM: {vram:.2f} GB)")
        print(f"[CUDA] Enforcing device=0 with FP16 Half-Precision (half=True)")
        return 0, True
    else:
        allow_cpu = force_cpu or os.getenv("FLOODLENS_ALLOW_CPU", "0") == "1"
        if not allow_cpu:
            raise RuntimeError(
                "CUDA GPU acceleration is required for 30+ FPS dual-YOLO inference on RTX hardware, "
                "but torch.cuda.is_available() returned False. Set FLOODLENS_ALLOW_CPU=1 or pass --cpu to bypass."
            )
        print("[CUDA] Warning: GPU not available, running on CPU fallback.")
        return "cpu", False


# COCO classes to track: 0=person, 1=bicycle, 2=car, 3=motorcycle, 5=bus, 7=truck
TARGET_CLASSES = {0: 'person', 1: 'bicycle', 2: 'car', 3: 'motorcycle', 5: 'bus', 7: 'truck'}
TIRE_DIAMETER_CM = 65.0
DEFAULT_IMGSZ = 480


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  PASSABILITY & RISK EVALUATION MATRIX
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def get_vehicle_passability(depth_cm: float) -> dict:
    return {
        'sedans': 'UNSAFE' if depth_cm > 25.0 else ('CAUTION' if depth_cm > 15.0 else 'CLEAR'),
        'two_wheelers': 'UNSAFE' if depth_cm > 12.0 else 'CLEAR',
        'suvs': (
            'UNSAFE'
            if depth_cm > 45.0
            else ('CAUTION' if depth_cm > 25.0 else 'CLEAR')
        ),
        'trucks': 'UNSAFE' if depth_cm > 65.0 else 'CLEAR',
    }


def get_vehicle_risk(submersion_ratio: float, aspect_ratio: float = 1.0) -> Tuple[str, Tuple[int, int, int], float, float]:
    S = max(0.0, min(1.0, float(submersion_ratio)))
    depth_cm = round(S * TIRE_DIAMETER_CM, 1)
    percent = round(S * 100.0, 1)

    if depth_cm < 10.0:
        status = 'SAFE'
        color = (0, 255, 0)
    elif depth_cm < 30.0:
        status = 'POOLING RISK'
        color = (0, 165, 255)
    else:
        status = 'IMPASSABLE'
        color = (0, 0, 255)

    status_text = f'{status} ({depth_cm}cm)'
    return status_text, color, percent, depth_cm


def get_pedestrian_risk(submersion_ratio: float) -> Tuple[str, Tuple[int, int, int], float, float]:
    S = max(0.0, min(1.0, float(submersion_ratio)))
    depth_cm = round(S * 75.0, 1)
    percent = round(S * 100.0, 1)

    if depth_cm < 10.0:
        status = 'SAFE'
        color = (0, 255, 0)
    elif depth_cm < 30.0:
        status = 'POOLING RISK'
        color = (0, 165, 255)
    else:
        status = 'IMPASSABLE'
        color = (0, 0, 255)

    status_text = f'{status} ({depth_cm}cm)'
    return status_text, color, percent, depth_cm


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  DUAL-YOLO INFERENCE PIPELINE & CACHED COMPOSITING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class DepthInferenceEngine:
    def __init__(self, detector_model: YOLO, water_model: YOLO, device: Any, use_half: bool = True, imgsz: int = DEFAULT_IMGSZ):
        self.detector_model = detector_model
        self.water_model = water_model
        self.device = device
        self.use_half = use_half
        self.imgsz = imgsz

        # Overlay Cache State
        self.cached_water_mask: Optional[np.ndarray] = None
        self.cached_objects: List[dict] = []
        self.cached_max_depth_cm: float = 0.0
        self.cached_max_sub_pct: float = 0.0
        self.cached_road_status: str = 'SAFE (Depth: 0.0cm)'
        self.cached_road_color: Tuple[int, int, int] = (0, 255, 0)

    def infer(self, frame: np.ndarray, conf_thresh: float = 0.25):
        h, w = frame.shape[:2]

        with torch.inference_mode():
            # Pass 1: Water segmentation
            water_results = self.water_model(
                frame,
                imgsz=self.imgsz,
                device=self.device,
                conf=conf_thresh,
                half=self.use_half,
                verbose=False
            )[0]

            water_mask = np.zeros((h, w), dtype=np.uint8)
            if hasattr(water_results, 'masks') and water_results.masks is not None:
                masks_data = water_results.masks.data.cpu().numpy()
                for mask in masks_data:
                    resized_mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)
                    water_mask = np.bitwise_or(water_mask, (resized_mask > 0.5).astype(np.uint8))

            # Suppress false detections on upper background/walls (top 35%)
            water_mask[: int(h * 0.35), :] = 0
            self.cached_water_mask = water_mask

            # Pass 2: Detection (Vehicles + Pedestrians)
            det_results = self.detector_model(
                frame,
                imgsz=self.imgsz,
                device=self.device,
                classes=list(TARGET_CLASSES.keys()),
                conf=conf_thresh,
                half=self.use_half,
                verbose=False,
            )[0]

        detected_objects = []
        max_depth_cm = 0.0
        max_sub_pct = 0.0

        if hasattr(det_results, 'boxes') and det_results.boxes is not None:
            for box in det_results.boxes:
                cls_id = int(box.cls[0].item())
                cls_name = TARGET_CLASSES.get(cls_id, 'object')
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                conf = float(box.conf[0].item())

                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w, x2), min(h, y2)
                box_h = y2 - y1
                box_w = x2 - x1
                if box_h <= 0 or box_w <= 0:
                    continue

                aspect_ratio = float(box_w) / float(box_h)

                if cls_name == 'person':
                    cutoff_y = int(y1 + 0.50 * box_h)
                    water_mask[y1:cutoff_y, x1:x2] = 0
                    limb_roi = water_mask[cutoff_y:y2, x1:x2]
                    submersion_ratio = float(limb_roi.mean()) if limb_roi.size > 0 else 0.0
                    status_text, color, submersion_pct, d_cm = get_pedestrian_risk(submersion_ratio)
                else:
                    H_ref = 0.35 * box_h
                    cutoff_y = int(y2 - H_ref)
                    cutoff_y = max(y1, min(y2 - 1, cutoff_y))
                    water_mask[y1:cutoff_y, x1:x2] = 0

                    wheel_roi = water_mask[cutoff_y:y2, x1:x2]
                    water_ratio = float(wheel_roi.mean()) if wheel_roi.size > 0 else 0.0
                    h_vis = max(0.0, (1.0 - water_ratio) * H_ref)
                    S = max(0.0, min(1.0, 1.0 - (h_vis / H_ref)))
                    status_text, color, submersion_pct, d_cm = get_vehicle_risk(S, aspect_ratio)

                if d_cm > max_depth_cm:
                    max_depth_cm = d_cm
                    max_sub_pct = submersion_pct

                detected_objects.append({
                    'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2,
                    'cutoff_y': cutoff_y,
                    'cls_name': cls_name,
                    'conf': conf,
                    'status_text': status_text,
                    'color': color,
                    'submersion_pct': submersion_pct,
                    'depth_cm': d_cm
                })

        self.cached_objects = detected_objects
        self.cached_max_depth_cm = max_depth_cm
        self.cached_max_sub_pct = max_sub_pct

        # Fallback road inundation metric if empty
        if not detected_objects:
            road_roi_pixels = int(h * 0.65 * w)
            total_water_pixels = np.count_nonzero(water_mask[int(h * 0.35):, :])
            road_inundation_pct = (total_water_pixels / max(1, road_roi_pixels)) * 100.0

            if road_inundation_pct > 30.0:
                d_cm = round(min(65.0, (road_inundation_pct / 60.0) * 45.0), 1)
                self.cached_road_status = f'IMPASSABLE (Depth: {d_cm}cm | Inundation: {road_inundation_pct:.1f}%)'
                self.cached_road_color = (0, 0, 255)
            elif road_inundation_pct > 8.0:
                d_cm = round((road_inundation_pct / 30.0) * 20.0, 1)
                self.cached_road_status = f'POOLING RISK (Depth: {d_cm}cm | Inundation: {road_inundation_pct:.1f}%)'
                self.cached_road_color = (0, 165, 255)
            else:
                self.cached_road_status = f'SAFE (Depth: 0.0cm | Inundation: {road_inundation_pct:.1f}%)'
                self.cached_road_color = (0, 255, 0)

    def render(self, frame: np.ndarray, fps: Optional[float] = None) -> np.ndarray:
        h, w = frame.shape[:2]
        annotated = frame.copy()

        # 1. Draw water overlay
        if self.cached_water_mask is not None and np.any(self.cached_water_mask):
            if self.cached_water_mask.shape != (h, w):
                mask = cv2.resize(self.cached_water_mask, (w, h), interpolation=cv2.INTER_NEAREST)
            else:
                mask = self.cached_water_mask

            overlay = annotated.copy()
            overlay[mask == 1] = (
                overlay[mask == 1] * 0.5 + np.array([255, 200, 0]) * 0.5
            ).astype(np.uint8)
            annotated = cv2.addWeighted(overlay, 0.6, annotated, 0.4, 0)

        # 2. Draw bounding markers
        for obj in self.cached_objects:
            x1, y1, x2, y2 = obj['x1'], obj['y1'], obj['x2'], obj['y2']
            cutoff_y = obj['cutoff_y']
            color = obj['color']
            cls_name = obj['cls_name']
            conf = obj['conf']
            status_text = obj['status_text']

            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            cv2.rectangle(annotated, (x1, cutoff_y), (x2, y2), (255, 255, 0), 1)

            label_top = f"{cls_name.upper()} ({conf:.2f})"
            label_sub = f"{status_text}"

            (tw1, th1), _ = cv2.getTextSize(label_top, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            (tw2, th2), _ = cv2.getTextSize(label_sub, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)

            cv2.rectangle(annotated, (x1, max(0, y1 - th1 - 8)), (x1 + tw1 + 6, max(0, y1)), color, -1)
            cv2.putText(annotated, label_top, (x1 + 3, max(0, y1 - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

            cv2.rectangle(annotated, (x1, min(h, y2 + 2)), (x1 + tw2 + 6, min(h, y2 + th2 + 10)), (20, 20, 20), -1)
            cv2.putText(annotated, label_sub, (x1 + 3, min(h, y2 + th2 + 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.42, color, 1, cv2.LINE_AA)

        # 3. Draw Road Status / Top Banner
        if not self.cached_objects:
            cv2.putText(annotated, self.cached_road_status, (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.7, self.cached_road_color, 2, cv2.LINE_AA)

        if fps is not None:
            fps_str = f"FPS: {fps:.1f}"
            cv2.putText(annotated, fps_str, (w - 140, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 255), 2, cv2.LINE_AA)

        return annotated


def process_frame(frame: np.ndarray, detector_model: YOLO, water_model: YOLO, conf_thresh: float = 0.25, imgsz: int = DEFAULT_IMGSZ, device: Any = 0, use_half: bool = True) -> np.ndarray:
    """Convenience one-shot processor for single images."""
    engine = DepthInferenceEngine(detector_model, water_model, device=device, use_half=use_half, imgsz=imgsz)
    engine.infer(frame, conf_thresh=conf_thresh)
    return engine.render(frame)


def run_inference(source_path: Optional[str] = None, conf: float = 0.25, imgsz: int = DEFAULT_IMGSZ, cadence: int = 3, force_cpu: bool = False):
    base_dir = Path(__file__).resolve().parent.parent
    models_dir = base_dir / 'models'
    output_dir = base_dir / 'output'
    output_dir.mkdir(parents=True, exist_ok=True)

    device, use_half = init_device(force_cpu=force_cpu)

    # Resolve models: check TensorRT engines first
    water_engine = models_dir / 'water_seg_best.engine'
    water_weight = water_engine if water_engine.exists() else (models_dir / 'water_seg_best.pt')
    if not water_weight.exists():
        water_weight = Path('yolov8n-seg.pt')

    det_engine = base_dir / 'backend' / 'yolov8n.engine'
    det_weight = det_engine if det_engine.exists() else Path('yolov8n.pt')

    print(f'[*] Loading Detector: {det_weight} | Segmentor: {water_weight}')
    detector_model = YOLO(str(det_weight)).to(device)
    water_model = YOLO(str(water_weight)).to(device)

    if use_half and not str(det_weight).endswith('.engine'):
        try:
            detector_model.model.half()
        except Exception:
            pass
    if use_half and not str(water_weight).endswith('.engine'):
        try:
            water_model.model.half()
        except Exception:
            pass

    # Model Warm-up
    if device != 'cpu':
        print('[*] Warming up Tensor Cores on GPU...')
        dummy = torch.zeros((1, 3, imgsz, imgsz), device=device, dtype=torch.float16 if use_half else torch.float32)
        with torch.inference_mode():
            detector_model(dummy, verbose=False)
            water_model(dummy, verbose=False)
        torch.cuda.synchronize()
        print('[*] GPU warm-up complete.')

    engine = DepthInferenceEngine(detector_model, water_model, device=device, use_half=use_half, imgsz=imgsz)

    if source_path:
        sources = [Path(source_path)]
    else:
        test_media_dir = base_dir / 'test_media'
        sources = list(test_media_dir.glob('*.*'))

    for src in sources:
        if not src.exists():
            continue

        ext = src.suffix.lower()
        if ext in ['.jpg', '.jpeg', '.png', '.bmp', '.webp']:
            frame = cv2.imread(str(src))
            if frame is None:
                continue
            engine.infer(frame, conf_thresh=conf)
            result = engine.render(frame)
            out_file = output_dir / f'annotated_{src.name}'
            cv2.imwrite(str(out_file), result)
            print(f'[+] Processed image: {out_file.name}')

        elif ext in ['.mp4', '.avi', '.mov', '.mkv']:
            cap = cv2.VideoCapture(str(src))
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            out_file = output_dir / f'annotated_{src.stem}.mp4'
            writer = cv2.VideoWriter(str(out_file), cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h))

            frame_idx = 0
            start_t = time.perf_counter()

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_idx += 1
                # Run dual-YOLO on cadence
                if frame_idx % cadence == 0:
                    engine.infer(frame, conf_thresh=conf)

                result = engine.render(frame)
                writer.write(result)

            elapsed = time.perf_counter() - start_t
            proc_fps = frame_idx / max(0.001, elapsed)
            cap.release()
            writer.release()
            print(f'[+] Processed video: {out_file.name} ({frame_idx} frames @ {proc_fps:.1f} FPS)')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="FloodLens Depth Inference Pipeline")
    parser.add_argument('--source', type=str, default=None, help='Path to image/video')
    parser.add_argument('--conf', type=float, default=0.25, help='Confidence threshold')
    parser.add_argument('--imgsz', type=int, default=DEFAULT_IMGSZ, help='Inference image size')
    parser.add_argument('--cadence', type=int, default=3, help='Inference frame skip cadence')
    parser.add_argument('--cpu', action='store_true', help='Force CPU execution')
    args = parser.parse_args()

    run_inference(args.source, args.conf, args.imgsz, args.cadence, args.cpu)