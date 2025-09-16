# backend/Dockerfile

# Istenildiği gibi Node.js'in 20 versiyonunu temel alıyoruz.
FROM node:20

# Konteyner içinde çalışacağımız dizini belirliyoruz.
WORKDIR /usr/src/app

# Sadece bağımlılıkları yüklemek için package.json dosyasını kopyala
COPY package*.json ./

# Proje bağımlılıklarını kuruyoruz.
RUN npm install

# --- YENİ VE KRİTİK ADIM ---
# Prisma şemasını kopyala
COPY ./prisma ./prisma/

# "Terziyi çağır": Prisma Client'ı şemaya göre oluştur.
RUN npx prisma generate
# -----------------------------

# Proje kaynak kodunun geri kalanını konteynere kopyalıyoruz.
COPY . .

# Uygulamayı başlatacak olan komutu belirtiyoruz.
CMD ["npm", "run", "dev"]