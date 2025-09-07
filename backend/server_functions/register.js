// backend/server_functions/register.js
const bcrypt = require('bcrypt');
const prisma = require('../prisma/db');
const SALT_ROUNDS = 10;

function setupRegisterRoute(fastify) {
    fastify.post('/register', async (request, reply) => {
        const { email, name, password } = request.body;
        if (!email || !password) {
            return reply.code(400).send({ error: 'Email and password are required' });
        }
        try {
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            const user = await prisma.user.create({
                data: { email: email, name: name, password: hashedPassword },
            });
            const { password: _, ...userWithoutPassword } = user;
            return reply.code(201).send(userWithoutPassword);
        } catch (error) {
            if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
                return reply.code(409).send({ error: 'This email is already registered' });
            }
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Could not register user' });
        }
    });
}

module.exports = setupRegisterRoute;