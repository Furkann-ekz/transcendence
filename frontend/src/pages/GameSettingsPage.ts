import { t } from '../i18n';
import { navigateTo } from '../router';
import { getGameSettings, saveGameSettings, resetGameSettings} from '../utils/gameSettings';
import type { GameSettings } from '../utils/gameSettings';

let currentSettings: GameSettings;

export function render(): string
{
    currentSettings = getGameSettings();
    
    return `
        <div class="min-h-screen bg-gray-900 text-white p-4">
            <div class="max-w-4xl mx-auto">
                <div class="bg-gray-800 rounded-lg p-6 shadow-xl">
                    <div class="flex items-center justify-between mb-6">
                        <h1 class="text-3xl font-bold text-blue-400">${t('game_settings') || 'Game Settings'}</h1>
                        <button id="back-btn" class="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition">
                            ${t('back') || 'Back'}
                        </button>
                    </div>

                    <div class="mb-8">
                        <h2 class="text-xl font-semibold mb-4 text-green-400">${t('game_mode') || 'Game Mode'}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-gray-700 rounded-lg p-4 border-2 ${currentSettings.mode === 'classic' ? 'border-blue-400' : 'border-transparent'} cursor-pointer hover:border-blue-300 transition" data-mode="classic">
                                <h3 class="font-semibold">${t('classic_mode') || 'Classic Mode'}</h3>
                                <p class="text-sm text-gray-300">${t('classic_mode_desc') || 'Traditional Pong gameplay'}</p>
                            </div>
                            <div class="bg-gray-700 rounded-lg p-4 border-2 ${currentSettings.mode === 'powerup' ? 'border-blue-400' : 'border-transparent'} cursor-pointer hover:border-blue-300 transition" data-mode="powerup">
                                <h3 class="font-semibold">${t('powerup_mode') || 'Power-up Mode'}</h3>
                                <p class="text-sm text-gray-300">${t('powerup_mode_desc') || 'Enhanced gameplay with power-ups'}</p>
                            </div>
                        </div>
                    </div>

                    <div class="mb-8">
                        <h2 class="text-xl font-semibold mb-4 text-green-400">${t('ball_settings') || 'Ball Settings'}</h2>
                        <div>
                            <label class="block text-sm font-medium mb-2">${t('ball_speed') || 'Ball Speed'}: <span id="ball-speed-value">${currentSettings.ballSpeed}</span></label>
                            <input type="range" id="ball-speed" min="3" max="15" step="1" value="${currentSettings.ballSpeed}" 
                                   class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider">
                            <div class="flex justify-between text-xs text-gray-400 mt-1">
                                <span>${t('slow') || 'Slow'}</span>
                                <span>${t('fast') || 'Fast'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="mb-8">
                        <h2 class="text-xl font-semibold mb-4 text-green-400">${t('paddle_settings') || 'Paddle Settings'}</h2>
                        <div>
                            <label class="block text-sm font-medium mb-2">${t('paddle_speed') || 'Paddle Speed'}: <span id="paddle-speed-value">${currentSettings.paddleSpeed}</span></label>
                            <input type="range" id="paddle-speed" min="5" max="20" step="1" value="${currentSettings.paddleSpeed}" 
                                   class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider">
                            <div class="flex justify-between text-xs text-gray-400 mt-1">
                                <span>${t('slow') || 'Slow'}</span>
                                <span>${t('fast') || 'Fast'}</span>
                            </div>
                        </div>
                    </div>

                    <div id="powerup-settings" class="mb-8 ${currentSettings.mode !== 'powerup' ? 'hidden' : ''}">
                        <h2 class="text-xl font-semibold mb-4 text-green-400">${t('powerup_settings') || 'Power-up Settings'}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="flex items-center justify-between p-3 bg-gray-700 rounded">
                                <div>
                                    <h4 class="font-medium">${t('speed_boost') || 'Speed Boost'}</h4>
                                    <p class="text-sm text-gray-300">${t('speed_boost_desc') || 'Temporarily increases ball speed'}</p>
                                </div>
                                <input type="checkbox" id="speedBoost" ${currentSettings.powerups.speedBoost ? 'checked' : ''} 
                                       class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500">
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-4 justify-center">
                        <button id="save-settings" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition">
                            ${t('save_settings') || 'Save Settings'}
                        </button>
                        <button id="reset-settings" class="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-6 rounded-lg transition">
                            ${t('reset_to_default') || 'Reset to Default'}
                        </button>
                        <button id="test-local-game" class="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition">
                            ${t('test_local_game') || 'Test Local Game'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function afterRender(): void
{
    const backBtn = document.getElementById('back-btn')!;
    const saveBtn = document.getElementById('save-settings')!;
    const resetBtn = document.getElementById('reset-settings')!;
    const testLocalBtn = document.getElementById('test-local-game')!;
    
    const modeCards = document.querySelectorAll('[data-mode]');
    const powerupSettings = document.getElementById('powerup-settings')!;

    const ballSpeedSlider = document.getElementById('ball-speed') as HTMLInputElement;
    const paddleSpeedSlider = document.getElementById('paddle-speed') as HTMLInputElement;

    const ballSpeedValue = document.getElementById('ball-speed-value')!;
    const paddleSpeedValue = document.getElementById('paddle-speed-value')!;

    const speedBoostCheck = document.getElementById('speedBoost') as HTMLInputElement;

    modeCards.forEach(card =>
    {
        card.addEventListener('click', () =>
        {
            const mode = card.getAttribute('data-mode') as 'classic' | 'powerup';
            currentSettings.mode = mode;
            
            modeCards.forEach(c =>
            {
                c.classList.remove('border-blue-400');
                c.classList.add('border-transparent');
            });
            card.classList.remove('border-transparent');
            card.classList.add('border-blue-400');

            if (mode === 'powerup')
                powerupSettings.classList.remove('hidden');
            else
                powerupSettings.classList.add('hidden');
        });
    });

    ballSpeedSlider.addEventListener('input', () =>
	{
        currentSettings.ballSpeed = parseInt(ballSpeedSlider.value);
        ballSpeedValue.textContent = ballSpeedSlider.value;
    });

    paddleSpeedSlider.addEventListener('input', () =>
	{
        currentSettings.paddleSpeed = parseInt(paddleSpeedSlider.value);
        paddleSpeedValue.textContent = paddleSpeedSlider.value;
    });

    speedBoostCheck?.addEventListener('change', () =>
	{
        currentSettings.powerups.speedBoost = speedBoostCheck.checked;
    });

    backBtn.addEventListener('click', () => navigateTo('/lobby'));

    saveBtn.addEventListener('click', () =>
	{
        saveGameSettings(currentSettings);
        alert(t('settings_saved') || 'Settings saved successfully!');
    });

    resetBtn.addEventListener('click', () =>
	{
        if (confirm(t('reset_confirm') || 'Are you sure you want to reset all settings to default?'))
		{
            currentSettings = resetGameSettings();
            window.location.reload();
        }
    });

    testLocalBtn.addEventListener('click', () =>
	{
        saveGameSettings(currentSettings);
        navigateTo('/local-game');
    });
}


export function cleanup(): void {}