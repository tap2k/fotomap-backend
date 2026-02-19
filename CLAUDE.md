# MVC Backend (Strapi)

Strapi 4.14.4 headless CMS backend for the Express/Admin multimedia platform.

## Architecture

```
config/
├── database.js          PostgreSQL connection
├── functions.js         Shared utility functions (permissions, encryption, file ops)
├── middlewares.js       Middleware stack (CORS, auth, body limits)
├── plugins.js           Email (nodemailer) + upload config
├── server.js            Host/port/proxy settings
└── admin.js             Admin panel secrets

src/
├── api/
│   ├── channel/         Hierarchical containers ("reels")
│   ├── content/         Media items within channels
│   ├── tag/             Channel-specific labels
│   ├── tileset/         Custom map tile configs
│   ├── overlay/         Georeferenced map image overlays
│   ├── asset/           Multi-platform bundles (PC/Mac/Android/WebGL)
│   ├── avatar/          User avatars
│   └── user/            User extensions
├── middlewares/
│   └── authenticate.js  Supabase JWT → Strapi user middleware
└── extensions/          Plugin overrides
```

Each API has: `content-types/*/schema.json`, `controllers/*.js`, `services/*.js`, `routes/*.js`, `routes/custom-*.js`

## Tech Stack

- **Framework:** Strapi 4.14.4
- **Database:** PostgreSQL (pg)
- **Auth:** JWT (jsonwebtoken), Supabase JWT middleware
- **File Upload:** Local or AWS S3 provider
- **Email:** Nodemailer (Gmail SMTP)
- **Media Processing:** fluent-ffmpeg, exifreader (EXIF geolocation)
- **Web Scraping:** cheerio (thumbnail extraction)
- **External Sources:** YouTube (youtubei), Google Photos album fetcher
- **Geocoding:** node-geocoder (OpenStreetMap)

## Key Concepts

### Three-Tier Access Model
1. **Public** (`uniqueID`): View-only, published content only
2. **Private Link** (`privateID`): XOR-encrypted channel ID, full management without login
3. **Authenticated** (JWT): Owner/editor roles with recursive parent permission inheritance

### Shared Functions (`config/functions.js`)
Called via `strapi.config.functions.*`:
- `createPrivateID(channelID)` / `getPublicID(privateID)` — XOR encryption/decryption
- `canEdit(channelID, userID, privateID)` — Recursive permission check up parent chain
- `getChannel(channelID, userID, privateID)` — Full channel with all relations
- `getBasicChannel(channelID)` — Lightweight channel fetch
- `addFile(id, ref, file, key)` / `deleteMediafile(id)` — File upload/delete
- `calculateChannelSize(channelID)` — Recursive storage calculation

### Content Features
- Automatic EXIF geolocation extraction on upload
- YouTube playlist auto-expansion into individual content items
- Google Photos album auto-expansion
- CSV/JSON bulk import
- Draft/publish workflow (content has `publishedAt`)
- Content reordering with automatic index adjustment

## Conventions

### File Naming
- All custom code uses **camelCase** JS files
- Each API follows Strapi structure: `schema.json`, `[name].js` for controller/service/routes
- Custom routes in `routes/custom-[name].js`

### Code Patterns
- Controllers use `strapi.factories.createCoreController` with custom methods
- Services use `strapi.factories.createCoreService`
- Database queries via `strapi.db.query()` or `strapi.query()`
- File uploads via `strapi.plugins.upload.services.upload.upload()`
- Multipart form data for file uploads (parsed by Strapi body middleware)
- Custom endpoints use query params for GET, request body for POST

### Custom Middleware
- `global::authenticate` runs on every request
- Extracts JWT from `Authorization` header or `jwt` cookie
- Verifies against `JWT_SECRET`, looks up Supabase user, re-signs for Strapi
- Passes through silently if no token or invalid token

## API Endpoints (Custom)

### Channels
```
GET  /getPublicChannels
GET  /getMyChannels                    (auth)
GET  /getChannel?uniqueID=...
GET  /getMyChannel?uniqueID=...        (auth)
GET  /getChildChannels?uniqueID=...
GET  /getSubmissionChannel?privateID=...
POST /createChannel                    (auth)
POST /updateChannel
POST /deleteChannel
POST /saveChannel                      (update content timeline)
```

### Content
```
POST /uploadContentToChannel
POST /updateContent
POST /deleteContent
POST /uploadSubmission                 (public upload)
POST /uploadJSONToChannel              (bulk CSV import)
```

### Tags
```
POST /addTag, /removeTag, /updateTag, /deleteTag
POST /combineTags, /purgeTags
```

## Development

```bash
npm run develop   # Dev server with auto-reload (port 1337)
npm run build     # Build admin panel
npm run start     # Production server
```

### Sibling Frontends
- **Express** (public-facing): lighter client
- **Admin** (management): full CRUD interface

Both connect to this backend via `NEXT_PUBLIC_STRAPI_HOST`.

## Important Notes

- **No test suite** — testing is manual
- Upload size limit is 1GB (configured in `config/middlewares.js`)
- CORS origins are explicitly listed in `config/middlewares.js`
- Image breakpoints: icon (32px) through xlarge (1920px) in `config/plugins.js`
- `PRIVATE_SEED` must match across frontend and backend
- User ID 1 is treated as superuser in `canEdit()`
