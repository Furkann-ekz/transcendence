const prisma = require('../prisma/db');
const authenticate = require('../middleware/authenticate');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function userRoutes(fastify, { io, onlineUsers }) {
    // Belirtilen kullanıcıya bildirim gönderir
    const notifyUser = (userId) => {
        const userSocketInfo = onlineUsers.get(userId);
        if (userSocketInfo) {
            io.to(userSocketInfo.socketId).emit('friendship_updated');
        }
    };

    // --- TEMEL KULLANICI İŞLEMLERİ (DEĞİŞİKLİK YOK) ---
    fastify.post('/profile/avatar', { preHandler: [authenticate] }, async (request, reply) => {
        const data = await request.file();
        if (!data) {
            return reply.code(400).send({ error: 'No file uploaded.' });
        }
        const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
        await fs.promises.mkdir(uploadDir, { recursive: true });
        const filename = `avatar-${request.user.userId}${path.extname(data.filename)}`;
        const filepath = path.join(uploadDir, filename);
        const avatarUrl = `/uploads/avatars/${filename}`;
        try {
            const buffer = await data.toBuffer();
            await fs.promises.writeFile(filepath, buffer);
            await prisma.user.update({
                where: { id: request.user.userId },
                data: { avatarUrl },
            });
            return { message: 'Avatar updated successfully', avatarUrl };
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Could not process file upload.' });
        }
    });
    fastify.get('/profile', { preHandler: [authenticate] }, async (request, reply) => {
        const userProfile = await prisma.user.findUnique({
            where: { id: request.user.userId },
            select: { id: true, email: true, name: true, createdAt: true, wins: true, losses: true, avatarUrl: true },
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
            // --- GÜNCELLEME BAŞLANGICI ---
            // Kullanıcı adı zaten alınmışsa, özel bir hata mesajı döndür.
            if (error.code === 'P2002' && error.meta?.target.includes('name')) {
                return reply.code(409).send({ error: 'error_name_taken' });
            }
            // --- GÜNCELLEME SONU ---
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
            select: { id: true, name: true, createdAt: true, wins: true, losses: true, avatarUrl: true }
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
            return { friends: acceptedFriends, pendingRequests, sentRequests };
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Could not fetch friends list.' });
        }
    });
    fastify.get('/friends/status/:targetId', { preHandler: [authenticate] }, async (request, reply) => {
        const myId = request.user.userId;
        const targetId = parseInt(request.params.targetId, 10);
        if (isNaN(targetId) || myId === targetId) {
            return reply.code(400).send({ error: "Invalid target user." });
        }
        try {
            const friendship = await prisma.friendship.findFirst({
                where: { OR: [{ requesterId: myId, receiverId: targetId }, { requesterId: targetId, receiverId: myId }] }
            });
            const iBlockedTarget = await prisma.block.findUnique({
                where: { blockerId_blockedId: { blockerId: myId, blockedId: targetId } }
            });
            const targetBlockedMe = await prisma.block.findUnique({
                where: { blockerId_blockedId: { blockerId: targetId, blockedId: myId } }
            });
            if (targetBlockedMe) {
                return { friendshipStatus: 'blocked_by_them', isBlocked: false };
            }
            const response = {
                friendshipStatus: 'none',
                friendshipId: null,
                isBlocked: !!iBlockedTarget
            };
            if (friendship) {
                response.friendshipId = friendship.id;
                if (friendship.status === 'ACCEPTED') {
                    response.friendshipStatus = 'friends';
                } else if (friendship.status === 'PENDING') {
                    response.friendshipStatus = friendship.requesterId === myId ? 'pending_sent' : 'pending_received';
                }
            }
            return response;
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: "Could not fetch friendship status." });
        }
    });
    fastify.post('/friends/request/:targetId', { preHandler: [authenticate] }, async (request, reply) => {
        const requesterId = request.user.userId;
        const receiverId = parseInt(request.params.targetId, 10);
        if (requesterId === receiverId) {
            return reply.code(400).send({ error: "Cannot friend yourself." });
        }
        const blockExists = await prisma.block.findFirst({
            where: {
                OR: [
                    { blockerId: requesterId, blockedId: receiverId },
                    { blockerId: receiverId, blockedId: requesterId },
                ]
            }
        });
        if (blockExists) {
            return reply.code(403).send({ error: "Cannot send friend request. A block is active between users." });
        }
        const existingFriendship = await prisma.friendship.findFirst({
            where: { OR: [{ requesterId, receiverId }, { requesterId: receiverId, receiverId: requesterId }] }
        });
        if (existingFriendship) {
            return reply.code(409).send({ error: "Friendship already exists or is pending." });
        }
        const newRequest = await prisma.friendship.create({ data: { requesterId, receiverId } });
        notifyUser(receiverId);
        return reply.code(201).send(newRequest);
    });

    // --- DEĞİŞİKLİĞİN OLDUĞU YER ---
    fastify.post('/friends/respond/:friendshipId', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.userId; // Bu, isteği kabul eden kişi (receiver)
        const friendshipId = parseInt(request.params.friendshipId, 10);
        const { accept } = request.body;
        const friendship = await prisma.friendship.findFirst({ where: { id: friendshipId, receiverId: userId, status: 'PENDING' } });
        if (!friendship) { return reply.code(404).send({ error: "Request not found." }); }
        
        let updatedFriendship;
        if (accept) {
            updatedFriendship = await prisma.friendship.update({ where: { id: friendshipId }, data: { status: 'ACCEPTED' } });
        } else {
            updatedFriendship = await prisma.friendship.delete({ where: { id: friendshipId } });
        }

        // --- GÜNCELLEME BURADA ---
        // Artık hem isteği göndereni (requester) hem de isteği kabul edeni (receiver/mevcut kullanıcı) bilgilendiriyoruz.
        notifyUser(friendship.requesterId); 
        notifyUser(userId); 

        return updatedFriendship;
    });

    fastify.delete('/friends/by-ship/:friendshipId', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.userId;
        const friendshipId = parseInt(request.params.friendshipId, 10);
        const friendship = await prisma.friendship.findFirst({
            where: { id: friendshipId, OR: [{ requesterId: userId }, { receiverId: userId }] }
        });
        if (!friendship) {
            return reply.code(404).send({ error: "Friendship not found or you are not part of it." });
        }
        await prisma.friendship.delete({ where: { id: friendship.id } });
        const otherUserId = friendship.requesterId === userId ? friendship.receiverId : friendship.requesterId;
        
        // --- GÜNCELLEME BURADA ---
        // Arkadaşlık silindiğinde de her iki tarafı bilgilendiriyoruz.
        notifyUser(otherUserId); 
        notifyUser(userId);
        
        return { message: "Friendship removed." };
    });

    // --- KULLANICI ENGELLEME (DEĞİŞİKLİK YOK) ---
    fastify.post('/users/:targetId/block', { preHandler: [authenticate] }, async (request, reply) => {
        const blockerId = request.user.userId;
        const blockedId = parseInt(request.params.targetId, 10);
        if (blockerId === blockedId) { 
            return reply.code(400).send({ error: "Cannot block yourself." }); 
        }
        const existingBlock = await prisma.block.findUnique({ 
            where: { blockerId_blockedId: { blockerId, blockedId } } 
        });
        if (existingBlock) { 
            return reply.code(409).send({ error: "User already blocked." }); 
        }

        // --- GÜNCELLEME BURADA ---
        // 'status' filtresini kaldırarak, aradaki arkadaşlığın
        // durumu ne olursa olsun (PENDING veya ACCEPTED) silinmesini sağlıyoruz.
        await prisma.friendship.deleteMany({
            where: {
                OR: [
                    { requesterId: blockerId, receiverId: blockedId },
                    { requesterId: blockedId, receiverId: blockerId }
                ]
            }
        });
        // --- GÜNCELLEME SONU ---
        
        const newBlock = await prisma.block.create({ 
            data: { blockerId, blockedId } 
        });

        notifyUser(blockerId);
        notifyUser(blockedId);
        return reply.code(201).send(newBlock);
    });
    fastify.delete('/users/:targetId/unblock', { preHandler: [authenticate] }, async (request, reply) => {
        const blockerId = request.user.userId;
        const blockedId = parseInt(request.params.targetId, 10);
        try {
            await prisma.block.delete({ 
                where: { blockerId_blockedId: { blockerId, blockedId } } 
            });
            notifyUser(blockerId);
            notifyUser(blockedId);
            return { message: "User unblocked." };
        } catch (error) {
            return reply.code(404).send({ error: "Block relationship not found." });
        }
    });
}

module.exports = userRoutes;