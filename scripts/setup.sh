#!/bin/sh
# Creates .env (for Docker) and backend/.env (for running Flask without Docker)
# with random secrets. Run it once from the project folder:  sh scripts/setup.sh
set -e
cd "$(dirname "$0")/.."

random() { LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$1"; }

if [ -f .env ]; then
  echo ".env exists already: left as it is."
else
  DB_PASSWORD=$(random 24)
  sed -e "s/^SECRET_KEY=.*/SECRET_KEY=$(random 64)/" \
      -e "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$DB_PASSWORD/" .env.example > .env
  echo "Created .env"
fi

if [ -f backend/.env ]; then
  echo "backend/.env exists already: left as it is."
else
  DB_PASSWORD=$(sed -n 's/^POSTGRES_PASSWORD=//p' .env)
  DB_PORT=$(sed -n 's/^DB_PORT=//p' .env); DB_PORT=${DB_PORT:-5432}
  sed -e "s/^SECRET_KEY=.*/SECRET_KEY=$(random 64)/" \
      -e "s#^DATABASE_URL=.*#DATABASE_URL=postgresql+psycopg://library:$DB_PASSWORD@localhost:$DB_PORT/library#" \
      backend/.env.example > backend/.env
  echo "Created backend/.env (uses the Docker database on localhost:$DB_PORT)"
fi
echo "Next: docker compose up --build   ->  http://localhost:8000"
