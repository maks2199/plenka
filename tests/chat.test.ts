import { describe, expect, it } from 'vitest';
import { parseTelegramHTML, parseTelegramJSON, parseWhatsApp } from '../src/lib/chat';

describe('chat parsers', () => {
  it('Telegram JSON with rich text parts', () => {
    const m = parseTelegramJSON({ messages: [
      { type: 'message', date: '2025-05-01T10:00:00', date_unixtime: '1746082800', from: 'Маша', text: ['кто взял ', { type: 'bold', text: 'газ' }, '?'] },
      { type: 'service', actor: 'Петя', action: 'pin_message' },
      { type: 'message', date: '2025-05-01T10:01:00', from: 'Петя', text: '' }
    ] });
    expect(m).toEqual([{ t: 1746082800000, a: 'Маша', x: 'кто взял газ?' }]);
  });
  it('Telegram full export with several chats', () => {
    expect(parseTelegramJSON({ chats: { list: [{ messages: [{ type: 'message', date: '2025-01-01T00:00:00', from: 'A', text: 'hi' }] }, { messages: [{ type: 'message', date: '2025-01-02T00:00:00', from: 'B', text: 'yo' }] }] } }).length).toBe(2);
  });
  it('Telegram HTML keeps author for joined messages', () => {
    const html = `<div class="message default"><div class="from_name">Оля</div><div class="date" title="01.05.2025 10:15:00 UTC+03:00"></div><div class="text">раз</div></div>
      <div class="message default joined"><div class="date" title="01.05.2025 10:16:00 UTC+03:00"></div><div class="text">два</div></div>`;
    expect(parseTelegramHTML(html).map(m => m.a + ':' + m.x)).toEqual(['Оля:раз', 'Оля:два']);
  });
  it('WhatsApp: Russian and US formats, multi-line, media skipped', () => {
    const txt = '01.05.2025, 10:15 - Маша: выезжаем в восемь\nи берём палатку\n01.05.2025, 10:16 - Петя: <Без медиафайлов>\n[8/10/25, 9:05:11 PM] Оля: what a day';
    const m = parseWhatsApp(txt);
    expect(m.map(x => x.a)).toEqual(['Маша', 'Оля']);
    expect(m[0].x).toBe('выезжаем в восемь\nи берём палатку');
    expect(new Date(m[1].t).getHours()).toBe(21);
    expect(new Date(m[1].t).getMonth()).toBe(7);
  });
});
