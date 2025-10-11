import { t } from '../i18n';
import { navigateTo } from '../router';
import { getGameSettings, saveGameSettings, resetGameSettings } from '../utils/gameSettings';
import type { GameSettings } from '../utils/gameSettings';

let currentSettings: GameSettings;

export function render(): string {
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

                    <!-- Game Mode Selection -->
                    <div class="mb-8">
                        <h2 class="text-xl font-semibold mb-4 text-green-400">${t('game_mode') || 'Game Mode'}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="bg-gray-700 rounded-lg p-4 border-2 ${currentSettings.mode === 'classic' ? 'border-blue-400' : 'border-transparent'} cursor-pointer hover:border-blue-300 transition" data-mode="classic">
                                <h3 class="font-semibold">${t('classic_mode') || 'Classic Mode'}</h3>
                                <p class="text-sm text-gray-300">${t('classic_mode_desc') || 'Traditional Pong gameplay'}</p>
                            </div>
                            <div class="bg-gray-700 rounded-lg p-4 border-2 ${currentSettings.mode === 'powerup' ? 'border-blue-400' : 'border-transparent'} cursor-pointer hover:border-blue-300 transition" data-mode="powerup">
                                <h3 class="font-semibold">${t('powerup_mode') || 'Power-up Mode'}</h3>
                                <p class="text-sm text-gray-300">${t('powerup_mode_desc') || 'Enhanced gameplay with power-ups'}</p>
                            </div>
                            <div class="bg-gray-700 rounded-lg p-4 border-2 ${currentSettings.mode === 'speed' ? 'border-blue-400' : 'border-transparent'} cursor-pointer hover:border-blue-300 transition" data-mode="speed">
                                <h3 class="font-semibold">${t('speed_mode') || 'Speed Mode'}</h3>
                                <p class="text-sm text-gray-300">${t('speed_mode_desc') || 'Fast-paced intense gameplay'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Ball Settings -->
                    <div class="mb-8">
                        <h2 class="text-xl font-semibold mb-4 text-green-400">${t('ball_settings') || 'Ball Settings'}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium mb-2">${t('ball_speed') || 'Ball Speed'}: <span id="ball-speed-value">${currentSettings.ballSpeed}</span></label>
                                <input type="range" id="ball-speed" min="3" max="15" step="1" value="${currentSettings.ballSpeed}" 
                                       class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider">
                                <div class="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>${t('slow') || 'Slow'}</span>
                                    <span>${t('fast') || 'Fast'}</span>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-2">${t('ball_size') || 'Ball Size'}: <span id="ball-size-value">${currentSettings.ballSize}</span>px</label>
                                <input type="range" id="ball-size" min="8" max="20" step="2" value="${currentSettings.ballSize}" 
                                       class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider">
                                <div class="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>${t('small') || 'Small'}</span>
                                    <span>${t('large') || 'Large'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Paddle Settings -->
                    <div class="mb-8">
                        <h2 class="text-xl font-semibold mb-4 text-green-400">${t('paddle_settings') || 'Paddle Settings'}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium mb-2">${t('paddle_height') || 'Paddle Height'}: <span id="paddle-height-value">${currentSettings.paddleHeight}</span>px</label>
                                <input type="range" id="paddle-height" min="60" max="150" step="10" value="${currentSettings.paddleHeight}" 
                                       class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider">
                                <div class="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>${t('short') || 'Short'}</span>
                                    <span>${t('tall') || 'Tall'}</span>
                                </div>
                            </div>
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
                    </div>

                    <!-- Map Settings -->
                    <div class="mb-8">
                        <h2 class="text-xl font-semibold mb-4 text-green-400">${t('map_settings') || 'Map Settings'}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium mb-2">${t('map_width') || 'Map Width'}: <span id="map-width-value">${currentSettings.mapWidth}</span>px</label>
                                <input type="range" id="map-width" min="600" max="1200" step="50" value="${currentSettings.mapWidth}" 
                                       class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider">
                                <div class="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>${t('narrow') || 'Narrow'}</span>
                                    <span>${t('wide') || 'Wide'}</span>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-2">${t('map_height') || 'Map Height'}: <span id="map-height-value">${currentSettings.mapHeight}</span>px</label>
                                <input type="range" id="map-height" min="400" max="800" step="50" value="${currentSettings.mapHeight}" 
                                       class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider">
                                <div class="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>${t('short') || 'Short'}</span>
                                    <span>${t('tall') || 'Tall'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Power-ups Settings (only shown in powerup mode) -->
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
                            <div class="flex items-center justify-between p-3 bg-gray-700 rounded">
                                <div>
                                    <h4 class="font-medium">${t('paddle_extend') || 'Paddle Extend'}</h4>
                                    <p class="text-sm text-gray-300">${t('paddle_extend_desc') || 'Temporarily increases paddle size'}</p>
                                </div>
                                <input type="checkbox" id="paddleExtend" ${currentSettings.powerups.paddleExtend ? 'checked' : ''} 
                                       class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500">
                            </div>
                            <div class="flex items-center justify-between p-3 bg-gray-700 rounded">
                                <div>
                                    <h4 class="font-medium">${t('multi_ball') || 'Multi Ball'}</h4>
                                    <p class="text-sm text-gray-300">${t('multi_ball_desc') || 'Spawns additional balls'}</p>
                                </div>
                                <input type="checkbox" id="multiBall" ${currentSettings.powerups.multiBall ? 'checked' : ''} 
                                       class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500">
                            </div>
                            <div class="flex items-center justify-between p-3 bg-gray-700 rounded">
                                <div>
                                    <h4 class="font-medium">${t('freeze') || 'Freeze'}</h4>
                                    <p class="text-sm text-gray-300">${t('freeze_desc') || 'Temporarily slows opponent paddle'}</p>
                                </div>
                                <input type="checkbox" id="freeze" ${currentSettings.powerups.freeze ? 'checked' : ''} 
                                       class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500">
                            </div>
                        </div>
                    </div>

                    <!-- Preview -->
                    <div class="mb-8">
                        <h2 class="text-xl font-semibold mb-4 text-green-400">${t('preview') || 'Preview'}</h2>
                        <div class="bg-black rounded-lg p-4 flex justify-center">
                            <canvas id="preview-canvas" width="400" height="200" class="border border-gray-500"></canvas>
                        </div>
                    </div>

                    <!-- Action Buttons -->
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

export function afterRender(): void {
    const backBtn = document.getElementById('back-btn')!;
    const saveBtn = document.getElementById('save-settings')!;
    const resetBtn = document.getElementById('reset-settings')!;
    const testLocalBtn = document.getElementById('test-local-game')!;
    
    // Mode selection
    const modeCards = document.querySelectorAll('[data-mode]');
    const powerupSettings = document.getElementById('powerup-settings')!;

    // Range inputs
    const ballSpeedSlider = document.getElementById('ball-speed') as HTMLInputElement;
    const ballSizeSlider = document.getElementById('ball-size') as HTMLInputElement;
    const paddleHeightSlider = document.getElementById('paddle-height') as HTMLInputElement;
    const paddleSpeedSlider = document.getElementById('paddle-speed') as HTMLInputElement;
    const mapWidthSlider = document.getElementById('map-width') as HTMLInputElement;
    const mapHeightSlider = document.getElementById('map-height') as HTMLInputElement;

    // Value displays
    const ballSpeedValue = document.getElementById('ball-speed-value')!;
    const ballSizeValue = document.getElementById('ball-size-value')!;
    const paddleHeightValue = document.getElementById('paddle-height-value')!;
    const paddleSpeedValue = document.getElementById('paddle-speed-value')!;
    const mapWidthValue = document.getElementById('map-width-value')!;
    const mapHeightValue = document.getElementById('map-height-value')!;

    // Powerup checkboxes
    const speedBoostCheck = document.getElementById('speedBoost') as HTMLInputElement;
    const paddleExtendCheck = document.getElementById('paddleExtend') as HTMLInputElement;
    const multiBallCheck = document.getElementById('multiBall') as HTMLInputElement;
    const freezeCheck = document.getElementById('freeze') as HTMLInputElement;

    // Preview canvas
    const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
    const previewCtx = previewCanvas.getContext('2d')!;

    // Event listeners for mode selection
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.getAttribute('data-mode') as 'classic' | 'powerup' | 'speed';
            currentSettings.mode = mode;
            
            // Update visual selection
            modeCards.forEach(c => c.classList.remove('border-blue-400'));
            modeCards.forEach(c => c.classList.add('border-transparent'));
            card.classList.remove('border-transparent');
            card.classList.add('border-blue-400');
            
            // Show/hide powerup settings
            if (mode === 'powerup') {
                powerupSettings.classList.remove('hidden');
            } else {
                powerupSettings.classList.add('hidden');
            }
            
            updatePreview();
        });
    });

    // Slider event listeners
    ballSpeedSlider.addEventListener('input', () => {
        currentSettings.ballSpeed = parseInt(ballSpeedSlider.value);
        ballSpeedValue.textContent = ballSpeedSlider.value;
        updatePreview();
    });

    ballSizeSlider.addEventListener('input', () => {
        currentSettings.ballSize = parseInt(ballSizeSlider.value);
        ballSizeValue.textContent = ballSizeSlider.value;
        updatePreview();
    });

    paddleHeightSlider.addEventListener('input', () => {
        currentSettings.paddleHeight = parseInt(paddleHeightSlider.value);
        paddleHeightValue.textContent = paddleHeightSlider.value;
        updatePreview();
    });

    paddleSpeedSlider.addEventListener('input', () => {
        currentSettings.paddleSpeed = parseInt(paddleSpeedSlider.value);
        paddleSpeedValue.textContent = paddleSpeedSlider.value;
        updatePreview();
    });

    mapWidthSlider.addEventListener('input', () => {
        currentSettings.mapWidth = parseInt(mapWidthSlider.value);
        mapWidthValue.textContent = mapWidthSlider.value;
        updatePreview();
    });

    mapHeightSlider.addEventListener('input', () => {
        currentSettings.mapHeight = parseInt(mapHeightSlider.value);
        mapHeightValue.textContent = mapHeightSlider.value;
        updatePreview();
    });

    // Powerup checkbox listeners
    speedBoostCheck?.addEventListener('change', () => {
        currentSettings.powerups.speedBoost = speedBoostCheck.checked;
    });

    paddleExtendCheck?.addEventListener('change', () => {
        currentSettings.powerups.paddleExtend = paddleExtendCheck.checked;
    });

    multiBallCheck?.addEventListener('change', () => {
        currentSettings.powerups.multiBall = multiBallCheck.checked;
    });

    freezeCheck?.addEventListener('change', () => {
        currentSettings.powerups.freeze = freezeCheck.checked;
    });

    // Button event listeners
    backBtn.addEventListener('click', () => {
        navigateTo('/lobby');
    });

    saveBtn.addEventListener('click', () => {
        saveGameSettings(currentSettings);
        alert(t('settings_saved') || 'Settings saved successfully!');
    });

    resetBtn.addEventListener('click', () => {
        if (confirm(t('reset_confirm') || 'Are you sure you want to reset all settings to default?')) {
            currentSettings = resetGameSettings();
            window.location.reload(); // Reload to update all values
        }
    });

    testLocalBtn.addEventListener('click', () => {
        saveGameSettings(currentSettings);
        navigateTo('/local-game');
    });

    // Initialize preview
    updatePreview();

    function updatePreview() {
        // Clear canvas
        previewCtx.fillStyle = 'black';
        previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

        // Scale down the preview
        const scale = Math.min(previewCanvas.width / currentSettings.mapWidth, previewCanvas.height / currentSettings.mapHeight);
        const previewWidth = currentSettings.mapWidth * scale;
        const previewHeight = currentSettings.mapHeight * scale;
        const previewPaddleHeight = currentSettings.paddleHeight * scale;
        const previewBallSize = currentSettings.ballSize * scale;

        const offsetX = (previewCanvas.width - previewWidth) / 2;
        const offsetY = (previewCanvas.height - previewHeight) / 2;

        // Draw game area border
        previewCtx.strokeStyle = 'white';
        previewCtx.lineWidth = 1;
        previewCtx.strokeRect(offsetX, offsetY, previewWidth, previewHeight);

        // Draw paddles
        previewCtx.fillStyle = '#60a5fa';
        previewCtx.fillRect(offsetX + 5, offsetY + (previewHeight - previewPaddleHeight) / 2, 8 * scale, previewPaddleHeight);
        
        previewCtx.fillStyle = '#f87171';
        previewCtx.fillRect(offsetX + previewWidth - 5 - 8 * scale, offsetY + (previewHeight - previewPaddleHeight) / 2, 8 * scale, previewPaddleHeight);

        // Draw ball
        previewCtx.fillStyle = 'white';
        previewCtx.beginPath();
        previewCtx.arc(offsetX + previewWidth / 2, offsetY + previewHeight / 2, previewBallSize / 2, 0, Math.PI * 2);
        previewCtx.fill();

        // Draw mode indicator
        previewCtx.fillStyle = 'yellow';
        previewCtx.font = '12px Arial';
        previewCtx.fillText(`Mode: ${currentSettings.mode}`, offsetX, offsetY - 5);
    }
}

export function cleanup(): void {
    // No cleanup needed for this page
}