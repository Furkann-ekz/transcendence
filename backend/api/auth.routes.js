const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db');
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;

async function authRoutes(fastify, options)
{
	fastify.post('/register', async (request, reply) =>
	{
		const { email, name, password } = request.body;
		if (!email || !password || !name)
			return (reply.code(400).send({ error: 'Email, name, and password are required' }));
		try
		{
			const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
			const user = await prisma.user.create({ data: { email, name, password: hashedPassword } });
			const { password: _, ...userWithoutPassword } = user;
			return (reply.code(201).send(userWithoutPassword));
		}
		catch (error)
		{
			if (error.code === 'P2002')
			{
				if (error.meta && error.meta.target.includes('name'))
					return (reply.code(409).send({ error: 'error_name_taken' }));
				else if (error.meta && error.meta.target.includes('email'))
					return (reply.code(409).send({ error: 'error_email_registered' }));
			}
			fastify.log.error(error);
			return (reply.code(500).send({ error: 'Could not register user' }));
		}
	});

	fastify.post('/login', async (request, reply) =>
	{
		const { email, password } = request.body;
		if (!email || !password)
			return (reply.code(400).send({ error: 'Email and password are required' }));
		try
		{
			const user = await prisma.user.findUnique({ where: { email } });
			const isPasswordMatch = user ? await bcrypt.compare(password, user.password) : false;
			if (!user || !isPasswordMatch)
				return (reply.code(401).send({ error: 'Invalid credentials' }));
			const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
			return ({ token });
		}
		catch (error)
		{
			fastify.log.error(error);
			return (reply.code(500).send({ error: 'Internal Server Error' }));
		}
	});
}
module.exports = authRoutes;