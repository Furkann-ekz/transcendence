const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db');
const JWT_SECRET = process.env.JWT_SECRET;

async function authenticate(request, reply) {
	try {
		const authHeader = request.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer '))
			return (reply.code(401).send({ error: 'Unauthorized: No token provided' }));
		const token = authHeader.split(' ')[1];
		const decoded = jwt.verify(token, JWT_SECRET);

		const user = await prisma.user.findUnique({
			where: { id: decoded.userId },
		});

		if (!user)
			return (reply.code(401).send({ error: 'Unauthorized: User not found' }));
		request.user = decoded;
	}
	catch (error)
	{
		return (reply.code(401).send({ error: 'Unauthorized: Invalid token' }));
	}
}

module.exports = authenticate;