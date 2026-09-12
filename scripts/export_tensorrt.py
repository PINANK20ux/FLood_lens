"""
FloodLens TensorRT Model Export & Benchmark Utility
Exports PyTorch YOLOv8 models (Object Detection & Water Segmentation) to TensorRT .engine format.

Enforces fixed inference dimensions (batch=1, imgsz=480, half=True, device=0)
to prevent shape mismatch and maximize RTX GPU Tensor Core utilization.
"""

import argparse
import os
import sys
import time
from pathlib import Path
import cv2
import numpy as np
import torch
from ultralytics import YOLO


def check_cuda():
    """Assert CUDA availability on NVIDIA hardware."""
    if not torch.cuda.is_available():
        raise RuntimeError(
            "TensorRT export requires an active NVIDIA GPU with CUDA support, "
            "but torch.cuda.is_available() returned False."
        )
    gpu_name = torch.cuda.get_device_name(0)
    print(f"[CUDA] Found GPU: {gpu_name}")
    print(f"[CUDA] Total VRAM: {torch.cuda.get_device_properties(0).total_memory / (1024**3):.2f} GB")


def export_model_to_tensorrt(
    model_path: str,
    imgsz: int = 480,
    batch_size: int = 1,
    half: bool = True,
    device: int = 0,
    workspace: int = 4,
) -> Path:
    """
    Export a YOLOv8 PyTorch model (.pt) to TensorRT (.engine) with fixed dimensions.
    """
    model_file = Path(model_path).resolve()
    if not model_file.exists():
        raise FileNotFoundError(f"Model file not found at: {model_file}")

    print("=" * 65)
    print(f"[*] Exporting Model to TensorRT Engine: {model_file.name}")
    print(f"    - Input Resolution : {imgsz}x{imgsz}")
    print(f"    - Batch Size       : {batch_size}")
    print(f"    - FP16 Precision   : {half}")
    print(f"    - Target Device    : cuda:{device}")
    print(f"    - Workspace (GB)   : {workspace}")
    print("=" * 65)

    model = YOLO(str(model_file))

    # Export using Ultralytics TensorRT exporter with explicit fixed dimensions
    exported_path = model.export(
        format="engine",
        imgsz=imgsz,
        batch=batch_size,
        half=half,
        device=device,
        workspace=workspace,
        dynamic=False,  # Fixed shape prevents dimension-mismatch errors
        verbose=True,
    )

    engine_path = Path(exported_path)
    print(f"[+] Successfully exported TensorRT engine: {engine_path.resolve()}")
    return engine_path


def benchmark_model(model_path: str, imgsz: int = 480, iterations: int = 100, device: int = 0):
    """
    Benchmark inference latency and FPS for a PyTorch (.pt) or TensorRT (.engine) model.
    """
    print(f"\n[*] Benchmarking: {model_path} ({iterations} iterations)...")
    model = YOLO(str(model_path))

    # Create dummy frame
    dummy_frame = np.random.randint(0, 255, (imgsz, imgsz, 3), dtype=np.uint8)

    # Warm-up (10 runs)
    print("    - Warming up...")
    for _ in range(10):
        _ = model.predict(source=dummy_frame, imgsz=imgsz, device=device, half=True, verbose=False)

    if torch.cuda.is_available():
        torch.cuda.synchronize()

    # Latency Timing
    start_time = time.perf_counter()
    for _ in range(iterations):
        _ = model.predict(source=dummy_frame, imgsz=imgsz, device=device, half=True, verbose=False)
    
    if torch.cuda.is_available():
        torch.cuda.synchronize()

    total_time = time.perf_counter() - start_time
    avg_latency_ms = (total_time / iterations) * 1000.0
    fps = iterations / total_time

    print(f"    ✓ Latency: {avg_latency_ms:.2f} ms | Throughput: {fps:.1f} FPS")
    return avg_latency_ms, fps


def main():
    parser = argparse.ArgumentParser(description="FloodLens TensorRT Export & Benchmark Utility")
    parser.add_argument("--model", type=str, default=None, help="Path to specific .pt model to export")
    parser.add_argument("--all", action="store_true", help="Export both detector and water segmentation models")
    parser.add_argument("--imgsz", type=int, default=480, help="Inference resolution (default: 480)")
    parser.add_argument("--batch", type=int, default=1, help="Fixed batch size (default: 1)")
    parser.add_argument("--device", type=int, default=0, help="GPU device ID (default: 0)")
    parser.add_argument("--benchmark", action="store_true", help="Run benchmark after export")
    parser.add_argument("--allow-cpu-check", action="store_true", help="Do not exit if CUDA is not found")
    args = parser.parse_args()

    base_dir = Path(__file__).resolve().parent.parent
    models_dir = base_dir / "models"
    backend_dir = base_dir / "backend"

    try:
        check_cuda()
    except RuntimeError as e:
        if args.allow_cpu_check:
            print(f"[!] Warning: {e}")
        else:
            print(f"[ERROR] {e}")
            sys.exit(1)

    targets = []
    if args.model:
        targets.append(Path(args.model))
    elif args.all or args.model is None:
        # Default models in project
        det_pt = backend_dir / "yolov8n.pt"
        if not det_pt.exists():
            det_pt = base_dir / "yolov8n.pt"
        if det_pt.exists():
            targets.append(det_pt)

        water_pt = models_dir / "water_seg_best.pt"
        if not water_pt.exists():
            water_pt = backend_dir / "yolov8n-seg.pt"
        if water_pt.exists():
            targets.append(water_pt)

    if not targets:
        print("[!] No valid model files found to export.")
        sys.exit(1)

    exported_engines = []
    for target in targets:
        try:
            engine = export_model_to_tensorrt(
                model_path=str(target),
                imgsz=args.imgsz,
                batch_size=args.batch,
                half=True,
                device=args.device,
            )
            exported_engines.append(engine)
        except Exception as err:
            print(f"[!] Export failed for {target.name}: {err}")

    if args.benchmark and exported_engines:
        print("\n" + "=" * 65)
        print("   TENSORRT BENCHMARK RESULTS (Fixed Shape: batch=1, imgsz=480)")
        print("=" * 65)
        for engine in exported_engines:
            benchmark_model(str(engine), imgsz=args.imgsz, device=args.device)


if __name__ == "__main__":
    main()
