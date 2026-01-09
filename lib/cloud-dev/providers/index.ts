import type { CloudDevProviderId, CloudDevProviderInterface } from '@/types/cloud-dev';
import { BaseCloudDevProvider, CloudDevProviderError, ProviderNotImplementedError } from './base';
import { JulesProvider } from './jules';
import { DevinProvider } from './devin';
import { ManusProvider } from './manus';
import { OpenHandsProvider } from './openhands';
import { GitHubSparkProvider } from './github-spark';
import { BlocksProvider } from './blocks';
import { ClaudeCodeProvider } from './claude-code';
import { CodexProvider } from './codex';

export {
  BaseCloudDevProvider,
  CloudDevProviderError,
  ProviderNotImplementedError,
  JulesProvider,
  DevinProvider,
  ManusProvider,
  OpenHandsProvider,
  GitHubSparkProvider,
  BlocksProvider,
  ClaudeCodeProvider,
  CodexProvider,
};

type ProviderConstructor = new (apiKey?: string) => CloudDevProviderInterface;

const PROVIDER_CONSTRUCTORS: Record<CloudDevProviderId, ProviderConstructor> = {
  jules: JulesProvider,
  devin: DevinProvider,
  manus: ManusProvider,
  openhands: OpenHandsProvider,
  'github-spark': GitHubSparkProvider,
  blocks: BlocksProvider,
  'claude-code': ClaudeCodeProvider,
  codex: CodexProvider,
};

export function createProvider(
  providerId: CloudDevProviderId,
  apiKey?: string
): CloudDevProviderInterface {
  const Constructor = PROVIDER_CONSTRUCTORS[providerId];
  if (!Constructor) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return new Constructor(apiKey);
}

export function createProviders(
  apiKeys: Partial<Record<CloudDevProviderId, string>>
): Map<CloudDevProviderId, CloudDevProviderInterface> {
  const providers = new Map<CloudDevProviderId, CloudDevProviderInterface>();

  for (const [providerId, apiKey] of Object.entries(apiKeys)) {
    if (apiKey) {
      providers.set(
        providerId as CloudDevProviderId,
        createProvider(providerId as CloudDevProviderId, apiKey)
      );
    }
  }

  return providers;
}

export function getAvailableProviderIds(): CloudDevProviderId[] {
  return Object.keys(PROVIDER_CONSTRUCTORS) as CloudDevProviderId[];
}
