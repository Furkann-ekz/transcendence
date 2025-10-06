// frontend/src/socket.ts
import { io, Socket } from "socket.io-client";
import { t } from './i18n';
import { navigateTo } from './router';
import { showToast, showConfirmationModal } from './utils/notifications'; // Yeni import

let socket: Socket | null = null;

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
            console.log('Socket sunucuya başarıyla bağlandı! ID:', newSocket.id);
            socket = newSocket;
            resolve(newSocket);
        });

        // DEĞİŞİKLİK BURADA: 'confirm' yerine kendi modal'ımızı kullanıyoruz.
        newSocket.on('game_invitation', ({ inviter }) => {
            const message = `${inviter.name} ${t('game_invitation_text')}`;
            const onConfirm = () => {
                newSocket.emit('invitation_response', { inviterId: inviter.id, accepted: true });
            };
            const onDecline = () => {
                newSocket.emit('invitation_response', { inviterId: inviter.id, accepted: false });
            };
            showConfirmationModal(message, onConfirm, onDecline);
        });

        newSocket.on('go_to_invited_game', () => {
            navigateTo('/online-game');
        });

        // DEĞİŞİKLİK BURADA: 'alert' yerine 'showToast' kullanıyoruz.
        newSocket.on('invitation_declined', ({ recipient }) => {
            const message = `${recipient.name} ${t('invitation_declined_text')}`;
            showToast(message);
        });

        newSocket.on('forceDisconnect', (reason) => {
            console.log(`Sunucu tarafından bağlantı sonlandırıldı: ${reason}`);
            showToast('Başka bir konumdan giriş yapıldığı için bu oturum sonlandırıldı.', 5000);
            
            setTimeout(() => {
                localStorage.removeItem('token');
                disconnectSocket(); 
                window.location.href = '/'; 
            }, 5000);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket bağlantısı kesildi.');
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket bağlantı hatası:', err.message);
            reject(err);
        });
    });
}


export function getSocket(): Socket | null {
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}