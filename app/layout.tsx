import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

// ---------------------------------------------------------------------------
// SEO Metadata — Next.js 15 Metadata API 베스트 프랙티스
// ---------------------------------------------------------------------------

const SITE_URL = getSiteUrl();

const BRAND_FULL = "신용보증기금 Start-up Nest Alumni 1기";
const BRAND_EXTENDED = "신용보증기금(신보) Start-up NEST Alumni 1기 — NEST 17기·18기 동문 커뮤니티";

const SITE_DESCRIPTION =
  "신용보증기금(신보, KODIT) Start-up NEST Alumni 1기 — NEST 17기·18기 졸업 기업이 첫 세대로 결성한 동문 커뮤니티 갤러리. 신보 NEST 액셀러레이션 프로그램 17기·18기 출신 스타트업이 자사 홈페이지·뉴스 기사·보도자료 URL 하나로 동문 기업 소개를 갤러리에 추가하면, 매거진 형식의 소개로 자동 정리되어 동문 간 교류·기술 협력·투자 연계의 단서로 활용할 수 있습니다. Start-up NEST 17기 동문, NEST 18기 동문, KODIT 액셀러레이터 졸업 기업이 모두 참여 가능합니다.";

const KEYWORDS = [
  // ─── 정식 명칭 (다양한 표기 변형) ───
  "신용보증기금 Start-up NEST Alumni 1기",
  "신용보증기금 Start-up Nest Alumni 1기",
  "신용보증기금 스타트업 네스트 동문",
  "신용보증기금 스타트업 NEST 동문",
  "신용보증기금 NEST Alumni",

  // ─── 신용보증기금 약칭 (보편 사용 호칭) ───
  "신보 NEST Alumni",
  "신보 Start-up NEST",
  "신보 스타트업 네스트",
  "신보 NEST 동문",
  "신보 NEST 17기",
  "신보 NEST 18기",
  "KODIT NEST Alumni",
  "KODIT Start-up NEST",

  // ─── 기수 단독 표현 (검색 빈도 높음) ───
  "Start-up NEST 17기",
  "Start-up NEST 18기",
  "Start-up Nest 17기",
  "Start-up Nest 18기",
  "스타트업 네스트 17기",
  "스타트업 네스트 18기",
  "NEST 17기",
  "NEST 18기",
  "신용보증기금 17기",
  "신용보증기금 18기",
  "신보 17기",
  "신보 18기",
  "17기 졸업",
  "18기 졸업",
  "17기 동문",
  "18기 동문",

  // ─── Alumni 커뮤니티 표현 ───
  "Start-up NEST Alumni",
  "스타트업 네스트 동문",
  "스타트업 네스트 동문회",
  "졸업 Alumni 1기",
  "Alumni 1기",
  "Alumni 커뮤니티",
  "동문 커뮤니티",
  "동문 갤러리",
  "스타트업 동문",

  // ─── 영문 표현 (해외 검색·AI 답변) ───
  "Start-up NEST Alumni",
  "Korea Credit Guarantee Fund NEST",
  "KODIT Start-up Accelerator",
  "Korean Startup Alumni Community",

  // ─── 콘텐츠 유형 ───
  "기업 소개 갤러리",
  "스타트업 디렉토리",
  "에디토리얼 카드",
  "기업 매거진",

  // ─── 기술 스택 (개발자 친화) ───
  "TextRank",
  "MMR 요약",
  "Next.js 15",
  "Vercel",
];

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: BRAND_EXTENDED,
    template: `%s | ${BRAND_FULL}`,
  },

  description: SITE_DESCRIPTION,

  applicationName: BRAND_FULL,
  authors: [{ name: "seong-ro", url: "https://github.com/seong-ro" }],
  creator: "seong-ro",
  publisher: BRAND_FULL,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",

  keywords: KEYWORDS,

  category: "technology",
  classification: "Business / Enterprise Software",

  alternates: {
    canonical: "/",
    languages: {
      "ko-KR": "/",
      "x-default": "/",
    },
  },

  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: BRAND_FULL,
    title: BRAND_EXTENDED,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: BRAND_EXTENDED,
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: BRAND_EXTENDED,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  // AI 검색엔진(ChatGPT/Perplexity/Claude/Gemini) 명시 허용 — GEO 베스트 프랙티스
  // robots 메타에 직접 다른 user-agent를 지정할 수는 없어 robots.ts에서 처리

  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/apple-icon", sizes: "180x180" }],
  },

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  verification: {
    // Google Search Console — 직접 코드 적용 (환경변수 우선, 없으면 하드코딩 fallback)
    google:
      process.env.GOOGLE_SITE_VERIFICATION ??
      "JuyHHaf_drhOJCJFn44lRBZ-23l4-6JmHZ-M6PV29Q8",
    other: {
      // 네이버 웹마스터도구 (한국 검색 ~30% 점유율)
      "naver-site-verification":
        process.env.NAVER_SITE_VERIFICATION ??
        "76efe1d0557654421a1536e32bfa7d381cae2e74",
      // Bing Webmaster Tools
      "msvalidate.01":
        process.env.BING_SITE_VERIFICATION ??
        "DBD84972CD0653BA0206AB375609D0FE",
    },
  },
};

