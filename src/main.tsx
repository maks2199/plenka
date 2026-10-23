import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { boot } from './lib/persist';

createRoot(document.getElementById('root')!).render(<App />);
boot();
