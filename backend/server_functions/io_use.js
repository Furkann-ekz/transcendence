// backend/server_functions/io_use.js
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db');
const JWT_SECRET = process.env.JWT_SECRET;

function setupIoAuth(io) {
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, name: true }
            });
            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }
            socket.user = user;
            next();
        } catch (err) {
            return next(new Error('Authentication error: Invalid token'));
        }
    });
}

module.exports = setupIoAuth;