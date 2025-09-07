# Istenildiği gibi Node.js'in 20 versiyonunu temel alıyoruz.
FROM node:20

# Konteyner içinde çalışacağımız dizini belirliyoruz.
WORKDIR /usr/src/app

# package.json ve package-lock.json dosyalarını kopyalıyoruz.
# Bu, sadece bağımlılıklar değiştiğinde "npm install" komutunun tekrar çalışmasını sağlar,
# her kod değişikliğinde değil. Bu da build süresini hızlandırır.
COPY package*.json ./

# Proje bağımlılıklarını kuruyoruz.
RUN npm install

# Proje kaynak kodunu konteynere kopyalıyoruz.
COPY . .

# Uygulamayı başlatacak olan komutu belirtiyoruz.
# "npm run dev" komutu ile nodemon'u çalıştıracağız.
CMD ["npm", "run", "dev"]