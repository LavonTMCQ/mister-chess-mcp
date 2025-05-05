const { exec } = require('child_process');

// Function to make a curl request and parse the response
function curlRequest(url, data) {
  return new Promise((resolve, reject) => {
    exec(`curl -s ${url} -X POST -H "Content-Type: application/json" -d '${JSON.stringify(data)}'`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      try {
        const response = JSON.parse(stdout);
        resolve(response);
      } catch (e) {
        reject(new Error(`Error parsing response: ${e.message}`));
      }
    });
  });
}

// Function to make a move
async function makeMove(playerId, gameId) {
  try {
    // Get the game state
    const gameState = await curlRequest('http://localhost:3001/api/tools/call', {
      name: 'get_game_state',
      args: { gameId }
    });

    if (!gameState.success) {
      console.error(`Failed to get game state: ${gameState.message}`);
      setTimeout(() => makeMove(playerId, gameId), 2000);
      return;
    }

    const game = gameState.game;

    // Check if the game is over
    if (game.state.isGameOver) {
      console.log(`Game ${gameId} is over: ${game.result || 'No result'} (${game.resultReason || 'unknown reason'})`);
      return;
    }

    // Check if it's the player's turn
    const isPlayerTurn =
      (game.state.turn === 'w' && game.whitePlayer === playerId) ||
      (game.state.turn === 'b' && game.blackPlayer === playerId);

    if (!isPlayerTurn) {
      console.log(`Not ${playerId}'s turn, waiting...`);
      setTimeout(() => makeMove(playerId, gameId), 2000);
      return;
    }

    console.log(`It's ${playerId}'s turn!`);

    // Choose a random move
    const legalMoves = game.state.legalMoves;
    if (legalMoves.length === 0) {
      console.error('No legal moves available');
      return;
    }

    const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    console.log(`${playerId} is making move:`, randomMove);

    // Make the move
    const moveResult = await curlRequest('http://localhost:3001/api/tools/call', {
      name: 'submit_move',
      args: {
        gameId,
        playerId,
        move: randomMove
      }
    });

    if (moveResult.success) {
      console.log(`${playerId} made move successfully`);

      // Check if the game is over
      if (moveResult.game.state.isGameOver) {
        console.log(`Game ${gameId} is over: ${moveResult.game.result || 'No result'} (${moveResult.game.resultReason || 'unknown reason'})`);
        return;
      }

      // Wait a bit before checking again
      setTimeout(() => makeMove(playerId, gameId), 1000);
    } else {
      console.error(`Failed to make move: ${moveResult.message}`);
      setTimeout(() => makeMove(playerId, gameId), 2000);
    }
  } catch (error) {
    console.error(`Error in makeMove: ${error.message}`);
    setTimeout(() => makeMove(playerId, gameId), 2000);
  }
}

// Main function to run the agents
async function runAgents() {
  try {
    // Create a new game
    const createResult = await curlRequest('http://localhost:3001/api/tools/call', {
      name: 'create_game',
      args: {
        whitePlayerId: 'agent9',
        blackPlayerId: 'agent10'
      }
    });

    if (!createResult.success) {
      console.error(`Failed to create game: ${createResult.message}`);
      return;
    }

    const gameId = createResult.gameId;
    console.log(`Game created with ID: ${gameId}`);

    // Start the game
    const startResult = await curlRequest('http://localhost:3001/api/tools/call', {
      name: 'start_game',
      args: { gameId }
    });

    if (!startResult.success) {
      console.error(`Failed to start game: ${startResult.message}`);
      return;
    }

    console.log(`Game ${gameId} started successfully`);
    console.log('Running agents...');

    // Start both agents
    makeMove('agent9', gameId);
    makeMove('agent10', gameId);
  } catch (error) {
    console.error(`Error in runAgents: ${error.message}`);
  }
}

// Run the agents
runAgents();
