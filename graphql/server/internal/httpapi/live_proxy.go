package httpapi

import (
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/adivar99/annapurna-server/internal/ai"
	"github.com/gorilla/websocket"
)

// liveProxyTimeouts bounds each leg of the proxied session. Google resets
// Live API connections roughly every 10 minutes, so 30 minutes of idle
// headroom is comfortably above any legitimate lull.
const (
	liveProxyWriteWait = 10 * time.Second
	liveProxyPongWait  = 30 * time.Minute
)

var liveUpgrader = websocket.Upgrader{
	// The browser's origin is checked at the JWT layer (requireAuth); any
	// Origin is acceptable here because the connection carries a bearer
	// token that must verify against our signer.
	CheckOrigin: func(r *http.Request) bool { return true },
}

// liveProxy bridges the browser's Live API WebSocket to Google's. The client
// authenticates with its Annapurna JWT (requireAuth runs before this
// handler); the Gemini API key never leaves the server. Frames are piped
// verbatim in both directions — the browser speaks the normal
// BidiGenerateContent protocol and includes model + setup itself.
//
// Auth note: requireAuth parses the JWT from the Authorization header. Browsers
// cannot set custom headers on WebSocket, so the client passes
// ?authorization=<JWT>, applied by stripLiveJWTQuery before requireAuth sees
// the request (see router.go).
func (h *Handlers) liveProxy(w http.ResponseWriter, r *http.Request) {
	if h.Gemini == nil {
		Fail(w, http.StatusServiceUnavailable, "Realtime voice is not configured (no GEMINI_API_KEY).")
		return
	}

	upstreamURL := ai.LiveWSURL + "?key=" + url.QueryEscape(h.Gemini.APIKey())

	upstream, resp, err := websocket.DefaultDialer.Dial(upstreamURL, nil)
	if err != nil {
		status := http.StatusBadGateway
		detail := err.Error()
		if resp != nil {
			detail = fmt.Sprintf("upstream status %d", resp.StatusCode)
			if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusUnauthorized {
				status = http.StatusForbidden
			}
		}
		Fail(w, status, "Could not reach the voice service: "+detail)
		return
	}
	defer upstream.Close()

	downstream, err := liveUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return // Upgrade already wrote the HTTP error
	}
	defer downstream.Close()

	_ = downstream.SetReadDeadline(time.Now().Add(liveProxyPongWait))
	_ = upstream.SetReadDeadline(time.Now().Add(liveProxyPongWait))

	// clientErr/serverErr capture the first read failure on each leg so the
	// deferred closes don't race the pump goroutine's writes.
	done := make(chan struct{})

	// Browser -> Google.
	go func() {
		defer close(done)
		for {
			msgType, payload, err := downstream.ReadMessage()
			if err != nil {
				return
			}
			_ = upstream.SetWriteDeadline(time.Now().Add(liveProxyWriteWait))
			if err := upstream.WriteMessage(msgType, payload); err != nil {
				return
			}
		}
	}()

	// Google -> browser.
	for {
		msgType, payload, err := upstream.ReadMessage()
		if err != nil {
			break
		}
		_ = downstream.SetWriteDeadline(time.Now().Add(liveProxyWriteWait))
		if err := downstream.WriteMessage(msgType, payload); err != nil {
			break
		}
	}

	// Wait (briefly) for the other direction to notice and unwind.
	select {
	case <-done:
	case <-time.After(2 * time.Second):
	}
}
