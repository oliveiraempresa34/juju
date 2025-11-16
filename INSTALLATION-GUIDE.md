# 🚀 GUIA DE INSTALAÇÃO - JUJU DRIFT v2.0.0

**Projeto:** Juju Drift Multiplayer Game
**Versão:** 2.0.0 (Refatoração Completa)
**Data:** 2025-11-16

---

## 📊 RESUMO EXECUTIVO - 10 AÇÕES IMEDIATAS

### 🔴 AÇÕES CRÍTICAS (Execute AGORA)

1. **Instalar PostgreSQL 15+**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql-15 postgresql-contrib-15

   # Via Docker (recomendado para dev)
   docker run --name juju-postgres \
     -e POSTGRES_PASSWORD=dev_password \
     -e POSTGRES_DB=juju_drift \
     -p 5432:5432 \
     -v juju_db_data:/var/lib/postgresql/data \
     -d postgres:15-alpine
   ```

2. **Gerar JWT_SECRET seguro**
   ```bash
   # Gerar secret
   JWT_SECRET=$(openssl rand -base64 64)

   # Adicionar ao .env
   echo "JWT_SECRET=$JWT_SECRET" >> server/.env
   ```

3. **Instalar dependências do Server**
   ```bash
   cd server
   npm install --save @prisma/client prisma zod multer \
     @aws-sdk/client-s3 @aws-sdk/s3-request-presigner cloudinary
   npm install --save-dev @types/multer
   ```

4. **Configurar DATABASE_URL**
   ```bash
   # server/.env
   DATABASE_URL=postgresql://postgres:dev_password@localhost:5432/juju_drift?schema=public
   ```

5. **Executar Migrations**
   ```bash
   cd server
   npx prisma generate
   npx prisma migrate dev --name init
   ```

### 🟠 AÇÕES DE ALTA PRIORIDADE (Execute hoje)

6. **Atualizar Vite Config e dependências do Client**
   ```bash
   cd client
   npm install --save-dev rollup-plugin-visualizer vite-plugin-compression2
   ```

7. **Configurar upload provider (escolha um)**
   ```bash
   # Opção A: S3 (produção recomendada)
   # server/.env:
   UPLOAD_PROVIDER=S3
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_S3_BUCKET=juju-drift-avatars

   # Opção B: Cloudinary
   UPLOAD_PROVIDER=CLOUDINARY
   CLOUDINARY_CLOUD_NAME=your_cloud
   CLOUDINARY_API_KEY=your_key
   CLOUDINARY_API_SECRET=your_secret

   # Opção C: Local (apenas dev)
   UPLOAD_PROVIDER=LOCAL
   ```

8. **Seed database com dados iniciais**
   ```bash
   cd server
   npm run build
   node -e "const {getDatabaseInstance}=require('./dist/database/Database.js'); const db=getDatabaseInstance(); db.connect().then(()=>db.seedInitialData()).then(()=>db.disconnect());"
   ```

### 🟡 AÇÕES RECOMENDADAS (Execute esta semana)

9. **Configurar ambiente de staging**
   - Criar database separado
   - Configurar variáveis ENV de staging
   - Testar fluxo completo antes de produção

10. **Configurar monitoramento e backups**
    ```bash
    # Backup diário automático (cron)
    0 3 * * * pg_dump -U postgres juju_drift > /backups/juju_$(date +\%Y\%m\%d).sql

    # Configurar Sentry (opcional)
    # server/.env:
    SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
    ```

---

## 📦 INSTALAÇÃO COMPLETA PASSO A PASSO

### Pré-requisitos

- ✅ Node.js 18+ e npm 9+
- ✅ PostgreSQL 15+
- ✅ Git
- ✅ (Opcional) Docker para PostgreSQL local

### 1. Setup do Repositório

```bash
# Clone o projeto
git clone https://github.com/seu-usuario/juju.git
cd juju

# Checkout para branch correta (se aplicável)
git checkout claude/colyseus-security-refactor-01XTfYGQoPvsWiyWkmZWTA2j
```

### 2. Setup PostgreSQL

#### Opção A: Docker (Recomendado para Desenvolvimento)

```bash
# Iniciar container PostgreSQL
docker run --name juju-postgres \
  -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=juju_drift \
  -e POSTGRES_USER=postgres \
  -p 5432:5432 \
  -v juju_db_data:/var/lib/postgresql/data \
  -d postgres:15-alpine

