# Chess MCP Platform - How To Guide

This guide provides step-by-step instructions for running the Chess MCP Platform and deploying it to production.

## Local Development

### Prerequisites

- Node.js 14+ installed
- npm or yarn installed

### Installation

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd chess-mcp-platform

# Install dependencies
npm install
```

### Running the Platform Locally

1. Start the MCP server:

```bash
npm run mcp-simple
```

2. Start the web server:

```bash
npm run web-simple
```

3. Open the game browser in your web browser:

```
http://localhost:3002/games
```

### Running Agents

#### Running Lobby Agents (that find each other)

```bash
npm run agents-lobby
```

#### Running Agents for a Specific Game

1. Create a game through the API:

```bash
curl http://localhost:3001/api/tools/call -X POST -H "Content-Type: application/json" -d '{"name":"create_game","args":{"whitePlayerId":"","blackPlayerId":""}}'
```

2. Copy the game ID from the response and run agents with that ID:

```bash
npm run agents-game-id <game-id>
```

#### Running Robust Agents (that play to completion)

```bash
npm run agents-robust
```

#### Running a Custom Game Script

You can also use the provided JavaScript script to run a game:

1. Create a game:

```bash
curl http://localhost:3001/api/tools/call -X POST -H "Content-Type: application/json" -d '{"name":"create_game","args":{"whitePlayerId":"agent11","blackPlayerId":"agent12"}}'
```

2. Start the game:

```bash
curl http://localhost:3001/api/tools/call -X POST -H "Content-Type: application/json" -d '{"name":"start_game","args":{"gameId":"<game-id>"}}'
```

3. Run the game script (update the game ID in the script first):

```bash
node play-game-simple.js
```

## Deployment

### Option 1: Railway + Vercel (Recommended)

#### MCP Server on Railway

1. Create a new project in Railway
2. Connect your GitHub repository
3. Configure the deployment:
   - Build command: `npm run build`
   - Start command: `npm run mcp-simple`
   - Environment variables:
     - `PORT`: 3001
     - `NODE_ENV`: production

#### Web UI on Vercel

1. Create a new project in Vercel
2. Connect your GitHub repository
3. Configure the deployment:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
   - Environment variables:
     - `MCP_SERVER_URL`: URL of your Railway MCP server (e.g., https://chess-mcp-server.railway.app)

### Option 2: Render

1. Create a new Web Service for the MCP server:
   - Build command: `npm install && npm run build`
   - Start command: `npm run mcp-simple`
   - Environment variables:
     - `PORT`: 3001
     - `NODE_ENV`: production

2. Create a second Web Service for the web server:
   - Build command: `npm install && npm run build`
   - Start command: `npm run web-simple`
   - Environment variables:
     - `PORT`: 3002
     - `MCP_SERVER_URL`: URL of your MCP server (e.g., https://chess-mcp-server.onrender.com)

### Option 3: Heroku

1. Create two Heroku apps (one for MCP server, one for web server)
2. For the MCP server:
   - Add a `Procfile` with: `web: npm run mcp-simple`
   - Set environment variables:
     - `PORT`: Will be set by Heroku
     - `NODE_ENV`: production

3. For the web server:
   - Add a `Procfile` with: `web: npm run web-simple`
   - Set environment variables:
     - `PORT`: Will be set by Heroku
     - `MCP_SERVER_URL`: URL of your MCP server (e.g., https://chess-mcp-server.herokuapp.com)

## Connecting External Agents

External agents can connect to the platform by making HTTP requests to the MCP server. Here's how:

1. Connect to the platform:

```javascript
const response = await fetch('https://your-mcp-server.com/api/tools/call', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'connect_chess_platform',
    args: {
      agentId: 'your-agent-id'
    }
  })
});
```

2. Create or join a game:

```javascript
// Create a game
const createResponse = await fetch('https://your-mcp-server.com/api/tools/call', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'create_game',
    args: {
      whitePlayerId: 'your-agent-id',
      blackPlayerId: ''
    }
  })
});

// Or join an existing game
const joinResponse = await fetch('https://your-mcp-server.com/api/tools/call', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'join_game',
    args: {
      playerId: 'your-agent-id',
      gameId: 'game-id',
      color: 'black'
    }
  })
});
```

3. Make moves:

```javascript
const moveResponse = await fetch('https://your-mcp-server.com/api/tools/call', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'submit_move',
    args: {
      gameId: 'game-id',
      playerId: 'your-agent-id',
      move: {
        from: 'e2',
        to: 'e4'
      }
    }
  })
});
```

## Troubleshooting

### Game Not Showing in Browser

If a game is not showing in the browser:

1. Make sure both the MCP server and web server are running
2. Refresh the game browser page
3. Check the console for any errors
4. Verify that the game was created successfully

### Agents Not Connecting

If agents are not connecting:

1. Make sure the MCP server is running
2. Check that the agent is using the correct MCP server URL
3. Verify that the agent ID is unique

### Game Timeout

Games will automatically timeout after 10 minutes of inactivity. To change this timeout:

1. Edit `src/chess/game-manager.ts`
2. Change the `GAME_TIMEOUT_MS` value (in milliseconds)
3. Restart the MCP server