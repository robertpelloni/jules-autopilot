import { z } from 'zod';

// Define the core permissions a plugin can request
export const PluginCapabilitySchema = z.enum([
    'filesystem:read',
    'filesystem:write',
    'network:http',
    'system:execute',
    'mcp:invoke_tool'
]);

export type PluginCapability = z.infer<typeof PluginCapabilitySchema>;

// Defines the properties of a Plugin within the registry
export const PluginManifestSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    author: z.string(),
    version: z.string(),
    capabilities: z.array(PluginCapabilitySchema),
    configSchema: z.record(z.unknown()).optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional()
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

// Defines the payload expected from the UI when installing a plugin
export const InstallPluginPayloadSchema = z.object({
    pluginId: z.string().min(1),
    config: z.record(z.unknown()).optional(),
});

export type InstallPluginPayload = z.infer<typeof InstallPluginPayloadSchema>;

// Extends manifest with runtime installation status
export const PluginRegistryItemSchema = PluginManifestSchema.extend({
    isInstalled: z.boolean(),
    isEnabled: z.boolean().optional(),
    userConfig: z.record(z.unknown()).optional()
});

export type PluginRegistryItem = z.infer<typeof PluginRegistryItemSchema>;
