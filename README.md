# HANS TECHY WhatsApp Bot

Node.js starter bot using [Baileys](https://github.com/WhiskeySockets/Baileys). This repository currently includes protected QR/pairing pages and only a small starter command set; it does **not** implement 300+ commands.

## Connect WhatsApp (QR / Pair Code)

Choose one of the links below to open the connection page:

- **[CONNECT WITH QR CODE — Pairing QR](https://hans-techy-yjo2.onrender.com/qr)**
- **[CONNECT WITH PAIR CODE — Pairing Number](https://hans-techy-yjo2.onrender.com/pair)**

Both pages are protected. Add your own admin token when accessing them, for example:
`https://hans-techy-yjo2.onrender.com/qr?token=YOUR_ADMIN_TOKEN` or
`https://hans-techy-yjo2.onrender.com/pair?token=YOUR_ADMIN_TOKEN`.
Never publish your real admin token in this README or share it with anyone.

## Features in this starter

- Protected QR login page and pairing-code form (links above)
- Session status at `/session?token=YOUR_ADMIN_TOKEN`
- Health endpoint at `/health`
- Implemented chat commands: `.menu`, `.help`, `.ping`
- Heroku manifest (`app.json`) and `Procfile`

## Run locally

Requires Node.js 20.

1. Clone this repository and run `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `ADMIN_TOKEN` to a long random secret (at least 24 characters).
4. Run `npm start`.
5. Open `http://localhost:3000/qr?token=YOUR_ADMIN_TOKEN` and scan the QR, or open `/pair?token=YOUR_ADMIN_TOKEN` to request a pairing code.

For pairing code, enter the phone number with country code, digits only, without plus sign, spaces or hyphens. On WhatsApp, open Linked devices and choose the phone-number linking option.

## Heroku deploy

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://www.heroku.com/deploy?template=https://github.com/hanstechy1/Hans-Techy)

The manifest requests `ADMIN_TOKEN` during deployment. Keep it private. After deployment, use `https://YOUR-APP.herokuapp.com/qr?token=YOUR_ADMIN_TOKEN` or `/pair?token=YOUR_ADMIN_TOKEN`.

## Important limitations and security

- **Not tested end-to-end in this commit.** A successful GitHub commit does not prove WhatsApp login or Heroku deployment works. Verify deployment logs and test with a spare WhatsApp account first.
- Baileys is an unofficial WhatsApp Web library; WhatsApp protocol changes can break connectivity.
- This starter uses `useMultiFileAuthState` on the local filesystem. Heroku dyno files are ephemeral, so linked sessions may be lost after restarts/redeploys. Configure durable encrypted session storage before relying on a hosted production deployment.
- The QR page, pairing page and session endpoint require the admin token. Never share the token, QR, or pairing code. Use HTTPS in hosted environments.
- Keep `.env` and `auth_info_baileys/` out of Git. Never commit credentials.
- Use responsibly and follow WhatsApp's terms and applicable laws.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ADMIN_TOKEN` | Yes | Secret protecting admin routes; minimum 24 characters |
| `PORT` | No | HTTP port (defaults to 3000) |
| `AUTH_DIR` | No | Auth directory (defaults to `./auth_info_baileys`) |
| `LOG_LEVEL` | No | Pino log level (defaults to `warn`) |
