const prisma = require('../prisma/db');
const authenticate = require('../middleware/authenticate');
const bcrypt = require('bcrypt');

async function userRoutes(fastify, options) {
    // --- TEMEL KULLANICI İŞLEMLERİ ---
    
    fastify.get('/profile', { preHandler: [authenticate] }, async (request, reply) => {
        const userProfile = await prisma.user.findUnique({
            where: { id: request.user.userId },
            select: { id: true, email: true, name: true, createdAt: true, wins: true, losses: true },
        });
        if (!userProfile) return reply.code(404).send({ error: 'User not found' });
        return userProfile;
    });

    fastify.patch('/profile', { preHandler: [authenticate] }, async (request, reply) => {
        const { name } = request.body;
        const userId = request.user.userId;
        if (typeof name !== 'string' || name.trim() === '') {
            return reply.code(400).send({ error: 'Name field cannot be empty' });
        }
        try {
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { name: name.trim() },
                select: { id: true, email: true, name: true }
            });
            return updatedUser;
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Could not update user profile' });
        }
    });
    
    fastify.post('/profile/change-password', { preHandler: [authenticate] }, async (request, reply) => {
        const { currentPassword, newPassword } = request.body;
        const userId = request.user.userId;
        if (!currentPassword || !newPassword) {
            return reply.code(400).send({ error: 'Current and new passwords are required' });
        }
        try {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                return reply.code(404).send({ error: 'User not found' });
            }
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

    fastify.get('/users/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = parseInt(request.params.id, 10);
        if (isNaN(userId)) { return reply.code(400).send({ error: 'Invalid user ID' }); }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, createdAt: true, wins: true, losses: true }
        });
        if (!user) { return reply.code(404).send({ error: 'User not found' }); }
        return user;
    });

    fastify.get('/users/:id/matches', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = parseInt(request.params.id, 10);
        if (isNaN(userId)) { return reply.code(400).send({ error: 'Invalid user ID' }); }
        try {
            const matches = await prisma.match.findMany({
                where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
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

    // --- ARKADAŞLIK SİSTEMİ ENDPOINT'LERİ ---

    fastify.get('/friends', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.userId;
        try {
            const friends = await prisma.friendship.findMany({
                where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { receiverId: userId }] },
                include: {
                    requester: { select: { id: true, name: true } },
                    receiver: { select: { id: true, name: true } },
                }
            });

            const pendingRequests = await prisma.friendship.findMany({
                where: { receiverId: userId, status: 'PENDING' },
                include: { requester: { select: { id: true, name: true } } }
            });
            
            const sentRequests = await prisma.friendship.findMany({
                where: { requesterId: userId, status: 'PENDING' },
                include: { receiver: { select: { id: true, name: true } } }
            });

            const acceptedFriends = friends.map(f => f.requesterId === userId ? f.receiver : f.requester);

            // DÜZELTME: Frontend'in beklediği obje yapısını burada oluşturup gönderiyoruz.
            return {
                friends: acceptedFriends,
                pendingRequests,
                sentRequests
            };

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Could not fetch friends list.' });
        }
    });
    
    fastify.post('/friends/request/:targetId', { preHandler: [authenticate] }, async (request, reply) => {
        const requesterId = request.user.userId;
        const receiverId = parseInt(request.params.targetId, 10);
        if (requesterId === receiverId) { return reply.code(400).send({ error: "Cannot friend yourself." }); }
        const existingFriendship = await prisma.friendship.findFirst({
            where: { OR: [{ requesterId, receiverId }, { requesterId: receiverId, receiverId: requesterId }] }
        });
        if (existingFriendship) { return reply.code(409).send({ error: "Friendship already exists or is pending." }); }
        const newRequest = await prisma.friendship.create({ data: { requesterId, receiverId } });
        return reply.code(201).send(newRequest);
    });

    fastify.post('/friends/respond/:friendshipId', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.userId;
        const friendshipId = parseInt(request.params.friendshipId, 10);
        const { accept } = request.body; // true for accept, false for reject

        const friendship = await prisma.friendship.findFirst({ where: { id: friendshipId, receiverId: userId, status: 'PENDING' } });
        if (!friendship) { return reply.code(404).send({ error: "Request not found." }); }
        
        if (accept) {
            return prisma.friendship.update({ where: { id: friendshipId }, data: { status: 'ACCEPTED' } });
        } else {
            return prisma.friendship.delete({ where: { id: friendshipId } });
        }
    });

    fastify.delete('/friends/:friendId', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.userId;
        const friendId = parseInt(request.params.friendId, 10);
        
        const friendship = await prisma.friendship.findFirst({
            where: { status: 'ACCEPTED', OR: [{ requesterId: userId, receiverId: friendId }, { requesterId: friendId, receiverId: userId }] }
        });
        if (!friendship) { return reply.code(404).send({ error: "Friendship not found." }); }

        await prisma.friendship.delete({ where: { id: friendship.id } });
        return { message: "Friend removed." };
    });

    // --- KULLANICI ENGELLEME ENDPOINT'LERİ ---

    fastify.post('/users/:targetId/block', { preHandler: [authenticate] }, async (request, reply) => {
        const blockerId = request.user.userId;
        const blockedId = parseInt(request.params.targetId, 10);

        if (blockerId === blockedId) { return reply.code(400).send({ error: "Cannot block yourself." }); }
        
        const existingBlock = await prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId, blockedId } } });
        if (existingBlock) { return reply.code(409).send({ error: "User already blocked." }); }
        
        const newBlock = await prisma.block.create({ data: { blockerId, blockedId } });
        return reply.code(201).send(newBlock);
    });

    fastify.delete('/users/:targetId/unblock', { preHandler: [authenticate] }, async (request, reply) => {
        const blockerId = request.user.userId;
        const blockedId = parseInt(request.params.targetId, 10);

        try {
            await prisma.block.delete({ where: { blockerId_blockedId: { blockerId, blockedId } } });
            return { message: "User unblocked." };
        } catch (error) {
            return reply.code(404).send({ error: "Block relationship not found." });
        }
    });
}

module.exports = userRoutes;