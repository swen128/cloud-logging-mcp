import { GoogleCloudLoggingApiClient } from "./adapter/api";
import { LogCacheImpl } from "./adapter/cache";
import { createTools } from "./port";

export interface CloudLoggingConfig {
  projectId?: string;
  cache?: {
    ttlMs?: number;
    maxEntries?: number;
  };
}

export const createCloudLoggingTools = (config?: CloudLoggingConfig) => {
  const api = new GoogleCloudLoggingApiClient(config?.projectId || process.env.GOOGLE_CLOUD_PROJECT);
  const cache = new LogCacheImpl(config?.cache);

  return createTools({ api, cache });
};
