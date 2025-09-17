// frontend/src/router/index.ts
import * as LoginPage from '../pages/LoginPage';
import * as RegisterPage from '../pages/RegisterPage';
import * as DashboardPage from '../pages/DashboardPage';
import * as LobbyPage from '../pages/LobbyPage';
import * as LocalGamePage from '../pages/LocalGamePage';
import * as OnlineGamePage from '../pages/OnlineGamePage';
import { connectSocket, getSocket } from '../socket';
import * as OnlineLobbyPage from '../pages/OnlineLobbyPage';
import * as ProfilePage from '../pages/ProfilePage';
import * as MatchHistoryPage from '../pages/MatchHistoryPage';
import * as ProfileEditPage from '../pages/ProfileEditPage';

interface Route {
  render: () => string;
  afterRender?: () => void;
  cleanup?: () => void;
}
let currentRoute: Route | null = null;

const routes: { [key: string]: Route } = {
  '/': { render: LoginPage.render, afterRender: LoginPage.afterRender },
  '/register': { render: RegisterPage.render, afterRender: RegisterPage.afterRender },
  '/dashboard': { render: DashboardPage.render, afterRender: DashboardPage.afterRender, cleanup: DashboardPage.cleanup },
  '/lobby': { render: LobbyPage.render, afterRender: LobbyPage.afterRender },
  '/online-lobby': { render: OnlineLobbyPage.render, afterRender: OnlineLobbyPage.afterRender },
  '/local-game': { render: LocalGamePage.render, afterRender: LocalGamePage.afterRender, cleanup: LocalGamePage.cleanup },
  '/profile/edit': { render: ProfileEditPage.render, afterRender: ProfileEditPage.afterRender },
  '/online-game': { render: OnlineGamePage.render, afterRender: OnlineGamePage.afterRender, cleanup: OnlineGamePage.cleanup },
};

const app = document.querySelector<HTMLDivElement>('#app')!;

// frontend/src/router/index.ts

export async function handleLocation() {
  const path = window.location.pathname;
  const token = localStorage.getItem('token');

  const protectedPaths = ['/dashboard', '/lobby', '/online-lobby', '/local-game', '/online-game', '/profile/edit'];
  // Profil ve maç geçmişi sayfaları da korunmalı
  const isProtectedRoute = protectedPaths.includes(path) || path.startsWith('/profile/');
  
  // SENARYO 1: Korunmuş bir sayfaya girmeye çalışıyoruz
  if (isProtectedRoute) {
    if (!token) {
      // Token yoksa, direkt giriş sayfasına yönlendir.
      navigateTo('/');
      return;
    }
    // Token var, geçerli mi diye kontrol edelim.
    if (!getSocket() || !getSocket()?.connected) {
      try {
        await connectSocket(token); // Soket'e bağlanmayı dene
      } catch (error) {
        // Bağlantı başarısız oldu (token geçersiz), hafızayı temizle ve giriş sayfasına at.
        console.error("Geçersiz token ile giriş denemesi engellendi, çıkış yapılıyor.");
        localStorage.removeItem('token');
        navigateTo('/');
        return;
      }
    }
  } 
  // SENARYO 2: Halka açık bir sayfaya (giriş, kayıt) girmeye çalışıyoruz
  else if (token) {
    // Token'ı var ama halka açık sayfada, dashboard'a yönlendir.
    // Burada soket bağlantısı denemiyoruz, yönlendirmeden sonra dashboard'da denenecek.
    navigateTo('/dashboard');
    return;
  }

  // Yönlendirme ve bağlantı kontrolleri bitti, şimdi sayfayı render et.
  let routeToRender: Route | null = null;
  
  if (path.startsWith('/profile/') && path.endsWith('/history')) {
    routeToRender = MatchHistoryPage;
  } else if (path.startsWith('/profile/')) {
    routeToRender = ProfilePage;
  } else {
    routeToRender = routes[path] || routes['/'];
  }
  
  if (!routeToRender) {
    app.innerHTML = '<h1>404 Not Found</h1>';
    return;
  }

  if (currentRoute !== routeToRender) {
    if (currentRoute && currentRoute.cleanup) {
      currentRoute.cleanup();
    }
    
    app.innerHTML = routeToRender.render();
    
    if (routeToRender.afterRender) {
      void routeToRender.afterRender();
    }
    currentRoute = routeToRender;
  }
}

export async function navigateTo(path: string) { // 'async' eklendi
  window.history.pushState({}, '', path);
  await handleLocation(); // 'await' eklendi
}

export async function initializeRouter() { // 'async' eklendi
  window.addEventListener('popstate', () => handleLocation()); // Olası "this" context hatalarını önlemek için arrow function içine aldık.
  document.body.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.matches('[data-link]')) {
      e.preventDefault();
      void navigateTo(target.getAttribute('href')!); // 'void' eklendi
    }
  });
  await handleLocation(); // 'await' eklendi
}