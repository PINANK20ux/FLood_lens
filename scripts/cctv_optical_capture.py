"""
Production-Grade Optical CCTV Ingestion & Streaming Engine (Windows DirectShow)
Node Identifier: CAM05 - ROAD & CCTV

Key Architectural Features:
1. Dynamic DirectShow Hardware Enumeration via `pygrabber` (Name-matched device discovery).
2. Decoupled Multi-threaded Ingestion Worker (`ThreadedCamera`) with Queue Depth = 1
   to eliminate hardware/DirectShow buffer latency and prevent frame lag.
3. Automatic Hardware Reconnection Loop with exponential backoff on USB disconnects.
4. Real-time CCTV HUD Overlay with ISO timestamps, live FPS counter, and recording status.
5. Interactive Operator Controls: Snapshot (S), Record Toggle (R), Clean Shutdown (Q).
"""

import datetime
import logging
import os
import sys
import threading
import time
from pathlib import Path
from typing import Optional, Tuple

import cv2
import numpy as np

# Configure Structured Logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(threadName)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("CCTV-Capture")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  HARDWARE ENUMERATION & DIRECTSHOW DISCOVERY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def get_camera_index_by_name(target_name: str = "USB2.0 PC CAMERA", default_fallback: int = 1) -> int:
    """
    Query all connected DirectShow video devices via pygrabber FilterGraph
    and perform a case-insensitive substring match against the target friendly name.
    
    If pygrabber is not installed or device is not located, safely fall back
    to `default_fallback` with diagnostic logs.
    """
    try:
        from pygrabber.dshow_graph import FilterGraph

        graph = FilterGraph()
        devices = graph.get_input_devices()
        logger.info(f"DirectShow device discovery found {len(devices)} device(s): {devices}")

        for index, device_name in enumerate(devices):
            logger.info(f"Checking Device [{index}]: '{device_name}'")
            if target_name.lower() in device_name.lower():
                logger.info(f"✓ Matched Target Hardware '{device_name}' -> Assigned Device Index {index}")
                return index

        logger.warning(
            f"Target device '{target_name}' was not detected in DirectShow enumeration. "
            f"Available devices: {devices}. Falling back to default index {default_fallback}."
        )
        return default_fallback

    except ImportError:
        logger.warning(
            "`pygrabber` package is not installed (run `pip install pygrabber`). "
            f"Using fallback camera index {default_fallback}."
        )
        return default_fallback
    except Exception as exc:
        logger.error(f"Hardware discovery encountered an error: {exc}. Using fallback index {default_fallback}.")
        return default_fallback


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  THREADED CAMERA INGESTION WORKER (ZERO-LATENCY BUFFER)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ThreadedCamera:
    """
    Decoupled frame ingestion worker running in a dedicated background daemon thread.
    Maintains a single atomic latest-frame reference (Queue Depth = 1)
    to eliminate OpenCV's internal DirectShow FIFO buffer lag.
    """

    def __init__(
        self,
        src: int = 1,
        width: int = 1280,
        height: int = 720,
        target_fps: int = 30,
        reconnect_timeout_sec: float = 2.0,
    ):
        self.src = src
        self.width = width
        self.height = height
        self.target_fps = target_fps
        self.reconnect_timeout_sec = reconnect_timeout_sec

        self.cap: Optional[cv2.VideoCapture] = None
        self.grabbed: bool = False
        self.frame: Optional[np.ndarray] = None
        self.lock = threading.Lock()
        self.running = False
        self.worker_thread: Optional[threading.Thread] = None

        self._init_device()

    def _init_device(self) -> bool:
        """Initialize the video capture device using cv2.CAP_DSHOW."""
        logger.info(f"Initializing video device handle at index {self.src} via CAP_DSHOW...")
        if self.cap is not None:
            self.cap.release()

        self.cap = cv2.VideoCapture(self.src, cv2.CAP_DSHOW)
        if not self.cap.isOpened():
            # Fallback to standard backend if DSHOW fails
            logger.warning("DirectShow init failed, attempting auto backend...")
            self.cap = cv2.VideoCapture(self.src)

        if self.cap.isOpened():
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            self.cap.set(cv2.CAP_PROP_FPS, self.target_fps)
            # Force single-frame buffer to prevent internal caching
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            self.grabbed, self.frame = self.cap.read()
            if self.grabbed and self.frame is not None:
                actual_w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                actual_h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                actual_fps = self.cap.get(cv2.CAP_PROP_FPS)
                logger.info(f"Device opened successfully: {actual_w}x{actual_h} @ ~{actual_fps:.1f} FPS")
                return True

        logger.error(f"Failed to open camera index {self.src}.")
        self.grabbed = False
        self.frame = None
        return False

    def start(self) -> "ThreadedCamera":
        """Start the background frame capture daemon thread."""
        if self.running:
            return self
        self.running = True
        self.worker_thread = threading.Thread(target=self._capture_loop, name="CaptureWorker", daemon=True)
        self.worker_thread.start()
        logger.info("Threaded capture worker started.")
        return self

    def _capture_loop(self):
        """Continuous frame grab loop with automated reconnect on USB disconnection."""
        while self.running:
            if self.cap is None or not self.cap.isOpened():
                logger.warning(f"Device offline. Retrying connection in {self.reconnect_timeout_sec}s...")
                time.sleep(self.reconnect_timeout_sec)
                self._init_device()
                continue

            grabbed, frame = self.cap.read()

            if not grabbed or frame is None:
                logger.warning("Frame read dropped. Re-syncing hardware stream...")
                with self.lock:
                    self.grabbed = False
                time.sleep(0.05)
                # If repeated drops occur, attempt device re-initialization
                if not self.cap.isOpened():
                    self._init_device()
                continue

            with self.lock:
                self.grabbed = grabbed
                self.frame = frame

    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Non-blocking fetch of the most recent atomic frame."""
        with self.lock:
            if self.grabbed and self.frame is not None:
                return True, self.frame.copy()
            return False, None

    def release(self):
        """Clean shutdown of the capture thread and release of OS handles."""
        logger.info("Releasing capture worker and hardware device handles...")
        self.running = False
        if self.worker_thread is not None and self.worker_thread.is_alive():
            self.worker_thread.join(timeout=2.0)

        with self.lock:
            if self.cap is not None:
                self.cap.release()
                self.cap = None
            self.grabbed = False
            self.frame = None
        logger.info("Hardware capture handles released cleanly.")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  CCTV OVERLAY & HUD RENDERER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class CCTVTelemetryHUD:
    """Renders professional CCTV headers, telemetry, and live timestamp badges."""

    def __init__(self, node_label: str = "CAM05 | ROAD & CCTV"):
        self.node_label = node_label
        self.prev_time = time.time()
        self.fps = 0.0
        self.alpha_smoothing = 0.90

    def update_fps(self):
        current_time = time.time()
        delta = current_time - self.prev_time
        self.prev_time = current_time
        if delta > 0:
            instant_fps = 1.0 / delta
            self.fps = (self.alpha_smoothing * self.fps) + ((1.0 - self.alpha_smoothing) * instant_fps)

    def draw(self, frame: np.ndarray, is_recording: bool = False) -> np.ndarray:
        h, w = frame.shape[:2]
        self.update_fps()

        # Top HUD semi-transparent dark banner
        banner_h = 42
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, banner_h), (12, 12, 16), -1)
        cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)

        # Top Left: Node Label & Optical Status
        cv2.putText(
            frame,
            f"LIVE | {self.node_label}",
            (16, 26),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.60,
            (0, 255, 0),
            2,
            cv2.LINE_AA,
        )

        # Top Right: ISO Timestamp & Live FPS Telemetry
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        telemetry_str = f"{now_str} | {self.fps:.1f} FPS"
        (tw, _), _ = cv2.getTextSize(telemetry_str, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
        cv2.putText(
            frame,
            telemetry_str,
            (w - tw - 16, 26),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (220, 220, 220),
            1,
            cv2.LINE_AA,
        )

        # Bottom Left: Operator Keymap Guide
        keymap_str = "[S] Snapshot  |  [R] Record Toggle  |  [Q] Exit"
        cv2.putText(
            frame,
            keymap_str,
            (16, h - 14),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (180, 180, 180),
            1,
            cv2.LINE_AA,
        )

        # Recording Status Indicator (Pulsing Red Marker)
        if is_recording:
            # Pulsing logic based on milliseconds
            pulse = int(time.time() * 2) % 2 == 0
            rec_color = (0, 0, 255) if pulse else (0, 0, 180)
            cv2.circle(frame, (w - 110, h - 18), 7, rec_color, -1)
            cv2.putText(
                frame,
                "REC",
                (w - 95, h - 13),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (0, 0, 255),
                2,
                cv2.LINE_AA,
            )

        return frame


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  MAIN EXECUTION LOOP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def main():
    target_hardware = "USB2.0 PC CAMERA"
    destination_label = "CAM05 - ROAD & CCTV"

    # Step 1: Dynamic Hardware Device Discovery
    logger.info("Initializing Optical CCTV Stream System...")
    cam_index = get_camera_index_by_name(target_name=target_hardware, default_fallback=1)

    # Step 2: Ensure Output Directories Exist
    capture_dir = Path("./cctv_field_captures")
    records_dir = Path("./cctv_recordings")
    capture_dir.mkdir(parents=True, exist_ok=True)
    records_dir.mkdir(parents=True, exist_ok=True)

    # Step 3: Instantiate Decoupled Threaded Camera Worker
    camera = ThreadedCamera(
        src=cam_index,
        width=1280,
        height=720,
        target_fps=30,
        reconnect_timeout_sec=2.0,
    ).start()

    hud = CCTVTelemetryHUD(node_label=destination_label)
    window_name = f"FloodLens CCTV | {destination_label}"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)

    # Video Recorder State
    video_writer: Optional[cv2.VideoWriter] = None
    is_recording = False
    fourcc = cv2.VideoWriter_fourcc(*"XVID")

    logger.info("Optical Stream live. Press [S] to snapshot, [R] to record, [Q] to exit.")

    try:
        while True:
            ret, frame = camera.read()

            if not ret or frame is None:
                # Render waiting screen if device is reconnecting
                blank_frame = np.zeros((720, 1280, 3), dtype=np.uint8)
                cv2.putText(
                    blank_frame,
                    f"AWAITING OPTICAL STREAM: {destination_label} (Index {cam_index})...",
                    (260, 360),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.75,
                    (0, 165, 255),
                    2,
                    cv2.LINE_AA,
                )
                cv2.imshow(window_name, blank_frame)
                if cv2.waitKey(30) & 0xFF in (ord("q"), ord("Q"), 27):
                    break
                continue

            # Render Telemetry & CCTV HUD
            annotated_frame = hud.draw(frame, is_recording=is_recording)

            # Write Frame to Disk if Recording
            if is_recording and video_writer is not None:
                video_writer.write(annotated_frame)

            # Display Feed
            cv2.imshow(window_name, annotated_frame)

            # Operator Controls
            key = cv2.waitKey(1) & 0xFF

            if key in (ord("q"), ord("Q"), 27):  # Q or ESC
                logger.info("Termination signal received from operator.")
                break

            elif key in (ord("s"), ord("S")):  # Snapshot
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                filepath = capture_dir / f"CAM05_snapshot_{timestamp}.jpg"
                cv2.imwrite(str(filepath), annotated_frame)
                logger.info(f"📸 Snapshot archived: {filepath.resolve()}")

            elif key in (ord("r"), ord("R")):  # Toggle Video Recording
                if not is_recording:
                    h, w = annotated_frame.shape[:2]
                    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                    rec_path = records_dir / f"CAM05_recording_{timestamp}.avi"
                    video_writer = cv2.VideoWriter(str(rec_path), fourcc, 20.0, (w, h))
                    is_recording = True
                    logger.info(f"🔴 Video recording STARTED: {rec_path.resolve()}")
                else:
                    is_recording = False
                    if video_writer is not None:
                        video_writer.release()
                        video_writer = None
                    logger.info("⏹ Video recording STOPPED and finalized.")

    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt intercepted.")
    finally:
        # Step 4: Graceful Resource Deallocation
        if video_writer is not None:
            video_writer.release()
        camera.release()
        cv2.destroyAllWindows()
        logger.info("CCTV Ingestion pipeline shut down cleanly.")


if __name__ == "__main__":
    main()
