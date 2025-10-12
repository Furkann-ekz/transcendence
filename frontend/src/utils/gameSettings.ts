export interface GameSettings {
    mode: 'classic' | 'powerup' | 'speed';
    ballSpeed: number;
    ballSize: number;
    paddleHeight: number;
    paddleSpeed: number;
    mapWidth: number;
    mapHeight: number;
    powerups: {
        speedBoost: boolean;
        paddleExtend: boolean;
        multiBall: boolean;
        freeze: boolean;
    };
}

export interface PowerupEffect {
    type: 'speedBoost' | 'paddleExtend' | 'multiBall' | 'freeze';
    duration: number;
    strength: number;
    x: number;
    y: number;
    active: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
    mode: 'classic',
    ballSpeed: 7,
    ballSize: 10,
    paddleHeight: 100,
    paddleSpeed: 8,
    mapWidth: 800,
    mapHeight: 600,
    powerups: {
        speedBoost: true,
        paddleExtend: true,
        multiBall: false,
        freeze: true,
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
                ...DEFAULT_SETTINGS,
                ...parsed,
                powerups: {
                    ...DEFAULT_SETTINGS.powerups,
                    ...(parsed.powerups || {})
                }
            };
        }
    }
    catch (error)
    {
        console.warn('Failed to load game settings:', error);
    }
    return ({ ...DEFAULT_SETTINGS });
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
    const defaultSettings = { ...DEFAULT_SETTINGS };
    saveGameSettings(defaultSettings);
    return (defaultSettings);
}

export function applyModePresets(mode: 'classic' | 'powerup' | 'speed'): Partial<GameSettings>
{
    const presets: Record<string, Partial<GameSettings>> =
    {
        classic:
        {
            ballSpeed: 7,
            paddleSpeed: 8,
            powerups:
            {
                speedBoost: false,
                paddleExtend: false,
                multiBall: false,
                freeze: false,
            }
        },
        powerup:
        {
            ballSpeed: 6,
            paddleSpeed: 10,
            powerups:
            {
                speedBoost: true,
                paddleExtend: true,
                multiBall: true,
                freeze: true,
            }
        },
        speed:
        {
            ballSpeed: 12,
            paddleSpeed: 15,
            powerups:
            {
                speedBoost: true,
                paddleExtend: false,
                multiBall: false,
                freeze: false,
            }
        }
    };
    
    return (presets[mode] || {});
}

export function createPowerup(x: number, y: number, availableTypes: string[]): PowerupEffect | null
{
    if (availableTypes.length === 0)
        return (null);
    
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)] as PowerupEffect['type'];
    
    return {
        type,
        duration: getPowerupDuration(type),
        strength: getPowerupStrength(type),
        x,
        y,
        active: true
    };
}

function getPowerupDuration(type: PowerupEffect['type']): number
{
    const durations =
    {
        speedBoost: 5000,
        paddleExtend: 8000,
        multiBall: 10000,
        freeze: 3000,
    };
    return (durations[type]);
}

function getPowerupStrength(type: PowerupEffect['type']): number
{
    const strengths =
    {
        speedBoost: 1.5,
        paddleExtend: 1.4,
        multiBall: 2,
        freeze: 0.3,
    };
    return (strengths[type]);
}

export function applyPowerupEffect(effect: PowerupEffect, gameState: any): void
{
    switch (effect.type)
    {
        case 'speedBoost':
            gameState.ballSpeedMultiplier = effect.strength;
            break ;
        case 'paddleExtend':
            gameState.paddleSizeMultiplier = effect.strength;
            break ;
        case 'multiBall':
            gameState.addBalls = Math.floor(effect.strength);
            break ;
        case 'freeze':
            gameState.opponentSpeedMultiplier = effect.strength;
            break ;
    }
}

export function removePowerupEffect(effect: PowerupEffect, gameState: any): void
{
    switch (effect.type)
    {
        case 'speedBoost':
            gameState.ballSpeedMultiplier = 1;
            break ;
        case 'paddleExtend':
            gameState.paddleSizeMultiplier = 1;
            break ;
        case 'multiBall':
            break ;
        case 'freeze':
            gameState.opponentSpeedMultiplier = 1;
            break ;
    }
}

export function getBackendGameConfig(): any
{
    const settings = getGameSettings();
    return{
        canvasSize: Math.max(settings.mapWidth, settings.mapHeight),
        paddleSize: settings.paddleHeight,
        paddleThickness: Math.max(10, Math.floor(settings.paddleHeight * 0.1)),
        ballSize: settings.ballSize,
        ballSpeed: settings.ballSpeed,
        paddleSpeed: settings.paddleSpeed,
        mode: settings.mode,
        powerupsEnabled: settings.mode === 'powerup',
        enabledPowerups: settings.powerups
    };
}