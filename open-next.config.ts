import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

// 시간기반 ISR(revalidate)은 R2에 캐시.
// on-demand 재검증(revalidatePath/Tag)을 쓰므로 tagCache 필요 — D1에 tag→path·무효화 시각 저장.
//   → admin 저장·/api/revalidate가 저장 즉시 해당 페이지 캐시를 무효화(= 저장→즉시 반영).
// queue: "direct" → Durable Object 없이 요청 중 인라인 재검증.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: "direct",
});
