// frontend/src/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// frontend/src/socket.ts -> connectSocket fonksiyonu

export function connectSocket(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
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
            resolve(newSocket);
        });

        // --- YENİ EKLENECEK DİNLEYİCİ ---
        newSocket.on('forceDisconnect', (reason) => {
            console.log(`Sunucu tarafından bağlantı sonlandırıldı: ${reason}`);
            alert('Başka bir konumdan giriş yapıldığı için bu oturum sonlandırıldı.');
            
            // Yerel durumu temizle
            localStorage.removeItem('token');
            // 'disconnectSocket' fonksiyonu socket'i null yapar ve bağlantıyı kapatır.
            disconnectSocket(); 
            // Kullanıcıyı login sayfasına yönlendir. Sayfa yenilemesi en garanti yöntemdir.
            window.location.href = '/'; 
        });
        // --- YENİ BLOĞUN SONU ---

        newSocket.on('disconnect', () => {
            console.log('Socket bağlantısı kesildi. Yeniden bağlanmaya çalışılıyor...');
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket bağlantı hatası:', err.message);
            reject(err);
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
