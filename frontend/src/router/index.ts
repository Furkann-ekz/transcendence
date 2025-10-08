// frontend/src/router/index.ts

import * as LoginPage from '../pages/LoginPage';
import * as RegisterPage from '../pages/RegisterPage';
import * as DashboardPage from '../pages/DashboardPage';
import * as LobbyPage from '../pages/LobbyPage';
import * as LocalGamePage from '../pages/LocalGamePage';
import * as OnlineGamePage from '../pages/OnlineGamePage';
import { connectSocket, getSocket } from '../socket';
import * as OnlineLobbyPage from '../pages/OnlineLobbyPage';
import * as MatchHistoryPage from '../pages/MatchHistoryPage';
import * as ProfileEditPage from '../pages/ProfileEditPage';
import * as ProfilePage from '../pages/ProfilePage';
import * as TournamentLobbyPage from '../pages/TournamentLobbyPage';
import * as TournamentListPage from '../pages/TournamentListPage';
import * as TournamentFlowPage from '../pages/TournamentFlowPage';

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
  '/lobby': { render: LobbyPage.render, afterRender: LobbyPage.afterRender, cleanup: LobbyPage.cleanup }, // cleanup eklendi
  '/online-lobby': { render: OnlineLobbyPage.render, afterRender: OnlineLobbyPage.afterRender, cleanup: OnlineLobbyPage.cleanup }, // cleanup eklendi
  '/local-game': { render: LocalGamePage.render, afterRender: LocalGamePage.afterRender, cleanup: LocalGamePage.cleanup },
  '/profile/edit': { render: ProfileEditPage.render, afterRender: ProfileEditPage.afterRender, cleanup: ProfileEditPage.cleanup }, // cleanup eklendi
  '/online-game': { render: OnlineGamePage.render, afterRender: OnlineGamePage.afterRender, cleanup: OnlineGamePage.cleanup },
  '/tournaments': { render: TournamentListPage.render, afterRender: TournamentListPage.afterRender, cleanup: TournamentListPage.cleanup },
};

const app = document.querySelector<HTMLDivElement>('#app')!;

export async function handleLocation(forceReload = false) {
  const path = window.location.pathname;
  const token = localStorage.getItem('token');

  const protectedPaths = ['/dashboard', '/lobby', '/online-lobby', '/local-game', '/online-game', '/profile/edit', '/tournaments'];
  // DEĞİŞİKLİK: Yeni turnuva akış sayfasının yolunu da korumalı olarak işaretliyoruz.
  const isProtectedRoute = protectedPaths.includes(path) || path.startsWith('/profile/') || path.startsWith('/tournaments/') || path.startsWith('/tournament/');

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
  
  // Önce statik rotaları kontrol et
  if (routes[path]) {
    routeToRender = routes[path];
  } 
  // Sonra dinamik (parametre içeren) rotaları kontrol et
  else if (path.startsWith('/tournaments/')) {
    routeToRender = TournamentLobbyPage;
  }
  else if (path.startsWith('/tournament/') && path.endsWith('/play')) {
    routeToRender = TournamentFlowPage;
  }
  else if (path.startsWith('/profile/') && path.endsWith('/history')) {
    routeToRender = MatchHistoryPage;
  }
  else if (path.startsWith('/profile/')) {
    routeToRender = ProfilePage;
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

export async function navigateTo(path: string) {
  window.history.pushState({}, '', path);
  await handleLocation();
}

export async function initializeRouter() {
  window.addEventListener('popstate', () => handleLocation());
  document.body.addEventListener('click', (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-link]');
    if (target) {
      e.preventDefault();
      const href = target.getAttribute('href');
      if(href) {
        void navigateTo(href);
      }
    }
  });
  await handleLocation();
}