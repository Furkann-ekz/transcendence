// backend/api/users.routes.js
const prisma = require('../prisma/db');
const authenticate = require('../middleware/authenticate');
const bcrypt = require('bcrypt');

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

    // Mevcut kullanıcının profilini günceller (şimdilik sadece 'name').
    fastify.patch('/profile', { preHandler: [authenticate] }, async (request, reply) => {
        const { name } = request.body;
        const userId = request.user.userId;

        // İsim alanı boş mu veya geçerli bir string mi diye kontrol et.
        if (typeof name !== 'string' || name.trim() === '') {
            return reply.code(400).send({ error: 'Name field cannot be empty' });
        }

        try {
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { name: name.trim() },
                select: { id: true, email: true, name: true } // Güvenlik için sadece bu alanları geri döndür
            });
            return updatedUser;
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Could not update user profile' });
        }
    });
    // Yeni: Mevcut kullanıcının şifresini değiştirir.
    fastify.post('/profile/change-password', { preHandler: [authenticate] }, async (request, reply) => {
        const { currentPassword, newPassword } = request.body;
        const userId = request.user.userId;

        if (!currentPassword || !newPassword) {
            return reply.code(400).send({ error: 'Current and new passwords are required' });
        }

        try {
            const user = await prisma.user.findUnique({ where: { id: userId } });

            // --- EKLENMESİ GEREKEN KONTROL ---
            // Eğer token geçerli ama veritabanında kullanıcı yoksa, işlemi durdur.
            if (!user) {
                return reply.code(404).send({ error: 'User not found' });
            }
            // --- KONTROL SONU ---

            const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);

            if (!isPasswordMatch) {
                return reply.code(401).send({ error: 'Invalid current password' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await prisma.user.update({
                where: { id: userId },
                data: { password: hashedPassword },
            });

            return { message: 'Password updated successfully' };

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Could not change password' });
        }
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
                    wins: true,
                    losses: true
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

    // Mevcut: Belirli bir kullanıcının son 10 maçını getirir.
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