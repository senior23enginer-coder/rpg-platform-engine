import type { AppMetadata } from "./appMetadataStorage";
import { createLocalHttpPlatformRepository } from "./localHttpPlatformRepository";
import { createLocalPlatformRepository } from "./localPlatformRepository";
import type { PlatformCloudConfig, PlatformRepository } from "./platformContracts";

const defaultCloudConfig: PlatformCloudConfig = {
  provider: "local-http",
  endpoint: "http://127.0.0.1:8787/api",
  realtimeEndpoint: "http://127.0.0.1:8787/realtime",
  region: "local",
};

export function getPlatformCloudConfig(metadata?: Partial<AppMetadata> & { cloud?: Partial<PlatformCloudConfig> }): PlatformCloudConfig {
  return {
    ...defaultCloudConfig,
    ...(metadata?.cloud ?? {}),
  };
}

export function createPlatformRepository(_metadata?: Partial<AppMetadata> & { cloud?: Partial<PlatformCloudConfig> }, _token?: string): PlatformRepository {
  const config = getPlatformCloudConfig(_metadata);
  if (config.provider === "local-http") {
    return createLocalHttpPlatformRepository(config, _token);
  }
  return createLocalPlatformRepository();
}
