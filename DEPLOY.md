# 🚀 Guia de Deploy - Drift Cash

## Scripts de Deploy Automatizado

Este projeto possui scripts automatizados para facilitar builds e deploys futuros.

### 📋 Scripts Disponíveis

#### 1. Deploy do Servidor (`./deploy-server.sh`)
Compila e faz deploy apenas do servidor Node.js/Colyseus.

```bash
cd /root/drifrr
./deploy-server.sh
```

**O que faz:**
- Limpa o diretório `dist` anterior
- Compila TypeScript
- Exibe tamanho do build
- Opção para reiniciar o servidor

**Tempo:** ~10 segundos

---

#### 2. Deploy do Cliente (`./deploy-client.sh`)
Compila e faz deploy apenas do cliente Vite/React/Babylon.js.

```bash
cd /root/drifrr
./deploy-client.sh
```

**O que faz:**
- Limpa o diretório `dist` anterior
- Gera versão única para cache busting
- Compila TypeScript + Vite
- Exibe estatísticas do build

**Tempo:** ~10-15 minutos

---

#### 3. Deploy Completo (`./deploy-full.sh`)
Faz deploy do servidor e cliente em sequência.

```bash
cd /root/drifrr
./deploy-full.sh                  # Deploy completo
./deploy-full.sh --server-only    # Apenas servidor
./deploy-full.sh --client-only    # Apenas cliente
```

**Tempo:** ~15 minutos

---

## 🔧 Problema da Logo (Cache do Navegador)

### Causa
Quando você substitui um arquivo com o mesmo nome (ex: `logo.webp`), o navegador mantém a versão antiga em cache.

### Solução Implementada
A logo agora inclui um parâmetro de versão na URL:
```tsx
src={`/logo.webp?v=${import.meta.env.VITE_BUILD_VERSION || Date.now()}`}
```

Cada build gera uma nova versão, forçando o navegador a baixar a nova imagem.

### Como Forçar Atualização
1. Faça o deploy: `./deploy-client.sh`
2. No navegador, pressione `Ctrl+Shift+R` (ou `Cmd+Shift+R` no Mac)
3. Ou limpe o cache manualmente nas configurações do navegador

---

## 📝 Build Manual (Sem Scripts)

### Servidor
```bash
cd /root/drifrr/server
rm -rf dist
npm run build
```

### Cliente
```bash
cd /root/drifrr/client
rm -rf dist
export VITE_BUILD_VERSION=$(date +%s)  # Para cache busting
npm run build
```

---

## 🔑 Permissões e Acessos

### Estrutura de Diretórios
```
/root/drifrr/
├── server/           # Backend (Node.js + Colyseus)
│   ├── src/         # Código fonte TypeScript
│   └── dist/        # Build compilado
├── client/          # Frontend (React + Babylon.js)
│   ├── src/         # Código fonte TypeScript
│   ├── public/      # Arquivos estáticos (logo, etc)
│   └── dist/        # Build compilado (Vite)
├── deploy-server.sh
├── deploy-client.sh
└── deploy-full.sh
```

### Configurar Permissões (se necessário)
```bash
# Dar permissões de escrita para o grupo
chmod -R g+w /root/drifrr

# Tornar scripts executáveis
chmod +x /root/drifrr/deploy-*.sh
```

---

## 🐛 Troubleshooting

### Problema: "Permission denied"
```bash
chmod -R g+w /root/drifrr
chmod +x /root/drifrr/deploy-*.sh
```

### Problema: Build do cliente muito lento
- Normal! O Vite precisa transformar 2000+ módulos
- Babylo.js é uma biblioteca grande
- Tempo esperado: 10-15 minutos

### Problema: Logo não atualiza após deploy
1. Verifique se o build foi feito após a mudança no LogoHeader.tsx
2. Limpe cache do navegador: `Ctrl+Shift+R`
3. Verifique se a logo em `client/public/logo.webp` é a correta
4. Inspecione a URL no navegador - deve ter `?v=timestamp`

### Problema: Servidor não reinicia após build
- Edite `deploy-server.sh` e adicione seu comando de restart
- Exemplos:
  - PM2: `pm2 restart drift-server`
  - Systemd: `systemctl restart drift-server`
  - Docker: `docker restart drift-server`

---

## 📊 Estatísticas de Build

### Servidor
- **Tamanho:** ~200KB
- **Tempo:** ~10s
- **Arquivos:** JavaScript ES6

### Cliente
- **Tamanho:** ~5.5MB (~1.25MB gzipped)
- **Tempo:** ~15min
- **Módulos:** 2048
- **Arquivos:** HTML + CSS + JavaScript + Assets

---

## ✨ Changelog de Melhorias

### [2025-11-12] - Deploy Automatizado
- ✅ Criados scripts de deploy automatizado
- ✅ Implementado cache busting para logo
- ✅ Documentação completa de deploy
- ✅ Física multiplayer convertida para client-side
- ✅ Auto-pilot para jogadores desconectados

### Arquitetura Multiplayer
- **Antes:** Server-authoritative (servidor controla física)
- **Depois:** Client-authoritative (cada cliente controla seu carro)
- **Benefício:** Movimento suave e independente, igual ao modo demo

---

## 🎯 Próximas Ações Recomendadas

1. **Configurar CI/CD** (GitHub Actions, GitLab CI, etc)
2. **Implementar versionamento semântico** (v1.0.0, v1.1.0, etc)
3. **Configurar servidor de staging**
4. **Adicionar testes de integração**
5. **Monitoramento e logs estruturados** (já iniciado com Winston)

---

## 💡 Dicas

- Execute `./deploy-full.sh --client-only` quando mudar apenas o frontend
- Execute `./deploy-full.sh --server-only` quando mudar apenas o backend
- Sempre limpe o cache do navegador após deploy do cliente
- Use `git status` antes de fazer deploy para garantir que tudo foi commitado
