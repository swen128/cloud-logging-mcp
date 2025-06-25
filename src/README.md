# Cloud Logging MCP Server

This server provides access to Google Cloud Logging data through the Model Context Protocol (MCP). It's designed
specifically for AI agents, optimizing the way log data is presented to reduce token usage and minimize back-and-forth
communication.

## Features

### Log Querying

- Search logs using Google Cloud Logging filter syntax
- Specify log sources using resourceNames (e.g., `projects/project_id/logs/run.googleapis.com%2Fstdout`)
- Paginate through large result sets efficiently
- Get concise summaries of matching logs
- Customize which fields appear in summaries
- Retrieve full log details when needed
- Automatically redact sensitive information from logs

### Smart Summarization

When querying logs, you can:

- Specify exactly which fields to include in summaries
- If no fields are specified, the server intelligently extracts the most relevant information:
  1. Uses textPayload if available
  2. Finds message fields in nested JSON or protobuf payloads
  3. Provides a truncated JSON representation as a fallback

### Performance Optimization

- In-memory caching reduces redundant API calls
- Each log entry includes an insertId for retrieving full details

### AI-Friendly Output

- Results formatted as JSON lines for easy parsing
- Concise summaries reduce token usage
- Pagination controls prevent overwhelming responses

### Security

- Automatically redacts sensitive information from logs
  - API keys and tokens
  - Passwords and credentials
  - Personal identifiable information (PII)
  - Other configurable patterns

## Available Tools

The server exposes two main tools through the MCP protocol:

1. `queryLogs` - Search for logs with filtering and pagination
2. `getLogDetail` - Retrieve complete information for a specific log

## Internal Architecture

This module follows Domain-Driven Design (DDD) and Ports & Adapters (Hexagonal Architecture) principles to separate concerns and enhance testability:

-   **`domain/`**: Contains the core business logic, types (like `LogId`, `LogEntry`), and interfaces (ports) for external dependencies (API, cache). See [`domain/README.md`](./domain/README.md) for details.
-   **`adapter/`**: Provides concrete implementations (adapters) for the domain interfaces, connecting to the actual Google Cloud Logging API and providing an in-memory cache. See [`adapter/README.md`](./adapter/README.md) for details.
-   **`port/`**: Defines the entry points (ports) for interacting with the feature, exposing the `queryLogs` and `getLogDetail` tools with schema validation (`zod`) and dependency injection. See [`port/README.md`](./port/README.md) for details.
-   **`index.ts`**: Exports the necessary functions or tools, likely orchestrating the creation and wiring of components.

## Usage

Since this is an MCP server, AI agents interact with it through the MCP protocol. Here's how the tools would be used:

### Querying Logs

```json
{
  "name": "queryLogs",
  "arguments": {
    "projectId": "my-project",
    "filter": "severity>=ERROR",
    "resourceNames": ["projects/my-project/logs/run.googleapis.com%2Fstdout"],
    "pageSize": 10,
    "summaryFields": ["labels.service", "textPayload"]
  }
}
```

### Getting Log Details

```json
{
  "name": "getLogDetail",
  "arguments": {
    "projectId": "my-project",
    "logId": "abc123"
  }
}
```

## Installation

To use this server with AI agents, add it to your MCP configuration file:

```json
{
  "mcpServers": {
    "cloud-logging": {
      "command": "node",
      "args": ["path/to/cloud-logging-server.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account-key.json"
      }
    }
  }
}
```