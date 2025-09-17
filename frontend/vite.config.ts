import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    hmr: {
      // Vite'in HMR bağlantısı için özel bir yol tanımlıyoruz.
      // Tarayıcı artık wss://localhost/vite-hmr adresine bağlanmaya çalışacak.
      path: '/vite-hmr'
    }
  }
})