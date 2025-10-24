# 🔊 Arquivos de Som - SavePoint

Este diretório deve conter os arquivos de áudio utilizados pelos jogos da plataforma SavePoint.

## 📋 Arquivos Necessários

### Jogo da Memória (6 sons)
1. **card-flip.mp3** - Som ao virar uma carta
2. **match-success.mp3** - Som ao encontrar um par correto
3. **match-fail.mp3** - Som ao errar (cartas não combinam)
4. **victory.mp3** - Som de vitória ao completar o jogo
5. **time-warning.mp3** - Som de alerta quando restam 60 segundos
6. **timeout.mp3** - Som ao esgotar o tempo

### Balão Matemático (4 sons)
1. **balloon-pop.mp3** - Som de balão estourando
2. **correct-answer.mp3** - Som ao acertar a resposta
3. **game-over.mp3** - Som de game over

## 🎵 Onde Baixar Sons Gratuitos

Você pode baixar sons gratuitos e livres de direitos autorais nos seguintes sites:

### 1. Freesound.org
- URL: https://freesound.org/
- Requer cadastro gratuito
- Licenças Creative Commons
- Filtros por duração, qualidade, etc.

**Sugestões de busca:**
- "card flip" ou "card swipe"
- "success" ou "win" ou "level up"
- "error" ou "wrong" ou "fail"
- "victory" ou "game win"
- "alarm" ou "warning beep"
- "balloon pop" ou "pop sound"
- "game over"

### 2. Zapsplat.com
- URL: https://www.zapsplat.com/
- Cadastro gratuito necessário
- Grande biblioteca de efeitos sonoros

### 3. Mixkit.co
- URL: https://mixkit.co/free-sound-effects/
- Sem necessidade de cadastro
- Sons de alta qualidade

### 4. Pixabay
- URL: https://pixabay.com/sound-effects/
- Sons e músicas grátis

## 📝 Instruções de Instalação

1. Baixe os arquivos de som nos formatos **MP3** ou **WAV**
2. Renomeie-os exatamente como listado acima
3. Coloque todos os arquivos neste diretório (`/assets/sounds/`)
4. Certifique-se de que os nomes dos arquivos correspondem exatamente aos esperados

## ⚙️ Configurações Recomendadas

- **Formato**: MP3 (melhor compatibilidade)
- **Taxa de bits**: 128 kbps ou superior
- **Duração**: 0.5s a 2s (sons curtos funcionam melhor)
- **Volume**: Normalizado (todos os sons com volume similar)

## 🔄 Alternativa: Criar Sons Sintéticos

Se preferir, você pode gerar sons simples usando ferramentas online como:
- **Bfxr**: https://www.bfxr.net/ (gerador de sons 8-bit)
- **Chiptone**: https://sfbgames.itch.io/chiptone (sons retrô)

## ✅ Verificação

Após adicionar os arquivos, verifique se todos os 9 arquivos estão presentes:

```bash
ls -lh /var/www/html/SavePoint/assets/sounds/
```

Você deverá ver:
- balloon-pop.mp3
- card-flip.mp3
- correct-answer.mp3
- game-over.mp3
- match-fail.mp3
- match-success.mp3
- time-warning.mp3
- timeout.mp3
- victory.mp3

## 📱 Teste

Após adicionar os sons, teste os jogos:
1. Acesse o Jogo da Memória
2. Vire uma carta (deve ouvir card-flip.mp3)
3. Encontre um par (deve ouvir match-success.mp3)
4. Erre um par (deve ouvir match-fail.mp3)

Se não ouvir sons, verifique:
- Se os arquivos estão neste diretório
- Se os nomes estão corretos (case-sensitive)
- Se o botão de mute não está ativado
- Se o volume do slider não está em 0
- Console do navegador (F12) para erros

---

**Nota**: Os sons são opcionais. Se não adicionados, os jogos funcionarão normalmente, apenas sem feedback sonoro.
