// backend/middleware/authenticate.js
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db'); // Prisma'yı import ettiğimizden emin olalım
const JWT_SECRET = process.env.JWT_SECRET;

async function authenticate(request, reply) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.code(401).send({ error: 'Unauthorized: No token provided' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // --- GÜVENLİK GÜNCELLEMESİ BAŞLANGICI ---
        // Token'ı doğruladıktan sonra, token içindeki kullanıcının
        // veritabanında hala var olup olmadığını kontrol et.
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        // Eğer kullanıcı veritabanında bulunamazsa (silinmiş, vb.),
        // token geçerli olsa bile isteği reddet.
        if (!user) {
            return reply.code(401).send({ error: 'Unauthorized: User not found' });
        }
        // --- GÜVENLİK GÜNCELLEMESİ SONU ---

        request.user = decoded; // Artık 'decoded' yerine 'user' objesini de atayabiliriz, ama bu haliyle de çalışır.
    } catch (error) {
        // Bu blok, token'ın süresi dolduğunda veya imza geçersiz olduğunda çalışır.
        return reply.code(401).send({ error: 'Unauthorized: Invalid token' });
    }
}

module.exports = authenticate;