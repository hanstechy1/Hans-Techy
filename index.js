import 'dotenv/config';
import express from 'express';
import QRCode from 'qrcode';
import pino from 'pino';
import * as baileys from '@whiskeysockets/baileys';
import { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
const makeWASocket = baileys.default?.default || baileys.default || baileys.makeWASocket;
import path from 'node:path';
import fs from 'node:fs/promises';

const app = express();
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));

const PORT = Number(process.env.PORT || 3000);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!ADMIN_TOKEN || ADMIN_TOKEN.length < 24) {
  console.error('Set ADMIN_TOKEN to a random secret of at least 24 characters.');
  process.exit(1);
}

const AUTH_DIR = process.env.AUTH_DIR || './auth_info_baileys';
let sock;
let qrDataUrl = '';
let latestQr = '';
let pairingReady = false;
let status = 'starting';
let startPromise;
let reconnectTimer;
const logger = pino({ level: process.env.LOG_LEVEL || 'warn' });

function authorized(req) {
  const supplied = req.get('x-admin-token') || req.query.token || req.body?.token;
  return typeof supplied === 'string' && supplied.length === ADMIN_TOKEN.length &&
    Buffer.from(supplied).equals(Buffer.from(ADMIN_TOKEN));
}
function requireAdmin(req, res, next) {
  if (!authorized(req)) return res.status(401).send('Unauthorized. Provide your admin token.');
  next();
}
function escapeHtml(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
const page = (body) => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HANS TECHY</title><style>body{font:16px system-ui;max-width:680px;margin:36px auto;padding:0 18px;background:#10151c;color:#f4f7fb}main{background:#1b2531;padding:24px;border-radius:16px}input,button{font:inherit;padding:12px;border-radius:8px;border:0;margin:5px 0}input{width:min(95%,380px)}button{background:#18a878;color:white;cursor:pointer}img{max-width:300px;width:100%;background:white;padding:10px;border-radius:8px}small{color:#bdc7d3}</style><main><h1>HANS TECHY</h1>${body}<p><small>Keep this page and its admin token private. Never share QR codes or pairing codes.</small></p></main></html>`;

app.get('/', (_req,res) => res.type('html').send(page('<p>WhatsApp bot service.</p><p>Use <code>/health</code> for status. Admin login pages: <code>/qr?token=...</code> and <code>/pair?token=...</code>.</p>')));
app.get('/health', (_req,res) => res.json({ok:true,status,whatsapp: sock ? 'socket-created' : 'not-started'}));
app.get('/qr', requireAdmin, (_req,res) => {
  const content = qrDataUrl ? `<p>Scan this QR from WhatsApp → Linked devices → Link a device.</p><img alt="WhatsApp login QR" src="${qrDataUrl}"><p>QR codes expire. Refresh this page if a new one is generated.</p>` : '<p>No QR available yet. Wait a few seconds and refresh. If already linked, status may become connected.</p>';
  res.type('html').send(page(`<p>Status: <b>${escapeHtml(status)}</b></p>${content}<p><a href="/session?token=${encodeURIComponent(String(_req.query.token || ''))}">Session status</a></p>`));
});
const pairPage = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HANS TECHY | Pair</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;font:16px Arial,sans-serif;color:#f5f7ff;background:#050510;overflow-x:hidden}body:before{content:"";position:fixed;inset:-40%;z-index:-1;background:conic-gradient(transparent,#15155c,#00f5ff33,transparent,#a855f733,transparent);filter:blur(90px);animation:spin 18s linear infinite}.card{width:min(100%,420px);padding:30px 25px;border:1px solid #00f5ff77;border-radius:22px;background:#0b1020ed;box-shadow:0 0 35px #00f5ff20;animation:up .7s ease both}.logo{text-align:center;font-size:36px;color:#00f5ff;text-shadow:0 0 18px #00f5ff;margin-bottom:8px}h1{text-align:center;font-size:25px;letter-spacing:4px;margin:8px 0}.sub{text-align:center;color:#9aabc9;font-size:12px;letter-spacing:2px;margin-bottom:25px}label{display:block;color:#c4d2eb;font-size:12px;margin-bottom:9px}input{width:100%;padding:14px;border:1px solid #394766;border-radius:9px;background:#060b18;color:white;font-size:16px;outline:none;margin:8px 0 17px}input:focus{border-color:#00f5ff;box-shadow:0 0 14px #00f5ff22}button{width:100%;padding:14px;border:0;border-radius:9px;background:linear-gradient(100deg,#00d9ff,#a855f7);font-weight:bold;letter-spacing:1px;color:#050510;cursor:pointer}button:hover{box-shadow:0 0 22px #00f5ff55;transform:translateY(-1px)}.hint{font-size:12px;line-height:1.6;color:#9aabc9}.code{font-size:30px;letter-spacing:5px;text-align:center;color:#00f5ff;text-shadow:0 0 18px #00f5ff;margin:25px 0;overflow-wrap:anywhere}.notice{border:1px solid #00f5ff44;background:#00f5ff0b;border-radius:10px;padding:14px;line-height:1.6}.footer{text-align:center;color:#8794ad;font-size:11px;margin-top:22px}@keyframes spin{to{transform:rotate(360deg)}}@keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}
</style></head><body><main class="card"><div class="logo">⌘</div><h1>HANS TECHY</h1><p class="sub">WHATSAPP PAIRING PORTAL</p>${body}<p class="footer">NEON CYBER INTERFACE · KEEP YOUR TOKEN AND CODE PRIVATE</p></main></body></html>`;
app.get('/pair', requireAdmin, (_req,res) => res.type('html').send(pairPage(`<form method="post" action="/pair"><input type="hidden" name="token" value="${escapeHtml(String(_req.query.token || ''))}"><label for="phone">PHONE NUMBER WITH COUNTRY CODE</label><input id="phone" name="phone" type="tel" inputmode="numeric" pattern="[0-9]{8,15}" required placeholder="2557XXXXXXXX" autocomplete="tel"><p class="hint">Tanzania: tumia 255 ikifuatiwa na namba yako, bila alama ya + au nafasi.</p><button type="submit">GET PAIRING CODE ↗</button></form><p class="hint" style="margin-top:18px">Kwenye WhatsApp: Linked devices → Link a device → Link with phone number instead.</p>`)));
app.post('/pair', requireAdmin, async (req,res) => {
  const phone = String(req.body.phone || '').replace(/\D/g,'');
  if (!/^\d{8,15}$/.test(phone)) return res.status(400).type('html').send(pairPage('<div class="notice">Namba si sahihi. Tumia tarakimu 8–15 pamoja na country code, bila + wala nafasi.</div>'));
  if (!sock || !pairingReady) return res.status(503).type('html').send(pairPage('<div class="notice">WhatsApp bado haijawa tayari kutoa pairing code. Subiri sekunde 15–30 kisha fungua upya ukurasa wa pairing kwa token yako.</div>'));
  try {
    const code = await sock.requestPairingCode(phone);
    res.type('html').send(pairPage(`<div class="notice">PAIRING CODE</div><div class="code">${escapeHtml(code)}</div><p class="hint">Kwenye simu yako: WhatsApp → Linked devices → Link a device → Link with phone number instead. Ingiza code hii haraka kabla haijaisha muda.</p><p class="hint">Usishiriki pairing code yako na mtu mwingine.</p>`));
  } catch (e) {
    logger.error({err:e}, 'Pairing code request failed');
    res.status(500).type('html').send(pairPage('<div class="notice">Imeshindikana kupata pairing code. Angalia Render Logs, kisha jaribu tena.</div>'));
  }
});
app.get('/session', requireAdmin, (_req,res) => res.json({status,connected:status==='connected',socketCreated:Boolean(sock),qrAvailable:Boolean(qrDataUrl),pairingReady}));

app.listen(PORT, () => console.log(`HANS TECHY web server listening on ${PORT}`));

async function startWhatsApp() {
  if (startPromise) return startPromise;
  startPromise = (async () => {
    await fs.mkdir(AUTH_DIR, {recursive:true});
    const { state, saveCreds } = await useMultiFileAuthState(path.resolve(AUTH_DIR));
    sock = makeWASocket({ auth:state, logger, printQRInTerminal:false, browser:['HANS TECHY','Chrome','1.0.0'], markOnlineOnConnect:false });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async ({connection, lastDisconnect, qr}) => {
      if (qr) {
        latestQr = qr;
        qrDataUrl = await QRCode.toDataURL(qr);
        pairingReady = true;
        status = 'awaiting_scan_or_pairing';
      }
      if (connection === 'open') { status='connected'; qrDataUrl=''; latestQr=''; pairingReady=false; console.log('WhatsApp connected.'); }
      if (connection === 'close') {
        status='disconnected'; qrDataUrl=''; latestQr=''; pairingReady=false;
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code !== DisconnectReason.loggedOut) {
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => { sock=null; startPromise=null; startWhatsApp().catch(err=>logger.error({err},'Reconnect failed')); }, 2000);
        } else {
          console.error('WhatsApp logged out. Remove auth state only if you intend to pair again.');
        }
      }
    });
    sock.ev.on('messages.upsert', async ({messages, type}) => {
      if (type !== 'notify') return;
      for (const m of messages) {
        if (!m.message || m.key.fromMe || m.key.remoteJid === 'status@broadcast') continue;
        const jid = m.key.remoteJid;
        const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
        const command = text.trim().toLowerCase();
        if (command === '.ping') await sock.sendMessage(jid,{text:'🏓 HANS TECHY is online!'});
        else if (command === '.menu' || command === '.help') await sock.sendMessage(jid,{text:'🤖 *HANS TECHY MENU*\n\n.ping — check bot status\n.menu — show this menu\n.help — help\n\nThis is a starter build; more commands are not implemented yet.'});
      }
    });
  })();
  return startPromise;
}
startWhatsApp().catch(err => { status='error'; logger.error({err}, 'WhatsApp startup failed'); });
