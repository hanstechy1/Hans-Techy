<!-- HANS TECHY README -->

<div align="center">
  <img src="assets/hans-techy-logo.svg" alt="HANS TECHY logo" width="100%" />

  <p><strong>WhatsApp automation • Pairing portal • Handy chat commands</strong></p>

  <p>
    <a href="https://hans-techy-yjo2.onrender.com/">🌐 Live Website</a> ·
    <a href="https://whatsapp.com/channel/0029VbD2ScLBFLgS8duVme2i">📢 ONLINE SERVICES Channel</a> ·
    <a href="https://github.com/hanstechy1/HANS-TECHY">💻 Source Code</a>
  </p>
</div>

---

## ✨ About

**HANS TECHY** is a Node.js WhatsApp bot built with [Baileys](https://github.com/WhiskeySockets/Baileys). It includes a web portal for WhatsApp QR/pair-code linking and a set of chat commands.

## 🚀 Connect WhatsApp

Open the live portal and choose your connection method:

- **[Open HANS TECHY website](https://hans-techy-yjo2.onrender.com/)**
- **[QR pairing page](https://hans-techy-yjo2.onrender.com/qr?token=2thmCkDbUMcJrvhxWLHjbdCjdW2YWKq6)** — protected by the admin token.
- **[Pair-code page](https://hans-techy-yjo2.onrender.com/pair?token=2thmCkDbUMcJrvhxWLHjbdCjdW2YWKq6)** — protected by the admin token.

The QR and pair-code routes require your admin token. Use the private connection flow configured for your deployment; **never put the token in this README, a public URL, screenshots, or chat messages**.

## 🧰 Commands

Send these commands to the bot in WhatsApp:

| Command | What it does |
| --- | --- |
| `.menu`, `.help` | Show the bot command menu |
| `.ping` | Check that the bot responds |
| `.alive` | Show online response and process uptime |
| `.uptime` | Show process uptime |
| `.time` | Show Tanzania time (EAT) |
| `.date` | Show the date in Tanzania |
| `.echo your message` | Repeat the supplied text |
| `.jid` | Show the current chat ID |
| `.groupinfo` | Show basic details for the current group |
| `.about` | Show information about the bot |
| `.channel` | Show the ONLINE SERVICES WhatsApp Channel link |
| `.verify` | Record your self-confirmation after following the channel |

### 📢 ONLINE SERVICES Channel

[**Follow the ONLINE SERVICES WhatsApp Channel**](https://whatsapp.com/channel/0029VbD2ScLBFLgS8duVme2i)

> **Note:** The bot cannot independently verify WhatsApp Channel follows through Baileys. The `.verify` command records a self-confirmation only; it is not proof of an actual follow. The current confirmation is held in memory and may reset when the bot restarts.

## 🖥️ Run locally

**Requirements:** Node.js 20 or later.

1. Clone this repository and install dependencies:
   ```bash
   git clone https://github.com/hanstechy1/HANS-TECHY.git
   cd HANS-TECHY
   npm install
   ```
2. Copy `.env.example` to `.env`.
3. Set `ADMIN_TOKEN` to a strong random secret of at least 24 characters.
4. Start the app:
   ```bash
   npm start
   ```
5. Open `http://localhost:3000` in your browser.

Do not commit `.env`, WhatsApp session files, QR codes, pairing codes, or admin credentials.

## ☁️ Deployment

The live service is hosted on Render:

- **Website:** https://hans-techy-yjo2.onrender.com/
- **Health status:** https://hans-techy-yjo2.onrender.com/health

After pushing changes to `main`, deploy the latest commit from your Render dashboard if automatic deployment is not enabled.

## 🔐 Security and limitations

- Keep `ADMIN_TOKEN` secret and rotate it immediately if it has ever appeared in a public file, URL, screenshot, or chat.
- The QR page, pair-code page, and session endpoint are protected routes. Never share pairing codes or QR codes with anyone.
- Baileys is an unofficial WhatsApp Web library; protocol changes may affect connectivity.
- The bot uses local filesystem session storage by default. Some hosting environments use ephemeral filesystems, so sessions may be lost after a restart or redeploy unless persistent storage is configured.
- Test changes in a safe environment and follow WhatsApp's terms and applicable laws.

## ⚙️ Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `ADMIN_TOKEN` | Yes | Secret for protected admin routes; at least 24 characters |
| `PORT` | No | HTTP port; defaults to `3000` |
| `AUTH_DIR` | No | WhatsApp auth directory; defaults to `./auth_info_baileys` |
| `LOG_LEVEL` | No | Pino log level; defaults to `warn` |

---

<div align="center">
  <sub>Made with ⚡ for HANS TECHY</sub>
</div>
