// backend/server_functions/io_connection.js
function setupIoConnection(io, onlineUsers) {
    io.on('connection', (socket) => {
        console.log(`${socket.user.email} bağlandı:`, socket.id);

        onlineUsers.set(socket.user.id, {
            id: socket.user.id,
            socketId: socket.id,
            email: socket.user.email,
            name: socket.user.name
        });

        io.emit('update user list', Array.from(onlineUsers.values()));

        socket.on('chat message', (msg) => {
            const senderName = socket.user.name || socket.user.email;
            const messageWithSender = `(Herkese) ${senderName}: ${msg}`;
            io.emit('chat message', messageWithSender);
        });
        
        socket.on('private message', ({ recipientId, message }) => {
            const recipient = onlineUsers.get(recipientId);
            if (recipient) {
                const senderName = socket.user.name || socket.user.email;
                const privateMessage = `(Özel) ${senderName}: ${message}`;
                io.to(recipient.socketId).emit('chat message', privateMessage);
                socket.emit('chat message', privateMessage);
            }
        });

        socket.on('disconnect', () => {
            if (socket.user) {
                console.log(`${socket.user.email} bağlantısı kesildi:`, socket.id);
                onlineUsers.delete(socket.user.id);
                io.emit('update user list', Array.from(onlineUsers.values()));
            }
        });
    });
}

module.exports = setupIoConnection;