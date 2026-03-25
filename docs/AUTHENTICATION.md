# Authentication Strategy: Jules Portal Tokens (AQ.A)

This document records the 100% verified method for authenticating with the Google Jules v1alpha API using session tokens generated from the [Jules Portal](https://jules.google.com).

## The Verified Protocol

High-privilege session tokens (starting with `AQ.A...`) are subject to strict security policies at the Google Labs gateway. 

### 1. The Required Header
You **MUST** use the following header:
```http
x-goog-api-key: AQ.Ab8RN6ItgxRxKy...
```

### 2. The Prohibited Header
You **MUST NOT** send the standard `Authorization` header. 
```http
# THIS WILL CAUSE API_KEY_SERVICE_BLOCKED
Authorization: Bearer AQ.Ab8RN6ItgxRxKy...
```
Even if the token is valid, sending it as a `Bearer` token (or sending both headers simultaneously) triggers a security filter that flags the request as an unauthorized API Key attempt.

### 3. No Query Parameters
Do not append the key to the URL.
```http
# AVOID THIS
https://jules.googleapis.com/...?key=AQ.A...
```
This triggers "Security Poisoning" blocks at the gateway level.

## Implementation in `lib/jules/client.ts`

The `request` method in `JulesClient` handles this automatically:

```typescript
if (isExternal) {
  // MUST delete Authorization to prevent API_KEY_SERVICE_BLOCKED
  delete headers['Authorization'];
  delete headers['authorization'];
  
  if (this.apiKey) {
    // Verified way to authenticate portal session tokens
    headers['x-goog-api-key'] = this.apiKey;
  }
}
```

## Why this happens
Standard Google Cloud API Keys (`AIza...`) often work with either header. However, **Session Tokens** (`AQ.A...`) are treated as primary credentials. Google's alpha/labs gateway for Jules is configured to recognize these specifically when passed via the `x-goog-api-key` header while strictly rejecting them if they masquerade as standard OAuth Bearer tokens.

## Troubleshooting
If you receive `API_KEY_SERVICE_BLOCKED`:
1. Check that the `Authorization` header is completely absent from the request.
2. Verify the key hasn't been corrupted by environment variable loaders (ensure no surrounding quotes).
3. Perform a **Hard Refresh (Ctrl + F5)** to ensure the browser isn't caching an old header configuration.
