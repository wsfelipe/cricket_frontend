Construa um frontend multiplayer responsivo para um jogo de dados chamado Cricket.

O frontend deve ser React + TypeScript e funcionar muito bem em desktop e mobile. O design visual pode ser simples e funcional; a prioridade é implementar corretamente o fluxo real do jogo usando WebSocket. Não use dados mockados nem crie endpoints REST.

## Conexão

Use WebSocket puro:

- Desenvolvimento: ws://localhost:8080
- Produção: usar a variável de ambiente VITE_WS_URL
- Exemplo de produção: wss://meu-backend.com

Criar uma camada centralizada de WebSocket para:
- abrir conexão;
- enviar mensagens JSON;
- interpretar mensagens recebidas;
- atualizar o estado global da sala;
- mostrar erros;
- detectar desconexão;
- permitir reconexão manual;
- impedir envio enquanto o socket não estiver aberto.

Não invente endpoints HTTP. Toda comunicação do jogo acontece por WebSocket.

## Tela inicial

Criar uma tela simples com:

- campo para nome do jogador;
- botão "Criar sala";
- campo para código da sala;
- botão "Entrar na sala";
- estado visual de conexão;
- mensagens de erro e carregamento.

O código da sala deve ser tratado sempre em maiúsculas.

Ao criar ou entrar em uma sala, persistir localmente:
- roomCode;
- playerId;
- playerName.

Não implementar login, cadastro ou histórico de partidas neste momento.

## Mensagens cliente -> servidor

Enviar exatamente estes formatos:

Criar sala:

{
  "type": "CREATE_ROOM",
  "playerName": "Alice"
}

Entrar em sala:

{
  "type": "JOIN_ROOM",
  "roomCode": "ABC123",
  "playerName": "Bob"
}

Iniciar jogo:

{
  "type": "START_GAME",
  "roomCode": "ABC123"
}

Rolar dados:

{
  "type": "ROLL_DICE",
  "roomCode": "ABC123"
}

Anunciar jogada:

{
  "type": "ANNOUNCE",
  "roomCode": "ABC123",
  "announcement": "pair_3"
}

Desafiar:

{
  "type": "CHALLENGE",
  "roomCode": "ABC123",
  "challengeType": "CALL_BLUFF"
}

Comprar o anúncio anterior:

{
  "type": "CHALLENGE",
  "roomCode": "ABC123",
  "challengeType": "BUY"
}

Sair da sala:

{
  "type": "LEAVE_ROOM",
  "roomCode": "ABC123"
}

## Mensagens servidor -> cliente

Suportar estes tipos:

- ROOM_CREATED
- ROOM_JOINED
- ROOM_UPDATED
- GAME_STARTED
- YOUR_TURN
- ANNOUNCEMENT
- CHALLENGE_RESULT
- PLAYER_ELIMINATED
- GAME_OVER
- PLAYER_LEFT
- ERROR

Todas as mensagens que possuem roomState devem atualizar o estado atual da partida.

Formato de RoomState:

{
  "code": "ABC123",
  "players": [
    {
      "id": "uuid",
      "name": "Alice",
      "lives": 3,
      "isActive": true,
      "isCurrentPlayer": true
    }
  ],
  "currentPlayerIndex": 0,
  "gamePhase": "waiting",
  "currentAnnouncement": null,
  "lastAnnouncingPlayerIndex": null,
  "diceResult": null,
  "round": 1,
  "winner": null,
  "createdAt": "date"
}

Os estados possíveis de gamePhase são:

- waiting
- rolling
- announcing
- challenging
- ended

## Privacidade dos dados

O servidor é autoritativo.

Nunca gere resultados de dados no frontend.

O frontend deve respeitar estas regras:

- diceResult normalmente será null para os demais jogadores;
- durante a fase announcing, o jogador que rolou pode receber o resultado privado dos próprios dados;
- nunca revelar os dados privados de outro jogador;
- depois que o jogador anuncia, esconder os dados novamente;
- o resultado só deve ser mostrado aos outros jogadores quando chegar CHALLENGE_RESULT.

## Fluxo do jogo

### Sala

1. Um jogador cria a sala.
2. Outros jogadores entram usando o código.
3. Mostrar a lista de jogadores, vidas e status de conexão.
4. O botão de iniciar deve aparecer quando houver pelo menos 2 jogadores.
5. O servidor continua sendo a autoridade final.

### Início

Ao receber GAME_STARTED:

- mudar para a tela da partida;
- mostrar a fase atual;
- destacar o jogador da vez;
- mostrar controles somente quando for apropriado.

