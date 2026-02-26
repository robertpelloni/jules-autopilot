import crypto from 'crypto';
import { PluginManifest } from '../schemas/plugins';

/**
 * Normalizes a PluginManifest for consistent cryptographic signing/verification.
 * Strips out runtime metadata, signatures, and timestamps.
 */
function normalizeManifestForSigning(manifest: PluginManifest): string {
    const dataToSign = {
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        author: manifest.author,
        version: manifest.version,
        capabilities: manifest.capabilities,
        configSchema: manifest.configSchema || {}
    };

    // Deterministic stringification
    return JSON.stringify(dataToSign, Object.keys(dataToSign).sort());
}

/**
 * Verifies a PluginManifest using Ed25519 cryptography.
 * Requires `manifest.signature` and `manifest.publicKey` to be present.
 * 
 * @param manifest The plugin manifest containing the signature and public key.
 * @returns boolean True if the signature perfectly matches the manifest payload.
 */
export function verifyPluginManifest(manifest: Partial<PluginManifest>): boolean {
    if (!manifest.signature || !manifest.publicKey) {
        return false;
    }

    try {
        const payload = normalizeManifestForSigning(manifest as PluginManifest);
        const publicKeyBuffer = Buffer.from(manifest.publicKey, 'base64');
        const signatureBuffer = Buffer.from(manifest.signature, 'base64');

        // Create the public key object for Ed25519
        const key = crypto.createPublicKey({
            key: publicKeyBuffer,
            format: 'der',
            type: 'spki'
        });

        // Verify using the native crypto library
        return crypto.verify(null, Buffer.from(payload), key, signatureBuffer);
    } catch (error) {
        console.error('[Crypto] Failed to verify plugin manifest signature:', error);
        return false;
    }
}
