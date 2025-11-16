# ✅ DEPLOY CHECKLIST - JUJU DRIFT PRODUCTION

**Versão:** 2.0.0
**Data:** 2025-11-16
**Ambiente:** Production

Este checklist garante que todos os passos críticos foram executados antes do deploy em produção.

---

## 🔴 PRÉ-REQUISITOS OBRIGATÓRIOS

### Infraestrutura

- [ ] **PostgreSQL 15+ instalado e configurado**
  ```bash
  psql --version  # Deve ser >= 15
  ```

- [ ] **Node.js 18+ instalado**
  ```bash
  node --version  # Deve ser >= 18
  npm --version   # Deve ser >= 9
  ```

- [ ] **SSL/TLS certificado configurado** (Nginx/Caddy/AWS ALB)
  ```bash
  # Verificar se HTTPS funciona
  curl -I https://seu-dominio.com
  ```

- [ ] **Firewall configurado**
  ```bash
  # Portas abertas:
  # - 443 (HTTPS) - frontend
  # - 2567 (WSS) - backend Colyseus
  # - 5432 (PostgreSQL) - APENAS localhost/VPC
  ```

- [ ] **Backup automático do PostgreSQL configurado**
  ```bash
  # Exemplo: cron diário
  0 3 * * * pg_dump -U postgres juju_drift > /backups/juju_$(date +\%Y\%m\%d).sql
  ```

---

## 🔐 SEGURANÇA

### 1. Variáveis de Ambiente

- [ ] **JWT_SECRET gerado com segurança**
  ```bash
  # Gerar novo secret:
  openssl rand -base64 64

  # Adicionar ao .env:
  JWT_SECRET=<secret_gerado_aqui>

  # NUNCA usar valores default!
  ```

- [ ] **DATABASE_URL com credenciais fortes**
  ```bash
  # ❌ MAL:
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/juju_drift

  # ✅ BOM:
  DATABASE_URL=postgresql://juju_user:$(openssl rand -base64 32)@db.interno:5432/juju_drift?sslmode=require
  ```

- [ ] **NODE_ENV=production definido**
  ```bash
  grep "NODE_ENV=production" server/.env
  ```

- [ ] **AWS/Cloudinary credentials configuradas** (se usar upload externo)
  ```bash
  # Verificar:
  grep -E "(AWS_|CLOUDINARY_)" server/.env
  ```

- [ ] **Chaves de pagamento (Mercado Pago, etc) configuradas**
  ```bash
  grep -E "(MP_|PAGSEGURO_|ASAAS_)" server/.env
  ```

### 2. Validações

- [ ] **Servidor recusa iniciar com JWT_SECRET inseguro**
  ```bash
  # Testar com secret inválido:
  JWT_SECRET=changeme npm start
  # Deve abortar com erro
  ```

- [ ] **CORS configurado apenas para domínios reais**
  ```bash
  # server/.env:
  FRONTEND_URL=https://driftcash.com,https://admin.driftcash.com
  # Sem 'localhost' em produção!
  ```

- [ ] **Rate limiting ativado**
  ```bash
  grep "RATE_LIMIT" server/.env
  # RATE_LIMIT_MAX_REQUESTS=100
  # RATE_LIMIT_AUTH_MAX=20
  ```

- [ ] **Headers de segurança ativos** (Helmet.js)
  ```bash
  curl -I https://api.seu-dominio.com | grep -E "(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)"
  ```

---

## 🗄️ DATABASE

### 1. Setup

- [ ] **PostgreSQL rodando e acessível**
  ```bash
  psql -U postgres -c "SELECT version();"
  ```

- [ ] **Database criado**
  ```bash
  psql -U postgres -c "CREATE DATABASE juju_drift;"
  ```

- [ ] **Usuário dedicado criado** (não usar 'postgres')
  ```bash
  psql -U postgres <<EOF
  CREATE USER juju_user WITH PASSWORD 'senha_forte_aqui';
  GRANT ALL PRIVILEGES ON DATABASE juju_drift TO juju_user;
  EOF
  ```

- [ ] **SSL/TLS habilitado no PostgreSQL**
  ```bash
  # postgresql.conf:
  ssl = on
  ssl_cert_file = 'server.crt'
  ssl_key_file = 'server.key'
  ```

### 2. Migrations

- [ ] **Prisma Client gerado**
  ```bash
  cd server
  npx prisma generate
  ```

- [ ] **Migrations executadas**
  ```bash
  npx prisma migrate deploy
  ```

- [ ] **Schema verificado**
  ```bash
  npx prisma studio
  # Verificar se todas tabelas existem
  ```

