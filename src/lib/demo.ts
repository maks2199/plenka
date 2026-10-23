import { S, emit } from './store';
import { DAY, HOUR, mulberry, pad2 } from './format';
import { rebuild } from './events';
import { addPhoto } from './importers';
import { closeDrawable, resize } from './image';

/** Демо из нарисованных кадров и выдуманного чата — чтобы с первого экрана было видно, как всё работает. В базу не пишется. */
export async function loadDemo(): Promise<void> {
  S.demo = true;
  const src = { id: 'demo', name: 'Демо: 8 событий', kind: 'demo' as const, total: 0, done: 0, note: '' };
  S.sources.push(src);
  const plan: [string, string, number, number, [string, string, string], [number, number] | null][] = [
    ['Новогодние', '2025-01-03', 2, 12, ['#1E2A44', '#D8E1EE', '#E8B04A'], null],
    ['Каток', '2025-02-15', 1, 8, ['#2B3B52', '#EEF2F6', '#5FA8D3'], null],
    ['На озере', '2025-05-01', 4, 20, ['#4F7A9A', '#3E5C3A', '#F2D06B'], [61.02, 29.91]],
    ['День рождения Вики', '2025-06-14', 1, 10, ['#5B2A3C', '#E9C46A', '#F4A261'], null],
    ['Поход по Карелии', '2025-07-19', 5, 24, ['#6B8FB0', '#2F4A2C', '#F6E7B0'], [61.6, 31.2]],
    ['Выходные в городе', '2025-09-06', 2, 12, ['#8A9BA8', '#5A4636', '#E07A5F'], [59.94, 30.31]],
    ['Осенний лес', '2025-10-12', 1, 9, ['#A26B3B', '#3B3A2A', '#E9B44C'], [60.3, 29.4]],
    ['Новый год', '2025-12-31', 1, 11, ['#141B33', '#2E3A63', '#F0B13A'], null]
  ];
  src.total = plan.reduce((s, x) => s + x[3], 0);
  const rnd = mulberry(42);
  const c = document.createElement('canvas');
  c.width = 960; c.height = 640;
  const g = c.getContext('2d')!;
  for (const [title, date, days, n, pal, geo] of plan) {
    const [Y, M, Dd] = date.split('-').map(Number);
    const perDay = Math.ceil(n / days);
    const times: number[] = [];
    for (let i = 0; i < n; i++) {
      const base = new Date(Y, M - 1, Dd + Math.floor(i / perDay), 10, 0).getTime();
      times.push(base + (i % perDay) * (12 * HOUR / perDay) + Math.floor(rnd() * HOUR));
    }
    if (title === 'Новый год') for (let i = 0; i < n; i++) times[i] = new Date(Y, M - 1, Dd, 20, 0).getTime() + i * 26 * 60e3;
    times.sort((a, b) => a - b);
    let lat = geo ? geo[0] : 0, lon = geo ? geo[1] : 0;
    for (let i = 0; i < n; i++) {
      g.fillStyle = pal[0]; g.fillRect(0, 0, 960, 640);
      const hz = 330 + rnd() * 120;
      g.fillStyle = pal[2]; g.beginPath(); g.arc(150 + rnd() * 660, 90 + rnd() * 140, 34 + rnd() * 40, 0, 7); g.fill();
      g.fillStyle = pal[1];
      for (let k = 0; k < 3; k++) { const x = rnd() * 960; g.beginPath(); g.moveTo(x - 260, hz + 40); g.lineTo(x, hz - 110 - rnd() * 120); g.lineTo(x + 260, hz + 40); g.fill(); }
      g.fillRect(0, hz, 960, 640 - hz);
      g.fillStyle = 'rgba(0,0,0,.28)';
      for (let k = 0; k < 4; k++) { const x = 80 + rnd() * 800; g.fillRect(x, hz - 70 - rnd() * 30, 22, 90); g.beginPath(); g.arc(x + 11, hz - 88, 16, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '500 22px ui-monospace, Menlo, monospace';
      g.fillText(`демо · ${title} · ${i + 1}`, 24, 616);
      const full = await new Promise<Blob>(r => c.toBlob(b => r(b!), 'image/jpeg', 0.78));
      const bmp = await createImageBitmap(full);
      const th = await resize(bmp, 360, 0.7);
      closeDrawable(bmp);
      if (geo) { lat += (rnd() - 0.3) * 0.02; lon += (rnd() - 0.3) * 0.03; }
      addPhoto({ key: `demo_${date}_${i}`, name: `IMG_${date.replace(/-/g, '')}_${pad2(i)}.jpg`, dir: 'demo/' + title, t: times[i], tsrc: 'exif', lat: geo ? lat : null, lon: geo ? lon : null, w: 960, h: 640, full, thumb: th.blob, demo: true });
      src.done++;
    }
  }
  const authors = ['Аня', 'Борис', 'Вика', 'Гоша', 'Даша'];
  const lines = ['кто взял горелку?', 'мы уже на месте, ставим палатки', 'фоткайте закат, пока не ушёл', 'кто-нибудь видел мою кружку?', 'гречка или макароны — решаем голосованием', 'дошли до поворота, тут лужа размером с озеро', 'я опаздываю на электричку, ждите', 'а кто взял нож? снова никто', 'это лучший день за лето, без шуток', 'сколько ещё идти до стоянки?', 'кто взял спички, признавайтесь', 'привезу пирог, не ешьте всё без меня', 'у меня промокли кроссовки насквозь', 'кто хочет завтра на рассвет?', 'всем спасибо, это было мощно'];
  for (const [, date, days] of plan) {
    const [Y, M, Dd] = date.split('-').map(Number);
    for (let i = 0; i < 26; i++) {
      S.chat.push({ t: new Date(Y, M - 1, Dd - 1, 9).getTime() + Math.floor(rnd() * (days + 1) * DAY), a: authors[Math.floor(rnd() * authors.length)], x: lines[Math.floor(rnd() * lines.length)] });
    }
  }
  S.chat.sort((a, b) => a.t - b.t);
  S.sources.push({ id: 'demo-chat', name: 'Демо-чат.json', kind: 'chat', total: S.chat.length, done: S.chat.length, note: `${S.chat.length} сообщений · 5 участников` });
  rebuild();
  emit();
}
