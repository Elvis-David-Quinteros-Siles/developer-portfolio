package ratelimit

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// slidingWindowScript evalúa la ventana deslizante de forma atómica:
// purga entradas fuera de la ventana, cuenta, y solo registra la petición si
// cabe. Devuelve {allowed(0|1), retry_after_ms}.
var slidingWindowScript = redis.NewScript(`
local key    = KEYS[1]
local now    = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit  = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry = window
  if oldest[2] then
    retry = (tonumber(oldest[2]) + window) - now
    if retry < 0 then retry = 0 end
  end
  return {0, retry}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {1, 0}
`)

// RedisSlidingWindow implementa Limiter con una ventana deslizante exacta
// sobre un sorted set de Redis, compartida entre réplicas del gateway.
type RedisSlidingWindow struct {
	client redis.UniversalClient
	now    func() time.Time // inyectable en tests
}

func NewRedisSlidingWindow(client redis.UniversalClient) *RedisSlidingWindow {
	return &RedisSlidingWindow{client: client, now: time.Now}
}

func (l *RedisSlidingWindow) Allow(ctx context.Context, key string, limit int, window time.Duration) (Decision, error) {
	now := l.now()
	res, err := slidingWindowScript.Run(ctx, l.client,
		[]string{key},
		now.UnixMilli(),
		window.Milliseconds(),
		limit,
		uniqueMember(now),
	).Slice()
	if err != nil {
		return Decision{}, fmt.Errorf("redis sliding window: %w", err)
	}
	if len(res) != 2 {
		return Decision{}, fmt.Errorf("redis sliding window: unexpected reply %v", res)
	}
	allowed, ok1 := res[0].(int64)
	retryMs, ok2 := res[1].(int64)
	if !ok1 || !ok2 {
		return Decision{}, fmt.Errorf("redis sliding window: unexpected reply types %v", res)
	}
	return Decision{
		Allowed:    allowed == 1,
		RetryAfter: time.Duration(retryMs) * time.Millisecond,
	}, nil
}

// uniqueMember garantiza que dos peticiones en el mismo instante no colisionen
// dentro del sorted set.
func uniqueMember(now time.Time) string {
	var b [4]byte
	_, _ = rand.Read(b[:])
	return strconv.FormatInt(now.UnixNano(), 36) + "-" + hex.EncodeToString(b[:])
}
