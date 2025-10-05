// frontend/src/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// disconnectSocket fonksiyonu burada tanımlanıyor ve export ediliyor.
// Diğer dosyaların (örneğin router) bu fonksiyona erişebilmesi için export ediyoruz.
export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

// Oturumu sonlandırmak ve kullanıcıyı çıkışa zorlamak için kullanılan dahili fonksiyon
function forceLogout() {
    console.warn("Forcing logout due to invalid session or authentication error.");
    localStorage.removeItem('token');
    // Yukarıda tanımlanan disconnectSocket fonksiyonunu çağırıyoruz.
    disconnectSocket(); 
    // Sayfanın tamamen yenilenerek giriş ekranına gitmesini sağla.
    window.location.href = '/'; 
}

export function connectSocket(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
        if (socket && socket.connected) {
            return resolve(socket);
        }

        const newSocket = io({
            path: '/api/socket.io',
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log('Socket server connected successfully! ID:', newSocket.id);
            socket = newSocket;
            resolve(newSocket);
        });

        newSocket.on('forceDisconnect', (reason) => {
            console.log(`Server forced disconnect: ${reason}`);
            alert('Another session was started from a different location. This session will be terminated.');
            forceLogout();
        });

        newSocket.on('disconnect', () => {
            console.log('Socket connection lost. Attempting to reconnect...');
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            
            if (err.message === 'User not found' || err.message === 'Invalid token') {
                forceLogout();
            }

            reject(err);
        });
    });
}

export function getSocket(): Socket | null {
    return socket;
}