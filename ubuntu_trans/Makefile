# Makefile for ft_transcendence project management

# .PHONY, bu hedeflerin birer dosya olmadığını, komut olduğunu belirtir.
.PHONY: up stop down db links start

# Projeyi her seferinde temiz bir şekilde yeniden kurar ve başlatır.
# Bu hedef, önce 'down' hedefini çalıştırarak temizlik yapar.
up: down
	@echo "Starting containers with a fresh build..."
	docker compose up --build -d

# Arka planda çalışan konteynerleri sadece durdurur (silmez).
stop:
	@echo "Stopping running containers..."
	docker compose stop

# Projeyi durdurur ve oluşturulan konteyner/ağ/volümleri tamamen temizler.
down:
	@echo "Stopping and removing all project containers, networks, and volumes..."
	docker compose down --volumes

# Veritabanını sıfırlar (tüm verileri siler).
db:
	docker compose exec backend npx prisma migrate reset --force

# Ağ ve yerel erişim linklerini gösterir.
links:
	@echo "for network: http://$$(hostname -I | awk '{print $$1}'):5173"
	@echo "for local:   http://localhost:5173"

# Projeyi ilk kez kurmak için frontend ve backend bağımlılıklarını yükler.
# DİKKAT: Bu komut, yerel makinede Node.js'in doğru sürümünün yüklü olmasını gerektirir.
# Sunum ortamında kullanılması tavsiye edilmez. 'make up' yeterlidir.
start:
	@echo "Installing backend dependencies..."
	(cd backend && npm install)
	@echo "Installing frontend dependencies..."
	(cd frontend && npm install)
	@echo "Setup complete! You can now run 'make up'."

