"""
FloodLens AI - Standalone Water Segmentation CLI Evaluation Tool
================================================================
Evaluates the trained YOLOv8 water segmentation model (water_seg.pt) on a batch
of flood imagery, calculates quantitative flood severity analytics, renders visual
overlays with telemetry HUDs, displays a formatted terminal summary table,
and exports an aggregated summary JSON report.

Usage:
    python test_water_model.py --input-dir test_images/ --output-dir test_results/
"""

from __future__ import annotations

import argparse
import json
import logging
import shutil
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2

# Ensure backend root is on sys.path when executed directly
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from app.services.water_seg_service import MODEL_PATH, process_image

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("floodlens.eval")

# ANSI terminal colors for formatted table output
COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"
COLOR_RED = "\033[91m"
COLOR_YELLOW = "\033[93m"
COLOR_GREEN = "\033[92m"
COLOR_CYAN = "\033[96m"
COLOR_GRAY = "\033[90m"


def seed_sample_images_if_empty(target_dir: Path) -> None:
    """
    If the target input directory is empty or does not exist, populate it
    automatically with available camera frames from the project repository.
    """
    target_dir.mkdir(parents=True, exist_ok=True)
    existing_images = [
        f for f in target_dir.iterdir()
        if f.suffix.lower() in {".jpg", ".jpeg", ".png"}
    ]
    if existing_images:
        return

    logger.info("Test images folder is empty. Auto-seeding test imagery from repository...")
    potential_sources = [
        SCRIPT_DIR.parent / "frontend" / "public" / "test_cameras",
        SCRIPT_DIR / "app" / "static" / "snapshots",
    ]

    copied_count = 0
    for src_dir in potential_sources:
        if src_dir.exists():
            for src_file in src_dir.iterdir():
                if src_file.suffix.lower() in {".jpg", ".jpeg", ".png"}:
                    dest_file = target_dir / src_file.name
                    if not dest_file.exists():
                        shutil.copy2(src_file, dest_file)
                        copied_count += 1

    if copied_count > 0:
        logger.info("Successfully populated %d sample images into: %s", copied_count, target_dir)


def format_severity_terminal(severity: str) -> str:
    """Return severity string wrapped in ANSI terminal colors."""
    if severity == "Critical":
        return f"{COLOR_BOLD}{COLOR_RED}{severity:<9}{COLOR_RESET}"
    elif severity == "Moderate":
        return f"{COLOR_BOLD}{COLOR_YELLOW}{severity:<9}{COLOR_RESET}"
    else:
        return f"{COLOR_BOLD}{COLOR_GREEN}{severity:<9}{COLOR_RESET}"


def print_summary_table(results: List[Dict[str, Any]]) -> None:
    """Print a clean, aligned terminal summary table."""
    col_widths = {
        "num": 4,
        "name": 26,
        "water_pct": 11,
        "severity": 10,
        "flood": 16,
        "pixels": 22,
    }

    divider = (
        "+" + "-" * (col_widths["num"] + 2)
        + "+" + "-" * (col_widths["name"] + 2)
        + "+" + "-" * (col_widths["water_pct"] + 2)
        + "+" + "-" * (col_widths["severity"] + 2)
        + "+" + "-" * (col_widths["flood"] + 2)
        + "+" + "-" * (col_widths["pixels"] + 2)
        + "+"
    )

    print("\n" + "=" * 94)
    print(f"{COLOR_BOLD}{COLOR_CYAN}FLOODLENS AI - WATER SEGMENTATION EVALUATION RESULTS{COLOR_RESET}".center(104))
    print("=" * 94)
    print(divider)
    print(
        f"| {'#':<{col_widths['num']}} "
        f"| {'Image Name':<{col_widths['name']}} "
        f"| {'Water %':<{col_widths['water_pct']}} "
        f"| {'Severity':<{col_widths['severity']}} "
        f"| {'Flood Detected':<{col_widths['flood']}} "
        f"| {'Water / Total Pixels':<{col_widths['pixels']}} |"
    )
    print(divider)

    for idx, r in enumerate(results, 1):
        name = r["image_name"]
        if len(name) > col_widths["name"]:
            name = name[: col_widths["name"] - 3] + "..."

        water_pct_str = f"{r['water_surface_percentage']:.2f}%"
        sev_color = format_severity_terminal(r["severity_level"])
        flood_flag = f"{COLOR_RED}YES (ACTIVE){COLOR_RESET}" if r["flood_detected"] else f"{COLOR_GREEN}NO (SAFE){COLOR_RESET}"
        flood_pad = " " * (col_widths["flood"] - (12 if r["flood_detected"] else 9))
        pixels_str = f"{r['water_pixel_count']:,} / {r['total_pixels']:,}"

        print(
            f"| {idx:<{col_widths['num']}} "
            f"| {name:<{col_widths['name']}} "
            f"| {water_pct_str:<{col_widths['water_pct']}} "
            f"| {sev_color} "
            f"| {flood_flag}{flood_pad} "
            f"| {pixels_str:<{col_widths['pixels']}} |"
        )

    print(divider + "\n")


