const axios = require('axios');

const API_URL = 'http://localhost:3001';
const GAME_ID = '1936466a-ada5-4ffe-ae36-558b6af0f1f1';
const WHITE_PLAYER = 'agent11';
const BLACK_PLAYER = 'agent12';

// Function to make a move
async function makeMove(playerId) {
  try {
    // Get the game state
    const gameStateResponse = await axios.post(`${API_URL}/api/tools/call`, {
      name: 'get_game_state',
      args: { gameId: GAME_ID }
    });
    
    const game = gameStateResponse.data.game;
    
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
    const moveResponse = await axios.post(`${API_URL}/api/tools/call`, {
      name: 'submit_move',
      args: {
        gameId: GAME_ID,
        playerId,
        move: randomMove
      }
    });
    
    if (moveResponse.data.success) {
      console.log(`${playerId} made move successfully`);
      
      // Check if the game is over
      if (moveResponse.data.game.state.isGameOver) {
        console.log(`Game ${GAME_ID} is over: ${moveResponse.data.game.result || 'No result'} (${moveResponse.data.game.resultReason || 'unknown reason'})`);
        return false;
      }
      
      return true;
    } else {
      console.error(`Failed to make move: ${moveResponse.data.message}`);
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
