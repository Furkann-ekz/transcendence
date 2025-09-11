// frontend/src/main.ts
import './style.css';
import { initializeRouter } from './router';

document.addEventListener('DOMContentLoaded', () => {
  void initializeRouter(); // 'void' eklendi
});