import { apiFetch } from './api';

const API_URL = '/api';

export async function loginUser(email: string, password: string)
{
	const response = await apiFetch(`${API_URL}/login`, {
		method: 'POST',
		body: JSON.stringify({ email, password }),
	});

	if (!response.ok)
	{
		const errorData = await response.json();
		throw new Error(errorData.error || 'Giriş başarısız oldu.');
	}
	return (response.json());
}

export async function registerUser(email: string, password: string, name: string)
{
	const response = await apiFetch(`${API_URL}/register`,
	{
		method: 'POST',
		body: JSON.stringify({ email, password, name }),
	});

	if (!response.ok)
	{
		const errorData = await response.json();
		throw new Error(errorData.error || 'Kayıt başarısız oldu.');
	}
	return (response.json());
}