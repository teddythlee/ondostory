import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

// 시간기반 ISR(revalidate)을 R2에 캐시해 Vercel과 동일하게 동작시킨다.
// on-demand 재검증(revalidateTag/Path)을 안 쓰므로 tagCache는 불필요.
// queue: "direct" → Durable Object 없이 요청 중 인라인 재검증.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: "direct",
});
