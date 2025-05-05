// Connect to the server
const socket = io();

// Game state
let games = [];
let selectedGame = null;
let board = null;
let chess = null;

// Initialize the chess board
function initBoard() {
  // If a board already exists, destroy it
  if (board) {
    board.destroy();
  }
  
  // Create a new board with the starting position
  const config = {
    position: 'start',
    draggable: false,
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
  };
  
  board = Chessboard('board', config);
  chess = new Chess();
  
  // Resize the board to fit the container
  $(window).resize(() => {
    board.resize();
  });
}

// Update the board with a game's position
function updateBoard(game) {
  if (!board) {
    initBoard();
  }
  
  // Update the chess.js instance with the game's FEN
  chess.load(game.state.fen);
  
  // Update the board
  board.position(game.state.fen);
}

// Render the list of games
function renderGamesList() {
  const container = $('#games-container');
  container.empty();
  
  if (games.length === 0) {
    container.html('<p>No games available</p>');
    return;
  }
  
  games.forEach(game => {
    const gameElement = $('<div>')
      .addClass('game-item')
      .attr('data-id', game.id)
      .html(`
        <strong>Game ${game.id.substring(0, 8)}...</strong><br>
        White: ${game.whitePlayer}<br>
        Black: ${game.blackPlayer}<br>
        Status: ${game.status}
      `);
    
    if (selectedGame && selectedGame.id === game.id) {
      gameElement.addClass('active');
    }
    
    gameElement.on('click', () => {
      selectGame(game);
    });
    
    container.append(gameElement);
  });
}

// Render game information
function renderGameInfo(game) {
  const container = $('#game-info-container');
  container.empty();
  
  if (!game) {
    container.html('<p>Select a game to view details</p>');
    return;
  }
  
  let resultText = '';
  if (game.status === 'completed') {
    if (game.result === 'white') {
      resultText = 'White won by ' + game.resultReason;
    } else if (game.result === 'black') {
      resultText = 'Black won by ' + game.resultReason;
    } else {
      resultText = 'Game drawn by ' + game.resultReason;
    }
  }
  
  container.html(`
    <p><strong>Game ID:</strong> ${game.id}</p>
    <p><strong>White Player:</strong> ${game.whitePlayer}</p>
    <p><strong>Black Player:</strong> ${game.blackPlayer}</p>
    <p><strong>Status:</strong> ${game.status}</p>
    <p><strong>Turn:</strong> ${game.state.turn === 'w' ? 'White' : 'Black'}</p>
    <p><strong>Check:</strong> ${game.state.isCheck ? 'Yes' : 'No'}</p>
    <p><strong>Game Over:</strong> ${game.state.isGameOver ? 'Yes' : 'No'}</p>
    ${resultText ? `<p><strong>Result:</strong> ${resultText}</p>` : ''}
  `);
  
  // Update move history
  renderMoveHistory(game);
  
  // Update the start game button
  const startGameBtn = $('#start-game-btn');
  startGameBtn.prop('disabled', game.status !== 'waiting');
}

// Render move history
function renderMoveHistory(game) {
  const container = $('#move-history');
  container.empty();
  
  if (!game || game.state.history.length === 0) {
    container.html('<p>No moves yet</p>');
    return;
  }
  
  const movesList = $('<div>');
  
  game.state.history.forEach((move, index) => {
    const moveNumber = Math.floor(index / 2) + 1;
    const isWhiteMove = index % 2 === 0;
    
    const moveText = `${moveNumber}. ${isWhiteMove ? '' : '...'} ${move.from}-${move.to}${move.promotion ? '=' + move.promotion.toUpperCase() : ''}`;
    
    const moveElement = $('<div>')
      .addClass('move-history-item')
      .text(moveText);
    
    movesList.append(moveElement);
  });
  
  container.append(movesList);
}

// Select a game
function selectGame(game) {
  selectedGame = game;
  
  // Update the board
  updateBoard(game);
  
  // Update the game info
  renderGameInfo(game);
  
  // Update the games list to highlight the selected game
  $('.game-item').removeClass('active');
  $(`.game-item[data-id="${game.id}"]`).addClass('active');
}

// Create a new game
function createGame(whitePlayer, blackPlayer) {
  $.ajax({
    url: '/api/games',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ whitePlayer, blackPlayer }),
    success: (game) => {
      games.push(game);
      renderGamesList();
      selectGame(game);
    },
    error: (error) => {
      console.error('Error creating game:', error);
      alert('Failed to create game');
    }
  });
}

// Start a game
function startGame(gameId) {
  $.ajax({
    url: `/api/games/${gameId}/start`,
    method: 'POST',
    success: (game) => {
      // Update the game in the games array
      const index = games.findIndex(g => g.id === game.id);
      if (index !== -1) {
        games[index] = game;
      }
      
      renderGamesList();
      selectGame(game);
    },
    error: (error) => {
      console.error('Error starting game:', error);
      alert('Failed to start game');
    }
  });
}

// Initialize the application
function init() {
  // Initialize the board
  initBoard();
  
  // Set up event handlers
  $('#create-game-form').on('submit', function(e) {
    e.preventDefault();
    
    const whitePlayer = $('#white-player').val();
    const blackPlayer = $('#black-player').val();
    
    createGame(whitePlayer, blackPlayer);
  });
  
  $('#start-game-btn').on('click', function() {
    if (selectedGame && selectedGame.status === 'waiting') {
      startGame(selectedGame.id);
    }
  });
  
  // Socket.io event handlers
  socket.on('allGames', (allGames) => {
    games = allGames;
    renderGamesList();
    
    // Select the first game if available
    if (games.length > 0 && !selectedGame) {
      selectGame(games[0]);
    }
  });
  
  socket.on('gameUpdated', (updatedGame) => {
    // Update the game in the games array
    const index = games.findIndex(game => game.id === updatedGame.id);
    if (index !== -1) {
      games[index] = updatedGame;
    } else {
      games.push(updatedGame);
    }
    
    renderGamesList();
    
    // If this is the selected game, update the view
    if (selectedGame && selectedGame.id === updatedGame.id) {
      selectGame(updatedGame);
    }
  });
}

// Initialize when the document is ready
$(document).ready(init);
