// frontend/src/router/index.ts
import * as LoginPage from '../pages/LoginPage';
import * as RegisterPage from '../pages/RegisterPage';
import * as DashboardPage from '../pages/DashboardPage';
import * as GamePage from '../pages/GamePage';

interface Route {
  render: () => string;
  afterRender?: () => void;
  cleanup?: () => void; // Yeni opsiyonel fonksiyon
}

let currentRoute: Route | null = null; // O anki rotayı tutmak için

const routes: { [key: string]: Route } = {
  '/': { render: LoginPage.render, afterRender: LoginPage.afterRender },
  '/register': { render: RegisterPage.render, afterRender: RegisterPage.afterRender },
  '/dashboard': { render: DashboardPage.render, afterRender: DashboardPage.afterRender, cleanup: DashboardPage.cleanup }, // cleanup eklendi
  '/game': { render: GamePage.render, afterRender: GamePage.afterRender, cleanup: GamePage.cleanup },
};

const app = document.querySelector<HTMLDivElement>('#app')!;

function handleLocation()
{
  if (currentRoute && currentRoute.cleanup) {
    currentRoute.cleanup();
  }
  const path = window.location.pathname;

  // KORUMALI YOL KONTROLÜNÜ GÜNCELLE
  const protectedPaths = ['/dashboard', '/game'];
  const isAuthRequired = protectedPaths.includes(path);
  const token = localStorage.getItem('token');

  if (isAuthRequired && !token) {
    navigateTo('/');
    return;
  }

  // Eğer giriş yapılmışsa ve kullanıcı anasayfaya veya kayıt sayfasına giderse, dashboard'a yönlendir.
  if (!isAuthRequired && token) {
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