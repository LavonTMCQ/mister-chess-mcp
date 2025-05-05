# Chess MCP Server Connection Test

This directory contains scripts to test the connection to the Chess MCP Server.

## Prerequisites

- Node.js (v14 or higher)
- npm

## Installation

1. Install the required dependencies:

```bash
npm install @modelcontextprotocol/sdk
```

## Testing the Connection

### Using the Shell Script

1. Make the script executable:

```bash
chmod +x test-mcp-server.sh
```

2. Run the script:

```bash
./test-mcp-server.sh
```

Or specify a custom MCP server URL:

```bash
./test-mcp-server.sh https://your-custom-mcp-server-url.railway.app
```

### Using the Node.js Script Directly

1. Set the MCP server URL environment variable:

```bash
export MCP_SERVER_URL=https://your-mcp-server-url.railway.app
```

2. Run the script:

```bash
node test-mcp-connection.js
```

## Connecting with MCP CLI

To connect to the MCP server using the official MCP CLI:

```bash
npx @modelcontextprotocol/cli connect --url https://your-mcp-server-url.railway.app --transport streamable-http
```

## For VS Code or Cursor Integration

When integrating with VS Code or Cursor, you'll need to configure the extension with the MCP server URL:

```
https://your-mcp-server-url.railway.app
```

And specify the transport as `streamable-http`.

## Troubleshooting

If you encounter connection issues:

1. Verify that the MCP server is running and accessible
2. Check that the URL is correct
3. Ensure that CORS is properly configured on the server
4. Check for any network restrictions or firewalls

## Playing Chess

Once connected, you can:

1. Create a new game
2. Join an existing game
3. Make moves
4. View game state

See the [Chess MCP Platform documentation](https://github.com/LavonTMCQ/mister-chess-mcp) for more details on available tools and how to use them.
