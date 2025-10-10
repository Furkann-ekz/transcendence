import './style.css';
import { initializeRouter } from './router';
import { setLanguage, getCurrentLanguage } from './i18n';

document.addEventListener('DOMContentLoaded', () =>
{	
	const currentLangBtn = document.getElementById('current-lang-btn');
	const currentLangText = document.getElementById('current-lang-text');
	const langOptions = document.getElementById('lang-options');

	if (currentLangText)
		currentLangText.textContent = getCurrentLanguage().toUpperCase();

	currentLangBtn?.addEventListener('click', (e) =>
	{
		e.stopPropagation();
		langOptions?.classList.toggle('hidden');
	});

	langOptions?.addEventListener('click', (e) =>
	{
		e.preventDefault();
		const target = e.target as HTMLElement;
		const lang = target.getAttribute('data-lang');
		if (lang)
		{
			setLanguage(lang);
			window.location.reload();
		}
});

	window.addEventListener('click', () =>
	{
		if (!langOptions?.classList.contains('hidden'))
			langOptions?.classList.add('hidden');
	});

	void initializeRouter();
});