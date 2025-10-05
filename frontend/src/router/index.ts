// frontend/src/router/index.ts

import * as LoginPage from '../pages/LoginPage';
import * as RegisterPage from '../pages/RegisterPage';
import * as DashboardPage from '../pages/DashboardPage';
import * as LobbyPage from '../pages/LobbyPage';
import * as LocalGamePage from '../pages/LocalGamePage';
import * as OnlineGamePage from '../pages/OnlineGamePage';
import * as OnlineLobbyPage from '../pages/OnlineLobbyPage';
import * as MatchHistoryPage from '../pages/MatchHistoryPage';
import * as ProfileEditPage from '../pages/ProfileEditPage';
import * as ProfilePage from '../pages/ProfilePage';
import * as TournamentLobbyPage from '../pages/TournamentLobbyPage';
import * as TournamentListPage from '../pages/TournamentListPage';
import * as TournamentFlowPage from '../pages/TournamentFlowPage';
import { connectSocket, getSocket, disconnectSocket } from '../socket';
import { validateSessionOnServer } from '../api/auth';

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
  '/tournaments': { render: TournamentListPage.render, afterRender: TournamentListPage.afterRender, cleanup: TournamentListPage.cleanup },
};

const app = document.querySelector<HTMLDivElement>('#app')!;

export async function handleLocation(forceReload = false) {
    const path = window.location.pathname;
    const token = localStorage.getItem('token');

    const logoutAndRedirect = () => {
        localStorage.removeItem('token');
        disconnectSocket();
        navigateTo('/');
    };

    const protectedPaths = ['/dashboard', '/lobby', '/online-lobby', '/local-game', '/online-game', '/profile/edit', '/tournaments'];
    const isProtectedRoute = protectedPaths.includes(path) || path.startsWith('/profile/') || path.startsWith('/tournaments/') || path.startsWith('/tournament/');

    if (isProtectedRoute) {
        if (!token) {
            navigateTo('/');
            return;
        }

        let isSessionValid = false;

        if (getSocket()?.connected) {
            isSessionValid = true;
        } 
        else {
            isSessionValid = await validateSessionOnServer();
        }

        if (!isSessionValid) {
            logoutAndRedirect();
            return;
        }

        if (!getSocket()?.connected) {
            try {
                await connectSocket(token);
            } catch (error) {
                console.error("Socket connection attempt failed, logging out.");
                logoutAndRedirect();
                return;
            }
        }
    } 
    else if (token) {
        navigateTo('/dashboard');
        return;
    }

    let routeToRender: Route | null = null;
  
    if (routes[path]) {
        routeToRender = routes[path];
    } 
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