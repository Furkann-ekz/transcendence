// backend/server.js
require('dotenv').config();

const fastify = require('fastify')({ logger: true });
const { Server } = require('socket.io');
const cors = require('@fastify/cors');
const initializeSocket = require('./websockets');

const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];

if (allowedOrigins.length === 0) {
    fastify.log.warn('CORS_ORIGINS is not defined in .env file. CORS might not work as expected.');
}

fastify.register(cors, { origin: allowedOrigins });

// Rotaları Kaydet
fastify.register(require('./api/auth.routes'), { prefix: '/api' });
fastify.register(require('./api/users.routes'), { prefix: '/api' });

const io = new Server(fastify.server, {
    path: '/api/socket.io',
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] }
});
fastify.decorate('io', io);
initializeSocket(io);

fastify.get('/', (request, reply) => {
    reply.send({ status: 'Server is running!' });
});

const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();