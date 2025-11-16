# 🔙 ROLLBACK PLANS - JUJU DRIFT

**Versão:** 2.0.0
**Data:** 2025-11-16
**Criticidade:** 🔴 ALTA

Este documento contém procedimentos detalhados para reverter cada mudança implementada na refatoração v2.0.0.

---

## ⚠️  QUANDO FAZER ROLLBACK

Execute rollback SE:
- ✅ Servidor não inicia após deploy
- ✅ Erro crítico em produção (taxa de erro > 10%)
- ✅ Perda de dados detectada
- ✅ Performance inaceitável (latência > 2s)
- ✅ Funcionalidade crítica quebrada (auth, payments, game)

NÃO execute rollback SE:
- ❌ Erro minor/cosmético (pode ser corrigido via hotfix)
- ❌ Bug isolado em feature não-crítica
- ❌ Reclamação de UX sem impacto funcional

---

## 🗄️ ROLLBACK 1: DATABASE MIGRATION (PostgreSQL → SQLite)

**Criticidade:** 🔴 CRÍTICA
**Tempo estimado:** 30-60 minutos
**Downtime:** SIM (15-30 minutos)
**Reversível:** SIM

### Pré-requisitos

- [ ] Backup completo do PostgreSQL atual
- [ ] Backup do SQLite antigo (se ainda existir)
- [ ] Código v1.x disponível no git

### Procedimento

#### 1. Parar servidor

```bash
pm2 stop juju-drift
# ou
sudo systemctl stop juju-drift
```

#### 2. Fazer backup do PostgreSQL atual

```bash
# Backup completo
pg_dump -U juju_user juju_drift > backup_postgresql_$(date +%Y%m%d_%H%M%S).sql

# Exportar dados essenciais apenas (opcional)
pg_dump -U juju_user juju_drift \
  -t users -t wallet_transactions -t payments \
  > backup_essential_$(date +%Y%m%d_%H%M%S).sql
```

#### 3. Restaurar código v1.x

```bash
cd /path/to/juju

# Verificar commits anteriores
git log --oneline | head -20

# Voltar para commit antes da migração
git checkout <commit_hash_v1>

# Ou voltar para tag
git checkout v1.0.0
```

#### 4. Reinstalar dependências antigas

```bash
cd server

# Remover node_modules e package-lock
rm -rf node_modules package-lock.json

# Reinstalar dependências v1.x
npm install

# Build
npm run build
```

#### 5. Restaurar SQLite antigo (se ainda existir)

```bash
# Se você tem backup do SQLite:
cp backup_database.sqlite database.sqlite

# Se NÃO tem, precisa migrar dados do PostgreSQL:
# Ver seção "Migração PostgreSQL → SQLite" abaixo
```

#### 6. Atualizar .env

```bash
nano server/.env

# Reverter para:
DATABASE_PATH=database.sqlite
# (Remover DATABASE_URL)
```

#### 7. Reiniciar servidor

```bash
cd server
npm start

# ou com PM2:
pm2 restart juju-drift
```

#### 8. Verificar

```bash
# Logs
pm2 logs juju-drift

# Health check
curl http://localhost:2567/health

# Testar login
curl -X POST http://localhost:2567/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"sua_senha"}'
```

### Migração PostgreSQL → SQLite (se necessário)

**⚠️  ATENÇÃO:** SQLite não suporta todos tipos do PostgreSQL. Pode haver perda de precisão.

```bash
# Script de migração (manual)
cd server

node <<'EOF'
const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://juju_user:senha@localhost:5432/juju_drift' }
  }
});

const db = new sqlite3.Database('database.sqlite');

async function migrate() {
  // 1. Criar tabelas SQLite (schema v1.x)
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      balance REAL DEFAULT 0,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ... outras tabelas ...
  });

  // 2. Migrar dados
  const users = await prisma.user.findMany();

  for (const user of users) {
    db.run(`INSERT INTO users (id, username, email, password_hash, role, balance, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.username, user.email, user.passwordHash, user.role,
       Number(user.balance), user.avatarUrl, user.createdAt]
    );
  }

  // ... migrar outras tabelas ...

  console.log('Migração concluída');
  await prisma.$disconnect();
  db.close();
}

migrate();
EOF
```

### Rollback Plan para Dados

**Opção A:** Se você tem backup SQLite antigo
```bash
cp backup_database.sqlite database.sqlite
```

**Opção B:** Se não tem, aceite perda de dados desde v2.0.0
```bash
# Criar SQLite vazio com seed data
cd server
npm run seed:v1  # (se existir script)
```

### Riscos

- 🔴 **Perda de dados:** Dados criados após v2.0.0 podem ser perdidos
- 🟠 **Downtime:** 15-30 minutos indisponibilidade
- 🟡 **Precisão:** Conversão Decimal → Float pode perder precisão

---

## 🔐 ROLLBACK 2: JWT_SECRET VALIDATION

**Criticidade:** 🟡 BAIXA
**Tempo estimado:** 5 minutos
**Downtime:** NÃO
**Reversível:** SIM

### Procedimento

#### 1. Reverter arquivo de config

```bash
cd server/src

