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
const OWNER_NUMBER = String(process.env.OWNER_NUMBER || '').replace(/\D/g, '');
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || '').trim();
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
if (!OWNER_NUMBER) console.warn('Set OWNER_NUMBER in Render environment variables (country code + number, digits only).');
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
const channelUrl = 'https://whatsapp.com/channel/0029VbD2ScLBFLgS8duVme2i';
// Baileys cannot reliably verify WhatsApp Channel follows; this is user self-confirmation only.
const channelConfirmedUsers = new Set();

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

app.get('/', (_req,res) => res.type('html').send(page(`<style>.online-pill{display:inline-flex;align-items:center;gap:9px;padding:9px 14px;border:1px solid #22c55e66;border-radius:999px;background:#22c55e16;color:#86efac;font-weight:700;letter-spacing:1px}.online-dot{width:10px;height:10px;border-radius:50%;background:#22c55e;box-shadow:0 0 12px #22c55e;display:inline-block}.status-card{margin:18px 0;padding:20px;border-radius:14px;background:#101b27;border:1px solid #22c55e55}.connect-link{display:inline-block;margin:8px 8px 0 0;padding:11px 15px;border-radius:9px;background:#00d9ff;color:#06101a;text-decoration:none;font-weight:700}.connect-link.alt{background:transparent;border:1px solid #00d9ff;color:#00d9ff}</style><h1>HANS TECHY</h1><div class="status-card"><div class="online-pill"><span class="online-dot"></span><span id="online-status">CHECKING STATUS...</span></div><p id="status-message">Tunaangalia muunganisho wa WhatsApp...</p><small>Status hujisasisha kila sekunde 10.</small></div><p>WhatsApp bot service.</p><p><a class="connect-link" href="/qr">CONNECT WITH QR</a><a class="connect-link alt" href="/pair">CONNECT WITH PAIR CODE</a></p><script>async function updateStatus(){const label=document.getElementById('online-status');const message=document.getElementById('status-message');try{const response=await fetch('/health',{cache:'no-store'});const data=await response.json();const online=data.status==='connected';label.textContent=online?'ONLINE':'OFFLINE';label.style.color=online?'#86efac':'#fca5a5';message.textContent=online?'HANS TECHY imeunganishwa na WhatsApp.':'HANS TECHY bado haijaunganishwa na WhatsApp ('+data.status+').';}catch(e){label.textContent='STATUS UNKNOWN';message.textContent='Imeshindikana kupata status. Jaribu tena.';}}updateStatus();setInterval(updateStatus,10000);</script>`)));
app.get('/health', (_req,res) => res.json({ok:true,status,whatsapp: sock ? 'socket-created' : 'not-started'}));
app.get('/connect', requireAdmin, (req,res) => {
  const token = encodeURIComponent(String(req.query.token || ''));
  res.type('html').send(pairPage(`<p class="hint" style="text-align:center;margin-bottom:22px">CHAGUA NJIA YA KUUNGANISHA WHATSAPP YAKO</p><a class="connect-btn" href="/qr?token=${token}">▦ &nbsp; CONNECT WITH QR</a><a class="connect-btn secondary" href="/pair?token=${token}">⌁ &nbsp; CONNECT WITH PAIR CODE</a><p class="hint" style="margin-top:20px;text-align:center">QR: scan kwa simu yako. Pair Code: ingiza namba yenye country code.</p>`));
});
app.get('/qr', requireAdmin, (_req,res) => {
  const content = qrDataUrl ? `<p>Scan this QR from WhatsApp → Linked devices → Link a device.</p><img alt="WhatsApp login QR" src="${qrDataUrl}"><p>QR codes expire. Refresh this page if a new one is generated.</p>` : '<p>No QR available yet. Wait a few seconds and refresh. If already linked, status may become connected.</p>';
  res.type('html').send(page(`<p>Status: <b>${escapeHtml(status)}</b></p>${content}<p><a href="/session?token=${encodeURIComponent(String(_req.query.token || ''))}">Session status</a></p>`));
});
const pairPage = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HANS TECHY | Pair</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;font:16px Arial,sans-serif;color:#f5f7ff;background:#050510;overflow-x:hidden}body:before{content:"";position:fixed;inset:-40%;z-index:-1;background:conic-gradient(transparent,#15155c,#00f5ff33,transparent,#a855f733,transparent);filter:blur(90px);animation:spin 18s linear infinite}.card{width:min(100%,420px);padding:30px 25px;border:1px solid #00f5ff77;border-radius:22px;background:#0b1020ed;box-shadow:0 0 35px #00f5ff20;animation:up .7s ease both}.logo{text-align:center;font-size:36px;color:#00f5ff;text-shadow:0 0 18px #00f5ff;margin-bottom:8px}h1{text-align:center;font-size:25px;letter-spacing:4px;margin:8px 0}.sub{text-align:center;color:#9aabc9;font-size:12px;letter-spacing:2px;margin-bottom:25px}label{display:block;color:#c4d2eb;font-size:12px;margin-bottom:9px}input{width:100%;padding:14px;border:1px solid #394766;border-radius:9px;background:#060b18;color:white;font-size:16px;outline:none;margin:8px 0 17px}input:focus{border-color:#00f5ff;box-shadow:0 0 14px #00f5ff22}button{width:100%;padding:14px;border:0;border-radius:9px;background:linear-gradient(100deg,#00d9ff,#a855f7);font-weight:bold;letter-spacing:1px;color:#050510;cursor:pointer}button:hover{box-shadow:0 0 22px #00f5ff55;transform:translateY(-1px)}.hint{font-size:12px;line-height:1.6;color:#9aabc9}.code{font-size:30px;letter-spacing:5px;text-align:center;color:#00f5ff;text-shadow:0 0 18px #00f5ff;margin:25px 0;overflow-wrap:anywhere}.notice{border:1px solid #00f5ff44;background:#00f5ff0b;border-radius:10px;padding:14px;line-height:1.6}.connect-btn{display:block;text-align:center;text-decoration:none;padding:15px;margin:12px 0;border-radius:10px;background:linear-gradient(100deg,#00d9ff,#a855f7);font-weight:bold;letter-spacing:1px;color:#050510;transition:.2s}.connect-btn:hover{box-shadow:0 0 22px #00f5ff66;transform:translateY(-2px)}.connect-btn.secondary{background:transparent;border:1px solid #00f5ff;color:#00f5ff}.footer{text-align:center;color:#8794ad;font-size:11px;margin-top:22px}@keyframes spin{to{transform:rotate(360deg)}}@keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}
</style></head><body><main class="card"><div class="logo">⌘</div><h1>HANS TECHY</h1><p class="sub">WHATSAPP PAIRING PORTAL</p>${body}<p class="footer">NEON CYBER INTERFACE · KEEP YOUR TOKEN AND CODE PRIVATE</p></main></body></html>`;
app.get('/pair', requireAdmin, (_req,res) => res.type('html').send(pairPage(`<form method="post" action="/pair"><input type="hidden" name="token" value="${escapeHtml(String(_req.query.token || ''))}"><label for="phone">PHONE NUMBER WITH COUNTRY CODE</label><input id="phone" name="phone" type="tel" inputmode="numeric" pattern="[0-9]{8,15}" required placeholder="2557XXXXXXXX" autocomplete="tel"><p class="hint">Tanzania: tumia 255 ikifuatiwa na namba yako, bila alama ya + au nafasi.</p><button type="submit">GET PAIRING CODE ↗</button></form><p class="hint" style="margin-top:18px">Kwenye WhatsApp: Linked devices → Link a device → Link with phone number instead.</p>`)));
app.post('/pair', requireAdmin, async (req,res) => {
  const phone = String(req.body.phone || '').replace(/\D/g,'');
  if (!/^\d{8,15}$/.test(phone)) return res.status(400).type('html').send(pairPage('<div class="notice">Namba si sahihi. Tumia tarakimu 8–15 pamoja na country code, bila + wala nafasi.</div>'));
  if (!sock || !pairingReady) return res.status(503).type('html').send(pairPage('<div class="notice">WhatsApp bado haijawa tayari kutoa pairing code. Subiri sekunde 15–30 kisha fungua upya ukurasa wa pairing kwa token yako.</div>'));
  try {
    const code = await sock.requestPairingCode(phone);
    res.type('html').send(pairPage(`<div class="notice">PAIRING CODE</div><div class="code" id="pairing-code">${escapeHtml(code)}</div><button type="button" id="copy-code" onclick="copyPairingCode()">📋 COPY PAIRING CODE</button><p class="hint" id="copy-feedback" role="status" aria-live="polite">Bonyeza Copy ili kunakili code, kisha iweke kwenye WhatsApp.</p><p class="hint">Kwenye simu yako: WhatsApp → Linked devices → Link a device → Link with phone number instead. Ingiza code hii haraka kabla haijaisha muda.</p><p class="hint">Usishiriki pairing code yako na mtu mwingine.</p><script>async function copyPairingCode(){const code=document.getElementById('pairing-code').textContent.trim();const button=document.getElementById('copy-code');const feedback=document.getElementById('copy-feedback');try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(code);}else{const field=document.createElement('textarea');field.value=code;field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);field.select();const copied=document.execCommand('copy');field.remove();if(!copied)throw new Error('Copy unavailable');}button.textContent='✓ COPIED!';feedback.textContent='Pairing code imenakiliwa. Sasa iweke kwenye WhatsApp.';setTimeout(()=>{button.textContent='📋 COPY PAIRING CODE';},2200);}catch(e){feedback.textContent='Copy imeshindikana. Bonyeza na ushikilie code ili kuinakili mwenyewe.';}}</script>`));
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
    sock = makeWASocket({ auth:state, logger, printQRInTerminal:false, browser:['Ubuntu','Chrome','20.0.04'], markOnlineOnConnect:false });
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
        if (!m.message || m.key.remoteJid === 'status@broadcast') continue;
        const jid = m.key.remoteJid;
        const raw = m.message.ephemeralMessage?.message || m.message.viewOnceMessage?.message || m.message.viewOnceMessageV2?.message || m.message;
        const text = String(raw.conversation || raw.extendedTextMessage?.text || raw.imageMessage?.caption || raw.videoMessage?.caption || raw.documentMessage?.caption || '').trim();
        if (!text.startsWith('.')) continue;
        const senderJid = m.key.participant || jid;
        const senderNumber = String(senderJid.split('@')[0] || '').replace(/\D/g, '');
        // Commands sent from the linked WhatsApp account are treated as owner commands.
        const isOwner = Boolean(m.key.fromMe) || Boolean(OWNER_NUMBER && senderNumber === OWNER_NUMBER);
        const [rawCommand, ...args] = text.split(/\s+/);
        const command = rawCommand.slice(1).toLowerCase();
        const argText = args.join(' ');
        const now = new Date();
        const time = new Intl.DateTimeFormat('sw-TZ', {timeZone:'Africa/Dar_es_Salaam',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
        const date = new Intl.DateTimeFormat('sw-TZ', {timeZone:'Africa/Dar_es_Salaam',day:'2-digit',month:'long',year:'numeric'}).format(now);
        const uptimeSeconds = Math.floor(process.uptime());
        const uptime = [Math.floor(uptimeSeconds/86400)+'d',Math.floor((uptimeSeconds%86400)/3600)+'h',Math.floor((uptimeSeconds%3600)/60)+'m',(uptimeSeconds%60)+'s'].join(' ');
        try {
          let reply;
          if (command === 'channel') {
            reply = '📢 *ONLINE SERVICES WHATSAPP CHANNEL*\n\nFollow channel yetu kwa updates na taarifa mpya:\n' + channelUrl + '\n\nBaada ya kufollow, tuma *.verify* kuthibitisha kwa kujitegemea. Kumbuka: bot haiwezi kuhakiki follow moja kwa moja.';
          } else if (command === 'verify') {
            channelConfirmedUsers.add(jid);
            reply = '✅ Uthibitisho wako umepokelewa. Bot haiwezi kuthibitisha follow moja kwa moja, kwa hiyo huu ni uthibitisho wa kujitegemea tu.\n\nTumia *.menu* kuendelea.';
          } else if (!isOwner && ['restart','addowner','delowner','eval','exec','shutdown','broadcast','kickall'].includes(command)) {
            reply = '🔒 Amri hii inaruhusiwa kwa OWNER pekee wa HANS TECHY.';
          } else if (!isOwner && !channelConfirmedUsers.has(jid) && !['menu','help','channel','verify'].includes(command)) {
            reply = '🔒 *FOLLOW CHANNEL KABLA YA KUENDELEA*\n\nTafadhali follow ONLINE SERVICES WhatsApp Channel:\n' + channelUrl + '\n\nUkishafollow, tuma *.verify* kuendelea.\n_Notice: WhatsApp/Baileys haitoi njia ya kuverify follow moja kwa moja; mfumo huu unategemea uthibitisho wako._';
          } else if (command === 'gpt') {
            if (!OPENAI_API_KEY) {
              reply = '⚠️ GPT haijawekwa bado. Mmiliki aongeze OPENAI_API_KEY kwenye Render → Environment.';
            } else if (!argText) {
              reply = 'Tumia: .gpt andika swali lako hapa';
            } else {
              const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + OPENAI_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: OPENAI_MODEL, messages: [{ role: 'system', content: 'You are HANS TECHY assistant. Answer helpfully and concisely. Reply in Swahili when the user writes in Swahili.' }, { role: 'user', content: argText.slice(0, 4000) }], max_tokens: 700 }),
                signal: AbortSignal.timeout(45000)
              });
              const data = await response.json().catch(() => ({}));
              if (!response.ok) {
                logger.error({status: response.status, error: data.error?.message || 'OpenAI request failed'}, 'OpenAI API request failed');
                reply = response.status === 401 ? '⚠️ OPENAI_API_KEY haikubaliki. Kagua API key kwenye Render.' : response.status === 429 ? '⏳ GPT imefikia limit au salio la API halitoshi. Kagua OpenAI billing/usage.' : '⚠️ GPT haikupatikana kwa sasa. Jaribu tena baadaye.';
              } else {
                reply = String(data.choices?.[0]?.message?.content || '').trim() || 'GPT haikurudisha jibu. Jaribu swali jingine.';
                reply = '🤖 *HANS TECHY GPT*\n\n' + reply.slice(0, 3500);
              }
            }
          } else switch (command) {
            case 'menu':
            case 'help':
              reply = '╭━━━〔 🤖 *HANS TECHY* 〕━━━╮\n│ 🤖 *AI*\n│ .gpt <swali>\n│\n│ ⚡ *GENERAL*\n│ .menu\n│ .help\n│ .ping\n│ .alive\n│ .uptime\n│\n│ 🕒 *TIME & DATE*\n│ .time\n│ .date\n│\n│ 🛠️ *TOOLS*\n│ .echo <ujumbe>\n│ .jid\n│ .groupinfo\n│ .about\n│ .channel\n│ .verify\n╰━━━━━━━━━━━━━━━━━━━━╯\n📢 Channel: https://whatsapp.com/channel/0029VbD2ScLBFLgS8duVme2i';
              break;
            case 'ping':
              reply = '🏓 *PONG!*\n⚡ HANS TECHY inafanya kazi.\n⏱️ Response check imefanikiwa.';
              break;
            case 'alive':
              reply = '🤖 *HANS TECHY iko ONLINE* ✅\n📡 WhatsApp connection: connected\n⏱️ Uptime: ' + uptime;
              break;
            case 'uptime':
              reply = '⏱️ *HANS TECHY UPTIME*\n' + uptime;
              break;
            case 'time':
              reply = '🕒 *Saa ya Tanzania*\n' + time + ' (EAT, UTC+3)';
              break;
            case 'date':
              reply = '📅 *Tarehe ya leo*\n' + date;
              break;
            case 'echo':
              reply = argText ? '💬 ' + argText.slice(0,1500) : 'Tumia: .echo ujumbe wako';
              break;
            case 'jid':
              reply = '🆔 *Chat ID:*\n' + jid;
              break;
            case 'groupinfo':
              if (!jid.endsWith('@g.us')) {
                reply = 'ℹ️ Command hii inafanya kazi kwenye group la WhatsApp pekee.';
              } else {
                const metadata = await sock.groupMetadata(jid);
                reply = '👥 *GROUP INFO*\n📝 Jina: ' + metadata.subject + '\n👤 Washiriki: ' + metadata.participants.length + '\n🆔 ID: ' + jid;
              }
              break;
            case 'about':
              reply = '🤖 *HANS TECHY*\nWhatsApp bot inayotumia Baileys na OpenAI GPT.\n⚙️ Prefix: .\n💚 Status: ONLINE\nTumia .menu kuona commands.';
              break;
            default:
              continue;
          }
          await sock.sendMessage(jid, {text: reply}, {quoted: m});
        } catch (err) {
          logger.error({err, command}, 'Command handler failed');
          try { await sock.sendMessage(jid, {text:'Samahani, command imeshindwa. Tafadhali jaribu tena.'}, {quoted:m}); } catch {}
        }
      }
    });
  })();
  return startPromise;
}
startWhatsApp().catch(err => { status='error'; logger.error({err}, 'WhatsApp startup failed'); });
