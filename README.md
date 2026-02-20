# MVC Backend (Strapi)

Strapi 4 headless CMS backend for the Express multimedia platform. Manages channels, content, tags, tilesets, and user permissions.

## Prerequisites

- Node.js 18+
- PostgreSQL

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a PostgreSQL database:

```sql
CREATE DATABASE mvc;
```

3. Create a `.env` file in the project root:

```env
HOST=0.0.0.0
PORT=1337
PUBLIC_URL=http://127.0.0.1:1337

# Database
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=mvc
DATABASE_USERNAME=<your-pg-user>
DATABASE_PASSWORD=<your-pg-password>
DATABASE_SSL=false

# Secrets (generate random strings for each)
APP_KEYS=<base64-key-1>,<base64-key-2>
ADMIN_JWT_SECRET=<random-base64>
API_TOKEN_SALT=<random-base64>
TRANSFER_TOKEN_SALT=<random-base64>
JWT_SECRET=<random-string-at-least-32-chars>
PRIVATE_SEED=<random-hex-string>
```

`PRIVATE_SEED` must match the value used in the Express frontend.

4. Start the server:

```bash
npm run develop
```

Open [http://localhost:1337/admin](http://localhost:1337/admin) to create your admin account on first run.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run develop` | Dev server with auto-reload |
| `npm run build` | Build admin panel |
| `npm run start` | Production server (no reload) |

## Content Types

| Type | Purpose |
|------|---------|
| Channel | Hierarchical containers with parent-child relationships |
| Content | Media items with metadata, geolocation, tags, ordering |
| Tag | Channel-specific labels for content |
| Tileset | Custom map tile configurations |
| Overlay | Georeferenced image overlays for maps |
| Asset | Multi-platform bundles (PC, Mac, Android, WebGL) |
| Avatar | User avatars |
