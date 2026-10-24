# --- 1. Build the React app -------------------------------------------------
FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- 2. Python runtime: Flask serves the API and the built React app ---------
FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FRONTEND_DIST=/app/frontend/dist
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend /frontend/dist /app/frontend/dist
RUN useradd --create-home app
USER app
EXPOSE 8000
# Apply pending migrations, then start. PORT is set by hosting services such as Render.
CMD ["sh", "-c", "flask --app wsgi db upgrade && exec gunicorn -w 2 -b 0.0.0.0:${PORT:-8000} wsgi:app"]