# Verificar status
docker ps | grep juju-postgres

# Acessar psql
docker exec -it juju-postgres psql -U postgres -d juju_drift
```

#### Opção B: Instalação Nativa (Ubuntu/Debian)

```bash
# Instalar PostgreSQL
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15

# Iniciar serviço
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Criar database
sudo -u postgres psql <<EOF
CREATE DATABASE juju_drift;
CREATE USER juju_user WITH PASSWORD 'sua_senha_forte';
GRANT ALL PRIVILEGES ON DATABASE juju_drift TO juju_user;
\q
EOF
```

#### Opção C: Instalação Nativa (macOS)

```bash
# Via Homebrew
brew install postgresql@15

# Iniciar serviço
brew services start postgresql@15

# Criar database
psql postgres <<EOF
CREATE DATABASE juju_drift;
\q
EOF
```

### 3. Setup do Backend (Server)

```bash
cd server

# Copiar exemplo de .env
cp .env.example .env

# Editar .env (IMPORTANTE!)
nano .env

# Preencher variáveis obrigatórias:
# - DATABASE_URL
# - JWT_SECRET
# - Demais conforme necessidade

# Instalar dependências
npm install

# Gerar Prisma Client
npx prisma generate

# Executar migrations
npx prisma migrate dev --name init

# Verificar schema (abre interface web)
npx prisma studio

# Build do TypeScript
npm run build

# (Opcional) Seed dados iniciais
npm run seed
```

#### Variáveis ENV Obrigatórias (server/.env)

```env
# OBRIGATÓRIO
DATABASE_URL=postgresql://postgres:dev_password@localhost:5432/juju_drift?schema=public
JWT_SECRET=<usar_openssl_rand_-base64_64>
NODE_ENV=development

# RECOMENDADO
PORT=2567
FRONTEND_URL=http://localhost:5173
UPLOAD_PROVIDER=LOCAL

# OPCIONAL (preencher conforme necessidade)
# AWS_* (se usar S3)
# CLOUDINARY_* (se usar Cloudinary)
# MP_* (se usar Mercado Pago)
```

### 4. Setup do Frontend (Client)

```bash
cd client

# Copiar exemplo de .env
cp .env.example .env.development

# Editar .env.development
nano .env.development

# Preencher variáveis:
VITE_WS_URL=ws://localhost:2567
VITE_API_URL=http://localhost:2567

# Instalar dependências
npm install

# Build (produção)
npm run build

# OU executar em modo dev
npm run dev
```

### 5. Verificação e Testes

```bash
# Terminal 1: Iniciar servidor
cd server
npm run dev
# Deve exibir: "Server listening on ws://localhost:2567"

# Terminal 2: Iniciar cliente
cd client
npm run dev
# Deve exibir: "Local: http://localhost:5173"

# Terminal 3: Testar endpoints
curl http://localhost:2567/health
# Deve retornar: {"status":"ok"}

# Testar registro
curl -X POST http://localhost:2567/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser",
    "email":"test@example.com",
    "password":"Test@123456"
  }'

# Testar login
curl -X POST http://localhost:2567/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser",
    "password":"Test@123456"
  }'
```

---

## 🔧 DEPENDÊNCIAS COMPLETAS

### Server (package.json)

```json
{
  "dependencies": {
    "@colyseus/schema": "^2.0.12",
    "@colyseus/ws-transport": "^0.15.3",
    "@prisma/client": "^5.7.0",
    "bcrypt": "^6.0.0",
    "colyseus": "^0.15.17",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "express-rate-limit": "^8.1.0",
    "express-validator": "^7.2.1",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "@aws-sdk/client-s3": "^3.470.0",
    "@aws-sdk/s3-request-presigner": "^3.470.0",
    "cloudinary": "^1.41.0",
    "zod": "^3.22.0",
    "winston": "^3.18.3"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.10.0",
    "prisma": "^5.7.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.4.5",
    "jest": "^30.2.0",
    "ts-jest": "^29.1.1",
    "@types/jest": "^29.5.11"
  },
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "seed": "ts-node scripts/seed.ts"
  }
}
```

### Client (package.json)

```json
{
  "dependencies": {
    "@babylonjs/core": "^7.0.0",
    "colyseus.js": "^0.15.15",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.30.1",
    "zustand": "^4.5.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.4.5",
    "vite": "^5.0.0",
    "rollup-plugin-visualizer": "^5.11.0",
    "vite-plugin-compression2": "^0.11.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "analyze": "ANALYZE=true vite build"
  }
}
```

---

## 🔄 COMANDOS DE INSTALAÇÃO RÁPIDA

### Script Completo de Instalação

```bash
#!/bin/bash
# install.sh - Instalação automatizada Juju Drift v2.0.0

