// frontend/src/router/index.ts
import * as LoginPage from '../pages/LoginPage';
import * as RegisterPage from '../pages/RegisterPage';
import * as DashboardPage from '../pages/DashboardPage';
import * as LobbyPage from '../pages/LobbyPage';
import * as LocalGamePage from '../pages/LocalGamePage';
import * as OnlineGamePage from '../pages/OnlineGamePage';
import { connectSocket, getSocket } from '../socket';
import * as OnlineLobbyPage from '../pages/OnlineLobbyPage';
import * as ProfileEditPage from '../pages/ProfileEditPage';
import * as ProfilePage from '../pages/ProfilePage';
import * as TournamentListPage from '../pages/TournamentListPage.ts';
import * as TournamentLobbyPage from '../pages/TournamentLobbyPage.ts';

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
  '/profile/edit': { render: ProfileEditPage.render, afterRender: ProfileEditPage.afterRender }, // << YENİ EKLENEN SATIR
  '/online-game': { render: OnlineGamePage.render, afterRender: OnlineGamePage.afterRender, cleanup: OnlineGamePage.cleanup },
  '/tournaments': { render: TournamentListPage.render, afterRender: TournamentListPage.afterRender },
  '/tournaments/:id': { render: TournamentLobbyPage.render, afterRender: TournamentLobbyPage.afterRender, cleanup: TournamentLobbyPage.cleanup },
};

const app = document.querySelector<HTMLDivElement>('#app')!;

export async function handleLocation(forceReload = false) {
  const path = window.location.pathname;
  const token = localStorage.getItem('token');

  const protectedPaths = ['/dashboard', '/lobby', '/online-lobby', '/local-game', '/online-game', '/profile/edit', '/tournaments'];
  const isProtectedRoute = protectedPaths.includes(path) || path.startsWith('/profile/') || path.startsWith('/tournaments/');
  
  if (isProtectedRoute) {
    if (!token) {
      navigateTo('/');
      return;
    }
    if (!getSocket() || !getSocket()?.connected) {
      try {
        await connectSocket(token);
      } catch (error) {
        console.error("Geçersiz token ile giriş denemesi engellendi, çıkış yapılıyor.");
        localStorage.removeItem('token');
        navigateTo('/');
        return;
      }
    }
  } 
  else if (token) {
    navigateTo('/dashboard');
    return;
  }

  let routeToRender: Route | null = null;
  
  // Önce spesifik yolları kontrol et
  if (routes[path]) {
    routeToRender = routes[path];
  } else if (path.startsWith('/tournaments/')) {
    routeToRender = TournamentLobbyPage;
  }
  else if (path.startsWith('/profile/')) {
    routeToRender = { 
        render: ProfilePage.render, 
        afterRender: ProfilePage.afterRender, 
        cleanup: ProfilePage.cleanup 
    };
  }
  // Hiçbiri eşleşmezse ana sayfayı göster
  else {
    routeToRender = routes['/'];
  }
  
  if (!routeToRender) {
    app.innerHTML = '<h1>404 Not Found</h1>';
    return;
  }

  if (currentRoute !== routeToRender || forceReload) {
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