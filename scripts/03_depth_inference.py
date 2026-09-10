import argparse
from pathlib import Path
import cv2
import numpy as np
import torch
from ultralytics import YOLO

# Enforce NVIDIA GPU acceleration and Tensor Core optimizations
if torch.cuda.is_available():
    torch.backends.cudnn.benchmark = True
    torch.backends.cuda.matmul.allow_tf32 = True
    torch.backends.cudnn.allow_tf32 = True
    DEVICE = torch.device("cuda:0")
    print(f"[CUDA] Initialized NVIDIA GPU on device: {torch.cuda.get_device_name(0)}")
else:
    DEVICE = torch.device("cpu")
    print("[CUDA] Warning: GPU not available, running on CPU")

# COCO classes to track: 0=person, 2=car, 3=motorcycle, 5=bus, 7=truck
TARGET_CLASSES = {0: 'person', 2: 'car', 3: 'motorcycle', 5: 'bus', 7: 'truck'}


# Standard vehicle tire diameter constant
TIRE_DIAMETER_CM = 65.0


def get_vehicle_passability(depth_cm):
  return {
      'sedans': 'UNSAFE' if depth_cm > 25.0 else 'CLEAR',
      'two_wheelers': 'UNSAFE' if depth_cm > 15.0 else 'CLEAR',
      'suvs': (
          'UNSAFE'
          if depth_cm > 45.0
          else ('CAUTION' if depth_cm > 25.0 else 'CLEAR')
      ),
      'trucks': 'UNSAFE' if depth_cm > 70.0 else 'CLEAR',
  }


def get_vehicle_risk(submersion_ratio, aspect_ratio=1.0):
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


def get_pedestrian_risk(submersion_ratio):
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


def process_frame(frame, detector_model, water_model, conf_thresh=0.25):
  h, w = frame.shape[:2]
  annotated = frame.copy()

  with torch.inference_mode():
    # Pass 1: Water segmentation
    water_results = water_model(frame, imgsz=640, device=DEVICE, conf=conf_thresh, verbose=False)[0]
    water_mask = np.zeros((h, w), dtype=np.uint8)

    if water_results.masks is not None:
      masks_data = water_results.masks.data.cpu().numpy()
      for mask in masks_data:
        resized_mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)
        water_mask = np.bitwise_or(
            water_mask, (resized_mask > 0.5).astype(np.uint8)
        )

    # Suppress false detections on upper background/walls (top 35%)
    water_mask[: int(h * 0.35), :] = 0

    # Pass 2: Detection (Vehicles + Pedestrians)
    det_results = detector_model(
        frame,
        imgsz=640,
        device=DEVICE,
        classes=list(TARGET_CLASSES.keys()),
        conf=conf_thresh,
        verbose=False,
    )[0]

  detected_objects = []
  max_depth_cm = 0.0
  max_sub_pct = 0.0

  if det_results.boxes is not None:
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
        # Measure bottom 50% (lower limbs) of the person
        cutoff_y = int(y1 + 0.50 * box_h)
        water_mask[y1:cutoff_y, x1:x2] = 0  # suppress upper body bleed

        limb_roi = water_mask[cutoff_y:y2, x1:x2]
        submersion_ratio = float(limb_roi.mean()) if limb_roi.size > 0 else 0.0
        status_text, color, submersion_pct, d_cm = get_pedestrian_risk(
            submersion_ratio
        )
      else:
        # Vehicles: Nominal expected tire height H_ref = 0.35 * box_h
        H_ref = 0.35 * box_h
        cutoff_y = int(y2 - H_ref)
        cutoff_y = max(y1, min(y2 - 1, cutoff_y))
        water_mask[y1:cutoff_y, x1:x2] = 0  # suppress roof/window bleed

        wheel_roi = water_mask[cutoff_y:y2, x1:x2]
        water_ratio = float(wheel_roi.mean()) if wheel_roi.size > 0 else 0.0
        # Visible tire height h_vis vs expected H_ref
        h_vis = max(0.0, (1.0 - water_ratio) * H_ref)
        S = max(0.0, min(1.0, 1.0 - (h_vis / H_ref)))
        status_text, color, submersion_pct, d_cm = get_vehicle_risk(
            S, aspect_ratio
        )

      if d_cm > max_depth_cm:
        max_depth_cm = d_cm
        max_sub_pct = submersion_pct

      detected_objects.append((
          x1,
          y1,
          x2,
          y2,
          cutoff_y,
          cls_name,
          conf,
          status_text,
          color,
          submersion_pct,
      ))

  # Pass 3: Draw cleaned water overlay
  if water_results.masks is not None and np.any(water_mask):
    overlay = annotated.copy()
    overlay[water_mask == 1] = (
        overlay[water_mask == 1] * 0.5 + np.array([255, 200, 0]) * 0.5
    ).astype(np.uint8)
    annotated = cv2.addWeighted(overlay, 0.6, annotated, 0.4, 0)

  # Pass 4: Draw bounding markers
  for (
      x1,
      y1,
      x2,
      y2,
      cutoff_y,
      cls_name,
      conf,
      status_text,
      color,
      submersion_pct,
  ) in detected_objects:
    cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
    cv2.rectangle(
        annotated, (x1, cutoff_y), (x2, y2), (255, 255, 0), 1
    )  # Contact ROI

    label_top = f'{cls_name.upper()} ({conf:.2f})'
    label_sub = f'{status_text}'

    (tw1, th1), _ = cv2.getTextSize(
        label_top, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1
    )
    (tw2, th2), _ = cv2.getTextSize(
        label_sub, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1
    )

    cv2.rectangle(
        annotated,
        (x1, max(0, y1 - th1 - 8)),
        (x1 + tw1 + 6, max(0, y1)),
        color,
        -1,
    )
    cv2.putText(
        annotated,
        label_top,
        (x1 + 3, max(0, y1 - 4)),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (0, 0, 0),
        1,
        cv2.LINE_AA,
    )

    cv2.rectangle(
        annotated,
        (x1, min(h, y2 + 2)),
        (x1 + tw2 + 6, min(h, y2 + th2 + 10)),
        (20, 20, 20),
        -1,
    )
    cv2.putText(
        annotated,
        label_sub,
        (x1 + 3, min(h, y2 + th2 + 6)),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.42,
        color,
        1,
        cv2.LINE_AA,
    )

  # Fallback: Empty Road Inundation Metric (if no vehicles/people present)
  if not detected_objects:
    road_roi_pixels = int(h * 0.65 * w)
    total_water_pixels = np.count_nonzero(water_mask[int(h * 0.35) :, :])
    road_inundation_pct = (total_water_pixels / max(1, road_roi_pixels)) * 100.0

    if road_inundation_pct > 30.0:
      depth_cm = round(min(65.0, (road_inundation_pct / 60.0) * 45.0), 1)
      road_status = f'IMPASSABLE (Depth: {depth_cm}cm | Inundation: {road_inundation_pct:.1f}%)'
      status_col = (0, 0, 255)
    elif road_inundation_pct > 8.0:
      depth_cm = round((road_inundation_pct / 30.0) * 20.0, 1)
      road_status = f'POOLING RISK (Depth: {depth_cm}cm | Inundation: {road_inundation_pct:.1f}%)'
      status_col = (0, 165, 255)
    else:
      depth_cm = 0.0
      road_status = f'SAFE (Depth: 0.0cm | Inundation: {road_inundation_pct:.1f}%)'
      status_col = (0, 255, 0)

    cv2.putText(
        annotated,
        road_status,
        (20, 35),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        status_col,
        2,
    )

  return annotated


