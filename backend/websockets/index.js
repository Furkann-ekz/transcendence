// backend/websockets/index.js
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db');
const chatHandler = require('./chatHandler');
const gameHandler = require('./gameHandler');
const JWT_SECRET = process.env.JWT_SECRET;

// Paylaşılan değişkenler (shared state)
const onlineUsers = new Map();
const gameState = {
    waitingPlayers: {
        '1v1': [],
        '2v2': []
    },
    gameRooms: new Map()
};

function initializeSocket(io) {
    // Kimlik Doğrulama Middleware'i
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, name: true }
            });
            if (!user) return next(new Error('User not found'));
            socket.user = user;
            next();
        } catch (err) {
            return next(new Error('Invalid token'));
        }
    });

    // Ana Bağlantı Olayı
    io.on('connection', (socket) => {
        // --- TEKİL OTURUM KONTROLÜ ---
        // Bu kullanıcıya ait eski bir bağlantı var mı diye kontrol et.
        if (onlineUsers.has(socket.user.id)) {
            const oldSocketId = onlineUsers.get(socket.user.id).socketId;
            const oldSocket = io.sockets.sockets.get(oldSocketId);
            if (oldSocket) {
                // Eski tarayıcıya "oturumu sonlandır" mesajı gönder.
                oldSocket.emit('forceDisconnect', 'Başka bir yerden giriş yapıldı.');
                // Eski bağlantıyı sunucudan kopar.
                oldSocket.disconnect();
                console.log(`Eski oturum sonlandırıldı: ${socket.user.email} (Socket ID: ${oldSocketId})`);
            }
        }
        // --- KONTROL SONU ---

        console.log(`${socket.user.email} bağlandı. (Socket ID: ${socket.id})`);
        onlineUsers.set(socket.user.id, { id: socket.user.id, socketId: socket.id, email: socket.user.email, name: socket.user.name });
        io.emit('update user list', Array.from(onlineUsers.values()));

        socket.on('requestUserList', () => {
            socket.emit('update user list', Array.from(onlineUsers.values()));
        });

        chatHandler(io, socket, onlineUsers);

        socket.on('joinMatchmaking', (payload) => {
            console.log(`${socket.user.email} eşleştirme havuzuna katıldı. Mod: ${payload.mode}`);
            gameHandler(io, socket, gameState, payload);
        });

        // --- GÜVENLİ TEMİZLEME FONKSİYONU ---
        const cleanUpPlayer = (sock) => {
            // Oyuncuyu tüm bekleme havuzlarından kaldır
            Object.keys(gameState.waitingPlayers).forEach(mode => {
                const pool = gameState.waitingPlayers[mode];
                const newPool = pool.filter(p => p.id !== sock.id);
                if (newPool.length < pool.length) {
                    console.log(`${sock.user.email}, ${mode} bekleme havuzundan kaldırıldı.`);
                    gameState.waitingPlayers[mode] = newPool;
                    newPool.forEach(p => p.emit('updateQueue', { queueSize: newPool.length, requiredSize: mode === '1v1' ? 2 : 4 }));
                }
            });

            // Oyuncu bir oyun odasındaysa, oyunu bitir.
            if (sock.gameRoom) {
                const game = gameState.gameRooms.get(sock.gameRoom.id);
                // KRİTİK DÜZELTME: 'game' nesnesinin var olduğundan emin ol! Bu, çökme hatasını engeller.
                if (game) {
                    clearInterval(game.intervalId);
                    const otherPlayers = game.players.filter(p => p.socketId !== sock.id);
                    otherPlayers.forEach(p => {
                         const otherSocket = io.sockets.sockets.get(p.socketId);
                         if(otherSocket) otherSocket.emit('opponentLeft');
                    });
                    gameState.gameRooms.delete(sock.gameRoom.id);
                    console.log(`Oda ${sock.gameRoom.id} temizlendi.`);
                }
            }
        };

        socket.on('leaveGameOrLobby', () => {
            console.log(`${socket.user.email} oyun/lobi'den manuel olarak ayrıldı.`);
            cleanUpPlayer(socket);
        });

        // Bağlantı Kesilme Olayı
        socket.on('disconnect', () => {
            console.log(`${socket.user.email} bağlantısı kesildi.`);
            // Sadece bu soket gerçekten listedeki son soket ise onlineUsers'dan sil
            if (onlineUsers.has(socket.user.id) && onlineUsers.get(socket.user.id).socketId === socket.id) {
                onlineUsers.delete(socket.user.id);
                io.emit('update user list', Array.from(onlineUsers.values()));
            }
            cleanUpPlayer(socket);
        });
    });
}

module.exports = initializeSocket;