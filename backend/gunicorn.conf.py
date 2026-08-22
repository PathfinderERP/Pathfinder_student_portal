"""
Gunicorn configuration for Pathfinder Student Portal (AWS EC2).

Tune these settings based on your EC2 instance size:
  - t3.small  (2 vCPU, 2GB)  : workers=3,  threads=2
  - t3.medium (2 vCPU, 4GB)  : workers=5,  threads=2
  - t3.large  (2 vCPU, 8GB)  : workers=5,  threads=4
  - c5.xlarge (4 vCPU, 8GB)  : workers=9,  threads=2

Formula: workers = (2 × CPU cores) + 1

Start Gunicorn with:
  gunicorn core.wsgi:application -c gunicorn.conf.py
"""

import multiprocessing
import os

# ---------------------------------------------------------------------------
# Workers
# ---------------------------------------------------------------------------
# (2 × CPU cores) + 1 — uses all available CPU without over-committing memory
workers = (multiprocessing.cpu_count() * 2) + 1

# Threads per worker — allows each worker to handle more concurrent I/O requests.
# Especially useful because Django hits MongoDB Atlas (network I/O).
threads = 2

# Worker class — sync is fine for Django + MongoDB (no async needed).
worker_class = "sync"

# ---------------------------------------------------------------------------
# Timeouts
# ---------------------------------------------------------------------------
# Kill & restart a worker if it doesn't respond within 120 seconds.
# Prevents one slow MongoDB query from blocking the whole server.
timeout = 120

# Graceful shutdown — wait 30s for in-flight requests before killing workers.
graceful_timeout = 30

# ---------------------------------------------------------------------------
# Keep-Alive
# ---------------------------------------------------------------------------
# Keep connections open for 5 seconds to avoid TCP handshake overhead.
keepalive = 5

# ---------------------------------------------------------------------------
# Binding
# ---------------------------------------------------------------------------
# Bind to TCP port 8000. If behind Nginx, you can switch to a unix socket:
#   bind = "unix:/tmp/gunicorn.sock"
bind = "0.0.0.0:8000"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
# Log to stdout so systemd / AWS CloudWatch can capture it.
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Log format includes response time (microseconds) — useful for spotting slow endpoints.
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s %(D)sus'

# ---------------------------------------------------------------------------
# Process management
# ---------------------------------------------------------------------------
# Restart workers after 1000 requests to prevent memory leaks
# from long-running Djongo/MongoDB cursor accumulation.
max_requests = 1000
max_requests_jitter = 100  # Stagger restarts so not all workers restart simultaneously

# Preload the app before forking — saves memory (shared code pages).
preload_app = True
