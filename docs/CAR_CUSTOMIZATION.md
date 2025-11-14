# Sistema de Customização de Carros

## 📍 Localização dos Arquivos

### Modelos 3D (Procedurais)
O projeto **NÃO usa arquivos externos** (.glb, .gltf, .obj). Os carros são gerados proceduralmente com Babylon.js.

| Arquivo | Propósito | Tipo de Modelo |
|---------|-----------|----------------|
| `/client/src/components/CarAnimation.tsx` | Animação da dashboard (tela inicial) | Nissan Skyline GT-R R34 - Roxo-azul fixo |
| `/client/src/game/CarController.ts` | Carros dentro do jogo | Carro esportivo simplificado - Cor customizável |
| `/client/src/components/CustomizationPanel.tsx` | Preview de customização | Versão simplificada do carro do jogo |

---

## 🎨 Como Funciona a Customização

### 1. Painel de Customização
**Arquivo:** `CustomizationPanel.tsx`

**Cores disponíveis:**
- 🔵 Azul (`#1a4de6`)
- 🟢 Verde (`#1acc4d`)
- 🟡 Amarelo (`#f2d91a`)
- 🩷 Rosa (`#f24db3`)

**Fluxo:**
1. Usuário seleciona uma cor
2. Preview 3D atualiza em tempo real
3. Clica em "Salvar Escolha"
4. Salva no `localStorage`: `carColor_${userId}`
5. Envia para servidor via `POST /api/users/update-car-color`

### 2. Aplicação no Jogo
**Arquivo:** `GameScene.tsx` (linhas 95-101)

```typescript
if (authUser?.id) {
  const savedColor = localStorage.getItem(`carColor_${authUser.id}`) || 'blue';
  carController.setLocalCarColor(savedColor);
}
```

**Funcionamento:**
- Carrega a cor do `localStorage` quando o jogo inicia
- Aplica ao `CarController` **antes** de criar qualquer carro
- Funciona em **todos os modos**: multiplayer, practice, demo

### 3. Renderização
**Arquivo:** `CarController.ts`

**Método `setLocalCarColor()`:**
- Define `this.localCarColor` com a cor escolhida
- Atualiza carros já existentes automaticamente

**Método `update()`:**
- Jogador local: Renderiza com `this.localCarColor` (opacidade 100%)
- Adversários: Renderiza com cor cinza (opacidade 60%)

---

## 🚗 Modos de Jogo Suportados

| Modo | Cor Customizada Aplicada |
|------|-------------------------|
| **Multiplayer (Público)** | ✅ Sim |
| **Multiplayer (Privado)** | ✅ Sim |
| **Demo** | ✅ Sim |
| **Practice** | ✅ Sim |

---

## 🔧 Como Substituir o Modelo do Carro

### Opção 1: Usar Arquivo 3D Externo (.glb)

**1. Adicionar o modelo:**
```
/client/public/models/car.glb
```

**2. Modificar `CarController.ts` (método `getOrCreate`):**
```typescript
import { SceneLoader } from '@babylonjs/core';

private async getOrCreate(id: string): Promise<Mesh> {
  const existing = this.cars.get(id);
  if (existing) return existing;

  // Carregar modelo externo
  const result = await SceneLoader.ImportMeshAsync(
    '',
    '/models/',
    'car.glb',
    this.scene
  );

  const carGroup = result.meshes[0] as Mesh;
  carGroup.name = `car-group-${id}`;

  // Aplicar cor customizada
  carGroup.getChildMeshes().forEach(mesh => {
    if (mesh.material) {
      const mat = mesh.material as StandardMaterial;
      if (mat.name.includes('paint')) {
        mat.diffuseColor = this.localCarColor;
      }
    }
  });

  this.cars.set(id, carGroup);
  return carGroup;
}
```

**Requisitos do modelo .glb:**
- Escala: ~4 unidades de comprimento
- Pivot: Centro da base do carro
- Material de pintura: Nomear como "car-paint" para aplicar cores

### Opção 2: Melhorar Modelo Procedural Atual

Editar `CarController.ts` (linhas 178-432) para adicionar:
- Espelhos laterais detalhados
- Interior visível
- Para-choques customizados
- Detalhes aerodinâmicos

---

## 🚀 Melhorias Futuras Sugeridas

### Performance
- [ ] Instanciamento de malhas (70% mais rápido)
- [ ] Redução de tessellation (40% menos polígonos)
- [ ] Freeze de malhas estáticas
- [ ] Sistema de LOD para jogadores distantes

### Estética
- [ ] Normal maps para fibra de carbono
- [ ] PBR materials para reflexões realistas
- [ ] Faróis funcionais com iluminação
- [ ] Sistema de decalques/adesivos
- [ ] Vidros com reflexão de skybox

### Customização
- [ ] Mais cores disponíveis
- [ ] Modelos diferentes de carros
- [ ] Rodas customizáveis
- [ ] Adesivos e números de corrida
- [ ] Fumaça colorida

---

## 📝 Endpoints da API

### Salvar Cor
```
POST /api/users/update-car-color
Body: { userId: string, carColor: string }
```

### Carregar Cor
```
GET /api/users/:userId/car-color
Response: { carColor: string }
```

**Cores válidas:** `blue`, `green`, `yellow`, `pink`

---

## 🐛 Correções Implementadas

### Bug Corrigido (2025)
**Problema:** Cores customizadas não apareciam no jogo.

**Causa:** `GameScene.tsx` não estava carregando a cor salva antes de renderizar.

**Solução:** Adicionado código para carregar do `localStorage` e aplicar via `setLocalCarColor()` logo após criar o `CarController`.

**Arquivos modificados:**
- `/client/src/game/GameScene.tsx` (linhas 95-101)
