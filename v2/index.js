import 'dotenv/config';
import * as baileys from '@whiskeysockets/baileys';
import pino from 'pino';
const makeWASocket = baileys.default?.default || baileys.default || baileys.makeWASocket;
const { DisconnectReason, useMultiFileAuthState } = baileys;

const OWNER_NUMBER = String(process.env.OWNER_NUMBER || '').replace(/\D/g, '');
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || '').trim();
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
const AUTH_DIR = process.env.AUTH_DIR || '../auth_info_baileys';
const logger = pino({ level: process.env.LOG_LEVEL || 'warn' });

if (!OWNER_NUMBER) {
  console.error('Set OWNER_NUMBER in v2/.env (country code + number, digits only).');
  process.exit(1);
}

let sock;
let mode = 'private';
let autoViewStatus = false;
let autoLikeStatus = false;
const seenStatuses = new Set();

const ownerJid = OWNER_NUMBER + '@s.whatsapp.net';
const isOwnerMessage = (m) => {
  const sender = m.key.participant || m.key.remoteJid || '';
  const number = sender.split('@')[0].replace(/\D/g, '');
  return Boolean(m.key.fromMe || number === OWNER_NUMBER);
};

async function reply(jid, text, quoted) {
  await sock.sendMessage(jid, { text }, quoted ? { quoted } : {});
}

async function askAI(question) {
  if (!OPENAI_API_KEY) return '⚠️ AI haijawekwa. Weka OPENAI_API_KEY kwenye v2/.env.';
  if (!question.trim()) return 'Matumizi: .ai swali lako';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + OPENAI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You are HANS TECHY, a helpful WhatsApp assistant. Reply in the language the user uses, concisely.' },
        { role: 'user', content: question.slice(0, 4000) }
      ],
      max_tokens: 700
    }),
    signal: AbortSignal.timeout(45000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    logger.warn({ status: response.status }, 'OpenAI request failed');
    if (response.status === 401) return '⚠️ OpenAI API key imekataliwa. Hakiki key yako.';
    if (response.status === 429) return '⏳ API limit imefika au billing haijakamilika.';
    return '⚠️ AI haipatikani kwa sasa. Jaribu tena baadaye.';
  }
  return data.choices?.[0]?.message?.content?.trim() || 'Sijapata jibu. Jaribu tena.';
}

async function handleStatus(m) {
  if (!m.message || m.key.fromMe) return;
  const id = m.key.id;
  if (!id || seenStatuses.has(id)) return;
  seenStatuses.add(id);
  if (seenStatuses.size > 2000) seenStatuses.clear();

  try {
    if (autoViewStatus) await sock.readMessages([m.key]);
    if (autoLikeStatus) {
      await sock.sendMessage('status@broadcast', {
        react: { text: '❤️', key: m.key }
      });
    }
  } catch (err) {
    logger.warn({ err }, 'Status action failed');
  }
}

async function handleCommand(m) {
  const jid = m.key.remoteJid;
  const raw = m.message?.ephemeralMessage?.message || m.message?.viewOnceMessageV2?.message || m.message;
  const text = String(raw?.conversation || raw?.extendedTextMessage?.text || '').trim();
  if (!text.startsWith('.')) return;
  const [head, ...rest] = text.split(/\s+/);
  const command = head.slice(1).toLowerCase();
  const args = rest.join(' ');
  const isOwner = isOwnerMessage(m);

  if (['mode', 'autoviewstatus', 'autolikestatus'].includes(command) && !isOwner) {
    return reply(jid, '🔒 Amri hii inaruhusiwa kwa owner pekee.', m);
  }
  if (command === 'mode') {
    const requested = args.toLowerCase();
    if (!['private', 'public'].includes(requested)) return reply(jid, 'Matumizi: .mode private au .mode public', m);
    mode = requested;
    return reply(jid, '🔒 Mode imewekwa: ' + mode, m);
  }
  if (mode === 'private' && !isOwner) return;
  if (command === 'autoviewstatus' || command === 'autolikestatus') {
    const requested = args.toLowerCase();
    if (!['on', 'off'].includes(requested)) return reply(jid, 'Matumizi: .' + command + ' on/off', m);
    if (command === 'autoviewstatus') autoViewStatus = requested === 'on';
    else autoLikeStatus = requested === 'on';
    return reply(jid, (command === 'autoviewstatus' ? '👁️ Autoview Status: ' : '❤️ Autolike Status: ') + requested.toUpperCase(), m);
  }
  switch (command) {
    case 'menu':
    case 'help':
      return reply(jid, [
        '╭━━━〔 🤖 HANS TECHY V2 〕━━━╮',
        '│ .ping — angalia bot',
        '│ .alive — hali ya bot',
        '│ .ai swali — uliza AI',
        '│ .menu — orodha ya amri',
        '│ .mode private/public — owner',
        '│ .autoviewstatus on/off — owner',
        '│ .autolikestatus on/off — owner',
        '╰━━━━━━━━━━━━━━━━━━━━╯'
      ].join('\n'), m);
    case 'ping': return reply(jid, '🏓 Pong! HANS TECHY V2 iko hewani.', m);
    case 'alive': return reply(jid, '✅ HANS TECHY V2 inafanya kazi.', m);
    case 'ai':
    case 'gpt': return reply(jid, await askAI(args), m);
    default: return;
  }
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  sock = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: true,
    browser: ['HANS TECHY V2', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') console.log('✅ HANS TECHY V2 imeunganishwa na WhatsApp.');
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log('Muunganisho umekatika; inajaribu kuunganisha tena...');
        setTimeout(() => start().catch(err => logger.error({ err }, 'Reconnect failed')), 3000);
      } else {
        console.error('WhatsApp imetoka kwenye linked devices. Unganisha upya kwa hiari yako; usifute auth bila backup.');
      }
    }
  });
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      if (m.key.remoteJid === 'status@broadcast') {
        await handleStatus(m);
        continue;
      }
      if (!m.message) continue;
      try { await handleCommand(m); }
      catch (err) { logger.error({ err }, 'Command handler failed'); }
    }
  });
}

start().catch(err => { logger.error({ err }, 'Startup failed'); process.exitCode = 1; });
