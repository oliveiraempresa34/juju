#!/bin/bash

# Script de deploy completo (servidor + cliente)
# Uso: ./deploy-full.sh [--server-only|--client-only]

set -e  # Exit on error

echo "🚀 Iniciando deploy completo do Drift Cash..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Diretório do projeto
PROJECT_DIR="/root/drifrr"

# Flags
DEPLOY_SERVER=true
DEPLOY_CLIENT=true

# Parse argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --server-only)
            DEPLOY_CLIENT=false
            shift
            ;;
        --client-only)
            DEPLOY_SERVER=false
            shift
            ;;
        *)
            echo -e "${RED}❌ Argumento desconhecido: $1${NC}"
            echo "Uso: ./deploy-full.sh [--server-only|--client-only]"
            exit 1
            ;;
    esac
done

# Verificar se está no diretório correto
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Diretório do projeto não encontrado: $PROJECT_DIR${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

# Timestamp do deploy
DEPLOY_TIME=$(date '+%Y-%m-%d %H:%M:%S')
echo -e "${BLUE}📅 Deploy iniciado em: $DEPLOY_TIME${NC}"
echo ""

# Deploy do servidor
if [ "$DEPLOY_SERVER" = true ]; then
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}   DEPLOY DO SERVIDOR${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"

    if [ -f "./deploy-server.sh" ]; then
        bash ./deploy-server.sh
    else
        echo -e "${RED}❌ Script deploy-server.sh não encontrado${NC}"
        exit 1
    fi
    echo ""
fi

# Deploy do cliente
if [ "$DEPLOY_CLIENT" = true ]; then
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}   DEPLOY DO CLIENTE${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"

    if [ -f "./deploy-client.sh" ]; then
        bash ./deploy-client.sh
    else
        echo -e "${RED}❌ Script deploy-client.sh não encontrado${NC}"
        exit 1
    fi
    echo ""
fi

# Resumo final
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✨ DEPLOY COMPLETO FINALIZADO! ✨${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📋 Próximos passos:${NC}"

if [ "$DEPLOY_CLIENT" = true ]; then
    echo -e "${YELLOW}  1. Limpe o cache do navegador (Ctrl+Shift+R)${NC}"
    echo -e "${YELLOW}  2. Verifique se a logo atualizou${NC}"
fi

if [ "$DEPLOY_SERVER" = true ]; then
    echo -e "${YELLOW}  3. Verifique os logs do servidor${NC}"
    echo -e "${YELLOW}  4. Teste a física multiplayer${NC}"
fi

echo ""
echo -e "${GREEN}✅ Deploy finalizado em: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
