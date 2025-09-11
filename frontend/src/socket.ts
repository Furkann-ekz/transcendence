// frontend/src/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// frontend/src/socket.ts -> connectSocket fonksiyonu

export function connectSocket(token: string): Promise<Socket> { // Artık bir Promise döndürüyor
    return new Promise((resolve, reject) => {
        // Eğer zaten bağlı bir soket varsa, hemen onu döndür.
        if (socket && socket.connected) {
            return resolve(socket);
        }

        const SOCKET_URL = `http://${window.location.hostname}:3000`;
        const newSocket = io(SOCKET_URL, {
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log('Socket sunucuya başarıyla bağlandı! ID:', newSocket.id);
            socket = newSocket;
            resolve(newSocket); // Bağlantı başarılı olunca sözü yerine getir.
        });

        newSocket.on('disconnect', () => {
            console.log('Socket bağlantısı kesildi. Yeniden bağlanmaya çalışılıyor...');
            // socket değişkenini null yapmıyoruz! Kütüphane kendi halledecek.
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket bağlantı hatası:', err.message);
            reject(err); // Hata durumunda sözü reddet.
        });
    });
}

// getSocket ve disconnectSocket fonksiyonları aynı kalabilir.
export function getSocket(): Socket | null {
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
