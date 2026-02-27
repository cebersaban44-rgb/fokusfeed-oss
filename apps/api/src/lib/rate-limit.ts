interface Bucket {
  count: number;
  minuteBucket: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  consume(userKey: string, routeKey: string, maxPerMinute: number, at: Date): boolean {
    const minuteBucket = Math.floor(at.getTime() / 60000);
    const key = `${userKey}:${routeKey}`;

    const current = this.buckets.get(key);
    if (!current || current.minuteBucket !== minuteBucket) {
      this.buckets.set(key, { count: 1, minuteBucket });
      return true;
    }

    if (current.count >= maxPerMinute) {
      return false;
    }

    current.count += 1;
    return true;
  }
}

export function resolveRateLimit(method: string, path: string): number {
  if (method === "GET" && path.startsWith("/v1/feed")) {
    return 120;
  }

  if (method === "POST" && path.startsWith("/v1/saved/ask")) {
    return 10;
  }

  if (["POST", "PATCH", "DELETE"].includes(method)) {
    return 60;
  }

  return 120;
}
