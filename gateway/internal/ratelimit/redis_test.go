package ratelimit

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func newTestLimiter(t *testing.T) (*RedisSlidingWindow, *miniredis.Miniredis, *time.Time) {
	t.Helper()
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { client.Close() })
	l := NewRedisSlidingWindow(client)
	now := time.Now()
	l.now = func() time.Time { return now }
	return l, mr, &now
}

func TestSlidingWindow_AllowsUpToLimit(t *testing.T) {
	l, _, _ := newTestLimiter(t)
	ctx := context.Background()
	for i := 0; i < 3; i++ {
		dec, err := l.Allow(ctx, "rl:test", 3, time.Minute)
		if err != nil {
			t.Fatalf("request %d: %v", i+1, err)
		}
		if !dec.Allowed {
			t.Fatalf("request %d should be allowed", i+1)
		}
	}
	dec, err := l.Allow(ctx, "rl:test", 3, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if dec.Allowed {
		t.Fatal("request over the limit should be denied")
	}
	if dec.RetryAfter <= 0 || dec.RetryAfter > time.Minute {
		t.Fatalf("retry-after out of range: %v", dec.RetryAfter)
	}
}

func TestSlidingWindow_SlidesOverTime(t *testing.T) {
	l, _, now := newTestLimiter(t)
	ctx := context.Background()
	for i := 0; i < 2; i++ {
		if dec, err := l.Allow(ctx, "rl:slide", 2, time.Minute); err != nil || !dec.Allowed {
			t.Fatalf("request %d: allowed=%v err=%v", i+1, dec.Allowed, err)
		}
	}
	if dec, _ := l.Allow(ctx, "rl:slide", 2, time.Minute); dec.Allowed {
		t.Fatal("third request inside the window should be denied")
	}

	*now = now.Add(61 * time.Second) // la ventana ya pasó
	dec, err := l.Allow(ctx, "rl:slide", 2, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if !dec.Allowed {
		t.Fatal("request after the window slid should be allowed")
	}
}

func TestSlidingWindow_RetryAfterMatchesOldestEntry(t *testing.T) {
	l, _, now := newTestLimiter(t)
	ctx := context.Background()
	if _, err := l.Allow(ctx, "rl:retry", 1, time.Minute); err != nil {
		t.Fatal(err)
	}
	*now = now.Add(20 * time.Second)
	dec, err := l.Allow(ctx, "rl:retry", 1, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if dec.Allowed {
		t.Fatal("expected denial")
	}
	if dec.RetryAfter != 40*time.Second {
		t.Fatalf("expected retry-after 40s (window - elapsed), got %v", dec.RetryAfter)
	}
}

func TestSlidingWindow_KeysAreIndependent(t *testing.T) {
	l, _, _ := newTestLimiter(t)
	ctx := context.Background()
	if dec, _ := l.Allow(ctx, "rl:ip-a", 1, time.Minute); !dec.Allowed {
		t.Fatal("first request for ip-a should be allowed")
	}
	if dec, _ := l.Allow(ctx, "rl:ip-a", 1, time.Minute); dec.Allowed {
		t.Fatal("second request for ip-a should be denied")
	}
	if dec, _ := l.Allow(ctx, "rl:ip-b", 1, time.Minute); !dec.Allowed {
		t.Fatal("ip-b must not be affected by ip-a's limit")
	}
}

func TestSlidingWindow_ErrorWhenRedisDown(t *testing.T) {
	l, mr, _ := newTestLimiter(t)
	mr.Close()
	if _, err := l.Allow(context.Background(), "rl:down", 1, time.Minute); err == nil {
		t.Fatal("expected an error when redis is unreachable (caller fails open)")
	}
}
