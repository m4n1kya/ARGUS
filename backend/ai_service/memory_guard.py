"""ARGUS Memory Guard & Resource Conservation Suite.
Enforces strict memory caps (<512MB) for cloud environments (Render Free Tier).
Provides explicit glibc malloc_trim, PyTorch thread capping, and memory eviction.
"""

import os
import gc
import sys
import ctypes
import logging

logger = logging.getLogger("argus.memory_guard")

# Set OS-level thread limits before OpenMP creates thread pools
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"


def apply_thread_and_runtime_limits():
    """Cap numerical libraries to single-threaded execution to prevent memory multiplication."""
    if "torch" in sys.modules:
        try:
            torch = sys.modules["torch"]
            torch.set_num_threads(1)
            torch.set_num_interop_threads(1)
        except Exception:
            pass


def release_system_memory(label: str = "general"):
    """Force Python garbage collection and release glibc arena memory back to OS kernel."""
    # 1. Python GC
    collected = gc.collect()

    # 2. PyTorch cache if already in memory
    if "torch" in sys.modules:
        try:
            torch = sys.modules["torch"]
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except Exception:
            pass

    # 3. Linux glibc malloc_trim (forces heap memory release back to Linux kernel)
    trimmed = False
    try:
        libc = ctypes.CDLL("libc.so.6")
        if hasattr(libc, "malloc_trim"):
            res = libc.malloc_trim(0)
            trimmed = (res == 1)
    except Exception:
        pass

    # 4. Read resident memory if on Linux
    rss_mb = None
    try:
        with open("/proc/self/status", "r") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    parts = line.split()
                    rss_kb = float(parts[1])
                    rss_mb = round(rss_kb / 1024.0, 2)
                    break
    except Exception:
        pass

    if rss_mb is not None:
        logger.info(
            "[%s] Memory cleanup: GC collected=%d, malloc_trim=%s, Resident RSS=%.2f MB / 512 MB limit",
            label, collected, trimmed, rss_mb
        )
    else:
        logger.info("[%s] Memory cleanup complete: GC collected=%d, malloc_trim=%s", label, collected, trimmed)