# Opção A: Git checkout do arquivo antigo
git checkout <commit_anterior> -- src/middleware/authMiddleware.ts

# Opção B: Comentar validação manualmente
nano src/config/index.ts

# Comentar função validateJwtSecret:
/*
function validateJwtSecret(secret, nodeEnv) {
  // ... código de validação ...
}
*/

# E usar secret direto:
const auth = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-only-for-development',
  // ...
};
```

#### 2. Rebuild & restart

```bash
npm run build
pm2 restart juju-drift
```

### Riscos

- 🟡 **Segurança reduzida:** Secrets inseguros podem passar despercebidos

---

## 📤 ROLLBACK 3: UPLOAD DE AVATARES (S3/Cloudinary → Base64)

**Criticidade:** 🟠 MÉDIA
**Tempo estimado:** 15 minutos
**Downtime:** NÃO
**Reversível:** SIM

### Procedimento

#### 1. Remover endpoint de upload novo

```bash
cd server/src/routes

# Deletar arquivo novo
rm uploadRoutes.ts

# Restaurar endpoint antigo em userRoutes.ts
git checkout <commit_anterior> -- routes/userRoutes.ts
```

#### 2. Remover dependências desnecessárias

```bash
cd server
npm uninstall multer @aws-sdk/client-s3 @aws-sdk/s3-request-presigner cloudinary
```

#### 3. Atualizar .env

```bash
nano server/.env

# Remover variáveis de upload:
# (comentar ou deletar)
#UPLOAD_PROVIDER=...
#AWS_*=...
#CLOUDINARY_*=...
```

#### 4. Frontend: reverter componente

```bash
cd client/src/components

# Remover componente novo
rm AvatarUpload.tsx

# Restaurar lógica base64 antiga no componente de perfil
git checkout <commit_anterior> -- components/ProfilePanel.tsx
```

#### 5. Rebuild ambos

```bash
# Server
cd server
npm run build
pm2 restart juju-drift

# Client
cd client
npm run build
# Deploy novo build
```

### Migração de Dados (URLs → Base64)

**⚠️  NÃO RECOMENDADO:** Converter URLs de volta para base64 é complexo e pode falhar.

**Opção A:** Manter URLs existentes e aceitar novo upload via base64
```sql
-- Permitir avatarUrl com URLs ou base64
-- Nenhuma migração necessária
```

**Opção B:** Baixar imagens das URLs e converter para base64
```javascript
// Script de migração (exemplo)
const axios = require('axios');

async function migrateAvatarsToBase64() {
  const users = await db.query('SELECT id, avatar_url FROM users WHERE avatar_url IS NOT NULL');

  for (const user of users) {
    if (user.avatar_url.startsWith('http')) {
      // Baixar imagem
      const response = await axios.get(user.avatar_url, { responseType: 'arraybuffer' });
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const mimeType = response.headers['content-type'];
      const dataUrl = `data:${mimeType};base64,${base64}`;

      // Atualizar no banco
      await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [dataUrl, user.id]);
    }
  }
}
```

### Riscos

- 🟠 **Tamanho do banco:** Base64 aumenta tamanho em ~33%
- 🟡 **Performance:** Queries mais lentas com base64

---

## 📋 ROLLBACK 4: VALIDAÇÃO ZOD

**Criticidade:** 🟢 BAIXA
**Tempo estimado:** 10 minutos
**Downtime:** NÃO
**Reversível:** SIM

### Procedimento

#### 1. Remover schemas Zod

```bash
cd server/src

# Deletar arquivo de schemas
rm schemas/validation.ts
```

#### 2. Remover imports e middlewares

```bash
# Em cada arquivo de rota que usa Zod:
nano routes/userRoutes.ts

# Remover:
# import { validateBody, RegisterSchema } from '../schemas/validation';

# E remover middleware:
# router.post('/register', validateBody(RegisterSchema), async (req, res) => {
# Mudar para:
# router.post('/register', async (req, res) => {
```

#### 3. Remover dependência

```bash
cd server
npm uninstall zod
```

#### 4. Rebuild

```bash
npm run build
pm2 restart juju-drift
```

### Riscos

- 🟡 **Validação reduzida:** Inputs não validados podem causar erros
- 🟡 **Segurança reduzida:** Maior risco de injection attacks

---

## ⚡ ROLLBACK 5: VITE CONFIG OTIMIZADO

**Criticidade:** 🟢 MUITO BAIXA
**Tempo estimado:** 5 minutos
**Downtime:** NÃO
**Reversível:** SIM

### Procedimento

#### 1. Reverter vite.config.ts

```bash
cd client

git checkout <commit_anterior> -- vite.config.ts

