export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
}

export interface ChessGameState {
  fen: string;
  turn: 'w' | 'b';
  legalMoves: ChessMove[];
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  history: ChessMove[];
}

export interface ChessGame {
  id: string;
  whitePlayer: string;
  blackPlayer: string;
  state: ChessGameState;
  status: 'waiting' | 'active' | 'completed';
  result?: 'white' | 'black' | 'draw';
  resultReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
