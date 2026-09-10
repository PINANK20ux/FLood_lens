import os
import sys
import shutil
from pathlib import Path
import cv2
import torch
from ultralytics import YOLO

def train_and_verify():
    base_dir = Path(__file__).resolve().parent.parent
    data_yaml = base_dir / "data" / "data.yaml"
    models_dir = base_dir / "models"
    output_dir = base_dir / "output"
    models_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not data_yaml.exists():
        print(f"[!] data.yaml not found at {data_yaml}. Please run convert_coco_to_yolo.py first.")
        sys.exit(1)

    print("=" * 65)
    print("   YOLOv8 Segmentation Training - Flood / Water Detection")
    print("=" * 65)
    print(f"[*] PyTorch Version : {torch.__version__}")
    print(f"[*] CUDA Available  : {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"[*] GPU Device      : {torch.cuda.get_device_name(0)}")
        print(f"[*] Total VRAM      : {torch.cuda.get_device_properties(0).total_memory / (1024**3):.2f} GB")
    print(f"[*] Dataset Config  : {data_yaml}")
    print("=" * 65)

    device = 0 if torch.cuda.is_available() else "cpu"
    batch_size = 8
    model_name = "yolov8n-seg.pt"

    print(f"[*] Loading model {model_name}...")
    model = YOLO(model_name)

    try:
        print(f"[*] Starting training: epochs=40, batch={batch_size}, imgsz=640, device={device}, workers=2...")
        model.train(
            data=str(data_yaml),
            epochs=40,
            imgsz=640,
            batch=batch_size,
            device=device,
            workers=2,
            project=str(base_dir / "runs"),
            name="water_seg_train",
            exist_ok=True,
            amp=True
        )
    except Exception as e:
        if "CUDA out of memory" in str(e) or isinstance(e, torch.cuda.OutOfMemoryError):
            print(f"\n[!] CUDA OOM encountered with batch={batch_size}. Retrying automatically with batch=4...")
            torch.cuda.empty_cache()
            batch_size = 4
            model = YOLO(model_name)
            model.train(
                data=str(data_yaml),
                epochs=40,
                imgsz=640,
                batch=batch_size,
                device=device,
                workers=2,
                project=str(base_dir / "runs"),
                name="water_seg_train",
                exist_ok=True,
                amp=True
            )
        else:
            raise e

    # Locate and copy best.pt
    dest_weight = models_dir / "water_seg_best.pt"
    best_pt = base_dir / "runs" / "water_seg_train" / "weights" / "best.pt"
    if hasattr(model, 'trainer') and hasattr(model.trainer, 'best') and Path(model.trainer.best).exists():
        best_pt = Path(model.trainer.best)

    if best_pt.exists():
        shutil.copy(best_pt, dest_weight)
        print(f"\n[+] Successfully exported best model weights to: {dest_weight}")
    else:
        print(f"\n[!] Warning: best.pt not found at {best_pt}")

    # Step 3: Standalone Verification
    print("\n[*] Running Step 3: Standalone Verification on validation image...")
    trained_model = YOLO(str(dest_weight if dest_weight.exists() else best_pt))
    
    # Pick a test/valid image
    valid_images = list((base_dir / "data" / "valid" / "images").glob("*.jpg")) or list((base_dir / "data" / "test" / "images").glob("*.jpg"))
    if valid_images:
        sample_img = valid_images[0]
        print(f"[*] Running inference on: {sample_img.name}")
        results = trained_model.predict(str(sample_img), conf=0.25, imgsz=640, device=device)
        res_plot = results[0].plot()
        out_pred_path = output_dir / "test_prediction.jpg"
        cv2.imwrite(str(out_pred_path), res_plot)
        print(f"[+] Saved visual verification output to: {out_pred_path}")
    else:
        print("[!] No validation images found to test.")

    print("\n[+] Training and standalone verification pipeline complete!")

if __name__ == "__main__":
    train_and_verify()
