// frontend/src/i18n.ts

// Dil dosyalarını import ediyoruz.
import en from './locales/en.json';
import tr from './locales/tr.json';
import ru from './locales/ru.json';

const translations: { [key: string]: any } = { en, tr, ru };

let currentLanguage: string;
let currentTranslations: any;

function getLanguage(): string {
  // Kullanıcının daha önce seçtiği dil localStorage'da var mı diye bak.
  const savedLang = localStorage.getItem('language');
  // Yoksa, tarayıcının dilini al, o da desteklenmiyorsa İngilizce'ye ayarla.
  const browserLang = navigator.language.split('-')[0];
  return savedLang || (translations[browserLang] ? browserLang : 'en');
}

export function setLanguage(lang: string) {
  currentLanguage = lang;
  currentTranslations = translations[lang];
  localStorage.setItem('language', lang);
}

export function getCurrentLanguage(): string {
  return currentLanguage;
}

// Çeviri fonksiyonumuz (t kısaltmasıyla kullanılır: "translate")
export function t(key: string): string {
  return currentTranslations[key] || key;
}

// Uygulama ilk yüklendiğinde dili ayarla.
setLanguage(getLanguage());