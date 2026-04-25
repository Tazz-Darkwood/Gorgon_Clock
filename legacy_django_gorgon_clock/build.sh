#!/usr/bin/env bash
# Exit immediately on any error
set -o errexit

pip install -r requirements.txt

# Collect static files into staticfiles/
python manage.py collectstatic --no-input

# Run any DB migrations (safe to run even with no models)
python manage.py migrate
