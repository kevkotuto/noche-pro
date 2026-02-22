#!/usr/bin/env bash
# =============================================================
# NochePro — Server Setup Script
# Server : 150.107.201.144
# Domain : noche.generale-ci.com
#
# Usage : ssh root@150.107.201.144 'bash -s' < scripts/setup-server.sh
# =============================================================
set -euo pipefail

DOMAIN="noche.generale-ci.com"
WEBROOT="/var/www/noche"
NGINX_CONF="/etc/nginx/sites-available/noche"

echo "🚀 Setting up NochePro server..."

# ── System update ─────────────────────────────
apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx curl

# ── Web root ──────────────────────────────────
mkdir -p "$WEBROOT/releases"
chown -R www-data:www-data "$WEBROOT"

# ── nginx config ──────────────────────────────
cat > "$NGINX_CONF" <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name noche.generale-ci.com;

    root /var/www/noche;
    index index.html;

    # Landing page
    location = / {
        try_files /index.html =404;
    }

    # Release files (installers, update manifests)
    location /releases/ {
        autoindex off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";

        # MIME types for electron-updater
        types {
            application/octet-stream      exe dmg zip;
            text/yaml                     yml yaml;
        }

        try_files $uri =404;
    }

    # Fallback
    location / {
        try_files $uri $uri/ =404;
    }

    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/noche
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl restart nginx

# ── SSL via Let's Encrypt ──────────────────────
echo "🔒 Obtaining SSL certificate for $DOMAIN..."
certbot --nginx \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email admin@generale-ci.com \
  --redirect

# ── Firewall ──────────────────────────────────
if command -v ufw &>/dev/null; then
  ufw allow 'Nginx Full'
  ufw allow OpenSSH
  ufw --force enable
fi

# ── Cron: auto-renew SSL ───────────────────────
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -

echo ""
echo "✅ Server setup complete!"
echo "   Landing page : https://$DOMAIN"
echo "   Releases dir : https://$DOMAIN/releases/"
echo ""
echo "Next: Add GitHub secrets to your repo:"
echo "  SSH_HOST        = 150.107.201.144"
echo "  SSH_USER        = root"
echo "  SSH_PRIVATE_KEY = (your private key content)"
