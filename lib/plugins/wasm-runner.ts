import { createPlugin, ManifestWasmData, ManifestWasmUrl, Manifest } from '@extism/extism';
import type { PluginManifest } from '../schemas/plugins';

// Defines the output expected strictly from Jules-compatible Wasm Plugins
export interface WasmExecutionResult {
    success: boolean;
    output?: string;
    error?: string;
    metrics?: {
        durationMs: number;
    };
}

export class WasmPluginRunner {
    private manifest: PluginManifest;
    private static MAX_MEMORY_PAGES = 100; // ~6.4MB hard memory cap default

    constructor(manifest: PluginManifest) {
        this.manifest = manifest;
        if (!this.manifest.wasmPayload && !this.manifest.wasmUrl) {
            throw new Error(`Plugin ${manifest.id} is missing both wasmPayload and wasmUrl.`);
        }
    }

    /**
     * Maps Jules capabilities to exact Extism runtime network allowed-hosts.
     */
    private getAllowedHosts(): string[] {
        // If the plugin specifically requests HTTP network access, we currently
        // allow wildcard domains. In a stricter environment, we could parse
        // configuration fields to isolate specific domains.
        // If it doesn't request the network, it gets exactly 0.
        if (this.manifest.capabilities.includes('network:http')) {
            return ["*"];
        }
        return [];
    }

    /**
     * Sandboxes and evaluates the Extism plugin.
     * @param functionName the exported function to invoke on the Wasm binary
     * @param input the stringified input payload
     */
    public async execute(functionName: string, input: string): Promise<WasmExecutionResult> {
        const startTime = Date.now();

        let wasmDefinition: ManifestWasmData | ManifestWasmUrl;

        if (this.manifest.wasmPayload) {
            wasmDefinition = {
                data: this.manifest.wasmPayload
            };
        } else if (this.manifest.wasmUrl) {
            wasmDefinition = {
                url: this.manifest.wasmUrl
            };
        } else {
            throw new Error('Fatal: Wasm source missing.');
        }

        const extismManifest: Manifest = {
            wasm: [wasmDefinition],
            allowedPaths: {}, // Disallow all host filesystem paths unconditionally
            allowedHosts: this.getAllowedHosts(),
            memory: {
                maxPages: WasmPluginRunner.MAX_MEMORY_PAGES
            }
        };

        const plugin = await createPlugin(extismManifest, {
            useWasi: true // Allows standard library functionality inside the Wasm guest (like RNG) but explicitly blocks non-permitted IO
        });

        try {
            // Check if the requested function exists in the compiled binary
            if (!await plugin.functionExists(functionName)) {
                return {
                    success: false,
                    error: `Function '${functionName}' does not exist on this Wasm binary.`
                };
            }

            // Exceute the payload securely
            const outputBytes = await plugin.call(functionName, input);
            const outputString = outputBytes ? outputBytes.text() : '';

            return {
                success: true,
                output: outputString,
                metrics: {
                    durationMs: Date.now() - startTime
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                metrics: {
                    durationMs: Date.now() - startTime
                }
            };
        } finally {
            // Force memory deallocation
            await plugin.close();
        }
    }
}
