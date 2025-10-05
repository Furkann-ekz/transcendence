// backend/websockets/chatHandler.js
function chatHandler(io, socket, onlineUsers) {
    socket.on('chat message', (msg) => {
        const messageObject = {
            type: 'public',
            sender: socket.user.name || socket.user.email,
            content: msg
        };
        io.emit('chat message', messageObject);
    });
    
    socket.on('private message', ({ recipientId, message }) => {
        const recipientSocket = io.sockets.sockets.get(onlineUsers.get(recipientId)?.socketId);
        if (recipientSocket) {
            const messageObject = {
                type: 'private',
                sender: socket.user.name || socket.user.email,
                content: message
            };
            recipientSocket.emit('chat message', messageObject); // Alıcıya gönder
            socket.emit('chat message', messageObject); // Gönderene de gönder
        }
    });
}
module.exports = chatHandler;