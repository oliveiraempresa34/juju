#!/bin/bash
# ============================================================
# JUJU DRIFT v2.0.0 - INSTALAÇÃO COMPLETA
# ============================================================
# Execute este script para instalar todas as dependências
# e configurar o projeto do zero.
#
# Uso: chmod +x INSTALL-COMMANDS.sh && ./INSTALL-COMMANDS.sh
# ============================================================

set -e  # Exit on error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          JUJU DRIFT v2.0.0 - INSTALAÇÃO                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================
# 1. VERIFICAR PRÉ-REQUISITOS
# ============================================================

echo -e "${YELLOW}[1/8] Verificando pré-requisitos...${NC}"

# Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado! Instale Node.js 18+ antes de continuar.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js versão >= 18 necessária. Versão atual: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm não encontrado!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm -v)${NC}"

# Docker (opcional)
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker $(docker -v | cut -d' ' -f3 | cut -d',' -f1)${NC}"
    USE_DOCKER=true
else
    echo -e "${YELLOW}⚠️  Docker não encontrado. PostgreSQL local será usado.${NC}"
    USE_DOCKER=false
fi

# PostgreSQL (se não usar Docker)
if [ "$USE_DOCKER" = false ]; then
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}❌ PostgreSQL não encontrado! Instale PostgreSQL 15+ ou Docker.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ PostgreSQL $(psql --version | cut -d' ' -f3)${NC}"
fi

# ============================================================
# 2. SETUP POSTGRESQL
# ============================================================

echo -e "${YELLOW}[2/8] Configurando PostgreSQL...${NC}"

if [ "$USE_DOCKER" = true ]; then
    # Verificar se container já existe
    if docker ps -a | grep -q juju-postgres; then
        echo "Container PostgreSQL já existe. Removendo..."
        docker stop juju-postgres || true
        docker rm juju-postgres || true
    fi

    # Criar novo container
    docker run --name juju-postgres \
      -e POSTGRES_PASSWORD=dev_password \
      -e POSTGRES_DB=juju_drift \
      -e POSTGRES_USER=postgres \
      -p 5432:5432 \
      -v juju_db_data:/var/lib/postgresql/data \
      -d postgres:15-alpine

    echo -e "${GREEN}✅ PostgreSQL container criado${NC}"

    # Aguardar PostgreSQL iniciar
    echo "Aguardando PostgreSQL iniciar..."
    sleep 5

    DATABASE_URL="postgresql://postgres:dev_password@localhost:5432/juju_drift?schema=public"
else
    # Usar PostgreSQL local
    echo "Criando database juju_drift..."
    sudo -u postgres psql <<EOF
DROP DATABASE IF EXISTS juju_drift;
CREATE DATABASE juju_drift;
\q
EOF

    echo "Digite a senha do usuário postgres para DATABASE_URL:"
    read -s POSTGRES_PASSWORD

    DATABASE_URL="postgresql://postgres:$POSTGRES_PASSWORD@localhost:5432/juju_drift?schema=public"
fi

# ============================================================
# 3. SERVER - INSTALAÇÃO DE DEPENDÊNCIAS
# ============================================================

echo -e "${YELLOW}[3/8] Instalando dependências do servidor...${NC}"

cd server

# Verificar se package.json existe
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ server/package.json não encontrado!${NC}"
    exit 1
fi

# Instalar dependências principais
npm install --save \
  @prisma/client \
  prisma \
  zod \
  multer \
  @aws-sdk/client-s3 \
  @aws-sdk/s3-request-presigner \
  cloudinary

# Instalar dependências de dev
npm install --save-dev \
  @types/multer

echo -e "${GREEN}✅ Dependências do servidor instaladas${NC}"

# ============================================================
# 4. SERVER - CONFIGURAÇÃO .env
# ============================================================

echo -e "${YELLOW}[4/8] Configurando server/.env...${NC}"

# Copiar .env.example se .env não existir
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "Arquivo .env criado a partir de .env.example"
    else
        echo -e "${RED}❌ .env.example não encontrado!${NC}"
        exit 1
    fi
fi

# Gerar JWT_SECRET
JWT_SECRET=$(openssl rand -base64 64)

# Atualizar .env
sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" .env
sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
sed -i.bak "s|^NODE_ENV=.*|NODE_ENV=development|" .env
sed -i.bak "s|^UPLOAD_PROVIDER=.*|UPLOAD_PROVIDER=LOCAL|" .env

echo -e "${GREEN}✅ server/.env configurado${NC}"

