# Deploying Gorgon Clock to Render

## Option A — One-click Blueprint (easiest)

1. Push this folder to a GitHub repo (the whole `gorgon_clock/` folder contents
   should be at the **root** of the repo, not inside a sub-folder).
2. Go to https://dashboard.render.com/blueprints → **New Blueprint Instance**.
3. Connect your repo. Render reads `render.yaml` and creates the service automatically.
4. Click **Apply**. Done — your app is live at `https://gorgon-clock.onrender.com`.

## Option B — Manual setup in the Render dashboard

1. **New Web Service** → connect your GitHub repo.
2. Set these fields:

   | Field | Value |
   |---|---|
   | Language | Python 3 |
   | Build Command | `./build.sh` |
   | Start Command | `python -m gunicorn gorgon_clock.wsgi:application` |

3. Under **Advanced → Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `SECRET_KEY` | click **Generate** |
   | `WEB_CONCURRENCY` | `4` |
   | `PYTHON_VERSION` | `3.12.0` |

4. Click **Create Web Service**. Build runs, app goes live.

## Repo structure required

Render runs commands from the repo root, so your repo root must look like:

```
build.sh          ← Render runs this to build
render.yaml       ← blueprint definition (Option A only)
requirements.txt
manage.py
gorgon_clock/     ← Django project package (settings, urls, wsgi)
adapters/
domain/
ports/
templates/
static/
```

## No database needed

This app has no models so no Postgres is required.
The `migrate` step in build.sh is harmless and future-proofs things.

## Local dev still works

```bash
pip install -r requirements.txt
python manage.py runserver
```

SQLite is used locally (no Postgres needed on your machine).
