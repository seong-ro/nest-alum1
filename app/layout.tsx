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
const BRAND_EXTENDED = "신용보증기금 Start-up Nest Alumni 1기 — 17·18기 졸업 기업의 Alumni 1기";

const SITE_DESCRIPTION =
  "신용보증기금 Start-up NEST Alumni 1기는 17·18기 졸업 기업이 첫 세대로 결성한 동문 커뮤니티입니다. 자사 홈페이지나 관련 뉴스 기사·보도자료 등 어떤 페이지든 URL 하나로 동문 기업 소개를 갤러리에 추가하면, 매거진 형식의 소개로 자동 정리되어 모든 동문이 기업 간 교류·기술 협력·투자 연계의 단서로 활용할 수 있습니다.";

const KEYWORDS = [
  "신용보증기금 Start-up Nest Alumni",
  "스타트업 네스트 동문",
  "신용보증기금 Start-up Nest 1기",
  "신용보증기금 Start-up Nest 17기",
  "신용보증기금 Start-up Nest 18기",
  "졸업 Alumni 1기",
  "Alumni 커뮤니티",
  "기업 소개",
  "에디토리얼 카드",
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
        "신용보증기금 Start-up Nest Alumni",
        "신용보증기금 Start-up Nest 졸업 Alumni 1기",
      ],
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      sameAs: ["https://github.com/seong-ro/nest-alum1"],
      // 17·18기 졸업 기업이 결성한 최초 Alumni 커뮤니티
      parentOrganization: {
        "@type": "Organization",
        name: "신용보증기금 Start-up Nest",
      },
      memberOf: [
        {
          "@type": "Organization",
          name: "신용보증기금 Start-up Nest 17기 졸업",
          description: "신용보증기금 Start-up Nest 액셀러레이션 프로그램 17기 졸업 기업군",
        },
        {
          "@type": "Organization",
          name: "신용보증기금 Start-up Nest 18기 졸업",
          description: "신용보증기금 Start-up Nest 액셀러레이션 프로그램 18기 졸업 기업군",
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: BRAND_FULL,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "ko-KR",
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
