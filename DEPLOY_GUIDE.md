# 🚀 Guia de Deploy - DRIFRR

Este guia mostra como fazer deploy do DRIFRR em diferentes plataformas e como usar Claude Code para editar em tempo real.

---

## 📋 Índice

1. [Deploy do Frontend (Cliente)](#deploy-frontend)
2. [Deploy do Backend (Servidor)](#deploy-backend)
3. [Edição com Claude Code](#claude-code)
4. [Variáveis de Ambiente](#variaveis)

---

## 🎨 Deploy do Frontend (Cliente) {#deploy-frontend}

### Opção 1: Netlify ⭐ Recomendado

**Passo a passo:**

1. Acesse: https://app.netlify.com
2. Clique em "Add new site" → "Import from Git"
3. Conecte sua conta GitHub
4. Selecione o repositório: `oliveiraempresa34/juju`
5. Configure:
   ```
   Base directory: client
   Build command: npm install && npm run build
   Publish directory: client/dist
   ```
6. Adicione variáveis de ambiente (Settings → Environment variables):
   ```
   VITE_WS_URL=wss://seu-servidor.com
   VITE_API_URL=https://seu-backend.com/api
   ```
7. Clique em "Deploy site"

**Resultado:**
- URL: `https://seu-site.netlify.app`
- Deploy automático a cada push
- SSL grátis

---

### Opção 2: Vercel

1. Acesse: https://vercel.com/new
2. Import: `github.com/oliveiraempresa34/juju`
3. Configure:
   ```
   Framework Preset: Vite
   Root Directory: client
   Build Command: npm run build
   Output Directory: dist
   ```
4. Adicione environment variables
5. Deploy!

**Resultado:** `https://juju.vercel.app`

---

### Opção 3: Cloudflare Pages

1. Acesse: https://pages.cloudflare.com
2. Connect to Git → GitHub → `juju`
3. Configure:
   ```
   Build command: cd client && npm install && npm run build
   Build output directory: client/dist
   ```
4. Save and Deploy

**Resultado:** `https://juju.pages.dev`

---

## 🔧 Deploy do Backend (Servidor) {#deploy-backend}

### Opção 1: Railway

1. Acesse: https://railway.app
2. New Project → Deploy from GitHub
3. Selecione: `oliveiraempresa34/juju`
4. Configure:
   ```
   Root Directory: server
   Build Command: npm install && npm run build
   Start Command: npm start
   ```
5. Adicione variáveis:
   ```
   NODE_ENV=production
   PORT=2567
   DATABASE_URL=postgresql://...
   ```

**Resultado:** `wss://juju-production.up.railway.app`

---

### Opção 2: Render

1. Acesse: https://render.com
2. New → Web Service
3. Connect: GitHub → `juju`
4. Configure:
   ```
   Name: drifrr-server
   Root Directory: server
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

---

### Opção 3: Fly.io

1. Instale Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Na pasta `server/`:
   ```bash
   fly launch
   fly deploy
   ```

---

## 🤖 Edição com Claude Code no Navegador {#claude-code}

### Como Usar:

1. **Acesse:** https://claude.ai
2. **Crie um projeto:**
   - Clique em "Projects" (menu lateral)
   - "New Project" ou "Connect to GitHub"
   - Selecione: `oliveiraempresa34/juju`

3. **Peça edições naturalmente:**
   ```
   "Edite o README.md e adicione uma seção sobre performance"
   "Melhore os materiais do carro para ficarem mais brilhantes"
   "Adicione um novo modo de jogo single player"
   ```

4. **Claude Code vai:**
   - ✅ Ler os arquivos necessários
   - ✅ Fazer as modificações
   - ✅ Criar commits
   - ✅ Fazer push automático

5. **Deploy automático:**
   - Netlify/Vercel detectam o push
   - Build automático em 2-3 minutos
   - Acesse seu domínio e teste!

---

### Workflow Completo:

```
Claude Code (edita) → GitHub (commit) → Netlify (deploy) → Teste ao vivo
        ↑                                                         |
        └─────────── Feedback / Ajustes ────────────────────────┘
```

---

## ⚙️ Variáveis de Ambiente {#variaveis}

### Cliente (Frontend)

Crie `.env.production` na pasta `client/`:

```env
# WebSocket do servidor Colyseus
VITE_WS_URL=wss://seu-servidor.railway.app

# API REST (se houver)
VITE_API_URL=https://seu-backend.com/api

# Ambiente
NODE_ENV=production
```

**Ou configure direto no Netlify/Vercel:**
- Dashboard → Settings → Environment variables

---

### Servidor (Backend)

Variáveis necessárias:

```env
# Porta
PORT=2567

# Ambiente
NODE_ENV=production

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Secrets
JWT_SECRET=seu-secret-seguro-aqui
SESSION_SECRET=outro-secret-aqui

# URLs permitidas (CORS)
ALLOWED_ORIGINS=https://seu-site.netlify.app,https://juju.vercel.app
```

---

## 📊 Fluxo de Deploy Completo

```mermaid
graph TD
    A[Código Local] -->|git push| B[GitHub]
    B -->|webhook| C[Netlify Build]
    B -->|webhook| D[Railway Deploy]
    C -->|frontend| E[CDN Global]
    D -->|backend| F[WebSocket Server]
    E --> G[Usuários]
    F --> G
```

---

## 🔄 Deploy Contínuo

Configurado automaticamente! A cada push para `main`:

1. ✅ **GitHub Actions** roda testes
2. ✅ **Netlify** faz build do frontend
3. ✅ **Railway** faz deploy do backend
4. ✅ Tudo sincronizado e funcionando

---

## 🧪 Teste Local Antes do Deploy

### Frontend:
```bash
cd client
npm install
npm run dev
# Acesse: http://localhost:5173
```

### Backend:
```bash
cd server
npm install
npm run dev
# Servidor em: ws://localhost:2567
```

---

## 🆘 Troubleshooting

### Build falha no Netlify:
```bash
# Verifique node_modules
npm install

# Teste build local
npm run build

# Se funcionar localmente, verifique variáveis de ambiente
```

### WebSocket não conecta:
```bash
# Verifique VITE_WS_URL no frontend
# Deve ser wss:// (não ws://) para HTTPS
# Exemplo: wss://seu-server.railway.app
```

### Erro de CORS:
```bash
# No servidor, adicione domínio do frontend em ALLOWED_ORIGINS
ALLOWED_ORIGINS=https://seu-site.netlify.app
```

---

## 📞 Links Úteis

- **Repositório:** https://github.com/oliveiraempresa34/juju
- **Claude Code:** https://claude.ai
- **Netlify:** https://netlify.com
- **Railway:** https://railway.app
- **Documentação Colyseus:** https://docs.colyseus.io

---

✨ **Deploy fácil, edição rápida, jogo online!**
