import en from './locales/en.json';
import tr from './locales/tr.json';
import ru from './locales/ru.json';

const translations: { [key: string]: any } = { en, tr, ru };

let currentLanguage: string;
let currentTranslations: any;

function getLanguage(): string
{
	const savedLang = localStorage.getItem('language');
	const browserLang = navigator.language.split('-')[0];
	return (savedLang || (translations[browserLang] ? browserLang : 'en'));
}

export function setLanguage(lang: string)
{
	currentLanguage = lang;
	currentTranslations = translations[lang];
	localStorage.setItem('language', lang);
}

export function getCurrentLanguage(): string
{
	return (currentLanguage);
}

export function t(key: string): string
{
	if (Object.prototype.hasOwnProperty.call(currentTranslations, key))
		return (currentTranslations[key]);
	return (key);
}

setLanguage(getLanguage());