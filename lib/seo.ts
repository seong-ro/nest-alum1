/**
 * 2026 SEO 베스트 프랙티스 — JSON-LD 빌더
 *
 * Schema.org 기반 구조화 데이터로 (1) Google Rich Results 35% CTR 향상
 * (2) AI Overviews / ChatGPT / Perplexity / Claude 인용 가능성 증대
 *
 * 적용 schema 5종:
 *   - Organization: Alumni 1기 운영 주체 (루트 layout)
 *   - WebSite: 사이트 + SearchAction (루트 layout)
 *   - Article: 개별 카드별 (필수: headline, author, datePublished, image)
 *   - BreadcrumbList: 홈→갤러리→카드 (개별 카드 페이지)
 *   - Person: 카드의 대표자 (있을 때만)
 */

import type { StoredCard } from "./types";
import { getSiteUrl } from "./site-url";

/**
 * 사이트 기본 정보 — getter 패턴으로 lazy 평가
 * SITE_URL은 매번 요청 시점에 getSiteUrl()로 결정 (Vercel 환경변수 보장)
 * (모듈 최상위에서 한 번만 평가하면 빌드 타임 fallback URL이 고정되는 문제 발생)
 */
export const SITE = {
  get url() {
    return getSiteUrl();
  },
  name: "Start-up NEST Alumni 1기",
  alternateName: "NEST Alumni 1기",
  description:
    "신용보증기금 Start-up NEST 17·18기 졸업 기업의 동문 커뮤니티 갤러리. 자사 홈페이지나 관련 뉴스 기사 등 어떤 페이지든 URL 하나로 동문 기업 소개를 갤러리에 추가하면 매거진 형식으로 자동 정리되어 모든 동문이 기업 간 교류·기술 협력·투자 연계의 단서로 활용할 수 있습니다.",
  get logo() {
    return `${getSiteUrl()}/icon`;
  },
  get ogImage() {
    return `${getSiteUrl()}/opengraph-image`;
  },
  founder: "주식회사 워터리아",
  founderUrl: "https://water-ria.vercel.app",
  publisher: "주식회사 워터리아 (Water-RIA)",
};

/**
 * Organization schema — 루트 레이아웃에 주입
 * Knowledge Panel 후보가 되며 Article 등 다른 schema의 publisher 참조점
 */
export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    alternateName: SITE.alternateName,
    url: SITE.url,
    logo: {
      "@type": "ImageObject",
      url: SITE.logo,
      width: 512,
      height: 512,
    },
    description: SITE.description,
    foundingDate: "2026",
    founder: {
      "@type": "Organization",
      name: SITE.founder,
      url: SITE.founderUrl,
    },
    sameAs: [SITE.founderUrl],
    knowsAbout: [
      "스타트업 동문 커뮤니티",
      "신용보증기금 NEST",
      "기업 간 협업",
      "동문 네트워크",
      "스타트업 협력",
    ],
  };
}

/**
 * WebSite schema — 루트 레이아웃에 주입
 * Sitelinks Search Box 후보
 */
export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    inLanguage: "ko-KR",
    publisher: {
      "@id": `${SITE.url}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.url}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Article schema — 개별 카드 페이지에 주입
 * 필수 필드: headline, author, datePublished, image (하나라도 누락 시 전체 schema 무효)
 */
export function buildArticleJsonLd(stored: StoredCard, cardUrl: string) {
  const card = stored.card;
  const heroImage =
    card.heroImage ||
    `${SITE.url}/opengraph-image?id=${encodeURIComponent(stored.id)}`;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${cardUrl}#article`,
    headline: card.headline,
    description: card.dek || card.lead.slice(0, 160),
    image: [heroImage],
    datePublished: stored.createdAt,
    dateModified: stored.updatedAt,
    author: {
      "@type": "Organization",
      name: card.sourceSiteName || card.sourceDomain,
      url: card.sourceUrl,
    },
    publisher: {
      "@id": `${SITE.url}/#organization`,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": cardUrl,
    },
    inLanguage: card.lang === "en" ? "en-US" : "ko-KR",
    articleSection: card.industry || "기업 소개",
    keywords: [
      card.sourceSiteName,
      card.sourceDomain,
      card.industry,
      "Start-up NEST Alumni",
      "동문 기업",
      ...card.keyPoints.slice(0, 3),
    ]
      .filter(Boolean)
      .join(", "),
  };
}

/**
 * BreadcrumbList schema — 개별 카드 페이지에 주입
 * 검색 결과에 breadcrumb 표시되어 클릭률 향상
 */
export function buildBreadcrumbJsonLd(stored: StoredCard, cardUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "홈",
        item: SITE.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "갤러리",
        item: `${SITE.url}/#gallery`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: stored.card.headline,
        item: cardUrl,
      },
    ],
  };
}

/**
 * 카드별 SEO 메타데이터 빌드
 * generateMetadata에서 사용
 */
