#!/bin/bash
# Exit on error
set -o errexit

# Install dependencies based on requirements.txt
pip install -r requirements.txt

# Run migrations
# 1. Migrate 'api' first to ensure CustomUser exists
python manage.py migrate api

# 2. Run remaining migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --no-input
