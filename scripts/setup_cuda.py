"""
FloodLens PyTorch CUDA Environment Verification & Setup Utility
Checks GPU availability, NVIDIA drivers, and automates CUDA PyTorch installation.
"""

import os
import sys
import subprocess
import shutil

# Ensure UTF-8 stdout encoding on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def check_nvidia_smi():
    """Check if nvidia-smi is available and retrieve driver information."""
    smi_path = shutil.which("nvidia-smi")
    if not smi_path:
        return False, "nvidia-smi not found in PATH. Ensure NVIDIA graphics drivers are installed."
    try:
        output = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,driver_version,memory.total", "--format=csv,noheader"],
            text=True,
            stderr=subprocess.STDOUT
        )
        return True, output.strip()
    except Exception as e:
        return False, f"Failed to query nvidia-smi: {e}"


def check_pytorch_cuda():
    """Check current PyTorch installation for CUDA support."""
    try:
        import torch
        version = torch.__version__
        cuda_built = getattr(torch.version, "cuda", None)
        cuda_avail = torch.cuda.is_available()
        gpu_name = torch.cuda.get_device_name(0) if cuda_avail else "None"
        return {
            "installed": True,
            "torch_version": version,
            "cuda_built_version": cuda_built,
            "cuda_available": cuda_avail,
            "gpu_name": gpu_name
        }
    except ImportError:
        return {
            "installed": False,
            "torch_version": None,
            "cuda_built_version": None,
            "cuda_available": False,
            "gpu_name": "None"
        }


def print_status():
    print("=" * 70)
    print("   FLOODLENS PYTORCH & NVIDIA CUDA RUNTIME DIAGNOSTIC")
    print("=" * 70)

    # 1. Hardware & Driver Check
    smi_ok, smi_info = check_nvidia_smi()
    print(f"[*] NVIDIA System Driver : {'[OK] DETECTED' if smi_ok else '[!] NOT DETECTED'}")
    if smi_ok:
        for line in smi_info.splitlines():
            print(f"    - GPU Telemetry      : {line}")
    else:
        print(f"    - Notice             : {smi_info}")

    # 2. PyTorch CUDA Status
    pt_status = check_pytorch_cuda()
    print(f"[*] PyTorch Installation : {pt_status['torch_version'] or 'Not installed'}")
    print(f"[*] PyTorch CUDA Build   : {pt_status['cuda_built_version'] or 'CPU-only'}")
    print(f"[*] torch.cuda.is_available(): {pt_status['cuda_available']}")
    if pt_status['cuda_available']:
        print(f"[*] Active GPU Device    : {pt_status['gpu_name']}")
    print("=" * 70)

    if pt_status['cuda_available']:
        print("\n[SUCCESS] PyTorch CUDA acceleration is active and ready for 30+ FPS inference!")
        return True
    else:
        print("\n[!] PyTorch is currently running in CPU-only mode.")
        print("To enable full hardware acceleration on your NVIDIA RTX GPU, run:\n")
        print("  pip uninstall -y torch torchvision torchaudio")
        print("  pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121")
        print("\nAlternatively, for temporary CPU testing (constrained to 2-6 FPS), set:")
        print("  FLOODLENS_ALLOW_CPU=1 in your backend/.env file\n")
        return False


def install_cuda_pytorch():
    print("\n[*] Starting automatic CUDA 12.1 PyTorch installation...")
    try:
        print("[1/2] Uninstalling existing CPU packages...")
        subprocess.check_call([sys.executable, "-m", "pip", "uninstall", "-y", "torch", "torchvision", "torchaudio"])

        print("\n[2/2] Installing PyTorch with CUDA 12.1 wheels...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install",
            "torch", "torchvision", "torchaudio",
            "--index-url", "https://download.pytorch.org/whl/cu121"
        ])
        print("\n[SUCCESS] Installation complete. Re-verifying CUDA status...\n")
        print_status()
    except subprocess.CalledProcessError as e:
        print(f"\n[ERROR] Installation command failed with exit code {e.returncode}")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="FloodLens CUDA Environment Setup")
    parser.add_argument("--install", action="store_true", help="Automatically run pip install for CUDA PyTorch")
    args = parser.parse_args()

    is_active = print_status()

    if args.install and not is_active:
        install_cuda_pytorch()


if __name__ == "__main__":
    main()
