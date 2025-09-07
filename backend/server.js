// backend/server.js
require('dotenv').config();

const fastify = require('fastify')({ logger: true });
const { Server } = require('socket.io');
const cors = require('@fastify/cors');
const prisma = require('./prisma/db');

// Modülleri import et
const setupLoginRoute = require('./server_functions/login');
const setupRegisterRoute = require('./server_functions/register');
const setupProfileRoute = require('./server_functions/profile');
const setupUsersRoute = require('./server_functions/users');
const setupIoAuth = require('./server_functions/io_use');
const setupIoConnection = require('./server_functions/io_connection');

// Eklentileri kaydet
fastify.register(cors, { origin: "*" });

// Socket.io sunucusunu başlat
const io = new Server(fastify.server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const onlineUsers = new Map();

// Socket.io modüllerini çalıştır
setupIoAuth(io);
setupIoConnection(io, onlineUsers);

// HTTP Yollarını kaydet
setupLoginRoute(fastify);
setupRegisterRoute(fastify);
setupProfileRoute(fastify);
setupUsersRoute(fastify);

fastify.get('/', (request, reply) => {
    reply.send({ status: 'Server is running and modularized!' });
});

const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
    } catch (err) {
        fastify.log.error(err);
        await prisma.$disconnect();
        process.exit(1);
    }
};

start();