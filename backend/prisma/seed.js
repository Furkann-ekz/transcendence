// backend/prisma/seed.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
    console.log(`Start seeding ...`);

    const usersToCreate = [
        { name: 'Alice', email: 'a@a', password: 'a' },
        { name: 'Bob', email: 'b@b', password: 'b' },
        { name: 'Charlie', email: 'c@c', password: 'c' },
        { name: 'Diana', email: 'd@d', password: 'd' },
        { name: 'Fatih', email: 'f@f', password: 'f' },
        { name: 'Goncagüle', email: 'g@g', password: 'g' },
        { name: 'Hacışakir', email: 'h@h', password: 'h' },
        { name: 'Jandarma', email: 'j@j', password: 'j' },
    ];

    for (const u of usersToCreate) {
        const hashedPassword = await bcrypt.hash(u.password, SALT_ROUNDS);
        const avatarUrl = `https://picsum.photos/seed/${u.name}/200`;
        const user = await prisma.user.create({
            data: {
                name: u.name,
                email: u.email,
                password: hashedPassword,
                avatarUrl: avatarUrl,
            },
        });
        console.log(`Created user with id: ${user.id} and name: ${user.name}`);
    }

    console.log(`Seeding finished.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });