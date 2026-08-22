"""
Gunicorn configuration for Pathfinder Student Portal.
Instance: AWS EC2 m6a.4xlarge (16 vCPU, 64 GB RAM)

Formula: workers = (2 x CPU cores) + 1 = (2 x 16) + 1 = 33
Effective concurrency: 33 workers x 4 threads = 132 simultaneous requests

Start Gunicorn with:
    cd /path/to/backend
    gunicorn core.wsgi:application -c gunicorn.conf.py
"""

import os

# ---------------------------------------------------------------------------
# Workers — hardcoded for m6a.4xlarge (16 vCPU)
# ---------------------------------------------------------------------------
# 33 workers fully saturates all 16 cores. With preload_app=True, memory
# is shared via copy-on-write so 33 workers costs far less than 33x app size.
workers = 33

# 4 threads per worker. Each worker handles 4 concurrent I/O-bound requests
# (MongoDB Atlas queries, ERP calls, etc.) without blocking.
# 33 workers x 4 threads = 132 concurrent request handlers.
threads = 4

# Sync workers are correct for Django + Djongo (no async framework).
worker_class = "sync"

# ---------------------------------------------------------------------------
# Binding
# ---------------------------------------------------------------------------
# Unix socket — matches the Nginx upstream config on this EC2 server.
# Faster than TCP (no network stack overhead for local Nginx → Gunicorn traffic).
bind = "unix:/home/ubuntu/Pathfinder_student_portal/backend/gunicorn.sock"

# ---------------------------------------------------------------------------
# Timeouts
# ---------------------------------------------------------------------------
# With m6a.4xlarge there's no excuse for slow workers, but MongoDB Atlas
# can occasionally spike. 60s is plenty — was 120s, tightened to fail faster.
timeout = 60

# Give in-flight requests 30s to complete during a graceful reload (git pull + restart).
graceful_timeout = 30

# ---------------------------------------------------------------------------
# Connection keep-alive
# ---------------------------------------------------------------------------
# Keep upstream connections alive for 5s. Reduces TCP handshake overhead
# when Nginx is proxying many requests from the same client pool.
keepalive = 5

# ---------------------------------------------------------------------------
# Memory management — critical for Djongo/MongoDB
# ---------------------------------------------------------------------------
# Djongo accumulates Django ORM query caches over time. Recycling workers
# after N requests prevents gradual memory creep on a long-running process.
# With 64 GB RAM this is less urgent, but still good practice.
max_requests = 2000
max_requests_jitter = 200  # Randomize restarts so all 33 workers don't restart at once

# Preload the application BEFORE forking workers.
# On a 64 GB box this is critical — shared code pages mean 33 workers cost
# roughly the same memory as ~3-4 without preloading (copy-on-write).
preload_app = True

# ---------------------------------------------------------------------------
# Logging — send to stdout for systemd / CloudWatch capture
# ---------------------------------------------------------------------------
accesslog  = "-"
errorlog   = "-"
loglevel   = "warning"   # 'info' is noisy with 132 concurrent handlers; use 'warning' in prod

# Response time in microseconds makes it easy to spot slow endpoints in logs.
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)sB %(D)sus'

# ---------------------------------------------------------------------------
# Worker temp files — use /dev/shm (RAM disk) for faster IPC on EC2
# ---------------------------------------------------------------------------
# This avoids disk I/O for heartbeat files between Gunicorn master & workers.
worker_tmp_dir = "/dev/shm"
