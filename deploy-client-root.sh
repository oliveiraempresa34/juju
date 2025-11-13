#!/bin/bash

# Script de deploy do cliente com permissões root
# Uso: sudo ./deploy-client-root.sh

set -e  # Exit on error

echo "🚀 Iniciando deploy do cliente (com permissões root)..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Diretório do projeto
PROJECT_DIR="/root/drifrr"
CLIENT_DIR="$PROJECT_DIR/client"

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Este script precisa ser executado como root${NC}"
    echo -e "${YELLOW}💡 Use: sudo ./deploy-client-root.sh${NC}"
    exit 1
fi

# Verificar se está no diretório correto
if [ ! -d "$CLIENT_DIR" ]; then
    echo -e "${RED}❌ Diretório do cliente não encontrado: $CLIENT_DIR${NC}"
    exit 1
fi

cd "$CLIENT_DIR"

# Limpar dist anterior (com força total)
echo -e "${YELLOW}🧹 Limpando build anterior...${NC}"
rm -rf dist

# Build com timestamp para cache busting
echo -e "${YELLOW}🔨 Compilando cliente (TypeScript + Vite)...${NC}"
echo -e "${YELLOW}⏳ Este processo pode levar 10-15 minutos...${NC}"

# Exportar versão do build (timestamp)
export VITE_BUILD_VERSION=$(date +%s)
echo -e "${YELLOW}📝 Build version: $VITE_BUILD_VERSION${NC}"

# Executar build
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build do cliente concluído com sucesso!${NC}"
    echo -e "${GREEN}📦 Localização: $CLIENT_DIR/dist${NC}"

    # Ajustar permissões para evitar problemas futuros
    echo -e "${YELLOW}🔧 Ajustando permissões do dist...${NC}"
    chown -R developer:developer dist
    chmod -R 755 dist

    # Mostrar tamanho do build
    BUILD_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
    echo -e "${GREEN}📊 Tamanho do build: $BUILD_SIZE${NC}"

    # Listar arquivos principais
    echo -e "${YELLOW}📄 Arquivos principais:${NC}"
    ls -lh dist/*.html dist/*.webp 2>/dev/null | awk '{print "  " $9 " - " $5}'
else
    echo -e "${RED}❌ Erro no build do cliente${NC}"
    exit 1
fi

echo -e "${GREEN}✨ Deploy do cliente finalizado!${NC}"
echo -e "${YELLOW}💡 Dica: Limpe o cache do navegador (Ctrl+Shift+R) para ver as mudanças${NC}"