def run_inference(source_path=None, conf=0.25):
  base_dir = Path(__file__).resolve().parent.parent
  models_dir = base_dir / 'models'
  output_dir = base_dir / 'output'
  output_dir.mkdir(parents=True, exist_ok=True)

  water_weight = models_dir / 'water_seg_best.pt'
  if not water_weight.exists():
    water_weight = 'yolov8n-seg.pt'

  print(f'[*] Loading Dual YOLOv8 Models on {DEVICE}...')
  detector_model = YOLO('yolov8n.pt').to(DEVICE)
  water_model = YOLO(str(water_weight)).to(DEVICE)

  if DEVICE.type == 'cuda':
    try:
      detector_model.model.half()
      water_model.model.half()
      print('[*] Enabled FP16 Half-Precision on NVIDIA GPU')
    except Exception as e:
      print(f'[*] Half-precision notice: {e}')

    # Model warm-up
    print('[*] Warming up Tensor Cores on GPU...')
    dummy = torch.zeros((1, 3, 640, 640), device=DEVICE, dtype=torch.float16 if hasattr(detector_model.model, 'half') else torch.float32)
    with torch.inference_mode():
      detector_model(dummy, verbose=False)
      water_model(dummy, verbose=False)
    torch.cuda.synchronize()
    print('[*] GPU warm-up complete. Ready for real-time inference.')

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
      result = process_frame(
          frame, detector_model, water_model, conf_thresh=conf
      )
      out_file = output_dir / f'annotated_{src.name}'
      cv2.imwrite(str(out_file), result)
      print(f'[+] Processed: {out_file.name}')

    elif ext in ['.mp4', '.avi', '.mov', '.mkv']:
      cap = cv2.VideoCapture(str(src))
      w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
      h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
      fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
      out_file = output_dir / f'annotated_{src.stem}.mp4'
      writer = cv2.VideoWriter(
          str(out_file), cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h)
      )

      while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
          break
        result = process_frame(
            frame, detector_model, water_model, conf_thresh=conf
        )
        writer.write(result)

      cap.release()
      writer.release()
      print(f'[+] Video saved: {out_file.name}')


if __name__ == '__main__':
  parser = argparse.ArgumentParser()
  parser.add_argument(
      '--source', type=str, default=None, help='Path to image/video'
  )
  parser.add_argument(
      '--conf', type=float, default=0.25, help='Confidence threshold'
  )
  args = parser.parse_args()

  run_inference(args.source, args.conf)