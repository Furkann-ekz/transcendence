# .PHONY, bu hedeflerin birer dosya olmadığını, komut olduğunu belirtir.
.PHONY: up stop down clean db links start

# Projeyi her seferinde temiz bir şekilde yeniden kurar ve başlatır.
# Bu hedef, önce 'clean' hedefini çalıştırarak tüm kalıntıları temizler.
up: clean
	@echo "Starting containers with a fresh build..."
	docker compose up --build -d

# Arka planda çalışan konteynerleri sadece durdurur (silmez).
stop:
	@echo "Stopping running containers..."
	docker compose stop

# Projeyi durdurur ve docker-compose tarafından yönetilen her şeyi temizler.
down:
	@echo "Stopping and removing project containers, networks, and volumes..."
	docker compose down --volumes

# Projeyle ilgili olabilecek tüm "hayalet" konteynerleri zorla temizler.
clean: down
	@echo "Forcibly removing any lingering containers..."
	@docker ps -a -q --filter "name=transcendence_backend" | xargs -r docker rm -f
	@docker ps -a -q --filter "name=transcendence_frontend" | xargs -r docker rm -f

# Veritabanını sıfırlar (tüm verileri siler).
db:
	cd backend
	npx prisma migrate reset --force
	cd ..

# Ağ ve yerel erişim linklerini gösterir.
links:
	@echo "for network: http://$$(hostname -I | awk '{print $$1}'):5173"
	@echo "for local:   http://localhost:5173"

# Projeyi ilk kez kurmak için frontend ve backend bağımlılıklarını yükler.
start:
	@echo "Installing backend dependencies..."
	(cd backend && npm install)
	@echo "Installing frontend dependencies..."
	(cd frontend && npm install)
	@echo "Setup complete! You can now run 'make up'."