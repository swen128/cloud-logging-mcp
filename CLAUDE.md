# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Workflow

- Run `bun check` periodically.
- After you've finished task, commit.

## Architecture

This is a Model Context Protocol (MCP) server for Google Cloud Logging following clean architecture:

### Core Flow
1. **MCP Request** → `server.ts` receives tool call
2. **Tool Handler** → `/port` handlers validate input with Zod schemas
3. **Domain Logic** → `/domain` functions process business logic with Result types
4. **API Adapter** → `/adapter/api.ts` calls Google Cloud APIs
5. **Cache Layer** → `/adapter/cache.ts` stores recent log entries
6. **MCP Response** → Returns formatted response to Claude

### Key Architectural Decisions

**Error Handling**
- Result types (neverthrow) for explicit error handling
- Zod schemas validate all external inputs

**Domain Layer (`/domain`)**
- Pure functions with dependency injection
- Returns `Result<T, Error>` for explicit error handling
- LogId uses interface pattern (not branded types) to avoid assertions
- Each domain function takes dependencies as parameters

**Port Layer (`/port`)**
- MCP tool definitions with Zod input schemas
- Converts Zod schemas to JSON Schema for MCP
- Handles tool routing via switch statements

**Adapter Layer (`/adapter`)**
- `api.ts`: Google Cloud API client with type-safe error mapping
- `cache.ts`: LRU cache with TTL for log entries


## Working with Google Cloud APIs

Authentication methods (in order of preference):
1. Application Default Credentials: `gcloud auth application-default login`
2. Service Account: `export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"`
3. Project ID: `export GOOGLE_CLOUD_PROJECT="project-id"`

The API client handles various timestamp formats from Google Cloud:
- ISO strings
- Date objects  
- Protobuf Timestamp objects with seconds/nanos

## Common Patterns

**Adding a New Tool**
1. Define input schema in `/port/newTool.ts` using Zod
2. Create domain function in `/domain/new-feature.ts` returning Result type
3. Add tool to `createTools` in `/port/index.ts`
4. Register in `server.ts` tools/list and tools/call handlers

**Type-Safe Error Handling**
```typescript
const result = await api.entries(params);
if (result.isErr()) {
  return err(result.error);
}
const { entries } = result.value;
```

