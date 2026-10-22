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
import os from 'node:os';
import fs from 'node:fs';

const OWNER_NAME = String(process.env.OWNER_NAME || 'HANS TECHY').trim();
const MENU_GROUPS = {
  'AI & CHAT': ['ai','gpt','ask','chat','translate','summarize','rewrite','grammar','explain','code','debug','story','poem','joke','fact','advice','define','synonym','antonym','spellcheck','caption','bio','hashtag','brainstorm','roleplay'],
  'WHATSAPP STATUS': ['autoviewstatus','autolikestatus','status','statusview','statuslike','statussave','statusreply','statusreact','statusinfo','mystatus','statusprivacy','statusdownload','statuscaption','statuscheck','statuslist','statusnotify','statusshare','statusforward','statuscount','statusseen'],
  'GROUP': ['groupinfo','groupstats','admins','alladmins','tagall','hidetag','promote','demote','kick','add','invite','revoke','groupname','groupdesc','grouplink','groupopen','groupclose','welcome','goodbye','antilink','antispam','warn','warnings','mute','unmute','poll','vote','rules','membercount','memberlist','tagadmins'],
  'STICKER & MEDIA': ['sticker','s','toimg','tomp4','togif','tourl','take','steal','emojimix','attp','ttp','brat','circle','crop','resize','blur','sharpen','gray','invert','mirror','flip','rotate','watermark','enhance','compress','audio','video','mp3','mp4','gif','webp','png','jpg','ocr'],
  'DOWNLOADERS': ['play','song','video','ytmp3','ytmp4','youtube','ytsearch','tiktok','instagram','facebook','twitter','pinterest','spotify','soundcloud','mediafire','gdrive','mega','threads','reddit','capcut','snapchat','vimeo','apk','playstore','github','wikipedia','news','lyrics','shortlink'],
  'TOOLS': ['ping','alive','uptime','runtime','time','date','echo','jid','owner','botinfo','about','help','menu','calc','percent','random','timestamp','uuid','password','coinflip','dice','choose','reverse','upper','lower','titlecase','count','trim','base64','unbase64','urlencode','urldecode','json','hash','binary','hex','morse','unit','currency','timezone','calendar','timer','remind','note','todo','system','ram','storage','server','host'],
  'GAMES & FUN': ['8ball','truth','dare','riddle','trivia','guess','numbergame','wordgame','hangman','tictactoe','rps','roll','fortune','compliment','roast','ship','compatibility','flirt','rate','meme','animal','cat','dog','waifu','anime','quote','motivate','horoscope','zodiac','wouldyourather'],
  'OWNER & BOT': ['mode','setprefix','setname','setbio','setstatus','setpp','restart','broadcast','bc','eval','exec','update','plugin','plugins','enable','disable','maintenance','public','private','autoread','autoreact','antidelete','anticall','block','unblock','backup','restore','logs','ownerinfo','setlanguage','settimezone'],
  'SEARCH & INFO': ['google','search','image','images','map','define2','dictionary','translate2','country','capital','crypto','stocks','sports','football','score','movie','imdb','anime2','manga','book','recipe','convert','exchange','flight','hotel','restaurant','nearby','address','phoneinfo','urlscan','whois','trending','factcheck','stackoverflow','docs'],
  'EXTRA / PLANNED': ['autobio','autocaption','autosticker','autodownload','autoreply','autoview','autolike','autoreactstatus','antifake','antibot','antibug','antiinvite','antitag','antiflood','antiraid','welcome2','goodbye2','setppgroup','setgroupname','setgroupdesc','setgroupicon','groupmute','groupunmute','tagadmins','tagmembers','getcontact','savecontact','vcard','fetch','upload','share','forward','react','remindme','schedule','profile','avatar','banner','logo','qrgen','qrcode','readqr','fancytext','asciiart','countdown','age','bmi','tip','splitbill','budget','pomodoro','studyplan','randomuser','screenshot','website','html','css','javascript','python','regex','git','repo','issue','pullrequest','package','dependencies','checkupdate','release','feedback','report','suggest','support','premium','daily','weekly','stats','analytics','commandlist','allcommands','featurelist','test','diagnostics','health','connection','reconnect','pair','sessioninfo','sessionbackup','export','import','clearcache','clearlogs','chatinfo','chatlist','privacy','deviceinfo','battery','network','memory','cpu','disk','process','environment','version','license','credits','terms','faq','tutorial','guide','quickstart','examples','demo','feedback2','supportticket','contactowner','botstatus','whatsappstatus','connectionstatus','messagecount','userstats','dailyusage','weeklyusage','monthlyusage','resetstats','insights','recommendations','language','swahili','english','french','arabic','spanish','hindi','portuguese','japanese','chinese','korean','italian','german','russian','turkish','indonesian','translate3','langdetect','proofread','paraphrase','simplify','formalize','expand','outline','bulletpoints','mindmap','flashcards','exam','homework','explaincode','codeformat','codeconvert','sql','restapi','graphql','curl','httpget','httppost','webhook','ipaddress','ipv4','ipv6','macaddress','subnet','portcheck','sslcheck','certificate','expiry','latency','traceroute','lookupdns','geolocation','forecast','sunrise','sunset','moonphase','airquality','earthquake','forex','bitcoin','ethereum','goldprice','fuelprice','tax','salary','loan','mortgage','savings','investment','retirement','length','weight','temperature','volume','area','speed','pressure','energy','dataunit','unix','epoch','stopwatch','alarm','reminders','checklist','habit','goal','planner','events','birthday','anniversary','daysbetween','dateadd','datediff','randompick','decision','yesno','tarot','dreammeaning','namegen','username','nickname','teamname','businessname','domainname','slogan','brandname','storygen','plotgen','characterbuild','dialogue','script','rhyme','haiku','sonnet','speech','toast','apology','congratulate','invitation','resume','coverletter','interview','agenda','minutes','proposal','businessplan','marketing','seo','keyword','headline','adcopy','productdesc','review','socialpost','tweet','thread','youtube_title','youtube_desc','contentplan','brandvoice','audience','persona','competitor','swot','pitch','invoice','receipt','quotation','contract','policy','citation','references','bibliography','apa','mla','plagiarism','compare','proscons','riskanalysis','rootcause','kanban','okr','kpi','dashboard','report2','weeklyreport','monthlyreport','projectplan','roadmap','milestone','timeline','flowchart','diagram','architecture','database','schema','sqlquery','mockdata','testdata','unittest','integrationtest','loadtest','benchmark','lint','format','compile','build','deploy','rollback','docker','linux','bash','termux','ssh','scp','rsync','cron','systemd','pm2','gitclone','gitpull','gitpush','gitstatus','gitlog','gitdiff','gitbranch','gitmerge','gitstash','gitreset','gitrevert','github','gitlab','bitbucket','gist','actions','workflow','pipeline','dotenv','config','permission','roles','access','audit','ratelimit','queue','worker','cache','redis','mongodb','postgres','mysql','sqlite','firebase','supabase','prisma','migration','websocket','socket','baileys','whatsapp','paircode','pairing','connect','disconnect','session','creds','credentials','linkeddevices','logout','auth','authstatus','authbackup','authrestore','ownercheck','modeinfo','publicmode','privatemode','statusmode','statusconfig','botsettings','settings','settingsreset','commandinfo','commandsearch','findcommand','commandstats','commandusage','mostused','recentcommands','changelog','versioninfo','checkhealth','healthcheck','selftest','diagnose','doctor','repair','rebuild','reinstall','start','stop','pid','processid','memoryusage','cpuusage','diskusage','networkusage','loglevel','logtail','crashlog','errorlog','stacktrace','bugreport','ticket','ticketstatus','helpdesk','gettingstarted','playground','sandbox','testai','teststatus','testgroup','testmedia','testdownload','testtools','testowner','testmode','testprivate','testpublic','testconnection','testauth','testsession','testbackup','testrestore','testconfig','testenv','testapi','testopenai','testnetwork','teststorage','testserver','testhost','testram','testcpu','testdisk','testlogs','testerrors','testsecurity','testprivacy','testweather','testcurrency','testconvert','testcalc','testgame','testquote','testjoke','testfact','testmeme','teststicker','testimage','testaudio','testvideo','testpdf','testfile','testurl','testqrgen','testocr','testhash','testencode','testdecode','testjson','testxml','testyaml','testcsv','testmarkdown','testregex','testsql','testcode','testgit','testgithub','testrepo','testissue','testpullrequest','testcommit','testbranch','testworkflow','testdeploy','testrollback','testdocker','testlinux','testtermux','testssh','testcron','testpm2','testnode','testnpm','testpackage','testdependency','testbuild','testlint','testformat','testcompile','testunit','testintegration','testload','testbenchmark','testprofile','testdatabase','testwebhook','testsocket','testreconnect','testlogout','testpair','testqrlogin','testdevice','testlinkeddevice','testcommands','testfeatures','testplugins','testupdates','testversion','testrelease','testdocs','testreadme','testlicense','testterms','testfaq','testsupport','testfeedback','testsuggest','testreport','testdonate','testpremium','testtrial','testclaim','testredeem','testsubscribe','testunsubscribe','testlanguage','testtranslate','testsearch','testweather','testcurrency2','testconversion','testcalculation','testrandomizer','testgame2','testfun2','testquote2','testjoke2','testfact2','testmeme2','teststicker2','testimage2','testaudio2','testvideo2','testpdf2','testfile2','testurl2','testhash2','testencode2','testdecode2','testjson2','testxml2','testyaml2','testcsv2','testmarkdown2','testregex2','testsql2','testcode2','testgit2','testrepo2','testissue2','testcommit2','testbranch2','testdeploy2','testrollback2','testdocker2','testlinux2','testtermux2','testssh2','testcron2','testpm22','testnode2','testnpm2','testpackage2','testdependency2','testbuild2','testlint2','testformat2','testcompile2','testunit2','testintegration2','testload2','testbenchmark2','testprofile2','testbackup2','testrestore2','testconfig2','testenv2','testapi2','testopenai2','testnetwork2','teststorage2','testserver2','testhost2','testlogs2','testerrors2','testpermissions2','testsecurity2','testprivacy2','testhealth2','testdiagnostics2','testreconnect2','testsession2','testauth2','testowner2','testmode2','teststatus2','testmenu2','testhelp2','testping2','testalive2','testuptime2','testabout2','testversion2','testchangelog2','testfaq2','testsupport2','testcontact2','testreport2','testfeedback3','testsuggest2','testticket2','testanalytics','teststats','testusage','testcommands3','testfeatures3','testplugins3','testupdates3','testrelease3','testdocs3','testreadme3','testlicense3','testterms3','testprivacy3','testtutorial','testguide','testquickstart','testexamples','testdemo','testplayground','testsandbox','testend'];
};
const ALL_COMMANDS = [...new Set(Object.values(MENU_GROUPS).flat())].slice(0, 385);
function buildMenu() {
  const totalMem = Math.round(os.totalmem() / 1024 ** 3);
  const freeMem = Math.round(os.freemem() / 1024 ** 3);
  const owner = OWNER_NUMBER ? '+' + OWNER_NUMBER : 'Not set';
  const sections = [
    '╭━━━〔 🤖 *HANS TECHY* 〕━━━╮',
    '│ 👑 *Owner:* ' + OWNER_NAME,
    '│ 📱 *Owner Number:* ' + owner,
    '│ 🔒 *Mode:* ' + mode,
    '│ 🌐 *Host:* ' + os.hostname(),
    '│ 🖥️ *Server:* ' + process.platform + ' / Node.js',
    '│ 🧠 *RAM:* ' + freeMem + 'GB free / ' + totalMem + 'GB',
    '│ 💾 *Storage:* ' + process.cwd(),
    '╰━━━━━━━━━━━━━━━━━━━━╯',
    'ℹ️ Amri zilizoandikwa PLANNED hazijatekelezwa bado.',
    ''
  ];
  for (const [category, commands] of Object.entries(MENU_GROUPS)) {
    sections.push('〔 ' + category + ' 〕');
    sections.push(commands.map(c => '.' + c).join('  '));
    sections.push('');
  }
  sections.push('📌 Orodha ya amri: ' + ALL_COMMANDS.length + ' majina ya amri (baadhi ni planned).');
  return sections.join('\n');
}


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
      return reply(jid, buildMenu(), m);
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
