// backend/websockets/chatHandler.js
const prisma = require('../prisma/db');

async function chatHandler(io, socket, onlineUsers) {
    
    // Genel mesajlar için mantık değişmiyor.
    socket.on('chat message', async (msg) => {
        const senderId = socket.user.id;
        const messageObject = {
            type: 'public',
            sender: socket.user.name || socket.user.email,
            content: msg
        };

        for (const recipientSocket of io.sockets.sockets.values()) {
            const recipientId = recipientSocket.user.id;
            if (senderId === recipientId) {
                recipientSocket.emit('chat message', messageObject);
                continue;
            }
            const blockExists = await prisma.block.findFirst({
                where: { OR: [ { blockerId: senderId, blockedId: recipientId }, { blockerId: recipientId, blockedId: senderId } ] }
            });
            if (!blockExists) {
                recipientSocket.emit('chat message', messageObject);
            }
        }
    });
    
    // --- ÖZEL MESAJLAR İÇİN GÜNCELLENMİŞ MANTIK ---
    socket.on('private message', async ({ recipientId, message }) => {
        const senderId = socket.user.id;
        const recipientSocketInfo = onlineUsers.get(recipientId);
        
        if (!recipientSocketInfo || senderId === recipientId) {
            return;
        }

        // Adım 1: Mesaj objesini oluştur ve gönderenin kendi geçmişinde görmesi için ANINDA geri gönder.
        const messageObject = {
            type: 'private',
            sender: socket.user.name || socket.user.email,
            content: message
        };
        socket.emit('chat message', messageObject);

        // Adım 2: Gönderen ve alıcı arasında bir engelleme olup olmadığını kontrol et.
        const blockExists = await prisma.block.findFirst({
            where: {
                OR: [
                    { blockerId: senderId, blockedId: recipientId },
                    { blockerId: recipientId, blockedId: senderId },
                ]
            }
        });

        // Adım 3: Eğer engel YOKSA, mesajı alıcıya da ilet.
        if (!blockExists) {
            const recipientSocket = io.sockets.sockets.get(recipientSocketInfo.socketId);
            if (recipientSocket) {
                // Alıcıya gönderirken aynı mesaj objesini kullanıyoruz.
                recipientSocket.emit('chat message', messageObject);
            }
        }
        // Engel varsa, başka hiçbir şey yapma. Mesaj gönderilmiş gibi göründü ama alıcıya hiç ulaşmadı.
    });
}

module.exports = chatHandler;