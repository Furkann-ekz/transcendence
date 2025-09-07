// backend/server_functions/users.js
const prisma = require('../prisma/db');
const authenticate = require('../server_functions/auth'); // Bu yolun doğru olduğundan emin ol

function setupUsersRoute(fastify) {
    fastify.get('/users', async (request, reply) => {
        try {
            const users = await prisma.user.findMany();
            return users;
        } catch (error) {
            reply.code(500).send({ error: 'Database query failed' });
        }
    });
}

module.exports = setupUsersRoute;