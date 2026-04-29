# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of ImmyBot MCP server
- OAuth 2.0 authentication with Microsoft Entra ID client credentials
- Decision-tree navigation for organized tool discovery
- Comprehensive ImmyBot API integration:
  - Computers domain (device and endpoint management)
  - Software domain (application and package management)  
  - Navigation tools (immybot_navigate, immybot_status, immybot_back)
- Gateway mode support for WYRE MCP Gateway
  - Per-request stateless server instances
  - Header-based credential injection
  - HTTP transport with health checks
- Docker container deployment
  - Multi-stage build with dependency pruning
  - Health checks and graceful shutdown
  - Non-root user for security
- Structured logging with configurable levels
- Elicitation infrastructure for interactive tool calls
- Two-step deployment model support (stage + reconcile)

### Security
- OAuth 2.0 client credentials authentication
- Non-root container user (mcp:1001)
- Environment-based credential injection
- Secure HTTP header handling for gateway mode