# Ou substituir manualmente por config simples:
cat > vite.config.ts <<'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true
  }
});
EOF
```

#### 2. Remover plugins opcionais

```bash
npm uninstall rollup-plugin-visualizer vite-plugin-compression2
```

#### 3. Rebuild

```bash
npm run build
# Deploy novo build
```

### Riscos

- 🟢 **Nenhum risco funcional:** Apenas bundle ficará maior e menos otimizado

---

## 🔄 ROLLBACK COMPLETO (EMERGÊNCIA)

**Criticidade:** 🔴 CRÍTICA
**Tempo estimado:** 60 minutos
**Downtime:** SIM (30-60 minutos)

Se tudo falhar, rollback completo para v1.x:

### Procedimento de Emergência

```bash
#!/bin/bash
# rollback_emergency.sh

set -e  # Exit on error

echo "🚨 INICIANDO ROLLBACK DE EMERGÊNCIA 🚨"

# 1. Parar servidor
echo "1. Parando servidor..."
pm2 stop juju-drift || sudo systemctl stop juju-drift

# 2. Backup current state
echo "2. Fazendo backup do estado atual..."
BACKUP_DIR="/backups/emergency_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

pg_dump -U juju_user juju_drift > $BACKUP_DIR/database.sql
cp -r /var/www/juju-drift/server $BACKUP_DIR/
cp -r /var/www/juju-drift/client $BACKUP_DIR/

# 3. Restaurar código v1.x
echo "3. Restaurando código v1.x..."
cd /var/www/juju-drift
git fetch --all
git checkout v1.0.0  # ou commit específico

# 4. Restaurar dependências
echo "4. Reinstalando dependências..."
cd server
rm -rf node_modules package-lock.json
npm install
npm run build

cd ../client
rm -rf node_modules package-lock.json
npm install
npm run build

# 5. Restaurar database
echo "5. Restaurando database..."
# Se tem backup SQLite:
if [ -f "/backups/database_v1.sqlite" ]; then
  cp /backups/database_v1.sqlite ./database.sqlite
else
  echo "⚠️  Backup SQLite não encontrado! Migração manual necessária."
fi

# 6. Atualizar .env
echo "6. Atualizando .env..."
cd server
sed -i 's/DATABASE_URL=.*/DATABASE_PATH=database.sqlite/' .env
# Remover variáveis novas
sed -i '/^UPLOAD_PROVIDER=/d' .env
sed -i '/^AWS_/d' .env
sed -i '/^CLOUDINARY_/d' .env

# 7. Reiniciar
echo "7. Reiniciando servidor..."
pm2 restart juju-drift || sudo systemctl start juju-drift

# 8. Verificar
echo "8. Verificando saúde..."
sleep 5
curl -f http://localhost:2567/health || echo "❌ Health check falhou!"

echo "✅ ROLLBACK CONCLUÍDO"
echo "Verifique logs: pm2 logs juju-drift"
echo "Backup salvo em: $BACKUP_DIR"
```

### Executar

```bash
chmod +x rollback_emergency.sh
./rollback_emergency.sh
```

---

## 📋 CHECKLIST PÓS-ROLLBACK

Após qualquer rollback:

- [ ] Servidor iniciou sem erros
- [ ] Health check respondendo
- [ ] Funcionalidades críticas testadas:
  - [ ] Login
  - [ ] Criar partida
  - [ ] Upload avatar (se aplicável)
  - [ ] Depósito/Saque
- [ ] Logs sem erros críticos
- [ ] Performance aceitável (< 500ms API)
- [ ] Database íntegro (sem corrupção)
- [ ] Backup do estado atual salvo
- [ ] Equipe notificada
- [ ] Post-mortem agendado

---

## 📊 MATRIZ DE DECISÃO DE ROLLBACK

| Sintoma | Rollback Necessário? | Qual? | Prioridade |
|---------|---------------------|-------|-----------|
| Servidor não inicia | ✅ SIM | Database ou Completo | 🔴 ALTA |
| Taxa de erro > 10% | ✅ SIM | Identificar componente | 🔴 ALTA |
| Upload avatar falha | ⚠️  TALVEZ | Upload Routes | 🟠 MÉDIA |
| Validação Zod bloqueia requests | ⚠️  TALVEZ | Validação Zod | 🟡 BAIXA |
| Build muito grande | ❌ NÃO | - | 🟢 MUITO BAIXA |
| JWT_SECRET validation | ❌ NÃO | Hotfix | 🟢 MUITO BAIXA |

---

## 🆘 CONTATOS DE EMERGÊNCIA

Em caso de necessidade de rollback:

1. **Avaliar gravidade** (usar matriz acima)
2. **Notificar equipe** (Slack #incidents)
3. **Executar rollback apropriado**
4. **Monitorar por 30 minutos**
5. **Agendar post-mortem** (dentro de 24h)

**Contatos:**
- DevOps On-Call: [telefone/pagerduty]
- CTO: [telefone]
- DBA: [telefone]

---

## 📝 LOG DE ROLLBACKS

Manter registro de todos rollbacks executados:

```
| Data | Hora | Ambiente | Tipo | Executado por | Razão | Tempo | Sucesso? |
|------|------|----------|------|---------------|-------|-------|----------|
| - | - | - | - | - | - | - | - |
```

---

**Última atualização:** 2025-11-16
**Versão do documento:** 1.0
