// backend/server.js
require('dotenv').config();

const fastify = require('fastify')({ logger: true });
const { Server } = require('socket.io');
const cors = require('@fastify/cors');
const initializeSocket = require('./websockets');

// .env dosyasından izin verilen adresleri oku ve bir diziye çevir
const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];

if (allowedOrigins.length === 0) {
    fastify.log.warn('CORS_ORIGINS is not defined in .env file. CORS might not work as expected.');
}


// Eklentileri Kaydet
fastify.register(cors, { origin: allowedOrigins });

// HTTP Yollarını Kaydet
fastify.register(require('./api/auth.routes'), { prefix: '/api' });
fastify.register(require('./api/users.routes'), { prefix: '/api' });

// Socket.io Sunucusunu Başlat
const io = new Server(fastify.server, {
    path: '/api/socket.io',
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] }
});
initializeSocket(io);

// Ana Durum Yolu
fastify.get('/', (request, reply) => {
    reply.send({ status: 'Server is running - Refactored!' });
});

// Sunucuyu Başlatma Fonksiyonu
const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();