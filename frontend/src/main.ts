// frontend/src/main.ts
import { t } from './i18n';
import './style.css';
import { initializeRouter } from './router';
import { setLanguage, getCurrentLanguage } from './i18n'; // getCurrentLanguage'ı import et

document.addEventListener('DOMContentLoaded', () => {
  
  // --- DİL DEĞİŞTİRME MANTIĞINI AŞAĞIDAKİYLE GÜNCELLE ---
  const currentLangBtn = document.getElementById('current-lang-btn');
  const currentLangText = document.getElementById('current-lang-text');
  const langOptions = document.getElementById('lang-options');

  document.querySelectorAll('[data-translate]').forEach(element => {
    const key = element.getAttribute('data-translate');
    if (key) {
      element.textContent = t(key);
    }
  });

  // Sayfa yüklendiğinde mevcut dili butona yaz
  if (currentLangText) {
    currentLangText.textContent = getCurrentLanguage().toUpperCase();
  }

  // Ana butona tıklayınca menüyü aç/kapat
  currentLangBtn?.addEventListener('click', (e) => {
    e.stopPropagation(); // Sayfanın başka yerine tıklama olayını tetiklemesin
    langOptions?.classList.toggle('hidden');
  });

  // Seçeneklerden birine tıklayınca dili değiştir
  langOptions?.addEventListener('click', (e) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const lang = target.getAttribute('data-lang');
    if (lang) {
      setLanguage(lang);
      window.location.reload();
    }
  });

  // Menü açıkken dışarıya tıklayınca kapat
  window.addEventListener('click', () => {
    if (!langOptions?.classList.contains('hidden')) {
      langOptions?.classList.add('hidden');
    }
  });
  // -----------------------------------------------------

  void initializeRouter();
});