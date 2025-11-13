#!/bin/bash
set -e

echo "🚀 Iniciando deploy do Drift Cash..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Build do servidor
echo -e "${BLUE}📦 Compilando servidor...${NC}"
cd /root/drifrr/server
npm run build

# 2. Build do cliente
echo -e "${BLUE}📦 Compilando cliente...${NC}"
cd /root/drifrr/client
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 3. Backup do site atual
echo -e "${YELLOW}💾 Fazendo backup...${NC}"
BACKUP_DIR="/var/www/driftcash_backup_$(date +%Y%m%d_%H%M%S)"
cp -r /var/www/driftcash "$BACKUP_DIR"
echo -e "${GREEN}✅ Backup salvo em: $BACKUP_DIR${NC}"

# 4. Deploy dos arquivos
echo -e "${BLUE}🚚 Copiando arquivos para /var/www/driftcash...${NC}"
rm -rf /var/www/driftcash/assets
cp -r /root/drifrr/client/dist/* /var/www/driftcash/

# 5. Reiniciar servidor
echo -e "${BLUE}🔄 Reiniciando servidor...${NC}"
pm2 restart drift-server

# 6. Recarregar Nginx
echo -e "${BLUE}🔄 Recarregando Nginx...${NC}"
nginx -t && systemctl reload nginx

echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo ""
echo "📊 Status dos serviços:"
pm2 list
echo ""
echo "🌐 Site disponível em:"
echo "  - http://driftcash.com"
echo "  - http://144.217.195.14"
echo "  - http://144.217.195.14:8081"
