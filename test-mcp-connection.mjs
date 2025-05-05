#!/usr/bin/env node

import { MCPClient } from '@modelcontextprotocol/sdk/client/index.js';

// Replace this with your actual MCP server URL
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'https://mister-chess-mcp-production.up.railway.app';

async function testMCPConnection() {
  console.log(`Testing connection to MCP server at ${MCP_SERVER_URL}...`);
  
  try {
    // Create MCP client
    const client = new MCPClient({
      url: MCP_SERVER_URL,
      transport: 'streamable-http'
    });
    
    // Connect to the server
    console.log('Connecting to MCP server...');
    await client.connect();
    console.log('✅ Successfully connected to MCP server!');
    
    // Get available tools
    console.log('\nFetching available tools...');
    const tools = await client.getTools();
    console.log('✅ Available tools:');
    tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description || 'No description'}`);
    });
    
    // Connect to the chess platform
    console.log('\nConnecting to chess platform...');
    const connectResult = await client.callTool('connect_chess_platform', {
      agentId: 'test-agent'
    });
    console.log(`✅ Connected to chess platform: ${JSON.stringify(connectResult, null, 2)}`);
    
    // Create a test game
    console.log('\nCreating a test game...');
    const createResult = await client.callTool('create_game', {
      createOpenGame: true,
      playerId: 'test-agent',
      playerColor: 'white'
    });
    console.log(`✅ Created test game: ${JSON.stringify(createResult, null, 2)}`);
    
    // Get game state
    console.log('\nFetching game state...');
    const gameId = createResult.gameId;
    const stateResult = await client.callTool('get_game_state', {
      gameId: gameId
    });
    console.log(`✅ Game state: ${JSON.stringify(stateResult, null, 2)}`);
    
    // Clean up - we don't want to leave test games around
    console.log('\nTest completed successfully!');
    console.log('Note: A test game has been created on the server. It will remain in "waiting" status.');
    console.log(`Game ID: ${gameId}`);
    
    // Disconnect
    await client.disconnect();
    
  } catch (error) {
    console.error('❌ Error connecting to MCP server:', error);
    process.exit(1);
  }
}

// Run the test
testMCPConnection().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
