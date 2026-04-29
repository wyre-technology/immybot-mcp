# @wyre-technology/immybot-mcp

MCP server for ImmyBot - Windows endpoint management and software deployment automation.

## Features

- 🔐 **OAuth 2.0 Authentication** - Microsoft Entra ID client credentials
- 🏢 **Multi-tenant Support** - Per-instance subdomain configuration  
- 🧭 **Decision Tree Navigation** - Organized tool discovery by domain
- 💻 **Comprehensive Coverage** - Computers, software, deployments, scripts, tenants, maintenance sessions, tasks
- ⚡ **Gateway Ready** - Stateless per-request operation for WYRE MCP Gateway
- 🚀 **Docker Deployment** - Container-ready with health checks
- 📊 **Structured Logging** - Detailed operation tracking

## Quick Start

### Docker (Recommended)

```bash
docker run -d \
  --name immybot-mcp \
  -p 8080:8080 \
  -e AUTH_MODE=gateway \
  -e MCP_HTTP_PORT=8080 \
  -e LOG_LEVEL=info \
  ghcr.io/wyre-technology/immybot-mcp:latest
```

### Direct Installation

```bash
npm install @wyre-technology/immybot-mcp
npx @wyre-technology/immybot-mcp
```

## Navigation

The server uses decision-tree navigation to organize tools by domain:

1. **Start** → `immybot_navigate` → Choose domain
2. **Domain tools** → Domain-specific operations  
3. **Return** → `immybot_back` → Main navigation

### Available Domains

- **computers** - Device and endpoint management
- **software** - Application and package management  
- **deployments** - Software deployment configuration
- **scripts** - PowerShell script execution and management
- **tenants** - Client organization management
- **maintenance_sessions** - Device maintenance and state reconciliation
- **tasks** - Background operation monitoring

## Authentication

ImmyBot uses OAuth 2.0 with Microsoft Entra ID:

### Required Configuration

| Field | Description | Example |
|-------|-------------|---------|
| `instanceSubdomain` | ImmyBot instance subdomain | `acmemsp` |
| `tenantId` | Microsoft Entra tenant ID | `12345678-1234-1234-1234-123456789abc` |
| `clientId` | Application (client) ID | `87654321-4321-4321-4321-cba987654321` |
| `clientSecret` | Client secret value | `your-client-secret` |

### Setup Steps

1. **Register Enterprise Application** in Microsoft Entra ID
2. **Grant ImmyBot API permissions** to the application
3. **Create client secret** for the application  
4. **Configure application** in ImmyBot settings

OAuth scope: `api://{client_id}/.default`

## Usage Examples

### 1. Navigate to Computers Domain

```javascript
// Start navigation
await callTool('immybot_navigate', { domain: 'computers' });

// List computers
await callTool('immybot_computers_list', { 
  tenantId: 1,
  isOnline: true 
});

// Get computer details
await callTool('immybot_computers_get', { computerId: 123 });
```

### 2. Software Management

```javascript
// Navigate to software domain
await callTool('immybot_navigate', { domain: 'software' });

// Search for software
await callTool('immybot_software_search', { query: 'Chrome' });

// Install software (stages for maintenance session)
await callTool('immybot_software_install', {
  softwareId: 456,
  computerIds: [123, 124, 125],
  autoUpdate: true
});
```

### 3. Maintenance Sessions

```javascript
// Navigate to maintenance sessions
await callTool('immybot_navigate', { domain: 'maintenance_sessions' });

// Start maintenance session (reconciles deployments)
await callTool('immybot_maintenance_sessions_start', {
  computerId: 123,
  sessionType: 'Manual'
});

// Check session status
await callTool('immybot_maintenance_sessions_get', { sessionId: 789 });
```

## Two-Step Deployment Model

⚠️ **Important**: ImmyBot uses a two-step deployment workflow:

1. **Configure desired state** - Software installations create deployments
2. **Reconcile via maintenance session** - Sessions apply the desired state

```javascript
// Step 1: Stage software installation
await callTool('immybot_software_install', {
  softwareId: 123,
  computerIds: [456]
});
// ↑ This creates a deployment, does NOT install immediately

// Step 2: Reconcile state
await callTool('immybot_maintenance_sessions_start', {
  computerId: 456
});
// ↑ This runs the maintenance session to actually install software
```

## Environment Variables

### Gateway Mode (Docker)

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_MODE` | `direct` | Set to `gateway` for WYRE MCP Gateway |
| `MCP_TRANSPORT` | `stdio` | Transport mode (`http` or `stdio`) |
| `MCP_HTTP_PORT` | `8080` | HTTP server port |
| `LOG_LEVEL` | `info` | Logging level (`debug`, `info`, `warn`, `error`) |

### Direct Mode (CLI)

| Variable | Required | Description |
|----------|----------|-------------|
| `IMMYBOT_INSTANCE_SUBDOMAIN` | ✅ | ImmyBot instance subdomain |
| `IMMYBOT_TENANT_ID` | ✅ | Microsoft Entra tenant ID |
| `IMMYBOT_CLIENT_ID` | ✅ | Application client ID |
| `IMMYBOT_CLIENT_SECRET` | ✅ | Client secret |

## Tools Reference

### Navigation Tools

| Tool | Description |
|------|-------------|
| `immybot_navigate` | Navigate to domain |
| `immybot_status` | Show current state |
| `immybot_back` | Return to main menu |

### Computers Tools

| Tool | Description |
|------|-------------|
| `immybot_computers_list` | List computers with filtering |
| `immybot_computers_get` | Get computer details |
| `immybot_computers_search` | Search computers by name |
| `immybot_computers_inventory` | Get hardware/software inventory |
| `immybot_computers_create` | Create computer record |
| `immybot_computers_deployments` | List computer deployments |
| `immybot_computers_trigger_checkin` | Force agent check-in |

### Software Tools

| Tool | Description |
|------|-------------|
| `immybot_software_list_global` | List global software packages |
| `immybot_software_list` | List all software (global + tenant) |
| `immybot_software_get` | Get software details |
| `immybot_software_search` | Search software by name |
| `immybot_software_versions` | List software versions |
| `immybot_software_latest_version` | Get latest version |
| `immybot_software_categories` | List categories |
| `immybot_software_publishers` | List publishers |
| `immybot_software_install` | Stage software installation |
| `immybot_software_stats` | Get installation statistics |

## Error Handling

The server provides structured error responses:

```json
{
  "content": [{"type": "text", "text": "Error: Authentication failed"}],
  "isError": true
}
```

Common error types:
- **Authentication errors** - Invalid credentials or expired tokens
- **Not found errors** - Resource doesn't exist  
- **Validation errors** - Missing or invalid parameters
- **Rate limit errors** - Too many requests
- **Server errors** - Internal ImmyBot API issues

## Development

### Build from Source

```bash
git clone https://github.com/wyre-technology/immybot-mcp.git
cd immybot-mcp
npm install
npm run build
npm start
```

### Testing

```bash
npm test
```

### Docker Build

```bash
docker build -t immybot-mcp --build-arg NODE_AUTH_TOKEN=$GITHUB_TOKEN .
```

## Support

- [ImmyBot API Documentation](https://docs.immy.bot/reference/api-documentation/)
- [Microsoft Entra App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [WYRE MCP Gateway](https://github.com/wyre-technology/mcp-gateway)

## License

Apache-2.0 - see [LICENSE](LICENSE) for details.