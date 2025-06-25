# Cloud Logging Domain (`packages/mcp/src/cloud-logging/domain/`)

This directory contains the core domain logic, types, and interfaces for the Google Cloud Logging feature, following Domain-Driven Design (DDD) principles. It defines the language and concepts of the Cloud Logging domain, independent of specific implementation details like external APIs or caching mechanisms.

## Architecture

The architecture focuses on defining the essential building blocks and rules of the Cloud Logging domain:

-   **Value Objects**: Represent concepts identified primarily by their value (e.g., a specific Log ID). They are typically immutable and self-validating.
-   **Entities**: Represent concepts with a distinct identity that persists over time (e.g., a Log Entry that might be updated or referenced).
-   **Domain Logic**: Functions or methods encapsulating business rules and transformations related to domain objects (e.g., creating summaries from raw log data).
-   **Interfaces (Ports)**: Define contracts for interacting with external systems or infrastructure necessary for the domain's operations, such as fetching logs or caching data. These interfaces decouple the domain logic from specific external implementations (Adapters).

## Files

-   **`api.ts`**: Defines the interface (Port) specifying the contract for interacting with the underlying Cloud Logging data source (e.g., fetching entries based on a query).
-   **`cache.ts`**: Defines the interface (Port) specifying the contract for caching log data to improve performance or reduce external calls.
-   **`log-entry.ts`**: Defines the core types related to log entries (e.g., raw structures, summaries, full entries) and contains logic for processing or transforming log entry data.
-   **`log-id.ts`**: Defines types and potentially factory functions related to unique log identifiers, ensuring type safety and consistency.
-   **`README.md`**: This file.

This separation ensures that the core business logic is isolated, understandable in its own terms, and testable independently of infrastructure concerns.