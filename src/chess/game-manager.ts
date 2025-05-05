import { Chess } from 'chess.js';
import { ChessGame, ChessGameState, ChessMove } from './types';
import { v4 as uuidv4 } from 'uuid';

export class ChessGameManager {
  private games: Map<string, ChessGame> = new Map();
  private chessEngines: Map<string, Chess> = new Map();
  private gameTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly GAME_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Create a new chess game
   * @param whitePlayer White player ID (can be empty string to indicate an open slot)
   * @param blackPlayer Black player ID (can be empty string to indicate an open slot)
   */
  createGame(whitePlayer: string, blackPlayer: string): ChessGame {
    const gameId = uuidv4();
    const chess = new Chess();

    const gameState = this.getGameState(chess);

    const game: ChessGame = {
      id: gameId,
      whitePlayer,
      blackPlayer,
      state: gameState,
      status: 'waiting',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.games.set(gameId, game);
    this.chessEngines.set(gameId, chess);

    return game;
  }

  /**
   * Create a game with an open slot
   * @param creatorId ID of the player creating the game
   * @param creatorColor Color the creator wants to play as ('white' or 'black')
   */
  createOpenGame(creatorId: string, creatorColor: 'white' | 'black'): ChessGame {
    if (creatorColor === 'white') {
      return this.createGame(creatorId, '');
    } else {
      return this.createGame('', creatorId);
    }
  }

  /**
   * Start a game
   */
  startGame(gameId: string): ChessGame {
    const game = this.getGame(gameId);

    if (game.status !== 'waiting') {
      throw new Error(`Game ${gameId} is not in waiting status`);
    }

    game.status = 'active';
    game.updatedAt = new Date();

    // Set a timeout for the game
    this.setGameTimeout(gameId);

    return game;
  }

  /**
   * Make a move in a game
   */
  makeMove(gameId: string, playerId: string, move: ChessMove): ChessGame {
    const game = this.getGame(gameId);
    const chess = this.getChessEngine(gameId);

    if (game.status !== 'active') {
      throw new Error(`Game ${gameId} is not active`);
    }

    // Check if it's the player's turn
    const isWhiteTurn = chess.turn() === 'w';
    if ((isWhiteTurn && playerId !== game.whitePlayer) ||
        (!isWhiteTurn && playerId !== game.blackPlayer)) {
      throw new Error(`Not ${playerId}'s turn`);
    }

    // Make the move
    try {
      chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion
      });
    } catch (error) {
      throw new Error(`Invalid move: ${error}`);
    }

    // Update game state
    game.state = this.getGameState(chess);
    game.updatedAt = new Date();

    // Reset the game timeout since there was activity
    this.resetGameTimeout(gameId);

    // Check if game is over
    if (game.state.isGameOver) {
      game.status = 'completed';

      // Clear any timeout for this game
      this.clearGameTimeout(gameId);

      if (game.state.isCheckmate) {
        game.result = chess.turn() === 'w' ? 'black' : 'white';
        game.resultReason = 'checkmate';
      } else if (game.state.isDraw) {
        game.result = 'draw';

        if (chess.isStalemate()) {
          game.resultReason = 'stalemate';
        } else if (chess.isThreefoldRepetition()) {
          game.resultReason = 'threefold repetition';
        } else if (chess.isInsufficientMaterial()) {
          game.resultReason = 'insufficient material';
        } else if (chess.isDraw()) {
          game.resultReason = 'fifty-move rule';
        }
      }
    }

    return game;
  }

  /**
   * Get a game by ID
   */
  getGame(gameId: string): ChessGame {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }
    return game;
  }

  /**
   * Get all games
   */
  getAllGames(): ChessGame[] {
    return Array.from(this.games.values());
  }

  /**
   * Get games for a player
   */
  getPlayerGames(playerId: string): ChessGame[] {
    return Array.from(this.games.values()).filter(
      game => game.whitePlayer === playerId || game.blackPlayer === playerId
    );
  }

  /**
   * Get the chess engine for a game
   */
  private getChessEngine(gameId: string): Chess {
    const chess = this.chessEngines.get(gameId);
    if (!chess) {
      throw new Error(`Chess engine for game ${gameId} not found`);
    }
    return chess;
  }

  /**
   * Get the current game state from a chess engine
   */
  private getGameState(chess: Chess): ChessGameState {
    const legalMoves: ChessMove[] = [];

    // Get all legal moves
    chess.moves({ verbose: true }).forEach(move => {
      legalMoves.push({
        from: move.from,
        to: move.to,
        promotion: move.promotion
      });
    });

    return {
      fen: chess.fen(),
      turn: chess.turn() as 'w' | 'b',
      legalMoves,
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isDraw: chess.isDraw(),
      isGameOver: chess.isGameOver(),
      history: chess.history({ verbose: true }).map(move => ({
        from: move.from,
        to: move.to,
        promotion: move.promotion
      }))
    };
  }

  /**
   * End a game due to timeout
   */
  private endGameDueToTimeout(gameId: string): void {
    const game = this.getGame(gameId);

    // Only end active games
    if (game.status !== 'active') {
      return;
    }

    game.status = 'completed';
    game.result = 'draw';
    game.resultReason = 'timeout - no activity';
    game.updatedAt = new Date();

    console.log(`Game ${gameId} ended due to timeout`);
  }

  /**
   * Set a timeout for a game
   */
  private setGameTimeout(gameId: string): void {
    // Clear any existing timeout
    this.clearGameTimeout(gameId);

    // Set a new timeout
    const timeout = setTimeout(() => {
      this.endGameDueToTimeout(gameId);
    }, this.GAME_TIMEOUT_MS);

    this.gameTimeouts.set(gameId, timeout);
  }

  /**
   * Reset the timeout for a game
   */
  private resetGameTimeout(gameId: string): void {
    this.setGameTimeout(gameId);
  }

  /**
   * Clear the timeout for a game
   */
  private clearGameTimeout(gameId: string): void {
    const timeout = this.gameTimeouts.get(gameId);
    if (timeout) {
      clearTimeout(timeout);
      this.gameTimeouts.delete(gameId);
    }
  }
}
