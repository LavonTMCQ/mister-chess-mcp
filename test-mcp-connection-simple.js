const fetch = require('node-fetch');

async function testMCPConnection() {
  const serverUrl = 'https://mister-chess-mcp-production.up.railway.app/mcp';
  console.log(`Testing connection to MCP server at ${serverUrl}...`);

  try {
    // Step 1: Initialize connection
    console.log('Sending initialize request...');
    const initResponse = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'initialize',
        id: '1'
      })
    });

    if (!initResponse.ok) {
      throw new Error(`HTTP error! status: ${initResponse.status}`);
    }

    const initData = await initResponse.json();
    console.log('Server capabilities:', JSON.stringify(initData, null, 2));

    // Step 2: Call a tool to connect to the chess platform
    console.log('\nCalling connect_chess_platform tool...');
    const toolResponse = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'tool_call',
        id: '2',
        name: 'connect_chess_platform',
        args: {
          agentId: 'test-agent'
        }
      })
    });

    if (!toolResponse.ok) {
      throw new Error(`HTTP error! status: ${toolResponse.status}`);
    }

    const toolData = await toolResponse.json();
    console.log('Tool response:', JSON.stringify(toolData, null, 2));

    console.log('\nConnection test successful!');

    // Return the connection details for Cursor
    return {
      mcp_server: {
        url: 'https://mister-chess-mcp-production.up.railway.app/mcp',
        transport: 'streamable-http'
      },
      connection_command: 'curl -X POST https://mister-chess-mcp-production.up.railway.app/mcp -H "Content-Type: application/json" -d \'{"type":"initialize","id":"1"}\''
    };
  } catch (error) {
    console.error('Error connecting to MCP server:', error);
    throw error;
  }
}

// Run the test
testMCPConnection()
  .then(connectionDetails => {
    console.log('\nConnection details for Cursor:');
    console.log(JSON.stringify(connectionDetails, null, 2));
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
