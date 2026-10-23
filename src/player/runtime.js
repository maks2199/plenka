/* Плеер показа. Самодостаточный модуль без импортов:
 * его исходник целиком (через `?raw`) встраивается в скачиваемый HTML,
 * поэтому внутри нельзя ссылаться ни на что снаружи функции. */
export function playerMain(D, root, opts) {
  opts = opts || {};
  var IMG = D.img || [];
  var css = `
.pl{position:fixed;inset:0;background:#0d0c0b;color:#f3eee5;font-family:'Golos Text',system-ui,-apple-system,'Segoe UI',sans-serif;overflow:hidden;user-select:none;-webkit-user-select:none;z-index:1000;cursor:default}
.pl *{box-sizing:border-box}
.pl-stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transition:opacity .32s ease}
.pl-stage.fade{opacity:0}
.pl-center{position:relative;z-index:2;text-align:center;padding:2rem;max-width:1180px}
.pl-eyebrow{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;letter-spacing:.35em;text-transform:uppercase;color:#f0b13a;font-size:clamp(.8rem,1.3vw,1rem);margin-bottom:1.4rem}
.pl-h1{font-family:'Unbounded','Arial Black',system-ui,sans-serif;font-weight:700;font-size:clamp(2.4rem,8.5vw,7.2rem);letter-spacing:-.03em;line-height:1.04;text-wrap:balance;margin:0}
.pl-h2{font-family:'Unbounded','Arial Black',system-ui,sans-serif;font-weight:700;font-size:clamp(2.2rem,7vw,6rem);letter-spacing:-.03em;line-height:1.05;text-wrap:balance;margin:0 0 1.1rem;text-shadow:0 2px 24px rgba(0,0,0,.6)}
.pl-sub{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;color:#9a9184;margin-top:1.4rem;font-size:clamp(.9rem,1.6vw,1.15rem)}
.pl-date{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:clamp(1rem,1.9vw,1.3rem);opacity:.85}
.pl-blurb{font-style:italic;color:#c9c1b4;font-size:clamp(1rem,2.1vw,1.4rem);margin-top:1.1rem}
.pl-hint{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:.85rem;color:#9a9184;margin-top:3rem}
.pl kbd{display:inline-block;padding:2px 8px;border:1px solid #3a362f;background:#1c1a17;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:.85em;color:#f3eee5;margin:0 2px}
.pl-bg{position:absolute;inset:-60px;background-size:cover;background-position:center;filter:blur(40px) brightness(.35)}
.pl-collage{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:4px;overflow:hidden}
.pl-collage div{overflow:hidden}
.pl-collage img{width:100%;height:100%;object-fit:cover;filter:blur(32px) brightness(.5);transform:scale(1.12);transition:filter .5s ease}
.rev .pl-collage img{filter:brightness(.62)}
.pl-q{font-family:'Unbounded','Arial Black',system-ui,sans-serif;font-weight:700;font-size:clamp(1.7rem,4.4vw,3.6rem);line-height:1.15;letter-spacing:-.02em;text-shadow:0 2px 24px rgba(0,0,0,.85);text-wrap:balance;margin:0}
.pl-ans{margin-top:1.8rem;animation:plup .42s ease}
.pl-ans-t{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;color:#f0b13a;letter-spacing:.2em;text-transform:uppercase;font-size:clamp(1rem,1.9vw,1.35rem)}
.pl-ans-x{font-size:clamp(1.1rem,2.4vw,1.6rem);margin-top:.6rem;text-shadow:0 2px 16px rgba(0,0,0,.8)}
.pl-story{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#000}
.pl-story img{max-width:100%;max-height:100%;object-fit:contain;display:block}
.pl-bars{position:absolute;top:0;left:0;right:0;display:flex;gap:4px;padding:10px 14px;z-index:5}
.pl-bar{flex:1;height:3px;background:rgba(255,255,255,.25);border-radius:2px;overflow:hidden}
.pl-bar i{display:block;height:100%;width:0;background:#f3eee5}
.pl-bar.done i{width:100%}
.pl-bar.on i{animation:plfill var(--d,4000ms) linear forwards}
.paused .pl-bar.on i{animation-play-state:paused}
.pl-cap{position:absolute;top:24px;left:16px;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:.85rem;color:#e6dfd3;text-shadow:0 1px 8px rgba(0,0,0,.9);z-index:5}
.pl-hud{position:absolute;left:22px;bottom:22px;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;background:rgba(0,0,0,.5);padding:6px 10px;border-radius:4px;color:#c9c1b4;font-size:.85rem;z-index:6}
.pl-flag{position:absolute;right:22px;bottom:22px;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;background:rgba(0,0,0,.5);padding:6px 10px;border-radius:4px;color:#f0b13a;font-size:.8rem;z-index:6}
.pl-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2vw;width:100%;height:58vh;margin:2rem auto 0}
.pl-pair figure{margin:0;position:relative;background:#000;overflow:hidden;outline:4px solid transparent;outline-offset:-4px;transition:outline-color .3s,opacity .3s}
.pl-pair img{width:100%;height:100%;object-fit:cover;display:block}
.pl-pair .L{position:absolute;left:18px;bottom:10px;font-family:'Unbounded','Arial Black',sans-serif;font-weight:700;font-size:clamp(2.4rem,5vw,4.5rem);color:#f0b13a;text-shadow:0 2px 16px rgba(0,0,0,.8);line-height:1}
.pl-pair .dt{position:absolute;right:14px;bottom:16px;background:rgba(13,12,11,.85);padding:6px 12px;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:clamp(.9rem,1.5vw,1.15rem);animation:plup .4s ease}
.rev .pl-pair figure.win{outline-color:#f0b13a}
.rev .pl-pair figure.lose{opacity:.55}
.pl-top{position:absolute;top:0;left:0;right:0;padding:4vh 4vw 0;text-align:center;z-index:2}
.pl-quote{font-size:clamp(1.5rem,3.6vw,3rem);font-weight:600;line-height:1.25;text-wrap:balance;margin:0 auto;max-width:28ch}
.pl-opts{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:2.6rem auto 0;max-width:900px}
.pl-opt{border:1px solid #3a362f;background:rgba(13,12,11,.6);padding:1rem 1.3rem;font-size:clamp(1rem,2vw,1.5rem);text-align:left;display:flex;gap:1rem;align-items:baseline;transition:opacity .3s,border-color .3s}
.pl-opt b{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;color:#f0b13a;font-weight:500}
.rev .pl-opt.ok{border-color:#f0b13a;background:rgba(240,177,58,.14)}
.rev .pl-opt:not(.ok){opacity:.35}
.pl-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2.6rem 3rem;margin-top:2.6rem}
.pl-stat-n{font-family:'Unbounded','Arial Black',sans-serif;font-weight:700;font-size:clamp(2.4rem,6.5vw,5.6rem);letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.pl-stat-n small{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-weight:400;font-size:.32em;letter-spacing:0;color:#9a9184;margin-left:.3em}
.pl-stat-l{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase;color:#9a9184;font-size:clamp(.75rem,1.1vw,.9rem);margin-top:.7rem}
.pl-stat-x{font-size:.85rem;color:#7d766b;margin-top:.35rem}
.pl-recs{display:flex;flex-wrap:wrap;justify-content:center;gap:1rem 3rem;margin-top:3rem;padding-top:1.4rem;border-top:1px solid #2e2b26;font-size:clamp(.95rem,1.5vw,1.15rem)}
.pl-recs span{display:block;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:.75rem;color:#9a9184;margin-bottom:.2rem}
.pl-recs em{font-style:normal;color:#f0b13a}
.pl-sum{max-height:92vh;overflow:auto;width:min(94vw,1300px);padding:2rem}
.pl-sum table{width:100%;border-collapse:collapse;font-size:clamp(.85rem,1.3vw,1.05rem)}
.pl-sum th,.pl-sum td{padding:.55em .8em;text-align:left;border-bottom:1px solid #26231f}
.pl-sum th{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:.72em;letter-spacing:.18em;text-transform:uppercase;color:#9a9184;font-weight:500}
.pl-sum .r{text-align:right;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums;white-space:nowrap}
.pl-sum .d{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;color:#9a9184;white-space:nowrap}
.pl-sum .ty{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;color:#f0b13a;white-space:nowrap}
.pl-sum .z{color:#4a453d}
.pl-menu{position:absolute;inset:0;background:rgba(0,0,0,.92);z-index:50;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:5vh 1.2rem}
.pl-menu[hidden]{display:none}
.pl-menu-in{max-width:640px;width:100%}
.pl-menu h3{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;letter-spacing:.3em;text-transform:uppercase;color:#f0b13a;font-size:.85rem;font-weight:500;margin:0 0 1rem}
.pl-menu h4{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;letter-spacing:.3em;text-transform:uppercase;color:#9a9184;font-size:.8rem;font-weight:500;margin:2rem 0 .7rem}
.pl-keys{display:grid;grid-template-columns:1fr 1fr;gap:.6rem 1rem;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:.85rem;color:#9a9184}
.pl-evs{list-style:none;margin:0;padding:0}
.pl-evs button{width:100%;display:flex;gap:.9rem;align-items:baseline;background:none;border:0;color:#f3eee5;padding:.55rem .6rem;cursor:pointer;text-align:left;font:inherit;font-size:.95rem}
.pl-evs button:hover,.pl-evs button:focus-visible{background:rgba(240,177,58,.12);color:#f0b13a;outline:none}
.pl-evs .k{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;color:#9a9184;font-size:.8rem;min-width:2.4em}
.pl-evs .dd{margin-left:auto;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;color:#9a9184;font-size:.8rem;white-space:nowrap}
.pl-mbtns{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1.4rem}
.pl-mbtns button{min-height:44px;padding:0 1.1rem;border:1px solid #3a362f;background:transparent;color:#f3eee5;font:inherit;cursor:pointer}
.pl-mbtns button.p{background:#f0b13a;border-color:#f0b13a;color:#12110f;font-weight:600}
.pl-reflect-sub{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;color:#9a9184;margin-top:2rem;font-size:clamp(.85rem,1.4vw,1.05rem)}
@keyframes plfill{from{width:0}to{width:100%}}
@keyframes plup{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@media (max-width:760px){.pl-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:1.6rem}.pl-opts{grid-template-columns:1fr}.pl-pair{grid-template-columns:1fr;height:70vh}}
@media (prefers-reduced-motion:reduce){.pl *{animation:none!important;transition:none!important}.pl-bar.on i{width:100%}}
`;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 9 ? '0' : '') + (n + 1); }
  function src(i) { return IMG[i] || ''; }

  root.innerHTML = '<style>' + css + '</style><div class="pl" tabindex="-1"><div class="pl-stage"></div><div class="pl-menu" hidden></div></div>';
  var pl = root.querySelector('.pl');
  var stage = root.querySelector('.pl-stage');
  var menu = root.querySelector('.pl-menu');
  var SL = D.slides || [];
  var cur = 0, timer = null, paused = false, rev = false, musicOn = false;
  var audio = null;
  if (D.music) { audio = new Audio(D.music); audio.loop = true; }
  var NEV = (D.events || []).length;

  function hud(s) { return (s.ev != null && (s.kind !== 'guess' || rev)) ? '<div class="pl-hud">' + pad(s.ev) + ' / ' + String(NEV).padStart(2, '0') + '</div>' : ''; }

  function render(s) {
    var h = '';
    switch (s.kind) {
      case 'intro':
        h = '<div class="pl-center"><div class="pl-eyebrow">' + esc(D.intro.eyebrow) + '</div><h1 class="pl-h1">' + esc(D.intro.title) + '</h1><div class="pl-sub">' + esc(D.intro.sub) + '</div><div class="pl-hint">нажми <kbd>Space</kbd> чтобы начать · <kbd>Esc</kbd> меню</div></div>';
        break;
      case 'outro':
        h = '<div class="pl-center"><div class="pl-eyebrow">' + esc(D.intro.eyebrow) + '</div><h1 class="pl-h1">' + esc(D.outro.title) + '</h1><div class="pl-sub">' + esc(D.outro.sub) + '</div></div>';
        break;
      case 'guess':
        h = '<div class="pl-collage">' + s.collage.map(function (i) { return '<div><img alt="" src="' + src(i) + '"></div>'; }).join('') + '</div>' +
          '<div class="pl-center"><h2 class="pl-q">' + esc(s.q) + '</h2>' +
          (rev ? '<div class="pl-ans"><div class="pl-ans-t">' + esc(s.aT) + '</div><div class="pl-ans-x">' + esc(s.aX) + '</div></div>' : '<div class="pl-hint">коллаж размыт · <kbd>Space</kbd> — ответ</div>') + '</div>' + hud(s);
        break;
      case 'title':
        h = '<div class="pl-bg" style="background-image:url(&quot;' + src(s.bg) + '&quot;)"></div><div class="pl-center"><div class="pl-eyebrow">Событие №' + pad(s.ev) + '</div><h2 class="pl-h2">' + esc(s.title) + '</h2><div class="pl-date">' + esc(s.date) + '</div>' + (s.blurb ? '<div class="pl-blurb">' + esc(s.blurb) + '</div>' : '') + '</div>' + hud(s);
        break;
      case 'story':
        var bars = '';
        for (var k = 0; k < s.sn; k++) bars += '<div class="pl-bar' + (k < s.si ? ' done' : (k === s.si ? ' on' : '')) + '" style="--d:' + (D.storySec * 1000) + 'ms"><i></i></div>';
        h = '<div class="pl-story"><img alt="" src="' + src(s.im) + '"></div><div class="pl-bars">' + bars + '</div>' + (s.cap ? '<div class="pl-cap">' + esc(s.cap) + '</div>' : '') + hud(s);
        break;
      case 'before':
        var fig = function (side, L) {
          var win = side.t === Math.min(s.a.t, s.b.t);
          return '<figure class="' + (win ? 'win' : 'lose') + '"><img alt="" src="' + src(side.im) + '"><span class="L">' + L + '</span>' + (rev ? '<span class="dt">' + esc(side.d) + '</span>' : '') + '</figure>';
        };
        h = '<div class="pl-center" style="width:100%;max-width:1560px"><h2 class="pl-q">Что было раньше?</h2><div class="pl-pair">' + fig(s.a, 'A') + fig(s.b, 'B') + '</div>' +
          (rev ? '<div class="pl-ans"><div class="pl-ans-x">' + esc(s.note) + '</div></div>' : '<div class="pl-hint">поднимайте A или B · <kbd>Space</kbd> — ответ</div>') + '</div><div class="pl-flag">вставка</div>';
        break;
      case 'who':
        h = (s.bg != null ? '<div class="pl-bg" style="background-image:url(&quot;' + src(s.bg) + '&quot;)"></div>' : '') +
          '<div class="pl-center"><div class="pl-eyebrow">Кто это написал?</div><p class="pl-quote">«' + esc(s.text) + '»</p><div class="pl-opts">' +
          s.opts.map(function (o, i) { return '<div class="pl-opt' + (o === s.author ? ' ok' : '') + '"><b>' + 'ABCD'[i] + '</b><span>' + esc(o) + '</span></div>'; }).join('') + '</div>' +
          (rev ? '<div class="pl-ans"><div class="pl-ans-x">' + esc(s.author) + ' · ' + esc(s.when) + '</div></div>' : '<div class="pl-hint"><kbd>Space</kbd> — ответ</div>') + '</div><div class="pl-flag">вставка · чат</div>';
        break;
      case 'reflect':
        h = '<div class="pl-center"><div class="pl-eyebrow">Рефлексия</div><h2 class="pl-q" style="font-size:clamp(2rem,5.4vw,4.4rem)">' + esc(s.text) + '</h2><div class="pl-reflect-sub">микрофон по кругу · у каждого минута</div></div>';
        break;
      case 'stats':
        h = '<div class="pl-center" style="width:100%;max-width:1240px"><div class="pl-eyebrow">' + esc(D.statsTitle) + '</div><div class="pl-stats">' +
          (D.stats || []).map(function (c) { return '<div><div class="pl-stat-n">' + esc(c.num) + (c.unit ? '<small>' + esc(c.unit) + '</small>' : '') + '</div><div class="pl-stat-l">' + esc(c.label) + '</div>' + (c.note ? '<div class="pl-stat-x">' + esc(c.note) + '</div>' : '') + '</div>'; }).join('') +
          '</div>' + ((D.records || []).length ? '<div class="pl-recs">' + D.records.map(function (r) { return '<div><span>' + esc(r.k) + '</span>' + esc(r.t) + ' — <em>' + esc(r.v) + '</em></div>'; }).join('') + '</div>' : '') + '</div>';
        break;
      case 'summary':
        var cell = function (v) { return v == null || v === '' ? '<span class="z">—</span>' : esc(v); };
        h = '<div class="pl-sum"><div class="pl-eyebrow" style="text-align:center">Все события</div><table><thead><tr><th class="r">№</th><th>Дата</th><th>Событие</th><th>Тип</th><th class="r">Дней</th><th class="r">Км</th><th class="r">Чел</th><th class="r">Кадров</th></tr></thead><tbody>' +
          (D.summary || []).map(function (r, i) { return '<tr><td class="r">' + pad(i) + '</td><td class="d">' + esc(r.date) + '</td><td style="font-weight:600">' + esc(r.title) + '</td><td class="ty">' + cell(r.type) + '</td><td class="r">' + cell(r.days) + '</td><td class="r">' + cell(r.km) + '</td><td class="r">' + cell(r.ppl) + '</td><td class="r">' + cell(r.n) + '</td></tr>'; }).join('') +
          '</tbody></table></div>';
        break;
    }
    stage.className = 'pl-stage' + (rev ? ' rev' : '');
    stage.innerHTML = h;
    pl.classList.toggle('paused', paused);
  }

  function preload() {
    for (var k = 1; k <= 3; k++) {
      var s = SL[cur + k]; if (!s) break;
      var ids = [];
      if (s.kind === 'story') ids = [s.im]; else if (s.kind === 'title') ids = [s.bg]; else if (s.kind === 'guess') ids = s.collage; else if (s.kind === 'before') ids = [s.a.im, s.b.im];
      ids.forEach(function (i) { var im = new Image(); im.src = src(i); });
    }
  }

  function arm() {
    clearTimeout(timer); timer = null;
    var s = SL[cur];
    if (paused || !menu.hidden) return;
    if (s.kind === 'story') timer = setTimeout(next, D.storySec * 1000);
    else if (s.kind === 'title') timer = setTimeout(next, D.titleSec * 1000);
  }

  function show(i, withRev) {
    i = Math.max(0, Math.min(SL.length - 1, i));
    var changed = i !== cur;
    cur = i; rev = !!withRev;
    if (changed) { stage.classList.add('fade'); }
    var go = function () { render(SL[cur]); stage.classList.remove('fade'); arm(); preload(); };
    if (changed && SL[cur].kind !== 'story') setTimeout(go, 120); else go();
  }
  var REV = { guess: 1, before: 1, who: 1 };
  function next() { show(cur + 1, false); }
  function advance() {
    var s = SL[cur];
    if (REV[s.kind] && !rev) { rev = true; render(s); return; }
    if (cur === SL.length - 1) return;
    next();
  }
  function back() { var t = cur - 1; if (t < 0) return; show(t, !!REV[SL[t].kind]); }
  function startMusic() {
    if (audio && !musicOn) { var p = audio.play(); musicOn = true; if (p && p.catch) p.catch(function () { musicOn = false; }); }
  }
  function toggleMusic() { if (!audio) return; if (musicOn) { audio.pause(); musicOn = false; } else startMusic(); }
  function togglePause() { paused = !paused; pl.classList.toggle('paused', paused); arm(); }
  function fullscreen() {
    var d = document;
    try { if (!d.fullscreenElement) { (d.documentElement.requestFullscreen ? d.documentElement.requestFullscreen() : Promise.resolve()).catch(function () {}); } else { d.exitFullscreen().catch(function () {}); } } catch (e) {}
  }
  function openMenu() {
    clearTimeout(timer);
    var h = '<div class="pl-menu-in"><h3>Меню</h3><div class="pl-keys"><div><kbd>Space</kbd> <kbd>→</kbd> вперёд</div><div><kbd>←</kbd> назад</div><div><kbd>P</kbd> пауза ' + (paused ? '(вкл)' : '') + '</div><div><kbd>F</kbd> полный экран</div>' + (audio ? '<div><kbd>M</kbd> музыка</div>' : '') + '<div><kbd>R</kbd> с начала</div><div><kbd>Esc</kbd> закрыть меню</div></div>';
    h += '<h4>Перейти к событию</h4><ol class="pl-evs">' + (D.events || []).map(function (e, i) { return '<li><button type="button" data-ev="' + i + '"><span class="k">' + pad(i) + '</span><span>' + esc(e.title) + '</span><span class="dd">' + esc(e.date) + '</span></button></li>'; }).join('') + '</ol>';
    h += '<div class="pl-mbtns"><button type="button" class="p" data-act="close">Продолжить</button><button type="button" data-act="final">К итогам</button>' + (opts.onExit ? '<button type="button" data-act="exit">Выйти из показа</button>' : '') + '</div></div>';
    menu.innerHTML = h; menu.hidden = false;
    var b = menu.querySelector('button.p'); if (b) b.focus();
  }
  function closeMenu() { menu.hidden = true; pl.focus(); arm(); }
  menu.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.ev != null) {
      var evi = +b.dataset.ev;
      var idx = SL.findIndex(function (s) { return s.ev === evi && (s.kind === 'guess' || s.kind === 'title'); });
      closeMenu(); if (idx >= 0) show(idx, false);
    } else if (b.dataset.act === 'close') closeMenu();
    else if (b.dataset.act === 'final') { closeMenu(); var si = SL.findIndex(function (s) { return s.kind === 'stats'; }); if (si >= 0) show(si); }
    else if (b.dataset.act === 'exit') { destroy(); opts.onExit(); }
  });
  function onKey(e) {
    var tg = e.target && e.target.tagName;
    if (tg === 'INPUT' || tg === 'TEXTAREA') return;
    if (!menu.hidden) { if (e.key === 'Escape') { e.preventDefault(); closeMenu(); } return; }
    switch (e.key) {
      case ' ': case 'ArrowRight': case 'ArrowDown': case 'PageDown': case 'Enter':
        e.preventDefault(); startMusic(); advance(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
        e.preventDefault(); back(); break;
      case 'Escape': e.preventDefault(); openMenu(); break;
      case 'p': case 'P': case 'з': case 'З': e.preventDefault(); togglePause(); break;
      case 'f': case 'F': case 'а': case 'А': e.preventDefault(); fullscreen(); break;
      case 'm': case 'M': case 'ь': case 'Ь': e.preventDefault(); toggleMusic(); break;
      case 'r': case 'R': case 'к': case 'К': e.preventDefault(); show(0); break;
      case 'Home': e.preventDefault(); show(0); break;
    }
  }
  function onClick(e) { if (!menu.hidden || e.target.closest('.pl-menu')) return; startMusic(); advance(); }
  document.addEventListener('keydown', onKey);
  stage.addEventListener('click', onClick);
  function destroy() {
    document.removeEventListener('keydown', onKey);
    clearTimeout(timer);
    if (audio) audio.pause();
    try { if (document.fullscreenElement) document.exitFullscreen().catch(function () {}); } catch (e) {}
    root.innerHTML = '';
  }
  render(SL[0]); preload(); pl.focus();
  return { destroy: destroy };
}
