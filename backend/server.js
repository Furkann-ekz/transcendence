require('dotenv').config();

const fastify = require('fastify')({ logger: true });
const { Server } = require('socket.io');
const cors = require('@fastify/cors');
const path = require('path');
const initializeSocket = require('./websockets');

const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];
if (allowedOrigins.length === 0)
	fastify.log.warn('CORS_ORIGINS is not defined. CORS might not work as expected.');
fastify.register(cors, { origin: allowedOrigins });
fastify.register(require('@fastify/multipart'),
{
	limits: { fileSize: 10 * 1024 * 1024,},
});
fastify.register(require('@fastify/static'),
{
	root: path.join(__dirname, 'uploads'),
	prefix: '/uploads/',
});

const io = new Server(fastify.server,
{
	path: '/api/socket.io',
	cors: { origin: allowedOrigins, methods: ["GET", "POST"] }
});

const { onlineUsers, gameRooms } = initializeSocket(io);

fastify.register(require('./api/auth.routes'), { prefix: '/api' });
fastify.register(require('./api/users.routes'),
{ 
	prefix: '/api',
	io: io,
	onlineUsers: onlineUsers
});

fastify.register(require('./api/tournaments.routes.js'),
{ 
	prefix: '/api',
	io: io,
	onlineUsers: onlineUsers,
	gameRooms: gameRooms
});

fastify.get('/', (request, reply) =>
{
	reply.send({ status: 'Server is running!' });
});

const start = async () =>
{
	try
	{
		await fastify.listen({ port: 3000, host: '0.0.0.0' });
	}
	catch (err)
	{
		fastify.log.error(err);
		process.exit(1);
	}
};

start();