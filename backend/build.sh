#!/bin/bash
# Exit on error
set -o errexit

# 1. Install standard dependencies (except Djongo)
pip install -r requirements.txt

# 2. Force install Djongo without checking dependencies
# This bypasses the "Django < 3.2" restriction since we have a runtime patch.
pip install djongo==1.3.7 --no-deps

# 3. Run migrations
python manage.py migrate

# 4. Collect static files
python manage.py collectstatic --no-input
