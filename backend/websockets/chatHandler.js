// backend/websockets/chatHandler.js

function chatHandler(io, socket, onlineUsers, isSocketSessionValid) {
    socket.on('chat message', async (msg) => {
        if (!await isSocketSessionValid(socket)) return;

        const messageObject = {
            type: 'public',
            sender: socket.user.name || socket.user.email,
            content: msg
        };
        io.emit('chat message', messageObject);
    });
    
    socket.on('private message', async ({ recipientId, message }) => {
        if (!await isSocketSessionValid(socket)) return;
        
        const recipientSocketInfo = onlineUsers.get(recipientId);
        if (recipientSocketInfo) {
            const recipientSocket = io.sockets.sockets.get(recipientSocketInfo.socketId);
            if (recipientSocket) {
                const messageObject = {
                    type: 'private',
                    sender: socket.user.name || socket.user.email,
                    content: message
                };
                recipientSocket.emit('chat message', messageObject);
                socket.emit('chat message', messageObject);
            }
        }
    });
}
module.exports = chatHandler;