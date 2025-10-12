interface ChatMessage
{
	type: 'public' | 'private';
	sender: { id: number; name: string; } | string;
	recipient?: { id: number; name: string; };
	content: string;
}

const MAX_MESSAGES = 50;
let messages: ChatMessage[] = [];

export function addMessage(message: ChatMessage)
{
	messages.push(message);

	if (messages.length > MAX_MESSAGES)
		messages.shift();
}

export function getMessages(): ChatMessage[]
{
	return (messages);
}

export function clearMessages()
{
	messages = [];
}