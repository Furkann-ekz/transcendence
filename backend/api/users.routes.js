// backend/api/users.routes.js
const prisma = require('../prisma/db');
const authenticate = require('../middleware/authenticate');

async function userRoutes(fastify, options) {
    fastify.get('/profile', { preHandler: [authenticate] }, async (request, reply) => {
        const userProfile = await prisma.user.findUnique({
            where: { id: request.user.userId },
            select: { id: true, email: true, name: true, createdAt: true },
        });
        if (!userProfile) return reply.code(404).send({ error: 'User not found' });
        return userProfile;
    });

    // Bu yolu korumak istersen, preHandler ekleyebilirsin. Şimdilik açık bırakıyoruz.
    fastify.get('/users', async (request, reply) => {
        const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
        return users;
    });
}
module.exports = userRoutes;