# Fuja da Prova!

Jogo em HTML, CSS e JavaScript puro.

## Versão 4
- 10 fases diferentes com labirintos maiores.
- 4 professores com IA e estratégias individuais.
- Blinky persegue diretamente.
- Pinky mira 4 blocos à frente.
- Clyde alterna entre perseguição e fuga para o canto.
- Inky calcula um alvo vetorial usando jogador + Blinky.
- A decisão de movimento usa busca de caminho e permite sair de becos sem ficar travada.
- Cada fase tem quatro chaves espalhadas pelo mapa que liberam a saída.
- Os professores começam na região central do labirinto, longe do jogador.
- Pontuação, vidas, cronômetro e itens coletáveis.

## Dificuldades
Escolha antes de começar:
- **Fácil**: 2 professores, lentos e de visão curta. Eles patrulham bastante e só perseguem quando você chega perto.
- **Médio**: 3 professores, alternando entre perseguição e patrulha.
- **Difícil**: os 4 professores caçam sem descanso (visão total e mais rápidos).

A IA foi ajustada para ser mais divertida: os professores revezam entre **patrulhar** (ir para o canto) e **perseguir**, só enxergam o jogador dentro de um alcance, às vezes tomam decisões imperfeitas e ficam atordoados por alguns instantes depois de te pegar.

## Abrir no VS Code
Abra a pasta inteira no VS Code e use o Live Server. O arquivo `index.html` está na raiz do projeto, portanto é a página inicial.