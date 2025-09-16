// backend/api/users.routes.js
const prisma = require('../prisma/db');
const authenticate = require('../middleware/authenticate');

async function userRoutes(fastify, options) {
    // Mevcut: Sadece kendi profilini getirir.
    fastify.get('/profile', { preHandler: [authenticate] }, async (request, reply) => {
        const userProfile = await prisma.user.findUnique({
            where: { id: request.user.userId },
            select: { id: true, email: true, name: true, createdAt: true, wins: true, losses: true },
        });
        if (!userProfile) return reply.code(404).send({ error: 'User not found' });
        return userProfile;
    });

    // Mevcut: Belirli bir kullanıcının halka açık profilini ID ile getirir.
    fastify.get('/users/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = parseInt(request.params.id, 10);
        if (isNaN(userId)) {
            return reply.code(400).send({ error: 'Invalid user ID' });
        }

        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { // Sadece güvenli ve halka açık bilgileri döndür
                    id: true,
                    name: true,
                    createdAt: true,
                    // --- YENİ EKLENEN ALANLAR ---
                    wins: true,
                    losses: true
                    // -------------------------
                }
            });

            if (!user) {
                return reply.code(404).send({ error: 'User not found' });
            }
            return user;
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    // --- YENİ EKLENEN YOL ---
    // Belirli bir kullanıcının son 10 maçını getirir.
    fastify.get('/users/:id/matches', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = parseInt(request.params.id, 10);
        if (isNaN(userId)) {
            return reply.code(400).send({ error: 'Invalid user ID' });
        }
        try {
            const matches = await prisma.match.findMany({
                where: {
                    OR: [
                        { player1Id: userId },
                        { player2Id: userId }
                    ]
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 10,
                include: { // Rakip bilgilerini de almak için
                    player1: { select: { id: true, name: true } },
                    player2: { select: { id: true, name: true } }
                }
            });
            return matches;
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });
}

module.exports = userRoutes;