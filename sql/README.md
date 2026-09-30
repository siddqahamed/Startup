# WendersBengaluru SQL

This directory contains the database starting point for the admin dashboard.

## SQLite setup

No extra Python package is required. Python 3.11+ includes the SQLite driver used by the initializer.

From the project root, run:

```bash
npm run db:init
```

This creates `wendersbengaluru.db`, applies the schema, and loads the sample records.

After changing the schema, use `npm run db:reset` to recreate the local demo database with the latest travel destinations. This resets only the ignored local database file.

## Persistent API mode

Run the backend in one terminal:

```bash
npm run server
```

Run the frontend in another:

```bash
npm run dev
```

The API listens on port `8787`; Vite proxies `/api` requests through port `5173`. Keep both processes running while testing bookings and customer accounts. For remote testing, forward port `5173` for the app and keep port `8787` reachable from the same machine. Bookings, customer password hashes, sessions, and status changes are stored in SQLite on the server.

Customers choose **My trips** to create an account or sign in. Booking requests are attached to the signed-in account; the customer trip page and the signed-in home-page tracker refresh status changes made by the administrator. Existing guest bookings are not automatically claimed by email alone; verify ownership before migrating a guest booking to an account.

If the `python` command is not available on another Windows machine, install Python 3.11+ and enable **Add Python to PATH** during installation.

### Manual SQLite CLI setup

```bash
sqlite3 wendersbengaluru.db < sql/schema.sql
sqlite3 wendersbengaluru.db < sql/seed.sql
```

Destination management keeps a browser `localStorage` fallback if the API is unavailable. Customer bookings require the API and a signed-in customer session. The seeded admin password is intentionally a placeholder; generate a real bcrypt hash before using this schema in production.

## WhatsApp automatic replies

The API includes a Meta WhatsApp Cloud API webhook. It stays inactive until these environment variables are configured:

```powershell
$env:WHATSAPP_VERIFY_TOKEN = "choose-a-private-verification-token"
$env:WHATSAPP_ACCESS_TOKEN = "your-meta-access-token"
$env:WHATSAPP_PHONE_NUMBER_ID = "your-whatsapp-phone-number-id"
npm.cmd run server
```

In Meta Developer, set the callback URL to `https://your-public-domain/webhook`, use the same verify token, and subscribe to `messages`. A local server must be exposed through an HTTPS tunnel such as ngrok before Meta can reach it. Never put the access token in frontend JavaScript.