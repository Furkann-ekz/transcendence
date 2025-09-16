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
  const token = localStorage.getItem('token');
  const path = window.location.pathname;
  let routeToRender: Route | null = null;

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

  // 3. ADIM: Sayfayı render et.
  let route: Route | null = null;
  
  if (path.startsWith('/profile/')) {
    route = ProfilePage;
  } else {
    route = routes[path] || routes['/'];
  }
  
  if (!route) { // Eğer hiçbir rota eşleşmezse
      app.innerHTML = '<h1>404 Not Found</h1>';
      return;
  }

  if (currentRoute !== route) {
    if (currentRoute && currentRoute.cleanup) {
      currentRoute.cleanup();
    }
    
    app.innerHTML = route.render();
    
    if (route.afterRender) {
      // afterRender async olabileceği için void ile çağırıyoruz
      void route.afterRender();
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