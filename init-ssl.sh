if [ -f "nginx/ssl/self-signed.crt" ]; then
	echo "SSL certificate already exists. Skipping generation."
	exit 0
fi

echo "SSL certificate not found. Generating a new one..."

mkdir -p nginx/ssl

LOCAL_IP=$(hostname -I | awk '{print $1}')

if [ -z "$LOCAL_IP" ]; then
	echo "Could not automatically determine local IP address. Please set it manually in nginx/ssl/cert.conf"
	exit 1
fi

echo "Detected local IP: $LOCAL_IP"

cat > nginx/ssl/cert.conf <<EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no
[req_distinguished_name]
C = TR
ST = Istanbul
L = Istanbul
O = TranscendenceDev
OU = Development
CN = localhost
[v3_req]
subjectAltName = @alt_names
[alt_names]
DNS.1 = localhost
IP.1 = $LOCAL_IP
EOF

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
	-keyout nginx/ssl/self-signed.key \
	-out nginx/ssl/self-signed.crt \
	-config nginx/ssl/cert.conf

rm nginx/ssl/cert.conf

echo "SSL certificate generated successfully for localhost and $LOCAL_IP"