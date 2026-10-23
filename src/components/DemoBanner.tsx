import { S, toast } from '../lib/store';
import { clearProject } from '../lib/persist';

export default function DemoBanner() {
  if (!S.demo) return null;
  return (
    <div className="banner">
      <div><b>Это демо.</b> Восемь придуманных событий и чат из нарисованных кадров — чтобы было видно, как всё работает. Ваши фото заменят его и хранятся только в этом браузере.</div>
      <button className="btn sm" type="button" onClick={async () => { await clearProject(); toast('Демо убрано. Загрузите свои фото.'); }}>Очистить демо</button>
    </div>
  );
}