// ---------------------------------------------------------------------------
// JSON-LD Structured Data
// ---------------------------------------------------------------------------

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: BRAND_FULL,
      alternateName: [
        "신용보증기금 Start-up NEST Alumni 1기",
        "신용보증기금 Start-up Nest Alumni 1기",
        "신보 NEST Alumni 1기",
        "신보 Start-up NEST Alumni",
        "KODIT NEST Alumni 1기",
        "KODIT Start-up NEST Alumni",
        "스타트업 네스트 동문 1기",
        "NEST Alumni 1기",
        "NEST 17기·18기 동문",
        "Start-up NEST 17기 18기 Alumni",
      ],
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      sameAs: ["https://github.com/seong-ro/nest-alum1", "https://www.kodit.co.kr"],
      // ⭐ 신용보증기금을 모기관으로 명시 — 2026 Google 베스트 프랙티스
      parentOrganization: {
        "@type": "GovernmentOrganization",
        "@id": "https://www.kodit.co.kr/#organization",
        name: "신용보증기금",
        alternateName: ["신보", "KODIT", "Korea Credit Guarantee Fund"],
        url: "https://www.kodit.co.kr",
      },
      // ⭐ Start-up NEST 프로그램 멤버 명시 — 검색엔진 정확 매칭
      memberOf: {
        "@type": "Program",
        name: "신용보증기금 Start-up NEST",
        alternateName: [
          "Start-up NEST",
          "신보 Start-up NEST",
          "KODIT Start-up NEST",
          "스타트업 네스트",
          "NEST",
        ],
        description:
          "신용보증기금이 운영하는 한국 스타트업 액셀러레이션 프로그램. 매년 일정 수의 스타트업을 선발하여 보증·투자 연계·멘토링·네트워킹을 제공.",
        provider: {
          "@type": "GovernmentOrganization",
          name: "신용보증기금",
          alternateName: ["신보", "KODIT"],
          url: "https://www.kodit.co.kr",
        },
      },
      knowsAbout: [
        "신용보증기금 Start-up NEST",
        "신보 Start-up NEST",
        "KODIT Start-up NEST",
        "Start-up NEST 17기",
        "Start-up NEST 18기",
        "NEST 17기 동문",
        "NEST 18기 동문",
        "스타트업 네스트 17기",
        "스타트업 네스트 18기",
        "스타트업 동문 커뮤니티",
        "기업 간 협업",
        "동문 네트워크",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: BRAND_FULL,
      alternateName: [
        "신보 NEST Alumni 1기",
        "KODIT NEST Alumni",
        "Start-up NEST 17기·18기 동문",
      ],
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "ko-KR",
    },
    // ⭐ WebPage schema — 메인 페이지를 명시적 정보 페이지로 마크업
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: "신용보증기금 Start-up NEST 17기·18기 동문 갤러리",
      description: SITE_DESCRIPTION,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "ko-KR",
      // 검색엔진이 메인 페이지를 풍부한 정보 페이지로 인식
      mainContentOfPage: {
        "@type": "WebPageElement",
        cssSelector: "main",
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Root Layout
// ---------------------------------------------------------------------------

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko-KR" dir="ltr">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <meta name="format-detection" content="telephone=no" />
        {/* 2026 GEO 베스트 프랙티스 — llms.txt 위치 광고 (AI 크롤러 hint) */}
        <link
          rel="alternate"
          type="text/markdown"
          title="LLM-friendly content map (llms.txt)"
          href="/llms.txt"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="antialiased min-h-dvh bg-bg text-fg">
        <a href="#main" className="skip-link">
          본문으로 건너뛰기
        </a>
        {children}
        {/* Vercel 무료 플랜에서도 동작 — 페이지뷰·Core Web Vitals 자동 수집 */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
