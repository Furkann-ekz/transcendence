import { disconnectSocket } from '../socket';
import { navigateTo } from '../router';

export async function apiFetch(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    
    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // --- DEĞİŞİKLİK BURADA ---
    // JSON başlığını sadece ve sadece bir 'body' varsa ekliyoruz.
    if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        console.error('Geçersiz oturum (401) tespit edildi. Çıkış yapılıyor...');
        
        localStorage.removeItem('token');
        disconnectSocket();
        
        navigateTo('/'); 
        
        throw new Error('Unauthorized session.');
    }

    return response;
}