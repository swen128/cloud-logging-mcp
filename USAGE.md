# Cloud Logging MCP Server Usage Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up Google Cloud credentials:**
   ```bash
   # Option 1: Use gcloud CLI
   gcloud auth application-default login
   
   # Option 2: Use service account
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
   ```

3. **Set your project ID:**
   ```bash
   export GOOGLE_CLOUD_PROJECT="your-project-id"
   ```

4. **Run the server:**
   ```bash
   bun run start
   ```

## Example Tool Usage

### Query Logs

```json
{
  "tool": "queryLogs",
  "input": {
    "projectId": "my-project",
    "filter": "resource.type=\"cloud_run_revision\" AND severity>=ERROR",
    "orderBy": {
      "timestamp": "desc"
    },
    "pageSize": 50
  }
}
```

### Get Log Detail

```json
{
  "tool": "getLogDetail",
  "input": {
    "projectId": "my-project",
    "logId": "65f5a7b60000000001234567"
  }
}
```

### List Projects

```json
{
  "tool": "listProjects",
  "input": {}
}
```

## Common Filter Examples

- **By severity:** `severity>=ERROR`
- **By time range:** `timestamp>="2024-01-01T00:00:00Z"`
- **By resource:** `resource.type="cloud_run_revision"`
- **By text search:** `textPayload:"connection timeout"`
- **Combined:** `resource.type="k8s_container" AND severity=ERROR AND timestamp>="2024-01-01T00:00:00Z"`

## Troubleshooting

1. **Authentication errors:** Ensure your Google Cloud credentials are properly configured
2. **Permission errors:** Check that your account has the `logging.logEntries.list` permission
3. **No results:** Verify your filter syntax and that logs exist for your query