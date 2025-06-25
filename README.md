# Google Cloud Logging MCP Server

A Model Context Protocol (MCP) server that provides access to Google Cloud Logging. This server allows AI assistants to query, search, and analyze logs from Google Cloud Platform projects.

## Features

- **Query Logs**: Search and filter logs across GCP projects
- **Get Log Details**: Retrieve detailed information about specific log entries
- **List Projects**: List available GCP projects

## Prerequisites

- [Bun](https://bun.sh/) runtime
- Google Cloud credentials configured
- Access to Google Cloud Logging API

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd cloud-logging-mcp

# Install dependencies
bun install
```

## Configuration

### Google Cloud Authentication

The server requires Google Cloud credentials. You can provide them in one of these ways:

1. **Application Default Credentials** (recommended):
   ```bash
   gcloud auth application-default login
   ```

2. **Service Account Key**:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
   ```

3. **Project ID**:
   ```bash
   export GOOGLE_CLOUD_PROJECT="your-project-id"
   ```

## Usage

### Running the Server

```bash
# Start the server
bun run start

# Development mode with auto-reload
bun run dev
```

### Using with Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cloud-logging": {
      "command": "bun",
      "args": ["run", "/path/to/cloud-logging-mcp/src/main.ts"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-project-id"
      }
    }
  }
}
```

## Available Tools

### queryLogs

Search and filter logs from Google Cloud Logging.

Parameters:
- `projectId`: GCP project ID
- `filter`: Log filter query (follows GCP logging query syntax)
- `orderBy`: Sort order for results
- `pageSize`: Number of results per page
- `pageToken`: Token for pagination
- `resourceNames`: Specific log resources to query
- `summaryFields`: Fields to include in the summary

### getLogDetail

Retrieve complete details for a specific log entry.

Parameters:
- `projectId`: GCP project ID
- `logId`: The unique identifier of the log entry

### listProjects

List all accessible Google Cloud projects.

Parameters: None

## Development

```bash
# Run tests
bun test

# Type checking
bun run typecheck

# Linting
bun run lint

# Format code
bun run format
```

## Architecture

The server follows a clean architecture pattern:

- **`/adapter`**: External service integrations (Google Cloud APIs)
- **`/domain`**: Core business logic and data models
- **`/port`**: Interface definitions and MCP tool handlers
- **`/util`**: Utility functions and helpers

## License

MIT