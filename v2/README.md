# HANS TECHY V2

A separate V2 folder so the existing bot and its files are not overwritten.

## Requirements
- Node.js 20 or newer
- A WhatsApp account you are authorized to link
- Optional OpenAI API key for `.ai` / `.gpt`

## Setup in Termux
From the repository root:

```sh
cd v2
npm install
cp .env.example .env
nano .env
```

Set `OWNER_NUMBER` to your WhatsApp number with country code and digits only. Optionally set `OPENAI_API_KEY`. Do not share or commit `.env`.

The default `AUTH_DIR=../auth_info_baileys` points to the existing session directory in the repository root. Stop the old bot before running V2 so two processes do not use the same WhatsApp session at once. If you prefer a new session, change AUTH_DIR to `./auth_info_baileys_v2` and pair that session separately.

Then run:

```sh
npm run check
npm start
```

## Commands
- `.menu`, `.help`
- `.ping`, `.alive`
- `.ai question`, `.gpt question` (requires OpenAI API key)
- `.mode private`, `.mode public` (owner only)
- `.autoviewstatus on`, `.autoviewstatus off` (owner only)
- `.autolikestatus on`, `.autolikestatus off` (owner only)

Private mode is the default. In private mode, only the configured owner can use commands. In public mode, normal commands can be used by other chats, but mode/status settings remain owner-only. Mode and status toggles currently reset to defaults when the process restarts.

Status view/reaction behavior depends on WhatsApp/Baileys support and status message availability. Use status automation respectfully and only with contacts/statuses you are allowed to interact with. Never upload WhatsApp auth/session files to GitHub.
