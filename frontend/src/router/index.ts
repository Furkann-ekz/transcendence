// frontend/src/router/index.ts
import * as LoginPage from '../pages/LoginPage';
import * as RegisterPage from '../pages/RegisterPage';
import * as DashboardPage from '../pages/DashboardPage';
import * as LobbyPage from '../pages/LobbyPage';
import * as LocalGamePage from '../pages/LocalGamePage';
import * as OnlineGamePage from '../pages/OnlineGamePage';
import { connectSocket, getSocket } from '../socket';

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
  '/local-game': { render: LocalGamePage.render, afterRender: LocalGamePage.afterRender, cleanup: LocalGamePage.cleanup },
  '/online-game': { render: OnlineGamePage.render, afterRender: OnlineGamePage.afterRender, cleanup: OnlineGamePage.cleanup },
};

const app = document.querySelector<HTMLDivElement>('#app')!;

function handleLocation() {
  const token = localStorage.getItem('token');

  if (token && (!getSocket() || !getSocket()?.connected)) {
    try {
      // Bağlantının kurulmasını BEKLE.
      await connectSocket(token);
    }
    catch (error)
    {
      console.error("Soket'e bağlanılamadı, login sayfasına yönlendiriliyor.");
      localStorage.removeItem('token'); // Başarısız olursa token'ı temizle
      navigateTo('/');
      return; // Fonksiyonu burada bitir.
    }
  }
  if (currentRoute && currentRoute.cleanup) {
    currentRoute.cleanup();
  }
  const path = window.location.pathname;
  const protectedPaths = ['/dashboard', '/lobby', '/local-game', '/online-game'];
  const isAuthRequired = protectedPaths.includes(path);
  const currentToken = localStorage.getItem('token');
  
  if (isAuthRequired && !currentToken) {
    navigateTo('/');
    return;
  }
  if (!isAuthRequired && currentToken && (path === '/' || path === '/register')) {
    navigateTo('/dashboard');
    return;
  }
  const route = routes[path] || routes['/'];
  app.innerHTML = route.render();
  if (route.afterRender) {
    route.afterRender();
  }
  currentRoute = route;
}

export function navigateTo(path: string) {
  window.history.pushState({}, '', path);
  handleLocation();
}

export function initializeRouter() {
  window.addEventListener('popstate', handleLocation);
  document.body.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.matches('[data-link]')) {
      e.preventDefault();
      navigateTo(target.getAttribute('href')!);
    }
  });
  handleLocation();
}