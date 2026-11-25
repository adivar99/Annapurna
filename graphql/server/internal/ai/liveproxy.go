// Package ai — the Live API WebSocket proxy URL shared by the browser-facing
// proxy (httpapi). The browser never sees this endpoint or the key.
package ai

// LiveWSURL is Google's browser-protocol BidiGenerateContent endpoint
// (v1beta). The proxy dials it with ?key=<API_KEY> auth.
const LiveWSURL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
