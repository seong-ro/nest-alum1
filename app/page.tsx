import { HomeClient } from "@/components/HomeClient";
import { isKvConfigured, kvLoadGallery } from "@/lib/kv-storage";
import { migrateGallery } from "@/lib/migrate";
import {
  buildCollectionPageJsonLd,
  buildFaqJsonLd,
  jsonLdScript,
} from "@/lib/seo";

// SEO 핵심: ISR 캐싱 (60초) — 검색엔진 봇이 캐시된 정적 HTML을 빠르게 인덱싱
// 카드 추가/수정/삭제 시 server action의 revalidatePath('/')가 즉시 무효화 → 사용자 변경은 실시간 반영
export const revalidate = 60;

export default async function Page() {
  // 서버에서 Redis 직접 읽기 — 클라이언트 fetch 왕복 제거
  const configured = isKvConfigured();
  const rawGallery = configured ? await kvLoadGallery().catch(() => []) : [];

  // ─── 자동 마이그레이션 ───
  // Redis에 저장된 카드에 최신 로직(마스킹·업종·컨택정보) 즉시 적용
  // Redis 자체는 변경 안 함 → 사용자는 코드 업데이트 즉시 효과 확인
  const gallery = migrateGallery(rawGallery);

  // ─── 2026 GEO 베스트 프랙티스 — JSON-LD 구조화 데이터 ───
  // CollectionPage + ItemList: 갤러리 카드 모음을 컬렉션으로 검색엔진 인식
  // FAQPage: ChatGPT·Claude·Perplexity·Gemini가 직접 추출하는 Q&A 형식
  // GPT-4 정확도 16% → 54% 향상 (Data World 연구), AI Overviews 인용 가능성 +
  const collectionJsonLd = buildCollectionPageJsonLd(gallery);
  const faqJsonLd = buildFaqJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(collectionJsonLd)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(faqJsonLd)}
      />
      <HomeClient initialGallery={gallery} storageConfigured={configured} />
    </>
  );
}
