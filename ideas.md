# LUAN SLASH — Design Brainstorm

## Approaches

### 1. "Obsidian Arena"
- Dark fantasy com texturas de obsidiana e fogo etéreo. Arena de pedra negra, inimigos sombrios, efeitos de fogo e sombras. Paleta: preto, cinza escuro, laranja de brasa.

### 2. "Blood Moon Colosseum"
- Arena medieval com céu de lua de sangue. Piso de arena de madeira e areia, tochas, grades de ferro. Paleta: vermelho sangue, marrom escuro, dourado apagado.

### 3. "Void Glitch"
- Arena digital/cyberpunk com glitches e distorções. Inimigos como entidades de código corrompido. Paleta: preto absoluto, magenta glitch, verde matrix.

---

## Selected Approach: "Obsidian Arena"

### Design Philosophy
O jogo é uma arena sombria de combate intenso. O jogador se sente como um guerreiro solitário cercado pela escuridão, iluminado apenas pelo brilho da sua espada e pelos olhos dos inimigos. A direção de arte é dark fantasy minimalista — poucos elementos visuais mas extremamente impactantes.

### Core Principles
1. **Escuridão como canvas** — O preto não é ausência, é a atmosfera. Efeitos de luz são raros e quando aparecem, causam impacto.
2. **Feedback visceral** — Cada hit precisa ser sentido. Screen shake, partículas, flash de dano.
3. **Simplicidade elegante** — Controles minimalistas, UI limpa, foco total no combate.
4. **Mobile-first** — Touch controls intuitivos, sem clutter na tela.

### Color Philosophy
- **Background:** #0a0a0f (quase preto com leve tom azulado — profundidade sem ser cinza)
- **Accent primary:** #ff4444 (vermelho sangue — dano, inimigos, perigo)
- **Accent secondary:** #ffcc00 (dourado — loot, level up, conquistas)
- **Player glow:** #44aaff (azul ciano — o jogador se destaca como herói na escuridão)
- **UI text:** #e8e8e8 (branco sujo — legível sem ser agressivo)

### Layout Paradigm
- Canvas full-screen, sem bordas, sem margens.
- HUD overlay: top-left (vida), top-right (pontuação/wave), bottom-center (controles touch).
- Menus: overlay escuro semi-transparente com tipografia bold centrada.

### Signature Elements
1. **Slash trail** — Rastro de luz que segue o movimento da espada, desvanecendo em partículas.
2. **Death burst** — Inimigos explodem em fragmentos sombrios ao morrer.
3. **Soul orbs** — Orbs azulados que flutuam em direção ao jogador após kills.

### Interaction Philosophy
- Toque duplo = dash/esquiva
- Arrastar = movimento
- Toque em inimigo = ataque direcionado
- Feedback tátil imediato (vibration API no mobile)

### Animation
- Transições de cena: fade to black (0.3s).
- Partículas de hit: burst rápido com easing out.
- Screen shake: 3-5 frames de jitter sutil.
- Player idle: leve respiração (scale 1.0 → 1.02 → 1.0 em loop).

### Typography System
- **Title/Headings:** "Orbitron" (Google Fonts) — futurista, bold, impactante.
- **Body/UI:** "Inter" — limpa, legível, neutra.
- **Score/Wave:** "Orbitron" monospace — números estilizados.

### Brand Essence
**LUAN SLASH** — Um guerreiro na escuridão. Combate visceral, rápido e viciante. Para quem quer ação em 3 minutos.
**Personalidade:** Intenso, Direto, Selvagem.

### Brand Voice
- "Eles vêm. Corte primeiro."
- "Mais um. Sempre mais um."

### Wordmark & Logo
Símbolo de espada cruzada em "X" estilizado, com rastro de corte, em vermelho sangue sobre preto. Sem texto no símbolo — apenas a forma geométrica da espada.

### Signature Brand Color
**#ff2222** — Vermelho sangue saturado. Inconfundível, agressivo, memorável.
