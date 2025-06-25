# Cloud Logging Adapters (`packages/mcp/src/cloud-logging/adapter/`)

This directory contains the adapter implementations for the interfaces (Ports) defined in the `packages/mcp/src/cloud-logging/domain/` directory. Adapters bridge the gap between the abstract domain logic and concrete external systems or infrastructure concerns, such as specific APIs or caching strategies.

## Architecture

Following the Adapter pattern (part of Ports & Adapters / Hexagonal Architecture), this layer provides concrete implementations for the contracts defined in the domain:

-   **API Adapter**: Implements the domain's API interface, handling the specifics of communicating with the actual Google Cloud Logging service (e.g., making HTTP requests, handling authentication, parsing responses).
-   **Cache Adapter**: Implements the domain's cache interface, providing a specific caching mechanism (e.g., in-memory with TTL and size limits) to store and retrieve log entries efficiently.

These adapters allow the core domain logic to remain unaware of the specific external tools or services being used.

## Files

-   **`api.ts`**: Contains the implementation of the `CloudLoggingApi` interface defined in the domain. It encapsulates the logic for interacting with the Google Cloud Logging API.
-   **`cache.ts`**: Contains the implementation of the `LogCache` interface defined in the domain. It provides a concrete caching strategy (e.g., in-memory).
-   **`*.test.ts`**: Contains unit tests for the adapter implementations, ensuring they correctly fulfill the contracts defined by the domain interfaces and handle edge cases.
-   **`README.md`**: This file.

These adapters are designed to be injected into the application layer (e.g., the Ports defined in `packages/mcp/src/cloud-logging/port/`) or services that require access to Cloud Logging data or caching, thus decoupling the application logic from specific infrastructure implementations.