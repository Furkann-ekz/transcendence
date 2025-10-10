const prisma = require('../prisma/db');

async function chatHandler(io, socket, onlineUsers)
{
	
	socket.on('chat message', async (msg) =>
	{
		const senderId = socket.user.id;
		const messageObject =
		{
			type: 'public',
			sender: socket.user.name || socket.user.email,
			content: msg
		};

		for (const recipientSocket of io.sockets.sockets.values())
		{
			const recipientId = recipientSocket.user.id;
			if (senderId === recipientId)
			{
				recipientSocket.emit('chat message', messageObject);
				continue ;
			}
			const blockExists = await prisma.block.findFirst({
				where: { OR: [ { blockerId: senderId, blockedId: recipientId }, { blockerId: recipientId, blockedId: senderId } ] }
			});
			if (!blockExists)
				recipientSocket.emit('chat message', messageObject);
		}
	});
	
	socket.on('private message', async ({ recipientId, message }) =>
	{
		const senderId = socket.user.id;
		const recipientInfo = onlineUsers.get(recipientId);
		
		if (!recipientInfo || senderId === recipientId)
			return ;

		const messageObject =
		{
			type: 'private',
			sender: { id: senderId, name: socket.user.name || socket.user.email },
			recipient: { id: recipientId, name: recipientInfo.name || recipientInfo.email },
			content: message
		};
		socket.emit('chat message', messageObject);

		const blockExists = await prisma.block.findFirst({
			where: { OR: [ { blockerId: senderId, blockedId: recipientId }, { blockerId: recipientId, blockedId: senderId } ] }
		});

		if (!blockExists)
		{
			const recipientSocket = io.sockets.sockets.get(recipientInfo.socketId);
			if (recipientSocket)
				recipientSocket.emit('chat message', messageObject);
		}
	});
}

module.exports = chatHandler;