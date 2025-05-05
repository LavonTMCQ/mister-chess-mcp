const { exec } = require('child_process');

const GAME_ID = '1936466a-ada5-4ffe-ae36-558b6af0f1f1';
const WHITE_PLAYER = 'agent11';
const BLACK_PLAYER = 'agent12';

// Function to execute a command and return the result
function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

// Function to make a move
async function makeMove(playerId) {
  try {
    // Get the game state
    const gameStateCommand = `curl -s http://localhost:3001/api/tools/call -X POST -H "Content-Type: application/json" -d '{"name":"get_game_state","args":{"gameId":"${GAME_ID}"}}'`;
    const gameStateOutput = await execCommand(gameStateCommand);
    const gameState = JSON.parse(gameStateOutput);
    
    const game = gameState.game;
    
    // Check if the game is over
    if (game.state.isGameOver) {
      console.log(`Game ${GAME_ID} is over: ${game.result || 'No result'} (${game.resultReason || 'unknown reason'})`);
      return false;
    }
    
    // Check if it's the player's turn
    const isPlayerTurn = 
      (game.state.turn === 'w' && playerId === WHITE_PLAYER) || 
      (game.state.turn === 'b' && playerId === BLACK_PLAYER);
    
    if (!isPlayerTurn) {
      console.log(`Not ${playerId}'s turn`);
      return true;
    }
    
    console.log(`It's ${playerId}'s turn!`);
    
    // Choose a random move
    const legalMoves = game.state.legalMoves;
    if (legalMoves.length === 0) {
      console.error('No legal moves available');
      return false;
    }
    
    const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    console.log(`${playerId} is making move:`, randomMove);
    
    // Make the move
    const moveCommand = `curl -s http://localhost:3001/api/tools/call -X POST -H "Content-Type: application/json" -d '{"name":"submit_move","args":{"gameId":"${GAME_ID}","playerId":"${playerId}","move":${JSON.stringify(randomMove)}}}'`;
    const moveOutput = await execCommand(moveCommand);
    const moveResult = JSON.parse(moveOutput);
    
    if (moveResult.success) {
      console.log(`${playerId} made move successfully`);
      
      // Check if the game is over
      if (moveResult.game.state.isGameOver) {
        console.log(`Game ${GAME_ID} is over: ${moveResult.game.result || 'No result'} (${moveResult.game.resultReason || 'unknown reason'})`);
        return false;
      }
      
      return true;
    } else {
      console.error(`Failed to make move: ${moveResult.message}`);
      return true;
    }
  } catch (error) {
    console.error('Error making move:', error.message);
    return true;
  }
}

// Main function to play the game
async function playGame() {
  let continueGame = true;
  
  while (continueGame) {
    // White's turn
    continueGame = await makeMove(WHITE_PLAYER);
    if (!continueGame) break;
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Black's turn
    continueGame = await makeMove(BLACK_PLAYER);
    if (!continueGame) break;
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('Game completed!');
}

// Start playing the game
playGame();
