# Changelog - Sistema Multiplayer Corrigido

## Data: 05/10/2025

### ✅ PROBLEMAS CORRIGIDOS

#### 1. Lobby Aparecendo Durante o Jogo
**Arquivo:** `client/src/game/GameScene.tsx`
- ❌ **ANTES:** Renderizava ~150 linhas de código de lobby DENTRO do jogo
- ✅ **DEPOIS:** Removido completamente. Apenas renderiza Canvas 3D + ScoreDisplay + GameOverModal

#### 2. Conexões Multiplayer Duplicadas
**Arquivo:** `client/src/game/GameScene.tsx` (linhas 315-341)
- ❌ **ANTES:** Tinha 2 useEffect criando conexões diferentes
- ✅ **DEPOIS:** Usa APENAS a instância criada no WaitingLobby via store

#### 3. Countdown Cancelado Incorretamente
**Arquivo:** `server/src/rooms/DriftRoom.ts`
- ❌ **ANTES:** Cancelava countdown com < 5 jogadores mesmo em sala privada
- ✅ **DEPOIS:** 
  - Adicionadas constantes MIN_PLAYERS_PRIVATE = 2 e MIN_PLAYERS_PUBLIC = 5
  - Validação correta no onLeave (linha 148)
  - Validação no startMatch (linha 271)

#### 4. Options Não Limpas Após Conexão
**Arquivo:** `client/src/components/WaitingLobby.tsx` (linha 90)
- ❌ **ANTES:** Options permaneciam após conexão
- ✅ **DEPOIS:** clearMultiplayerOptions() após conexão bem-sucedida

---

### 🎮 FLUXO CORRETO AGORA

#### Salas Públicas:
1. Lobby → Escolhe aposta → "Iniciar Partida"
2. WaitingLobby → cria conexão + aguarda 5 jogadores
3. Sala enche → countdown automático 5s
4. matchStatus = 'active' → TODOS vão para 'game'
5. ✅ Jogo inicia simultaneamente para todos

#### Salas Privadas:
1. Lobby → "Criar Privada" ou "Entrar com Código"
2. WaitingLobby → cria conexão + aguarda mínimo 2 jogadores
3. Host clica "Iniciar Partida" (≥ 2 jogadores)
4. Countdown 5s
5. matchStatus = 'active' → TODOS vão para 'game'
6. ✅ Jogo inicia simultaneamente para todos

---

### 👁️ VISUALIZAÇÃO DOS CARROS

- **Carro Local:** Opacidade 100%, cor escolhida pelo jogador
- **Carros Remotos:** Opacidade 50%, cor cinza, com label de nome

---

### 🏆 SISTEMA DE PONTUAÇÃO

**Fórmula:** `Pontuação = (Tempo Vivo × 100) + Distância Percorrida`

Arquivo: `server/src/rooms/DriftRoom.ts` linha 454

---

### 📁 ARQUIVOS MODIFICADOS

```
client/src/game/GameScene.tsx
client/src/components/WaitingLobby.tsx
server/src/rooms/DriftRoom.ts
```

---

### 🚀 DEPLOY

Use o script automatizado:
```bash
/root/difr/deploy.sh
```

Ou manual:
```bash
# 1. Build
npm run build
cd /root/difr/client && npm run build

# 2. Deploy
rm -rf /var/www/html/assets
cp -r /root/difr/client/dist/* /var/www/html/

# 3. Restart
pm2 restart drift-server
nginx -t && systemctl reload nginx
```

---

### ⚠️ NOTAS IMPORTANTES

1. **Cache do navegador:** Os usuários podem precisar fazer CTRL+F5 para ver as mudanças
2. **Arquivos servidos de:** `/var/www/html/` (não `/root/difr/client/dist/`)
3. **Nginx config:** `/etc/nginx/sites-available/drift-game`
4. **Servidor PM2:** `drift-server` (porta 2567)
