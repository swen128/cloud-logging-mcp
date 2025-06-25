# Cloud Logging Ports (`packages/mcp/src/cloud-logging/port/`)

This directory defines the "Ports" for the Cloud Logging feature, acting as the primary interface for external interaction. In the context of this MCP (Model Context Protocol) server, these ports are exposed as "Tools". This layer orchestrates the application flow by coordinating calls to the domain logic and using the injected adapter implementations.

## Architecture

This layer serves as the entry point to the Cloud Logging functionality, translating external requests into actions within the application:

-   **Tool Definitions**: Encapsulates specific use cases (e.g., querying logs, retrieving log details) as self-contained, invokable tools. Each tool defines its purpose, inputs, and outputs.
-   **Dependency Injection**: Utilizes factory functions or similar mechanisms (often in `index.ts`) to inject the necessary adapter implementations (e.g., the concrete API client and cache implementations that fulfill the contracts defined by domain interfaces). This adheres to the Dependency Inversion Principle.
-   **Schema Validation**: Employs schema definition and validation libraries (like `zod`) to define and enforce strict input and output structures for each tool, ensuring data integrity and providing clear usage contracts.
-   **Handlers**: Each tool includes a handler function responsible for executing the specific use case logic. This involves validating input, interacting with the injected adapters (e.g., calling the API adapter to fetch data, using the cache adapter), potentially calling domain logic functions (e.g., for data transformation), and formatting the output according to the defined schema.

## Files

-   **`index.ts`**: Typically exports a factory function to create the set of tools with their dependencies injected, or exports the configured tools directly.
-   **`queryLogs.ts`**: Defines the tool responsible for querying log entries. It includes the input/output schemas for query parameters and results, and the handler logic that orchestrates fetching and summarizing logs using the injected adapters and domain functions.
-   **`getLogDetail.ts`**: Defines the tool responsible for retrieving the full details of a specific log entry. It includes input/output schemas for the log identifier and the detailed entry, and the handler logic that uses adapters (potentially checking cache first) to fetch the required data.
-   **`README.md`**: This file.

This structure provides a clear, validated, and dependency-managed interface for interacting with the Cloud Logging capabilities, suitable for consumption by the MCP server or other clients.