export function buildCardMetadata(stored: StoredCard, cardUrl: string) {
  const card = stored.card;
  const description = (
    card.dek ||
    card.lead ||
    card.bodyParagraphs[0] ||
    card.headline
  ).slice(0, 160);

  return {
    title: card.headline,
    description,
    openGraph: {
      title: card.headline,
      description,
      url: cardUrl,
      siteName: SITE.name,
      images: card.heroImage
        ? [{ url: card.heroImage, width: 1200, height: 630, alt: card.headline }]
        : undefined,
      locale: card.lang === "en" ? "en_US" : "ko_KR",
      type: "article" as const,
      publishedTime: stored.createdAt,
      modifiedTime: stored.updatedAt,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: card.headline,
      description,
      images: card.heroImage ? [card.heroImage] : undefined,
    },
    alternates: {
      canonical: cardUrl,
    },
    keywords: [
      card.sourceSiteName,
      card.sourceDomain,
      card.industry,
      "Start-up NEST Alumni 1기",
      "동문 기업",
      "스타트업",
      card.contactInfo?.address?.split(" ")[0],
    ].filter(Boolean) as string[],
  };
}

/**
 * JSON-LD를 React에서 안전하게 주입하는 헬퍼
 * dangerouslySetInnerHTML 사용을 캡슐화
 */
export function jsonLdScript(data: unknown): { __html: string } {
  // XSS 방지: </script> 패턴 이스케이프
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return { __html: json };
}

/**
 * FAQ 스키마 — 2026 GEO 베스트 프랙티스
 * AI Overviews(Google), ChatGPT, Claude, Perplexity가 직접 추출하는 형식
 * Q&A 쌍이 명확하면 답변 엔진 인용 가능성 증가
 */
export function buildFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE.url}/#faq`,
    mainEntity: [
      {
        "@type": "Question",
        name: "Start-up NEST Alumni 1기는 무엇인가요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "신용보증기금(KODIT) Start-up NEST 17·18기 졸업 기업이 첫 세대로 결성한 동문 커뮤니티입니다. 졸업 기업들이 서로의 사업·기술·서비스를 한 눈에 파악하고 협력 기회를 모색할 수 있도록 자발적 참여 기반 갤러리를 운영합니다.",
        },
      },
      {
        "@type": "Question",
        name: "어떻게 우리 회사 소개를 등록하나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "사이트 우상단 [+ 새 기업 소개 추가] 버튼을 누르고 자사 홈페이지 URL이나 보도자료/뉴스 기사 URL을 입력하면 자동으로 매거진 형식의 카드가 생성됩니다. 자동 추출이 어려운 경우 수동 입력 폼으로 직접 작성할 수도 있습니다.",
        },
      },
      {
        "@type": "Question",
        name: "AI가 본문을 작성하나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "AI 생성이 아닌 TextRank + MMR(Maximal Marginal Relevance) 알고리즘 기반 추출 요약을 사용합니다. 원본 사이트의 본문에서 핵심 문장을 선별하여 보여주는 방식이라, 사실 왜곡 위험은 낮지만 표현이 단조로울 수 있습니다.",
        },
      },
      {
        "@type": "Question",
        name: "참여하지 않으면 불이익이 있나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "전혀 없습니다. 본 커뮤니티는 자발적 참여 기반이며 운영 주체와 무관하게 자유롭게 가입·탈퇴할 수 있습니다. 노출이 부담스러운 기업은 등록하지 않아도 됩니다.",
        },
      },
      {
        "@type": "Question",
        name: "검색 엔진과 AI 답변에 노출되나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "네, 사이트 전체가 Google·Naver·Bing 인덱싱 + ChatGPT·Claude·Perplexity·Gemini 등 AI 답변 엔진 친화적으로 구성되어 있습니다. JSON-LD 구조화 데이터, llms.txt(GEO 표준), 동적 sitemap을 통해 검색 노출 + AI 인용 가능성을 모두 높입니다.",
        },
      },
      {
        "@type": "Question",
        name: "운영 비용이 드나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "참여 기업에게는 무료입니다. 운영 주체인 주식회사 워터리아가 자발적 봉사 형태로 운영 비용을 부담하며, 광고나 멤버십 비용을 받지 않습니다.",
        },
      },
    ],
  };
}

/**
 * CollectionPage + ItemList 스키마 — 2026 베스트 프랙티스
 * 갤러리(메인 페이지)에서 등록된 카드 목록을 구조화된 형식으로 노출
 * 검색 엔진이 카드 모음을 컬렉션으로 인식 → "이 사이트에 N개 카드가 있다"
 */
export function buildCollectionPageJsonLd(cards: StoredCard[]) {
  const itemList = cards.slice(0, 50).map((stored, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    url: `${SITE.url}/${stored.id}`,
    name: stored.card.headline,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE.url}/#collection`,
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE.url}/#organization`,
    },
    mainEntity: {
      "@type": "ItemList",
      "@id": `${SITE.url}/#itemlist`,
      numberOfItems: cards.length,
      itemListElement: itemList,
    },
  };
}
