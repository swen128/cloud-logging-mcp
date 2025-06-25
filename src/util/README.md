# Utility Functions (`packages/mcp/src/util/`)

This directory contains general-purpose utility functions used across the MCP package. These functions provide common, reusable logic that is not specific to any particular domain feature.

## Architecture

The architecture is straightforward: a collection of independent, reusable functions organized into modules based on their purpose.

-   **Data Handling**: Utilities for tasks like safely accessing nested properties within objects.
-   **Security**: Functions for redacting sensitive information (e.g., API keys, PII) from strings.
-   **Testing**: Includes unit tests (`*.test.ts`) to ensure the correctness of the utility functions.

## Files

-   `index.ts`: Main entry point, exporting selected utilities for use by other modules.
-   `*.ts` (excluding `index.ts`, `*.test.ts`): Individual modules implementing specific utility functions (e.g., redaction logic).
-   `*.test.ts`: Unit tests for the corresponding utility modules.
-   `README.md`: This file.