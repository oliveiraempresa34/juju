#!/bin/bash

# Script de deploy do servidor
# Uso: ./deploy-server.sh

set -e  # Exit on error

echo "🚀 Iniciando deploy do servidor..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Diretório do projeto
PROJECT_DIR="/root/drifrr"
SERVER_DIR="$PROJECT_DIR/server"

# Verificar se está no diretório correto
if [ ! -d "$SERVER_DIR" ]; then
    echo -e "${RED}❌ Diretório do servidor não encontrado: $SERVER_DIR${NC}"
    exit 1
fi

cd "$SERVER_DIR"

# Limpar dist anterior
echo -e "${YELLOW}🧹 Limpando build anterior...${NC}"
rm -rf dist

# Build
echo -e "${YELLOW}🔨 Compilando TypeScript...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build do servidor concluído com sucesso!${NC}"
    echo -e "${GREEN}📦 Localização: $SERVER_DIR/dist${NC}"

    # Mostrar tamanho do build
    BUILD_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
    echo -e "${GREEN}📊 Tamanho do build: $BUILD_SIZE${NC}"
else
    echo -e "${RED}❌ Erro no build do servidor${NC}"
    exit 1
fi

# Verificar se deve reiniciar o servidor
read -p "🔄 Deseja reiniciar o servidor agora? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    echo -e "${YELLOW}🔄 Reiniciando servidor...${NC}"
    # Adicione aqui o comando para reiniciar seu servidor
    # Exemplo: pm2 restart drift-server
    # Exemplo: systemctl restart drift-server
    echo -e "${YELLOW}⚠️  Configure o comando de restart no script${NC}"
fi

echo -e "${GREEN}✨ Deploy do servidor finalizado!${NC}"
