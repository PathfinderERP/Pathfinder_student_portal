#!/bin/bash
# Exit on error
set -o errexit

# Install dependencies based on requirements.txt
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --no-input