def run_evaluation(
    input_dir_path: str,
    output_dir_path: str,
    weights_path: Optional[str] = None,
    conf_threshold: float = 0.25,
    save_masks: bool = False,
) -> Dict[str, Any]:
    """
    Main evaluation pipeline:
    1. Discovers all test images in the input directory.
    2. Runs water instance segmentation on each image.
    3. Saves annotated visual overlay images.
    4. Computes per-image and aggregate summary statistics.
    5. Exports results to summary.json and prints terminal table.
    """
    input_dir = Path(input_dir_path).resolve()
    output_dir = Path(output_dir_path).resolve()

    # Automatically seed sample images if folder is empty or absent
    seed_sample_images_if_empty(input_dir)

    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    # Scan for valid image files
    valid_exts = {".jpg", ".jpeg", ".png"}
    image_paths = sorted([
        p for p in input_dir.iterdir()
        if p.is_file() and p.suffix.lower() in valid_exts
    ])

    if not image_paths:
        logger.warning("No image files (.jpg, .jpeg, .png) found in: %s", input_dir)
        return {
            "total_images_processed": 0,
            "average_flood_coverage": 0.0,
            "high_risk_flags": 0,
            "results": [],
        }

    logger.info("Starting evaluation on %d test images...", len(image_paths))
    logger.info("Input directory:  %s", input_dir)
    logger.info("Output directory: %s", output_dir)
    logger.info("Model weights:    %s", weights_path or MODEL_PATH)

    processed_results: List[Dict[str, Any]] = []
    high_risk_list: List[Dict[str, Any]] = []
    severity_counter = {"Low": 0, "Moderate": 0, "Critical": 0}
    total_coverage = 0.0

    start_batch_time = time.perf_counter()

    for idx, img_path in enumerate(image_paths, 1):
        t0 = time.perf_counter()
        try:
            # Run segmentation and metrics pipeline
            res = process_image(
                image_input=img_path,
                conf_threshold=conf_threshold,
                custom_model_path=weights_path,
            )
            elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 1)

            water_pct = res["water_surface_percentage"]
            severity = res["severity_level"]
            flood_detected = res["flood_detected"]
            total_coverage += water_pct
            severity_counter[severity] = severity_counter.get(severity, 0) + 1

            # Save annotated overlay image
            output_img_path = output_dir / img_path.name
            cv2.imwrite(str(output_img_path), res["overlay_image"])

            # Optional: save isolated binary mask
            if save_masks and "binary_mask" in res:
                mask_path = output_dir / f"{img_path.stem}_mask.png"
                cv2.imwrite(str(mask_path), res["binary_mask"])

            result_entry = {
                "image_name": img_path.name,
                "water_pixel_count": res["water_pixel_count"],
                "total_pixels": res["total_pixels"],
                "water_surface_percentage": water_pct,
                "severity_level": severity,
                "flood_detected": flood_detected,
                "inference_time_ms": elapsed_ms,
                "output_image_path": str(output_img_path),
            }
            processed_results.append(result_entry)

            # High-risk flag: Critical severity level (>40% water coverage)
            if severity == "Critical":
                high_risk_list.append({
                    "image_name": img_path.name,
                    "water_surface_percentage": water_pct,
                    "severity_level": severity,
                })

            logger.info(
                "[%d/%d] Processed %s -> Water: %.2f%% | Severity: %s (%s ms)",
                idx,
                len(image_paths),
                img_path.name,
                water_pct,
                severity,
                elapsed_ms,
            )

        except Exception as err:
            logger.error("Failed to process %s: %s", img_path.name, err, exc_info=True)

    batch_duration_sec = round(time.perf_counter() - start_batch_time, 2)
    total_processed = len(processed_results)
    avg_coverage = round(total_coverage / total_processed, 2) if total_processed > 0 else 0.0

    # Print clean terminal summary table
    if processed_results:
        print_summary_table(processed_results)

    # Build aggregated summary JSON
    summary_data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_images_processed": total_processed,
        "average_flood_coverage": avg_coverage,
        "high_risk_flags": len(high_risk_list),
        "high_risk_images": high_risk_list,
        "severity_breakdown": severity_counter,
        "batch_duration_seconds": batch_duration_sec,
        "model_weights": str(weights_path or MODEL_PATH),
        "results": processed_results,
    }

    # Export aggregated summary JSON file
    summary_path = output_dir / "summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2)

    logger.info("Evaluation complete! Aggregated summary exported to: %s", summary_path)
    print(f"{COLOR_BOLD}Evaluation Summary:{COLOR_RESET}")
    print(f" - Total Images Processed: {total_processed}")
    print(f" - Average Flood Coverage: {avg_coverage:.2f}%")
    print(f" - High-Risk Alerts:       {len(high_risk_list)}")
    print(f" - Low Severity Images:    {severity_counter.get('Low', 0)}")
    print(f" - Moderate Severity:      {severity_counter.get('Moderate', 0)}")
    print(f" - Critical Severity:      {severity_counter.get('Critical', 0)}")
    print(f" - Outputs Saved To:       {output_dir}\n")

    return summary_data


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="FloodLens YOLOv8 Water Segmentation CLI Evaluation Tool",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    # Default input directory: test_images/ in current dir or script dir
    default_input = SCRIPT_DIR / "test_images"
    default_output = SCRIPT_DIR / "test_results"

    parser.add_argument(
        "-i", "--input-dir",
        type=str,
        default=str(default_input),
        help="Path to directory containing test flood images (.jpg, .jpeg, .png)",
    )
    parser.add_argument(
        "-o", "--output-dir",
        type=str,
        default=str(default_output),
        help="Path to directory where annotated images and summary.json will be saved",
    )
    parser.add_argument(
        "-w", "--weights",
        type=str,
        default=None,
        help="Path to custom YOLOv8 segmentation weights file (.pt)",
    )
    parser.add_argument(
        "-c", "--conf",
        type=float,
        default=0.25,
        help="Confidence threshold for segmentation masks",
    )
    parser.add_argument(
        "--save-masks",
        action="store_true",
        help="Also export isolated binary mask images into the output directory",
    )

    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    try:
        run_evaluation(
            input_dir_path=args.input_dir,
            output_dir_path=args.output_dir,
            weights_path=args.weights,
            conf_threshold=args.conf,
            save_masks=args.save_masks,
        )
    except KeyboardInterrupt:
        logger.warning("Evaluation interrupted by user.")
        sys.exit(130)
    except Exception as e:
        logger.critical("Fatal evaluation error: %s", e, exc_info=True)
        sys.exit(1)
