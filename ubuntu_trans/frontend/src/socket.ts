// frontend/src/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// frontend/src/socket.ts -> connectSocket fonksiyonu

export function connectSocket(token: string) {
    if (socket) {
        socket.disconnect();
    }

    // Backend adresini dinamik olarak al
    const API_URL = `http://${window.location.hostname}:3000`;

    const newSocket = io(API_URL, { 
        auth: { token } 
    });
    
    newSocket.on('connect_error', (err: Error) => {
        console.error('Socket bağlantı hatası:', err.message);
    });

    newSocket.on('connect', () => {
        console.log('Socket sunucuya başarıyla bağlandı! ID:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
        console.log('Socket bağlantısı kesildi.');
        socket = null;
    });

    newSocket.on('connect_error', (err) => {
        console.error('Socket bağlantı hatası:', err.message);
    });

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