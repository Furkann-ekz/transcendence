// frontend/src/main.ts
import './style.css';
import { initializeRouter } from './router';
import { setLanguage } from './i18n'; // setLanguage'ı import et

document.addEventListener('DOMContentLoaded', () => {
  
  // DİL DEĞİŞTİRME MANTIĞINI BURAYA TAŞIYORUZ
  const langContainer = document.getElementById('language-switcher-container');
  langContainer?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.matches('.lang-btn')) {
      const lang = target.getAttribute('data-lang');
      if (lang) {
        setLanguage(lang);
        window.location.reload(); // Değişikliğin yansıması için sayfayı yenile
      }
    }
  });

  void initializeRouter();
});