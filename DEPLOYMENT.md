# Chess MCP Platform Deployment Guide

This guide explains how to deploy the Chess MCP Platform to cloud services.

## Architecture

The Chess MCP Platform consists of two main components:

1. **MCP Server**: Handles the chess game logic and provides tools for agents to interact with the platform
2. **Web Server**: Serves the web UI for users to view and interact with games

## Deployment Options

### Option 1: Railway + Vercel (Recommended)

#### MCP Server on Railway

[Railway](https://railway.app/) is a great platform for deploying backend services.

1. Create a new project in Railway
2. Connect your GitHub repository
3. Configure the deployment:
   - Build command: `npm run build`
   - Start command: `npm run mcp-simple`
   - Environment variables:
     - `PORT`: 3001
     - `NODE_ENV`: production

#### Web UI on Vercel

[Vercel](https://vercel.com/) is ideal for hosting the web UI.

1. Create a new project in Vercel
2. Connect your GitHub repository
3. Configure the deployment:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
   - Environment variables:
     - `MCP_SERVER_URL`: URL of your Railway MCP server (e.g., https://chess-mcp-server.railway.app)

### Option 2: Render

[Render](https://render.com/) can host both the MCP server and web server.

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

[Heroku](https://www.heroku.com/) is another option for hosting both servers.

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

## Preparing for Deployment

Before deploying, make these changes to the codebase:

### 1. Update the MCP server to use environment variables

```typescript
// src/mcp-simple-server.ts
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
```

### 2. Update the web server to use environment variables

```typescript
// src/simple-web-server.ts
const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;
```

### 3. Update the web UI to use the MCP server URL from environment variables

```typescript
// public/game-browser.html
const API_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';
```

## Connecting Agents to the Deployed Platform

Agents can connect to the deployed platform by specifying the MCP server URL:

```typescript
// Example: Connecting an agent to the deployed platform
const agent = new LobbyChessAgent('agent1', 'white', 'https://chess-mcp-server.railway.app');
```

## CORS Configuration

Make sure CORS is properly configured to allow the web UI to communicate with the MCP server:

```typescript
// src/mcp-simple-server.ts
import cors from 'cors';

// Enable CORS for all routes
app.use(cors());
```

## Scaling Considerations

- The current implementation uses in-memory storage, which means games will be lost if the server restarts
- For production use, consider implementing a database backend (e.g., MongoDB, PostgreSQL)
- For high traffic, consider implementing a load balancer and multiple MCP server instances

## Monitoring

- Set up monitoring for both servers to track performance and errors
- Use logging services like Papertrail or LogDNA to capture and analyze logs
- Set up alerts for server downtime or high error rates
