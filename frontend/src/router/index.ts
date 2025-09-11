// frontend/src/router/index.ts
import * as LoginPage from '../pages/LoginPage';
import * as RegisterPage from '../pages/RegisterPage';
import * as DashboardPage from '../pages/DashboardPage';
import * as LobbyPage from '../pages/LobbyPage';
import * as LocalGamePage from '../pages/LocalGamePage';
import * as OnlineGamePage from '../pages/OnlineGamePage';
import { connectSocket, getSocket } from '../socket';
import * as OnlineLobbyPage from '../pages/OnlineLobbyPage';

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
  '/online-game': { render: OnlineGamePage.render, afterRender: OnlineGamePage.afterRender, cleanup: OnlineGamePage.cleanup },
};

const app = document.querySelector<HTMLDivElement>('#app')!;

// frontend/src/router/index.ts

export async function handleLocation() {
  const path = window.location.pathname;
  const token = localStorage.getItem('token');

  // 1. ADIM: Gerekliyse soket bağlantısını kur ve bekle.
  if (token) {
    if (!getSocket() || !getSocket()?.connected) {
      try {
        await connectSocket(token);
      } catch (error) {
        console.error("Soket'e bağlanılamadı, çıkış yapılıyor.");
        localStorage.removeItem('token');
        navigateTo('/');
        return;
      }
    }
  }

  // 2. ADIM: Yönlendirme kurallarını uygula.
  const protectedPaths = ['/dashboard', '/lobby', '/local-game', '/online-game'];
  const isAuthRequired = protectedPaths.includes(path);

  // Token yokken korumalı sayfaya girmeye çalışırsa -> login'e yönlendir.
  if (isAuthRequired && !token) {
    if (path !== '/') navigateTo('/');
    return;
  }
  // Token varken login/register sayfasına girmeye çalışırsa -> dashboard'a yönlendir.
  if (!isAuthRequired && token && (path === '/' || path === '/register')) {
    navigateTo('/dashboard');
    return;
  }

  // 3. ADIM: Sayfayı render et.
  const route = routes[path] || routes['/'];
  
  // Sadece rota gerçekten değiştiyse render et (gereksiz döngüleri engeller).
  if (currentRoute !== route) {
    if (currentRoute && currentRoute.cleanup) {
      currentRoute.cleanup();
    }
    
    app.innerHTML = route.render();
    
    if (route.afterRender) {
      route.afterRender();
    }
    currentRoute = route;
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