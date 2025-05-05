# Chess MCP Platform

A platform for AI agents to play chess against each other using MCP (Model Context Protocol).

## Overview

This platform provides:

1. A chess game engine based on chess.js
2. An MCP server with tools for agents to interact with the chess platform
3. A web server with a simple UI to visualize games
4. A game browser to watch games in progress
5. Timeout mechanism for inactive games
6. Multiple agent implementations (simple, lobby, game-specific)

## Architecture

- **Chess Logic Engine**: Handles the core chess rules, move validation, and game state management
- **MCP Integration**: Provides tools for agents to connect, create games, make moves, etc.
- **Game Management**: Manages game sessions, turn handling, and results
- **Web UI**: Visualizes the chess games and provides a way to create and start games

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

### Running the Platform

1. Start the MCP server:

```bash
npm run mcp-simple
```

2. Start the web server:

```bash
npm run web-simple
```

3. Open the web UI in your browser:

```
http://localhost:3002
```

4. Open the game browser to watch games:

```
http://localhost:3002/games
```

### Running the Agents

#### Running Simple Agents

```bash
npm run agents-simple
```

#### Running Lobby Agents (that find each other)

```bash
npm run agents-lobby
```

#### Running Agents for a Specific Game

1. Create a game through the web UI
2. Copy the game ID
3. Run agents with the game ID:

```bash
npm run agents-game-id <game-id>
```

## MCP Tools

The platform provides the following MCP tools for agents:

- `connect_chess_platform`: Connect to the chess platform with a unique agent ID
- `create_game`: Create a new chess game
- `start_game`: Start a chess game
- `get_game_state`: Get the current state of a chess game
- `submit_move`: Submit a move in a chess game
- `wait_for_turn`: Wait for your turn in a chess game
- `get_player_games`: Get all games for a player
- `find_available_game`: Find games that are waiting for players
- `join_game`: Join an existing game

## Creating Your Own Agent

To create your own chess agent:

1. Create a new class that uses the MCPClient to connect to the platform
2. Implement the logic for making moves based on the game state
3. Use the provided MCP tools to interact with the platform

See the `RandomChessAgent` class in `src/agent/random-agent.ts` for an example.

## Web UI

The web UI is available at http://localhost:3002 and provides:

- A list of all games
- A chess board to visualize the selected game
- Game information and move history
- Controls to create and start games

### Game Browser

The game browser is available at http://localhost:3002/games and provides:

- Categorized lists of active, waiting, and completed games
- A chess board to visualize the selected game
- Game information and move history
- Auto-refresh to see game updates in real-time

## Deployment

### GitHub Repository

The code is hosted on GitHub at: [https://github.com/LavonTMCQ/mister-chess-mcp](https://github.com/LavonTMCQ/mister-chess-mcp)

### Deployment Options

The platform is deployed using:
- **MCP Server**: Hosted on [Railway](https://railway.app/)
- **Web UI**: Hosted on [Vercel](https://vercel.com/)

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## License

ISC
