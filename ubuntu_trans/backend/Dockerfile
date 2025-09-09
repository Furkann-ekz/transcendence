# backend/Dockerfile (DÜZELTİLMİŞ)
FROM node:20

WORKDIR /usr/src/app

# Önce sadece package.json'ları kopyala. Bu, Docker'ın build cache'ini
# daha verimli kullanmasını sağlar.
COPY package*.json ./

# Proje bağımlılıklarını kur.
RUN npm install

# YENİ: Prisma Client'ı oluşturmak için bu komut zorunludur.
# Bu komut, schema.prisma'yı okuyabilmek için o dosya kopyalandıktan SONRA çalışmalıdır.
# Bu yüzden, tüm kaynak kodunu şimdi kopyalıyoruz.
COPY . .
RUN npx prisma generate

# Uygulamayı başlat.
CMD ["npm", "run", "dev"]