### Primeiro turno

Fluxo:

1. O jogador da vez recebe YOUR_TURN na fase rolling.
2. Ele pode clicar em "Rolar dados".
3. O servidor muda para announcing.
4. Mostrar os dados apenas para o jogador que rolou.
5. Mostrar opções de anúncio.

### Anúncio

As jogadas possíveis são:

- 4
- 5
- 6
- 7
- 8
- 9
- 10
- 11
- pair_1
- pair_2
- pair_3
- pair_4
- pair_5
- pair_6
- cricket

Exibir nomes amigáveis:

- pair_1: Par de 1
- pair_2: Par de 2
- pair_3: Par de 3
- pair_4: Par de 4
- pair_5: Par de 5
- pair_6: Par de 6
- cricket: Cricket

A nova jogada deve ser maior ou igual à jogada anterior.

A validação visual pode desabilitar opções menores, mas o frontend nunca deve substituir a validação do servidor.

Blefe é permitido. O jogador não precisa anunciar o resultado verdadeiro dos próprios dados.

### Fase challenging

Depois de um anúncio:

- destacar o anúncio atual;
- destacar quem anunciou;
- mostrar ao próximo jogador dois controles:
  - "Desafiar"
  - "Comprar"

"Desafiar" envia CALL_BLUFF.

"Comprar" envia BUY.

BUY não resolve o desafio. BUY significa:

1. o jogador aceita o anúncio anterior;
2. o servidor rola novos dados para ele;
3. o jogador recebe YOUR_TURN na fase announcing;
4. ele deve anunciar uma jogada maior ou igual ao anúncio anterior;
5. depois disso, o próximo jogador poderá desafiar ou comprar.

### Resultado do desafio

Ao receber CHALLENGE_RESULT:

- mostrar uma animação ou modal curto;
- exibir vencedor;
- exibir perdedor;
- exibir quantas vidas foram perdidas;
- exibir a mensagem reason;
- atualizar jogadores e vidas;
- remover o modal após alguns segundos ou permitir fechar.

Se alguém chegar a zero vidas, mostrar que foi eliminado.

### Fim

Ao receber GAME_OVER:

- mostrar vencedor;
- mostrar ranking/lista final de jogadores;
- oferecer botão para voltar à tela inicial;
- limpar roomCode e playerId persistidos.

## Interface da partida

Criar uma tela mobile-first contendo:

- código da sala com botão para copiar;
- rodada atual;
- indicador da fase;
- lista de jogadores;
- vidas de cada jogador;
- destaque visual para o jogador da vez;
- anúncio atual;
- último jogador que anunciou;
- dados quando disponíveis para o jogador autorizado;
- área de ações;
- mensagens de erro;
- botão para sair da sala.

Os controles devem respeitar a fase:

- waiting: mostrar jogadores e botão iniciar;
- rolling: mostrar botão rolar somente para o jogador da vez;
- announcing: mostrar opções de anúncio somente para o jogador da vez;
- challenging: mostrar desafiar/comprar somente para o jogador da vez;
- ended: bloquear ações e mostrar resultado final.

Desabilitar botões enquanto uma mensagem estiver sendo enviada, para evitar cliques duplicados.

## Animações e áudio

Adicionar:

- animação curta ao rolar dados;
- transição visual ao mudar o jogador da vez;
- feedback ao anunciar;
- feedback forte ao desafiar;
- animação ao perder vidas;
- celebração ao vencer;
- sons opcionais para rolagem, anúncio, desafio e vitória;
- botão global para ativar/desativar áudio.

O áudio deve começar apenas após uma interação do usuário com a página.

## Erros e desconexão

Ao receber ERROR, mostrar a mensagem retornada pelo servidor sem substituí-la por uma mensagem genérica.

Se o WebSocket fechar:

- mostrar estado desconectado;
- bloquear ações;
- oferecer botão para reconectar;
- não fingir que a partida continua funcionando;
- como não existe protocolo de reconexão de jogador neste momento, não tentar restaurar automaticamente uma partida antiga sem confirmação do servidor.

## Requisitos técnicos

- TypeScript estrito.
- WebSocket encapsulado em um hook ou serviço reutilizável.
- Estado da partida centralizado.
- Componentes separados para lobby, jogadores, dados, anúncio, ações e resultado.
- Não usar polling.
- Não criar backend falso.
- Não usar REST para substituir o WebSocket.
- Usar VITE_WS_URL para a URL de produção.
- Preparar o build para hospedagem em produção.
- Tratar mensagens inesperadas sem quebrar a aplicação.