// backend/server.js
require('dotenv').config();

const fastify = require('fastify')({ logger: true });
const { Server } = require('socket.io');
const cors = require('@fastify/cors');
const path = require('path');
const initializeSocket = require('./websockets');

// 1. Adım: Gerekli Fastify eklentilerini kaydet
const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];
if (allowedOrigins.length === 0) {
    fastify.log.warn('CORS_ORIGINS is not defined. CORS might not work as expected.');
}
fastify.register(cors, { origin: allowedOrigins });
fastify.register(require('@fastify/multipart'));
fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, 'uploads'),
    prefix: '/uploads/',
});

// 2. Adım: Socket.IO sunucusunu oluştur
const io = new Server(fastify.server, {
    path: '/api/socket.io',
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] }
});

// 3. Adım: Socket mantığını başlat ve onlineUsers listesini al
const onlineUsers = initializeSocket(io);

// 4. Adım: Rotaları kaydet (artık 'io' ve 'onlineUsers' mevcut)
fastify.register(require('./api/auth.routes'), { prefix: '/api' });
fastify.register(require('./api/users.routes'), { 
    prefix: '/api',
    io: io,
    onlineUsers: onlineUsers
});
fastify.register(require('./api/tournaments.routes.js'), { 
    prefix: '/api',
    io: io 
});

// Basit bir "sunucu ayakta" kontrolü
fastify.get('/', (request, reply) => {
    reply.send({ status: 'Server is running!' });
});

// 5. Adım: Sunucuyu başlat
const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();