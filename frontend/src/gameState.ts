// frontend/src/gameState.ts

// Bu dosya, oyun başlangıç verilerini geçici olarak saklamak için kullanılacak.
let initialGameData: any = null;

export function setGameData(data: any) {
    initialGameData = data;
}

export function getGameData() {
    const data = initialGameData;
    initialGameData = null; // Veriyi bir kere aldıktan sonra temizle
    return data;
}