- [ ] **Seed data executado**
  ```bash
  npm run seed  # ou equivalente
  ```

### 3. Backup

- [ ] **Backup manual antes do deploy**
  ```bash
  pg_dump -U juju_user juju_drift > backup_pre_deploy_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Backup testado (restore em ambiente de staging)**
  ```bash
  psql -U juju_user juju_drift_test < backup_pre_deploy_*.sql
  ```

---

## 📦 BUILD & DEPENDÊNCIAS

### Server

- [ ] **Dependências instaladas**
  ```bash
  cd server
  npm ci --production
  ```

- [ ] **Build executado sem erros**
  ```bash
  npm run build
  # Verificar dist/ gerado
  ls -lh dist/
  ```

- [ ] **Testes passando**
  ```bash
  npm run test
  ```

### Client

- [ ] **Dependências instaladas**
  ```bash
  cd client
  npm ci --production
  ```

- [ ] **Build executado sem erros**
  ```bash
  npm run build
  # Verificar dist/ gerado
  ls -lh dist/
  ```

- [ ] **Bundle size verificado** (< 2MB total gzip)
  ```bash
  ANALYZE=true npm run build
  # Abrir dist/stats.html e verificar tamanhos
  ```

- [ ] **Variáveis ENV de produção configuradas**
  ```bash
  # client/.env.production:
  VITE_WS_URL=wss://game-server.driftcash.com
  VITE_API_URL=https://api.driftcash.com
  NODE_ENV=production
  ```

---

## 🚀 DEPLOY

### 1. Server Deploy

- [ ] **Arquivo .env criado** (NUNCA commitar!)
  ```bash
  cp server/.env.example server/.env
  nano server/.env
  # Preencher todas variáveis
  ```

- [ ] **Servidor inicia sem erros**
  ```bash
  cd server
  npm start
  # Verificar logs para erros
  ```

- [ ] **Health check endpoint responde**
  ```bash
  curl https://api.seu-dominio.com/health
  # Deve retornar 200 OK
  ```

- [ ] **WebSocket conecta**
  ```bash
  # Usar ferramenta como wscat:
  wscat -c wss://game-server.seu-dominio.com
  ```

### 2. Client Deploy

- [ ] **Assets uploadados para CDN** (se aplicável)
  ```bash
  aws s3 sync client/dist/ s3://seu-bucket/ --acl public-read
  # ou
  vercel deploy --prod
  ```

- [ ] **Cache invalidado** (CloudFront/Cloudflare)
  ```bash
  aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
  ```

- [ ] **Frontend acessível via HTTPS**
  ```bash
  curl -I https://driftcash.com
  # Deve retornar 200 OK
  ```

### 3. Nginx/Reverse Proxy

- [ ] **Configuração Nginx ativa**
  ```nginx
  # /etc/nginx/sites-available/juju-drift

  # Frontend
  server {
    listen 443 ssl http2;
    server_name driftcash.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/juju-drift/client/dist;
    index index.html;

    location / {
      try_files $uri $uri/ /index.html;
    }
  }

  # Backend API
  server {
    listen 443 ssl http2;
    server_name api.driftcash.com;

    location / {
      proxy_pass http://localhost:2567;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
    }
  }

  # WebSocket
  server {
    listen 443 ssl http2;
    server_name game-server.driftcash.com;

    location / {
      proxy_pass http://localhost:2567;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "Upgrade";
      proxy_set_header Host $host;
      proxy_read_timeout 86400;
    }
  }
  ```

- [ ] **Nginx config testado**
  ```bash
  sudo nginx -t
  ```

- [ ] **Nginx recarregado**
  ```bash
  sudo systemctl reload nginx
  ```

### 4. Process Manager

- [ ] **PM2 configurado** (ou equivalente)
  ```bash
  # Instalar PM2
  npm install -g pm2

  # Criar ecosystem.config.js
  cd server
  pm2 start ecosystem.config.js --env production

  # Auto-restart no boot
  pm2 startup
  pm2 save
  ```

- [ ] **Logs configurados**
  ```bash
  pm2 logs juju-drift
  ```

---

## 🧪 TESTES EM PRODUÇÃO

### 1. Funcionalidades Críticas

- [ ] **Registro de novo usuário**
  ```bash
  curl -X POST https://api.seu-dominio.com/api/users/register \
    -H "Content-Type: application/json" \
    -d '{"username":"test","email":"test@example.com","password":"Test@123456"}'
  ```

- [ ] **Login**
  ```bash
  curl -X POST https://api.seu-dominio.com/api/users/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"Test@123456"}'
  ```

- [ ] **Upload de avatar** (S3/Cloudinary)
  - Testar no frontend manualmente

- [ ] **Criar partida pública**
  - Testar no frontend manualmente

- [ ] **Criar partida privada**
  - Testar no frontend manualmente

- [ ] **Depósito PIX** (ambiente sandbox)
  - Testar fluxo completo

- [ ] **Saque PIX** (ambiente sandbox)
  - Testar aprovação manual

### 2. Performance

- [ ] **Tempo de resposta API < 200ms**
  ```bash
  curl -w "@curl-format.txt" -o /dev/null -s https://api.seu-dominio.com/api/health
  ```

- [ ] **WebSocket latência < 50ms**
  - Usar ferramenta de monitoramento

- [ ] **Database queries < 100ms**
  ```bash
  # Habilitar log de queries lentas
  # postgresql.conf:
  log_min_duration_statement = 100
  ```

### 3. Segurança

- [ ] **HTTPS funciona (SSL válido)**
  ```bash
  curl -I https://seu-dominio.com | grep "HTTP/2 200"
  ```

- [ ] **HSTS header presente**
  ```bash
  curl -I https://seu-dominio.com | grep "Strict-Transport-Security"
  ```

- [ ] **XSS protection ativa**
  ```bash
  curl -I https://api.seu-dominio.com | grep "X-Content-Type-Options"
  ```

- [ ] **Rate limiting funciona**
  ```bash
  # Fazer 150 requests em 1 minuto
  for i in {1..150}; do
    curl https://api.seu-dominio.com/api/health &
  done
  # Deve bloquear após 100
  ```

---

## 📊 MONITORAMENTO

### 1. Logs

- [ ] **Logs centralizados** (Papertrail, CloudWatch, etc)
  ```bash
  # PM2 logs
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 10M
  ```

- [ ] **Alertas configurados** (erros críticos)
  - Sentry, PagerDuty, etc

### 2. Métricas

- [ ] **CPU/RAM monitorados**
  ```bash
  pm2 monit
  ```

- [ ] **Database connections monitoradas**
  ```sql
  SELECT count(*) FROM pg_stat_activity WHERE datname = 'juju_drift';
  ```

- [ ] **Uptime monitoring** (Pingdom, UptimeRobot)

---

## 📝 DOCUMENTAÇÃO

- [ ] **README.md atualizado** com instruções de produção

- [ ] **CHANGELOG.md preenchido** com versão e mudanças

- [ ] **API docs atualizadas** (se aplicável)

- [ ] **Runbook criado** para incidentes comuns

---

## 🔄 POST-DEPLOY

### Imediatamente Após Deploy

- [ ] **Verificar logs por 10 minutos**
  ```bash
  pm2 logs --lines 100
  ```

- [ ] **Testar funcionalidades principais** (ver seção Testes)

- [ ] **Verificar métricas de performance**

- [ ] **Notificar equipe** que deploy foi concluído

### Primeiras 24 horas

- [ ] **Monitorar taxa de erro** (deve ser < 1%)

- [ ] **Verificar feedback de usuários**

- [ ] **Revisar logs de erro** (Sentry, CloudWatch)

- [ ] **Validar backups automáticos** funcionando

---

## ⚠️  ROLLBACK

Se algo der errado:

1. **Parar servidor atual**
   ```bash
   pm2 stop juju-drift
   ```

2. **Restaurar código anterior**
   ```bash
   git checkout <commit_anterior>
   npm ci
   npm run build
   ```

3. **Restaurar database** (se schema mudou)
   ```bash
   psql -U juju_user juju_drift < backup_pre_deploy_*.sql
   ```

4. **Reiniciar servidor**
   ```bash
   pm2 restart juju-drift
   ```

**Ver:** `ROLLBACK-PLANS.md` para detalhes

---

## 🎯 CHECKLIST FINAL

### Antes de Marcar Deploy como Concluído

- [ ] Todos itens acima verificados
- [ ] Nenhum erro crítico nos logs
- [ ] Performance dentro dos limites esperados
- [ ] Funcionalidades principais testadas
- [ ] Equipe notificada
- [ ] Rollback plan testado (em staging)
- [ ] Documentação atualizada
- [ ] Backups funcionando

---

## 📞 CONTATOS DE EMERGÊNCIA

- **DevOps Lead:** [nome] - [telefone/slack]
- **Backend Lead:** [nome] - [telefone/slack]
- **DBA:** [nome] - [telefone/slack]
- **On-Call:** [telefone/pagerduty]

---

**Assinaturas:**

- [ ] Deploy Executado por: ________________ Data: _______
- [ ] QA Aprovado por: ________________ Data: _______
- [ ] Product Owner Aprovado por: ________________ Data: _______

---

**Última atualização:** 2025-11-16
