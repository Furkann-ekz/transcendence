# Makefile for ft_transcendence project management

# Projeyi arka planda başlatır ve imajları yeniden oluşturur.
up:
	docker compose up --build -d

# Projeyi durdurur ve oluşturulan konteyner/ağları temizler.
down:
	docker compose down

# Arka planda çalışan konteynerleri sadece durdurur (silmez).
stop:
	docker compose stop

# Veritabanını sıfırlar (tüm verileri siler).
# --force bayrağı, "Emin misin?" sorusunu sormadan işlemi yapar.
db:
	docker compose exec backend npx prisma migrate reset --force

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

# .PHONY, bu hedeflerin birer dosya olmadığını, komut olduğunu belirtir.
.PHONY: up down db links start