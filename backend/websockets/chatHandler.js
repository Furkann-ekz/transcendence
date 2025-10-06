// backend/websockets/chatHandler.js - GÜNCELLENMİŞ HALİ
const prisma = require('../prisma/db');

async function chatHandler(io, socket, onlineUsers) {
    
    // Genel mesaj gönderildiğinde tetiklenir
    socket.on('chat message', async (msg) => {
        const senderId = socket.user.id;

        const messageObject = {
            type: 'public',
            sender: socket.user.name || socket.user.email,
            content: msg
        };

        // Herkese göndermek yerine, online olan her kullanıcı için kontrol yap
        for (const recipientSocket of io.sockets.sockets.values()) {
            const recipientId = recipientSocket.user.id;
            
            // Kullanıcı kendine mesaj gönderebilir, kontrol etmeye gerek yok
            if (senderId === recipientId) {
                recipientSocket.emit('chat message', messageObject);
                continue;
            }

            // Gönderen ve alıcı arasında herhangi bir yönde engelleme var mı diye kontrol et
            const blockExists = await prisma.block.findFirst({
                where: {
                    OR: [
                        { blockerId: senderId, blockedId: recipientId },
                        { blockerId: recipientId, blockedId: senderId },
                    ]
                }
            });

            // Eğer engelleme yoksa, mesajı bu kullanıcıya gönder
            if (!blockExists) {
                recipientSocket.emit('chat message', messageObject);
            }
        }
    });
    
    // Özel mesaj gönderildiğinde tetiklenir
    socket.on('private message', async ({ recipientId, message }) => {
        const senderId = socket.user.id;
        const recipientSocketInfo = onlineUsers.get(recipientId);
        
        // Alıcı online değilse veya gönderen kendine mesaj atmaya çalışıyorsa işlem yapma
        if (!recipientSocketInfo || senderId === recipientId) {
            return;
        }

        // Gönderen ve alıcı arasında herhangi bir yönde engelleme var mı diye kontrol et
        const blockExists = await prisma.block.findFirst({
            where: {
                OR: [
                    { blockerId: senderId, blockedId: recipientId },
                    { blockerId: recipientId, blockedId: senderId },
                ]
            }
        });

        // Eğer engelleme yoksa, mesajı gönder
        if (!blockExists) {
            const recipientSocket = io.sockets.sockets.get(recipientSocketInfo.socketId);
            if (recipientSocket) {
                const messageObject = {
                    type: 'private',
                    sender: socket.user.name || socket.user.email,
                    content: message
                };
                recipientSocket.emit('chat message', messageObject); // Alıcıya gönder
                socket.emit('chat message', messageObject); // Gönderene de gönder (sohbet geçmişi için)
            }
        } else {
            // İsteğe bağlı: Engellenen kullanıcıya mesaj gönderemediğine dair bir bildirim
            socket.emit('chat_error', { message: 'Bu kullanıcıya mesaj gönderemezsiniz.' });
        }
    });
}

module.exports = chatHandler;