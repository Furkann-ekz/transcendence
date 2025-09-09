// frontend/src/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// frontend/src/socket.ts -> connectSocket fonksiyonu

export function connectSocket(token: string) {
    // Mevcut bir bağlantı varsa, eskisini kapat
    if (socket) {
        socket.disconnect();
    }

    const API_URL = import.meta.env.VITE_API_URL;
    if (!API_URL) {
        throw new Error("API URL is not defined!");
    }

    // YENİ: Soketi önce yerel bir sabite ata
    const newSocket = io(API_URL, { 
        auth: { token } 
    });
    
    // Olay dinleyicilerini bu 'null' olamayan newSocket üzerinden kur
    newSocket.on('connect', () => {
        // 'newSocket' null olamayacağı için TypeScript burada hata vermez
        console.log('Socket sunucuya başarıyla bağlandı! ID:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
        console.log('Socket bağlantısı kesildi.');
        socket = null; // Kapsamdaki ana 'socket' değişkenini null yap
    });

    newSocket.on('connect_error', (err) => {
        console.error('Socket bağlantı hatası:', err.message);
    });

    // Son olarak, yerel soketi modül kapsamındaki ana soket değişkenine ata
    socket = newSocket;
}

// Diğer dosyalardan mevcut soket bağlantısını almak için
export function getSocket(): Socket | null {
    return socket;
}

// Çıkış yaparken veya ihtiyaç duyulduğunda bağlantıyı manuel olarak kesmek için
export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null; // Bağlantıyı kapattıktan sonra değişkeni de temizleyelim.
    }
}