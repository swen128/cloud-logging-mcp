# TODOs for MCP Server Hand-off

## Setup Completed ✅
- Google Cloud Logging SDK installed
- Authentication implemented using Application Default Credentials
- API client with proper error handling
- Domain logic for queryLogs and getLogDetail
- Configuration support (environment variables and code-based)
- In-memory caching with TTL and size limits
- Type-safe implementation with branded types
- All tests passing (26 tests)
- Comprehensive README documentation
- `.mcp.json` created with your project ID (dinii-self-develop)

## Remaining Tasks

### 🔴 TOP PRIORITY: Dynamic Project Selection
- [ ] **Remove hardcoded project ID requirement** - Currently users must specify projectId in every tool call
- [ ] **Add `listProjects` tool** - Allow users to discover available Google Cloud projects
  - Use Google Resource Manager API to list projects
  - Show project ID, name, and status
  - Cache the project list for the session
- [ ] **Make projectId optional in tools** - When not specified:
  - Use the default project from gcloud config
  - Or prompt user to select from available projects
- [ ] **Update tool descriptions** - Make it clear that projectId is optional

Implementation approach:
1. Add `@google-cloud/resource-manager` dependency
2. Create new tool `listProjects` in the MCP server
3. Modify queryLogs and getLogDetail to use default project when projectId not provided
4. Update input schemas to make projectId optional

### 1. Test the MCP Server
- [ ] Run `bun run src/main.ts` to verify the server starts correctly
- [ ] Test with Claude Code to ensure the tools are available
- [ ] Verify you can query logs from your Google Cloud project

### 2. Configure ESLint (Optional)
- [ ] The ESLint configuration is missing - add `.eslintrc.js` or `eslint.config.js`
- [ ] Current lint script in package.json won't work without proper config

### 3. Implement Additional Features (Optional)
- [ ] Add support for resource name filtering
- [ ] Implement log streaming/tailing functionality
- [ ] Add more sophisticated query builders
- [ ] Support for structured logging queries
- [ ] Add metrics/telemetry for monitoring MCP server usage

### 4. Production Considerations
- [ ] Add proper logging for the MCP server itself
- [ ] Implement retry logic with exponential backoff
- [ ] Add connection pooling for better performance
- [ ] Consider adding request/response validation middleware
- [ ] Add health check endpoint

### 5. Testing Improvements
- [ ] Add integration tests with real Google Cloud Logging API
- [ ] Add tests for error scenarios (network failures, auth issues)
- [ ] Add performance benchmarks for cache effectiveness
- [ ] Test with large log volumes

### 6. Documentation Enhancements
- [ ] Add example queries for common use cases
- [ ] Document the Google Cloud Logging query syntax
- [ ] Add troubleshooting for common permission issues
- [ ] Create a video tutorial for setup

## Quick Start Commands

```bash
# Test the server locally
bun run src/main.ts

# Run tests
bun test

# Type check
bun run typecheck

# Format code
bun run format
```

## Notes
- Your Google Cloud account (yuto.ogino@dinii.jp) is already authenticated
- Project ID is set to: dinii-self-develop
- The server uses stdio transport for MCP communication
- Cache is configured for 30 minutes TTL and 1000 max entries by default