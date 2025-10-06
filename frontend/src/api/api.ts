import { disconnectSocket } from '../socket';
import { navigateTo } from '../router';

/**
 * Projedeki tüm API istekleri için kullanılacak merkezi fetch fonksiyonu.
 * Otomatik olarak Authorization header'ını ekler ve 401 (Unauthorized) 
 * yanıtlarını yakalayarak kullanıcıyı zorla sistemden atar.
 */
export async function apiFetch(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    
    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    // FormData gönderilmiyorsa Content-Type'ı ayarla
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // --- EN KRİTİK BÖLÜM: 401 HATASI KONTROLÜ ---
    if (response.status === 401) {
        console.error('Geçersiz oturum (401) tespit edildi. Çıkış yapılıyor...');
        
        // Tüm oturum bilgilerini temizle
        localStorage.removeItem('token');
        disconnectSocket();
        
        // Kullanıcıyı giriş sayfasına yönlendir ve geri gelmesini engelle
        navigateTo('/'); 
        
        // Bu hatayı fırlatarak, isteği başlatan fonksiyonun devam etmesini engelle
        // ve konsolda gereksiz ek hataların görünmesini önle.
        throw new Error('Unauthorized session.');
    }

    return response;
}