# ============================================================
# 5. SERVER - PRISMA SETUP
# ============================================================

echo -e "${YELLOW}[5/8] Configurando Prisma e executando migrations...${NC}"

# Gerar Prisma Client
npx prisma generate

# Executar migrations
npx prisma migrate dev --name init --skip-seed

# Build do servidor
npm run build

echo -e "${GREEN}✅ Prisma configurado e servidor compilado${NC}"

# ============================================================
# 6. SERVER - SEED DADOS INICIAIS
# ============================================================

echo -e "${YELLOW}[6/8] Inserindo dados iniciais...${NC}"

# Seed via node
node <<'EOF'
const { getDatabaseInstance } = require('./dist/database/Database.js');

async function seed() {
  const db = getDatabaseInstance();
  try {
    await db.connect();
    console.log('Conectado ao banco de dados');
    await db.seedInitialData();
    console.log('Dados iniciais inseridos com sucesso');
    await db.disconnect();
  } catch (error) {
    console.error('Erro ao inserir dados:', error);
    process.exit(1);
  }
}

seed();
EOF

echo -e "${GREEN}✅ Dados iniciais inseridos${NC}"

# ============================================================
# 7. CLIENT - INSTALAÇÃO DE DEPENDÊNCIAS
# ============================================================

echo -e "${YELLOW}[7/8] Instalando dependências do cliente...${NC}"

cd ../client

# Verificar se package.json existe
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ client/package.json não encontrado!${NC}"
    exit 1
fi

# Instalar dependências de dev
npm install --save-dev \
  rollup-plugin-visualizer \
  vite-plugin-compression2

# Instalar todas dependências
npm install

echo -e "${GREEN}✅ Dependências do cliente instaladas${NC}"

# ============================================================
# 8. CLIENT - CONFIGURAÇÃO .env
# ============================================================

echo -e "${YELLOW}[8/8] Configurando client/.env.development...${NC}"

# Copiar .env.example se .env.development não existir
if [ ! -f ".env.development" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env.development
        echo "Arquivo .env.development criado a partir de .env.example"
    else
        echo -e "${YELLOW}⚠️  .env.example não encontrado. Criando .env.development...${NC}"
        cat > .env.development <<'ENVEOF'
VITE_WS_URL=ws://localhost:2567
VITE_API_URL=http://localhost:2567
NODE_ENV=development
ENVEOF
    fi
fi

# Atualizar .env.development
sed -i.bak "s|^VITE_WS_URL=.*|VITE_WS_URL=ws://localhost:2567|" .env.development
sed -i.bak "s|^VITE_API_URL=.*|VITE_API_URL=http://localhost:2567|" .env.development
sed -i.bak "s|^NODE_ENV=.*|NODE_ENV=development|" .env.development

echo -e "${GREEN}✅ client/.env.development configurado${NC}"

# Build do cliente (opcional)
# npm run build

# ============================================================
# FINALIZAÇÃO
# ============================================================

cd ..

echo ""
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO! 🎉         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo "Para iniciar o projeto:"
echo ""
echo -e "${YELLOW}Terminal 1 (Servidor):${NC}"
echo "  cd server"
echo "  npm run dev"
echo ""
echo -e "${YELLOW}Terminal 2 (Cliente):${NC}"
echo "  cd client"
echo "  npm run dev"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Credenciais admin padrão:${NC}"
echo "  Username: admin"
echo "  Email: admin@driftcash.com"
echo "  Password: Admin@123456"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Ferramentas úteis:${NC}"
echo "  Prisma Studio:    cd server && npx prisma studio"
echo "  Bundle Analyzer:  cd client && ANALYZE=true npm run build"
echo "  Logs do Server:   cd server && npm run dev (logs no terminal)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}Database:${NC}"
echo "  Host: localhost:5432"
echo "  Database: juju_drift"
echo "  User: postgres"
echo "  Password: dev_password (se Docker)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Documentação:${NC}"
echo "  CHANGELOG-FIXES.md      - Detalhes de todas mudanças"
echo "  DEPLOY-CHECKLIST.md     - Checklist de produção"
echo "  ROLLBACK-PLANS.md       - Planos de rollback"
echo "  INSTALLATION-GUIDE.md   - Guia completo de instalação"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "  1. NUNCA commite o arquivo .env no git"
echo "  2. Altere a senha do admin padrão após primeiro login"
echo "  3. Configure upload provider (S3/Cloudinary) antes de produção"
echo "  4. Gere novo JWT_SECRET para produção"
echo ""
echo "Boa sorte! 🚀"
echo ""
