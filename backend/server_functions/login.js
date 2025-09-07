// backend/server_functions/login.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db');
const JWT_SECRET = process.env.JWT_SECRET;

function setupLoginRoute(fastify) {
    fastify.post('/login', async (request, reply) => {
        const { email, password } = request.body;
        if (!email || !password) {
            return reply.code(400).send({ error: 'Email and password are required' });
        }
        try {
            const user = await prisma.user.findUnique({ where: { email: email } });
            if (!user) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }
            const isPasswordMatch = await bcrypt.compare(password, user.password);
            if (!isPasswordMatch) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }
            const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
            return { token: token };
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });
}

module.exports = setupLoginRoute;