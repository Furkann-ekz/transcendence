export interface GameSettings
{
    mode: 'classic' | 'powerup';
    ballSpeed: number;
    paddleSpeed: number;
    powerups:
    {
        speedBoost: boolean;
    };
}
export interface PowerupEffect
{
    type: 'speedBoost';
    duration: number;
    strength: number;
    x: number;
    y: number;
    active: boolean;
}

const DEFAULT_SETTINGS: GameSettings =
{
    mode: 'classic',
    ballSpeed: 7,
    paddleSpeed: 8,
    powerups:
    {
        speedBoost: true,
    }
};

const STORAGE_KEY = 'transcendence_game_settings';

export function getGameSettings(): GameSettings
{
    try
    {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored)
        {
            const parsed = JSON.parse(stored);
            return {
                mode: parsed.mode === 'powerup' ? 'powerup' : 'classic',
                ballSpeed: parsed.ballSpeed || DEFAULT_SETTINGS.ballSpeed,
                paddleSpeed: parsed.paddleSpeed || DEFAULT_SETTINGS.paddleSpeed,
                powerups:
                {
                    speedBoost: parsed.powerups?.speedBoost ?? DEFAULT_SETTINGS.powerups.speedBoost,
                }
            };
        }
    }
    catch (error)
    {
        console.warn('Failed to load game settings:', error);
    }
    return (JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
}

export function saveGameSettings(settings: GameSettings): void
{
    try
    {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
    catch (error)
    {
        console.error('Failed to save game settings:', error);
    }
}

export function resetGameSettings(): GameSettings
{
    const defaultSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    saveGameSettings(defaultSettings);
    return (defaultSettings);
}

export function getBackendGameConfig(): any
{
    const settings = getGameSettings();
    return {
        canvasSize: 800,
        paddleSize: 100,
        paddleThickness: 15,
        ballSize: 10,
        ballSpeed: settings.ballSpeed,
        paddleSpeed: settings.paddleSpeed,
        mode: settings.mode,
        powerupsEnabled: settings.mode === 'powerup' && settings.powerups.speedBoost,
        enabledPowerups: settings.powerups
    };
}

export function createPowerup(x: number, y: number): PowerupEffect
{
    return {
        type: 'speedBoost',
        duration: 5000,
        strength: 1.5,
        x,
        y,
        active: true
    };
}

export function applyPowerupEffect(effect: PowerupEffect, gameState: any): void
{
    if (effect.type === 'speedBoost')
        gameState.ballSpeedMultiplier = effect.strength;
}

export function removePowerupEffect(effect: PowerupEffect, gameState: any): void
{
    if (effect.type === 'speedBoost')
        gameState.ballSpeedMultiplier = 1;
}