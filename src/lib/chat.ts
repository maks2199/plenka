import type { ChatMsg } from './types';

/* Парсеры экспорта переписки. Возвращают сообщения с локальным временем в мс. */

type TgPart = string | { text?: string };
function tgText(t: unknown): string {
  if (typeof t === 'string') return t;
  if (Array.isArray(t)) return (t as TgPart[]).map(x => (typeof x === 'string' ? x : x?.text || '')).join('');
  return '';
}

/** Telegram Desktop → Export chat history → JSON (result.json): один чат или полный экспорт. */
export function parseTelegramJSON(d: any): ChatMsg[] {
  let list: any[] = [];
  if (Array.isArray(d?.messages)) list = d.messages;
  else if (Array.isArray(d?.chats?.list)) d.chats.list.forEach((c: any) => { if (Array.isArray(c.messages)) list = list.concat(c.messages); });
  const out: ChatMsg[] = [];
  for (const m of list) {
    if (m.type && m.type !== 'message') continue;
    const x = tgText(m.text).trim();
    const a = m.from || m.actor;
    if (!x || !a) continue;
    const t = m.date_unixtime ? +m.date_unixtime * 1000 : Date.parse(m.date);
    if (!isFinite(t)) continue;
    out.push({ t, a: String(a), x });
  }
  return out;
}

/** Telegram Desktop → Export → HTML (messages.html, messages2.html…). */
export function parseTelegramHTML(html: string): ChatMsg[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out: ChatMsg[] = [];
  let last = '';
  doc.querySelectorAll('.message.default').forEach(el => {
    const fn = el.querySelector('.from_name');
    if (fn) last = (fn.textContent || '').trim();
    const dt = el.querySelector('.date[title]');
    const tx = el.querySelector('.text');
    if (!dt || !tx || !last) return;
    const m = /(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2})/.exec(dt.getAttribute('title') || '');
    if (!m) return;
    const t = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]).getTime();
    const x = (tx.textContent || '').trim();
    if (x) out.push({ t, a: last, x });
  });
  return out;
}

const WA = /^\[?(\d{1,2})[./](\d{1,2})[./](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?([AaPp][Mm])?\]?\s?(?:[-–]\s)?([^:]{1,60}?):\s(.*)$/;
/** WhatsApp → Экспорт чата → _chat.txt. Понимает «20.07.2025, 18:02 - Имя: текст» и «[7/20/25, 6:02:11 PM] Name: text». */
export function parseWhatsApp(text: string): ChatMsg[] {
  const out: ChatMsg[] = [];
  let last: ChatMsg | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/[‎ ]/g, ' ').replace(/ /g, ' ').trimStart();
    const m = WA.exec(line);
    if (m) {
      const a = +m[1], b = +m[2];
      let y = +m[3]; if (y < 100) y += 2000;
      let day = a, mon = b;
      if (/^\[?\d{1,2}\//.test(line) && a <= 12) { mon = a; day = b; }
      let h = +m[4];
      const ap = m[7];
      if (ap) { if (/p/i.test(ap) && h < 12) h += 12; if (/a/i.test(ap) && h === 12) h = 0; }
      const t = new Date(y, mon - 1, day, h, +m[5], m[6] ? +m[6] : 0).getTime();
      const x = m[9].trim();
      last = { t, a: m[8].trim(), x };
      if (x && !/^<(Media omitted|Без медиафайлов)>$/.test(x) && !/вложение|attached/i.test(x)) out.push(last);
    } else if (last && line.trim()) {
      last.x += '\n' + line.trim();
    }
  }
  return out;
}

export function parseChatFile(name: string, text: string): ChatMsg[] {
  const ext = (/\.([a-z0-9]+)$/i.exec(name)?.[1] || '').toLowerCase();
  try {
    if (ext === 'json') return parseTelegramJSON(JSON.parse(text));
    if (ext === 'html') return /class="message/.test(text) ? parseTelegramHTML(text) : [];
    return parseWhatsApp(text);
  } catch {
    return [];
  }
}
