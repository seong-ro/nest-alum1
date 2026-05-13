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
  "신용보증기금(신보, KODIT) Start-up NEST Alumni 1기 — NEST 전 기수 동문을 위한 자발적 커뮤니티 갤러리. NEST 17기(2025년 4월~8월 협약)·18기(2025년 8월~11월 협약) 졸업 기업이 첫 세대로 결성, NEST 1~16기 졸업 기업은 신용보증기금 스타트업그라운드팀(startup@kodit.co.kr, 02-710-4678) 문의 후 자발적으로 참여 가능. URL 한 줄로 매거진 카드 자동 생성 (TextRank+MMR), 약 500장까지 확장 가능. 동문 간 사업 파악·기술 협력·투자 연계 단서로 활용. Bing/Naver/Yandex 즉시 검색 노출 (IndexNow), 매주 자동 재인덱싱.";

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

  // ─── 협약기간 (정확한 시점, v2.55.8) ───
  "NEST 17기 2025년 4월",
  "NEST 17기 2025년 8월",
  "스타트업 네스트 17기 2025",
  "NEST 18기 2025년 8월",
  "NEST 18기 2025년 11월",
  "스타트업 네스트 18기 2025",
  "2025년 Start-up NEST",

  // ─── 전 기수 확장 (v2.56.0) ───
  "NEST 1기 동문",
  "NEST 16기 동문",
  "NEST 전 기수 동문",
  "스타트업 네스트 1~16기",
  "스타트업 네스트 전 기수",
  "스타트업그라운드팀",
  "신용보증기금 스타트업그라운드팀",
  "KODIT Startup Ground team",

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
      sameAs: [
        "https://github.com/seong-ro/nest-alum1",
        "https://www.kodit.co.kr",
        // v2.54.0: KODIT Start-up NEST 공식 페이지 (2026-May 베스트 프랙티스 — 권위 시그널)
        "https://www.kodit.co.kr/kodit/cm/cntnts/cntntsView.do?mi=2563&cntntsId=11234",
        // 정부24 — Start-up NEST 공식 등록 정부 서비스
        "https://www.gov.kr/portal/service/serviceInfo/B19001600005",
      ],
      // ⭐ 신용보증기금을 모기관으로 명시 — 2026 Google 베스트 프랙티스
      parentOrganization: {
        "@type": "GovernmentOrganization",
        "@id": "https://www.kodit.co.kr/#organization",
        name: "신용보증기금",
        alternateName: ["신보", "KODIT", "Korea Credit Guarantee Fund"],
        url: "https://www.kodit.co.kr",
      },
      // v2.58.0: Program → EducationalOccupationalProgram (schema.org 표준)
      // Organization → subjectOf → 별도 Program 노드 (memberOf 미적합 회피)
      subjectOf: {
        "@id": `${SITE_URL}/#program`,
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
    // v2.58.0: Start-up NEST 프로그램을 별도 schema.org 표준 노드로 정의
    // 이전 버전: Organization > memberOf > Program (Program 미정의, memberOf 부적합)
    // 이제: EducationalOccupationalProgram (schema.org 표준) + provider GovernmentOrganization
    {
      "@type": "EducationalOccupationalProgram",
      "@id": `${SITE_URL}/#program`,
      name: "신용보증기금 Start-up NEST",
      alternateName: [
        "Start-up NEST",
        "신보 Start-up NEST",
        "KODIT Start-up NEST",
        "스타트업 네스트",
        "NEST",
        "스타트업 NEST",
      ],
      description:
        "신용보증기금이 운영하는 한국 스타트업 액셀러레이션 프로그램. 4~7개월 협약기간 동안 보증·투자 연계·멘토링·네트워킹·교육을 제공. 매년 일정 수의 스타트업을 선발.",
      url: "https://www.kodit.co.kr/kodit/cm/cntnts/cntntsView.do?mi=2563&cntntsId=11234",
      programType: "Startup Accelerator Program",
      educationalProgramMode: "full-time",
      occupationalCategory: "스타트업 액셀러레이션",
      provider: {
        "@type": "GovernmentOrganization",
        "@id": "https://www.kodit.co.kr/#organization",
        name: "신용보증기금",
        alternateName: ["신보", "KODIT", "Korea Credit Guarantee Fund"],
        url: "https://www.kodit.co.kr",
      },
      sameAs: [
        "https://www.kodit.co.kr/kodit/cm/cntnts/cntntsView.do?mi=2563&cntntsId=11234",
        "https://www.gov.kr/portal/service/serviceInfo/B19001600005",
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
      name: "신용보증기금 Start-up NEST 동문 갤러리 (Alumni 1기)",
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
    // v2.57.0: FAQPage schema — Google AIO / Naver AI Briefing 답변 인용 최적화
    // 검색 결과 페이지에서 Rich Snippet 노출 + AI 답변 엔진이 직접 인용
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faqpage`,
      mainEntity: [
        {
          "@type": "Question",
          name: "신용보증기금 Start-up NEST Alumni 1기란 무엇인가요?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "신용보증기금(신보, KODIT)이 운영하는 Start-up NEST 액셀러레이션 프로그램의 졸업 기업이 자발적으로 결성한 동문 커뮤니티 갤러리입니다. NEST 17기(2025년 4월~8월 협약, 90개사)와 18기(2025년 8월~11월 협약, 60개사)가 SOUND2025 행사(2025.12.15)에서 첫 세대(Alumni 1기)로 결성했으며, 1~16기 졸업 기업도 신용보증기금 스타트업그라운드팀(startup@kodit.co.kr, 02-710-4678)에 문의 후 자발적으로 참여 가능합니다.",
          },
        },
        {
          "@type": "Question",
          name: "NEST 1~16기 졸업 기업도 참여할 수 있나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "네, 자발적으로 참여 가능합니다. 신용보증기금 스타트업그라운드팀에 사전 문의 후 동문 인증 절차를 거쳐 카드 등록이 가능합니다. 연락처는 이메일 startup@kodit.co.kr, 전화 02-710-4678 또는 02-710-4679입니다. 본 갤러리는 NEST 전 기수(1~18기 및 후속 기수)를 위한 자발적 커뮤니티로 운영됩니다.",
          },
        },
        {
          "@type": "Question",
          name: "동문 기업 소개 카드는 어떻게 등록하나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "회원가입 없이 URL 한 줄만 입력하면 됩니다. 자사 홈페이지나 보도자료 URL을 갤러리에 입력하면, TextRank + MMR 알고리즘이 핵심 문장을 자동 추출하여 매거진 형식 카드를 생성합니다. 등록 즉시 Bing/Naver/Yandex에 IndexNow ping이 전송되어 1~5분 내 검색 결과에 반영되며, Google은 sitemap.xml 자동 갱신으로 1~7일 내 자연 발견됩니다.",
          },
        },
        {
          "@type": "Question",
          name: "등록한 카드가 구글 검색에 나오지 않을 때 어떻게 해결하나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "등록 직후 1~7일 대기가 일반적입니다(Google 자연 인덱싱). 시간이 지났는데도 검색되지 않으면 /admin 대시보드의 [🔄 모든 카드 검색엔진 재인덱싱] 버튼을 사용하면 즉시 모든 카드를 IndexNow에 재ping합니다. 매주 일요일 KST 03:00에 GitHub Actions가 자동으로 모든 카드를 재인덱싱하기도 합니다. Google Search Console에서 직접 URL 제출하면 1~3일 가속화됩니다.",
          },
        },
        {
          "@type": "Question",
          name: "본 갤러리는 신용보증기금 공식 사이트인가요?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "아니요, 본 갤러리는 신용보증기금이 직접 운영하는 공식 사이트가 아닌 NEST 졸업 기업이 자발적으로 결성한 비공식 동문 커뮤니티 갤러리입니다. 다만 1~16기 동문이 참여하려면 신용보증기금 스타트업그라운드팀의 사전 인증을 받아야 하므로, 신용보증기금과 협력하는 커뮤니티입니다.",
          },
        },
        {
          "@type": "Question",
          name: "카드 등록 가능 개수에 제한이 있나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "약 500장까지 등록 가능합니다. KV 저장소(Upstash Redis) 무료 티어 기준으로 256MB·10,000 commands/day 한도 내에서 충분히 수용 가능합니다. 카드 데이터는 매일 KST 02:00에 GitHub Actions가 자동 백업하여 시점 복원 가능합니다.",
          },
        },
      ],
    },
    // v2.57.0: HowTo schema — "동문 기업 카드 등록 방법" Google How-To rich result
    {
      "@type": "HowTo",
      "@id": `${SITE_URL}/#howto`,
      name: "신용보증기금 Start-up NEST 동문 갤러리에 기업 소개 카드 등록하기",
      description:
        "회원가입·로그인 없이 URL 한 줄로 매거진 형식의 동문 기업 소개 카드를 등록하는 방법.",
      totalTime: "PT1M",
      tool: [
        {
          "@type": "HowToTool",
          name: "회사 홈페이지·보도자료 URL",
        },
      ],
      step: [
        {
          "@type": "HowToStep",
          name: "URL 입력란 찾기",
          text: "홈페이지의 [기업 소개 추가] 버튼을 누르면 URL 입력란이 나타납니다.",
          url: `${SITE_URL}/#create-card`,
        },
        {
          "@type": "HowToStep",
          name: "URL 붙여넣기",
          text:
            "자사 홈페이지 또는 자사 보도자료 URL을 입력란에 붙여넣습니다. https://로 시작하는 전체 URL이어야 합니다.",
        },
        {
          "@type": "HowToStep",
          name: "관리 코드 설정",
          text:
            "본인이 정한 4~32자 관리 코드를 입력합니다. 이 코드로 추후 카드 수정·삭제가 가능합니다 (회원가입 불요).",
        },
        {
          "@type": "HowToStep",
          name: "카드 생성",
          text:
            "[카드 만들기] 버튼을 누르면 1~3초 내 TextRank+MMR 알고리즘이 본문을 자동 분석하여 매거진 형식 카드가 생성됩니다.",
        },
        {
          "@type": "HowToStep",
          name: "검색 노출 확인",
          text:
            "카드 등록 즉시 Bing·Naver·Yandex에 IndexNow ping이 자동 전송됩니다. 1~5분 후 'site:nest-alum1.vercel.app 회사명' 형식으로 검색하면 카드 노출 확인 가능합니다.",
        },
      ],
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