set -e  # Exit on error

echo "🚀 Instalando Juju Drift v2.0.0..."

# 1. PostgreSQL via Docker
echo "1. Iniciando PostgreSQL..."
docker run --name juju-postgres \
  -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=juju_drift \
  -p 5432:5432 \
  -v juju_db_data:/var/lib/postgresql/data \
  -d postgres:15-alpine || echo "PostgreSQL já rodando"

# 2. Aguardar PostgreSQL iniciar
echo "2. Aguardando PostgreSQL..."
sleep 5

# 3. Server setup
echo "3. Configurando servidor..."
cd server

cp .env.example .env
sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:dev_password@localhost:5432/juju_drift?schema=public|" .env
sed -i "s|JWT_SECRET=.*|JWT_SECRET=$(openssl rand -base64 64)|" .env

npm install
npx prisma generate
npx prisma migrate dev --name init
npm run build

echo "✅ Servidor configurado"

# 4. Client setup
echo "4. Configurando cliente..."
cd ../client

cp .env.example .env.development
sed -i "s|VITE_WS_URL=.*|VITE_WS_URL=ws://localhost:2567|" .env.development
sed -i "s|VITE_API_URL=.*|VITE_API_URL=http://localhost:2567|" .env.development

npm install
npm run build

echo "✅ Cliente configurado"

# 5. Seed
echo "5. Adicionando dados iniciais..."
cd ../server
node -e "const {getDatabaseInstance}=require('./dist/database/Database.js'); const db=getDatabaseInstance(); db.connect().then(()=>db.seedInitialData()).then(()=>db.disconnect());"

echo "✅ Dados iniciais adicionados"

# 6. Finalizar
echo ""
echo "🎉 INSTALAÇÃO CONCLUÍDA!"
echo ""
echo "Para iniciar:"
echo "  Terminal 1: cd server && npm run dev"
echo "  Terminal 2: cd client && npm run dev"
echo ""
echo "Credenciais admin padrão:"
echo "  Username: admin"
echo "  Password: Admin@123456"
echo ""
echo "Prisma Studio: npx prisma studio (em server/)"
echo ""
```

### Executar Script

```bash
chmod +x install.sh
./install.sh
```

---

## 🐛 TROUBLESHOOTING

### Problema: "JWT_SECRET validation failed"

**Solução:**
```bash
# Gerar novo secret
openssl rand -base64 64

# Adicionar ao .env
echo "JWT_SECRET=<secret_aqui>" >> server/.env
```

### Problema: "Cannot connect to PostgreSQL"

**Solução:**
```bash
# Verificar se PostgreSQL está rodando
docker ps | grep postgres
# ou
sudo systemctl status postgresql

# Testar conexão
psql -U postgres -h localhost -d juju_drift

# Verificar DATABASE_URL no .env
cat server/.env | grep DATABASE_URL
```

### Problema: "Prisma migration failed"

**Solução:**
```bash
# Resetar database (CUIDADO: deleta dados)
npx prisma migrate reset

# Ou criar novo database
psql -U postgres -c "DROP DATABASE juju_drift; CREATE DATABASE juju_drift;"

# Executar migrations novamente
npx prisma migrate dev --name init
```

### Problema: "Module not found" no servidor

**Solução:**
```bash
cd server

# Limpar cache
rm -rf node_modules package-lock.json dist/

# Reinstalar
npm install
npm run build
```

### Problema: Frontend não conecta ao backend

**Solução:**
```bash
# Verificar se servidor está rodando
curl http://localhost:2567/health

# Verificar CORS no server/.env
grep FRONTEND_URL server/.env
# Deve incluir http://localhost:5173

# Verificar variáveis do cliente
cat client/.env.development
```

---

## 📞 SUPORTE

- **Documentação:** Ver `CHANGELOG-FIXES.md` para detalhes de mudanças
- **Deploy:** Ver `DEPLOY-CHECKLIST.md` para checklist de produção
- **Rollback:** Ver `ROLLBACK-PLANS.md` em caso de problemas

**Boa sorte! 🚀**

---

**Última atualização:** 2025-11-16
