# Makefile for ft_transcendence project management

# .PHONY, bu hedeflerin birer dosya olmadığını, komut olduğunu belirtir.
.PHONY: all up stop down clean db links start check-env init-ssl

# 'make' komutu tek başına çalıştırıldığında 'up' hedefini çağırır.
all: up

init-ssl:
	@sh ./init-ssl.sh

# YENİ VE GELİŞMİŞ "UP" KOMUTU
# Projeyi sıfırdan kurar, başlatır ve veritabanını sıfırlar.
up: check-env init-ssl clean
	@echo "--- Starting containers with a fresh build... ---"
	docker compose up --build -d
	@echo "--- Waiting for containers to initialize... ---"
	@sleep 3 # Konteynerlerin tam olarak başlaması için 3 saniye bekle
	@echo "--- Initializing database... ---"

# Arka planda çalışan konteynerleri sadece durdurur (silmez).
stop:
	@echo "--- Stopping running containers... ---"
	docker compose stop

# Projeyi durdurur ve docker-compose tarafından yönetilen her şeyi temizler.
down:
	@echo "--- Stopping and removing containers, networks, and volumes... ---"
	docker compose down --volumes --remove-orphans

# Projeyle ilgili olabilecek tüm "hayalet" konteynerleri zorla temizler.
clean: down
	@echo "--- Forcibly removing any lingering containers... ---"
	@docker ps -a -q --filter "name=transcendence_backend" | xargs -r docker rm -f || true
	@docker ps -a -q --filter "name=transcendence_frontend" | xargs -r docker rm -f || true
	
remove:
	@(cd backend && rm -rf node_modules package-lock.json)
	@(cd frontend && rm -rf node_modules package-lock.json)

# Veritabanını sıfırlar (tüm verileri siler).
db:
	@echo "--- Resetting database inside the container... ---"
	docker compose exec backend npx prisma migrate reset --force

migrate:
	@echo "--- Applying new migrations inside the container... ---"
	docker compose exec backend npx prisma migrate dev

# Ağ ve yerel erişim linklerini gösterir.
links:
	@echo "for network: https://$$(hostname -I | awk '{print $$1}')"
	@echo "for local:   https://localhost"

# YENİ YARDIMCI HEDEF: .env dosyasını kontrol eder ve gerekirse oluşturur.
check-env:
	@if [ ! -f backend/.env ]; then \
		echo "--- .env file not found. Creating from .env.example... ---"; \
		cp backend/.env.example backend/.env; \
	fi

# Projeyi ilk kez kurmak için host makinedeki bağımlılıkları yükler (IDE desteği için).
start:
	@echo "Installing backend dependencies on host..."
	(cd backend && npm install)
	@echo "Installing frontend dependencies on host..."
	(cd frontend && npm install)
	@echo "Host setup complete! You can now run 'make up'."