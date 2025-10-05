// frontend/src/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let heartbeatInterval: number | null = null; // Heartbeat interval'ını tutmak için

export function disconnectSocket() {
    // Bağlantı kesildiğinde heartbeat'i de durdur
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

function forceLogout(reason: string = "Session is invalid.") {
    console.warn(`Forcing logout: ${reason}`);
    localStorage.removeItem('token');
    disconnectSocket(); 
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
            console.log('Socket server connected! ID:', newSocket.id);
            socket = newSocket;

            if (heartbeatInterval) clearInterval(heartbeatInterval);
            
            // Her 15 saniyede bir sunucuya oturumun geçerli olup olmadığını sor
            heartbeatInterval = window.setInterval(() => {
                if (socket?.connected) {
                    socket.emit('validate_session');
                }
            }, 15000); // 15 saniye

            resolve(newSocket);
        });

        // Sunucudan gelen zorunlu çıkış sinyalini dinle
        newSocket.on('force_logout', (reason) => {
             forceLogout(reason);
        });

        newSocket.on('forceDisconnect', (reason) => {
            alert('Another session was started from a different location. This session will be terminated.');
            forceLogout(reason);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket connection lost.');
            // Bağlantı koptuğunda heartbeat'i durdur
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            if (err.message === 'User not found' || err.message === 'Invalid token') {
                forceLogout(err.message);
            }
            reject(err);
        });
    });
}

export function getSocket(): Socket | null {
    return socket;
}