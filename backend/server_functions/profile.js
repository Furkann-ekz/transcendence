// backend/server_functions/profile.js
const prisma = require('../prisma/db');
const authenticate = require('./auth'); // YOL GÜNCELLENDİ

function setupProfileRoute(fastify) {
    fastify.get('/profile', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.userId;
        const userProfile = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, createdAt: true },
        });
        if (!userProfile) {
            return reply.code(404).send({ error: 'User not found' });
        }
        return userProfile;
    });
}

module.exports = setupProfileRoute;