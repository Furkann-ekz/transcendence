// backend/websockets/chatHandler.js
function chatHandler(io, socket, onlineUsers) {
    socket.on('chat message', (msg) => {
        const senderName = socket.user.name || socket.user.email;
        const messageWithSender = `(Herkese) ${senderName}: ${msg}`;
        io.emit('chat message', messageWithSender);
    });
    
    socket.on('private message', ({ recipientId, message }) => {
        const recipient = Array.from(onlineUsers.values()).find(user => user.id === recipientId);
        if (recipient) {
            const senderName = socket.user.name || socket.user.email;
            const privateMessage = `(Özel) ${senderName}: ${message}`;
            io.to(recipient.socketId).emit('chat message', privateMessage);
            socket.emit('chat message', privateMessage);
        }
    });
}
module.exports = chatHandler;