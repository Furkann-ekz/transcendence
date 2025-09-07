// frontend/src/router/index.ts
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';

const routes: { [key: string]: () => string } = {
  '/': LoginPage,
  '/register': RegisterPage,
};

const app = document.querySelector<HTMLDivElement>('#app')!;

function handleLocation() {
  const path = window.location.pathname;
  const routeHandler = routes[path] || routes['/']; // Eşleşen yol yoksa ana sayfaya yönlendir
  app.innerHTML = routeHandler();
}

function navigateTo(path: string) {
  window.history.pushState({}, '', path);
  handleLocation();
}

export function initializeRouter() {
  window.addEventListener('popstate', handleLocation);

  // Linklere tıklandığında sayfa yenilenmesini engelle ve navigateTo'yu çağır
  document.body.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.matches('[data-link]')) {
      e.preventDefault();
      navigateTo(target.getAttribute('href')!);
    }
  });

  handleLocation(); // İlk yüklemede doğru sayfayı göster
}