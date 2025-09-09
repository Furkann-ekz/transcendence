// backend/server.js (DÜZELTİLMİŞ)
require('dotenv').config();

const fastify = require('fastify')({ logger: true });
const { Server } = require('socket.io');
const cors = require('@fastify/cors');
const initializeSocket = require('./websockets');

// Eklentileri Kaydet
fastify.register(cors, { origin: "*" });

// HTTP Yollarını Kaydet
fastify.register(require('./api/auth.routes'));
fastify.register(require('./api/users.routes'));

// Ana Durum Yolu
fastify.get('/', (request, reply) => {
    reply.send({ status: 'Server is running - Refactored!' });
});

// Sunucuyu Başlatma Fonksiyonu
const start = async () => {
    try {
        // DÜZELTME: Socket.IO'yu, fastify.server nesnesinin tamamen hazır olduğu
        // bu noktada başlatmak en güvenli yöntemdir.
        const io = new Server(fastify.server, {
            cors: { origin: "*", methods: ["GET", "POST"] }
        });
        initializeSocket(io);

        await fastify.listen({ port: 3000, host: '0.0.0.0' });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();