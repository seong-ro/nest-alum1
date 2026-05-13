import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  title:
    "신용보증기금 Start-up NEST 전 기수 동문 커뮤니티 소개 | NEST 1~18기 Alumni 자발적 커뮤니티",
  description:
    "신용보증기금(신보, KODIT) Start-up NEST 전 기수(1~18기 및 후속 기수) 동문을 위한 자발적 커뮤니티 갤러리 소개. NEST 17기·18기 졸업 기업이 첫 세대(Alumni 1기)로 결성, NEST 1~16기는 신용보증기금 스타트업그라운드팀(startup@kodit.co.kr, 02-710-4678) 문의 후 참여 가능. 약 500장까지 확장 가능한 동문 카드 갤러리.",
  alternates: { canonical: "/about" },
  openGraph: {
    title:
      "신용보증기금 Start-up NEST 전 기수 동문 커뮤니티 소개 | NEST 1~18기 Alumni",
    description:
      "신보 NEST 17기·18기 출발, 1~16기 + 후속 기수까지 합류 가능한 자발적 동문 커뮤니티 갤러리.",
    url: `${SITE_URL}/about`,
  },
};

// SEO 핵심: ISR 캐싱 (24시간) - 정적 콘텐츠라 자주 갱신 불필요
export const revalidate = 86400;

export default function AboutPage() {
  return (
    <main className="max-w-container mx-auto px-6 md:px-10 py-16 md:py-24">
      <article className="max-w-3xl prose-content">
        <nav className="mb-8 text-[0.85rem] text-fg-muted">
          <Link href="/" className="hover:text-fg focus-ring rounded-sm">
            홈
          </Link>
          <span aria-hidden="true" className="mx-2">
            ›
          </span>
          <span className="text-fg">커뮤니티 소개</span>
        </nav>

        <header className="mb-10">
          <h1 className="font-display font-bold tracking-tight text-[2rem] md:text-[2.5rem] leading-[1.15]">
            신용보증기금 Start-up NEST 17기·18기 동문 커뮤니티 소개
          </h1>
          <p className="mt-4 text-[1.05rem] text-fg-muted leading-relaxed">
            신보 NEST Alumni 1기 갤러리에 대한 자세한 안내
          </p>
        </header>

        <section className="space-y-6 text-[0.98rem] leading-[1.8] text-fg">
          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            동문 기업이 얻는 구체적 이점
          </h2>
          <p>
            본 갤러리는 Start-up NEST 17기·18기 동문 기업이 다음과 같은 실용적
            가치를 즉시 활용할 수 있도록 설계되었습니다.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-fg">
            <li>
              <strong>동문 사업 한눈에 파악</strong> — 다른 17기·18기 기업이 어떤 사업·기술을
              다루는지 카드 갤러리에서 빠르게 탐색할 수 있습니다. 기수별·업종별 정렬과
              필터링으로 관심 분야의 동문을 즉시 식별합니다.
            </li>
            <li>
              <strong>기술 협력 후보 발굴</strong> — 업종 카테고리 multi-select 필터로 자사
              기술과 시너지가 있는 동문 기업을 빠르게 탐색합니다. AI·NPU·Edge,
              클라우드·SaaS, 핀테크, 헬스케어 등 8개 카테고리 분류 적용.
            </li>
            <li>
              <strong>등록 절차 간소화</strong> — 회원가입·로그인 없이 자사 홈페이지
              URL이나 보도자료 URL 1개만 입력하면 매거진 형식의 기업 소개 카드가
              자동 생성됩니다. TextRank + MMR 알고리즘이 본문에서 핵심 문장을 추출합니다.
            </li>
            <li>
              <strong>셀프 카드 관리</strong> — 카드 등록 시 본인이 설정한 관리 코드로
              직접 등록·수정·삭제를 처리합니다. 운영자 승인 절차 없이 즉시 반영됩니다.
            </li>
            <li>
              <strong>검색 엔진 자연 노출</strong> — Google·Naver·Bing에 자동 인덱싱되어
              잠재 고객·투자자가 동문 기업명 또는 관련 기술 검색 시 본 카드가 자연 노출됩니다.
              JSON-LD 구조화 데이터(Article·BreadcrumbList) 자동 적용.
            </li>
            <li>
              <strong>AI 답변 엔진 인용 가능</strong> — ChatGPT·Claude·Perplexity·Gemini
              답변에 동문 기업 정보가 인용될 수 있도록 GEO(Generative Engine Optimization)
              표준 llms.txt와 FAQPage·Organization·CollectionPage JSON-LD를 모두 적용했습니다.
            </li>
            <li>
              <strong>카드 단위 외부 공유</strong> — 카드별 고유 URL로 소셜 미디어·이메일·
              메신저에 직접 공유합니다. Web Share API와 클립보드 복사 기능을 통합하여
              한 번의 클릭으로 공유 흐름이 완료됩니다.
            </li>
            <li>
              <strong>즐겨찾기 개인화</strong> — 관심 동문 기업을 ★ 즐겨찾기로 표시하면
              브라우저 localStorage에 저장되어 재방문 시 자동 표시됩니다. 서버 데이터베이스
              부하 없이 작동합니다.
            </li>
            <li>
              <strong>오픈 소스 코드 공개</strong> — 전체 소스 코드를 GitHub에 공개하여
              운영 투명성을 확보합니다. 동문 기업이 직접 코드를 검증하거나 개선
              제안을 할 수 있습니다.
            </li>
            <li>
              <strong>장기 안정 운영</strong> — Vercel + GitHub + Upstash 무료 인프라 기반으로
              구축되어 외부 유료 서비스 의존성이 없습니다. 외부 정책 변경에 영향 받지 않고
              지속 운영됩니다.
            </li>
          </ul>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            신용보증기금 Start-up NEST는 무엇인가요?
          </h2>
          <p>
            <strong>신용보증기금(신보, KODIT, Korea Credit Guarantee Fund)</strong>은
            한국의 대표적인 정책금융기관으로, 중소기업·스타트업의 신용보증을 통해 자금
            조달을 지원합니다. <strong>Start-up NEST(스타트업 네스트)</strong>는
            신용보증기금이 운영하는 스타트업 액셀러레이션 프로그램으로, 매년 일정 수의
            스타트업을 선발하여 보증·투자 연계·멘토링·네트워킹을 제공합니다.
          </p>
          <p>
            본 사이트는 <strong>Start-up NEST 17기</strong>(협약기간{" "}
            <strong>2025년 4월~8월</strong>)와{" "}
            <strong>Start-up NEST 18기</strong>(협약기간{" "}
            <strong>2025년 8월~11월</strong>)를 졸업한 동문 기업들이 자발적으로
            결성한 비공식 동문 커뮤니티 갤러리입니다.
          </p>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            왜 17기·18기가 함께 1기를 만들었나요?
          </h2>
          <p>
            <strong>신용보증기금 Start-up NEST 17기</strong>(2025년 4월~8월 협약, 5개 전형
            90개사 선발)와{" "}
            <strong>스타트업 네스트 18기</strong>(2025년 8월~11월 협약, 60개사 선발)는
            연속하여 같은 해(2025년)에 협약 진행된 두 기수입니다.
            기존 NEST 동문 커뮤니티가 별도로 존재하지 않았기 때문에, 두 기수의 졸업 기업이
            함께 첫 세대(Alumni 1기)를 결성하여 동문 갤러리를 출범했습니다.
          </p>
          <p>
            출범일은 <strong>2025년 12월 15일</strong>이며,{" "}
            <strong>SOUND2025</strong> 행사에서 공식 발족했습니다. 이후 NEST 19기, 20기 등
            후속 기수 졸업 기업도 순차적으로 합류할 수 있도록 열려 있습니다.
          </p>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            🎉 NEST 전 기수(1기~) 졸업 기업 모두 환영합니다
          </h2>
          <p>
            본 갤러리는 17기·18기가 출발점이었지만,{" "}
            <strong>NEST 1기부터 16기까지의 졸업 기업</strong>도 자발적으로 참여 가능합니다.
            전 기수 동문이 한 공간에서 서로의 사업을 공유하고 협력 기회를 찾을 수 있도록
            확장된 자발적 커뮤니티입니다.
          </p>
          <div className="my-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="font-semibold text-emerald-900 mb-2">
              📞 NEST 1~16기 참여 절차
            </h3>
            <p className="text-emerald-900 text-sm">
              아래 신용보증기금 <strong>스타트업그라운드팀</strong>에 사전 문의 후,
              동문 인증 절차를 거쳐 카드 등록이 가능합니다.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-emerald-900">
              <li>
                <strong>· 부서:</strong> 신용보증기금 스타트업그라운드팀
              </li>
              <li>
                <strong>· 이메일:</strong>{" "}
                <a href="mailto:startup@kodit.co.kr" className="hover:underline font-mono">
                  startup@kodit.co.kr
                </a>
              </li>
              <li>
                <strong>· 전화:</strong>{" "}
                <a href="tel:02-710-4678" className="hover:underline font-mono">
                  ☎ 02-710-4678
                </a>
                {" / "}
                <a href="tel:02-710-4679" className="hover:underline font-mono">
                  ☎ 02-710-4679
                </a>
              </li>
              <li>
                <strong>· 홈페이지:</strong>{" "}
                <a
                  href="https://www.kodit.co.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  https://www.kodit.co.kr
                </a>
              </li>
              <li>
                <strong>· 신보 ON-Biz:</strong>{" "}
                <a
                  href="https://www.kodit.co.kr/sut/index.do"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  https://www.kodit.co.kr/sut/index.do
                </a>
              </li>
            </ul>
            <p className="mt-3 text-xs text-emerald-700">
              💡 본 갤러리는 NEST <strong>전 기수(1~18기 및 후속 기수)</strong>를
              위한 자발적 커뮤니티로 운영됩니다. 등록 카드 범위는 약 500장까지 확장
              가능합니다.
            </p>
          </div>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            📖 본 갤러리의 작동 원리 (스토리텔링)
          </h2>
          <p className="text-stone-700">
            <strong>1️⃣ 문제:</strong> NEST를 졸업한 동문 기업이 서로 어떤 사업을
            하는지 모릅니다. 공식 동문 디렉토리가 없고, 같은 기수 안에서도 모든
            기업을 파악하기 어렵습니다. 기수 간에는 더더욱 단절돼있습니다.
          </p>
          <p className="text-stone-700">
            <strong>2️⃣ 솔루션:</strong> 회원가입 없이 URL 한 줄만 입력하면 매거진
            형식의 카드가 자동 생성됩니다. 자사 홈페이지 또는 보도자료 URL을
            넣으면, TextRank + MMR 알고리즘이 핵심 문장을 추출하여 통일된 디자인의
            카드로 정리합니다.
          </p>
          <p className="text-stone-700">
            <strong>3️⃣ 작동 방식:</strong> 입력한 URL → cheerio로 HTML 파싱 → og·twitter·schema.org
            메타데이터 우선 추출 → TextRank로 본문 핵심 문장 선정 → MMR로 다양성 보장 → KV
            저장소(Upstash Redis)에 영구 저장 → 즉시 검색엔진에 알림(IndexNow).
          </p>
          <p className="text-stone-700">
            <strong>4️⃣ 검색 노출:</strong> 카드 등록 즉시 Bing·Naver·Yandex에 ping이
            전송되어 1~5분 내 검색 결과에 반영됩니다. Google은 IndexNow를
            지원하지 않지만 sitemap.xml 자동 갱신으로 1~7일 내 자연 발견됩니다.
            매주 일요일 KST 03:00에 GitHub Actions가 모든 카드를 다시 ping
            (주기적 자동 작동).
          </p>
          <p className="text-stone-700">
            <strong>5️⃣ 미래:</strong> NEST 1~18기 + 19기 이후 모든 기수가
            자유롭게 참여하면, 각 동문 기업의 사업 변화·신규 사업 발표·투자 유치
            등의 소식이 카드 형태로 누적되어 NEST 동문의 살아있는 갤러리로
            성장합니다. 누구나 검색·필터링하여 시너지 가능한 동문 기업을 찾을 수
            있습니다.
          </p>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            🔍 구글·네이버 검색 노출 가이드
          </h2>
          <p>
            본 갤러리는 검색엔진 노출을 위한 4가지 자동 시스템이 작동합니다:
          </p>
          <div className="my-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <h3 className="font-semibold mb-2">자동 검색 노출 시스템</h3>
            <ul className="space-y-2">
              <li>
                <strong>1️⃣ IndexNow 즉시 ping</strong> — 카드 등록 시 Bing·Naver·Yandex·Seznam·Yep에
                즉시 알림 (1~5분 후 검색 결과 반영)
              </li>
              <li>
                <strong>2️⃣ sitemap.xml 자동 갱신</strong> — 모든 카드 URL이 sitemap에
                포함되어 Google 자연 인덱싱 (1~7일)
              </li>
              <li>
                <strong>3️⃣ JSON-LD 구조화 데이터</strong> —
                Organization·Article·CollectionPage·BreadcrumbList schema로 검색
                결과 풍부한 표시
              </li>
              <li>
                <strong>4️⃣ 주기적 자동 재인덱싱</strong> — 매주 일요일 KST 03:00
                GitHub Actions가 모든 카드를 IndexNow에 재ping (weekly-reindex
                workflow)
              </li>
            </ul>
          </div>
          <h3 className="text-[1.1rem] font-semibold mt-6 mb-2 text-fg">
            검색 안 보일 때 진단 절차
          </h3>
          <p>등록한 카드가 검색되지 않는 경우 다음 순서로 점검:</p>
          <ol className="list-decimal pl-6 space-y-1 my-3">
            <li>
              <strong>등록 직후라면</strong> 1~7일 대기 (Google 자연 인덱싱 시간)
            </li>
            <li>
              <strong>시간이 지났는데도 안 나오면</strong>: <code>/admin</code>{" "}
              대시보드 접속 → [🔄 모든 카드 검색엔진 재인덱싱] 버튼 클릭
            </li>
            <li>
              <strong>Google Search Console에서 직접 URL 제출</strong>:{" "}
              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                search.google.com/search-console
              </a>
            </li>
            <li>
              <strong>인덱싱 확인</strong>: Google에서{" "}
              <code className="bg-stone-100 px-1 rounded text-xs">
                site:nest-alum1.vercel.app
              </code>{" "}
              검색 → 표시되는 페이지 수 확인
            </li>
            <li>
              <strong>특정 카드 검색</strong>:{" "}
              <code className="bg-stone-100 px-1 rounded text-xs">
                site:nest-alum1.vercel.app &lt;회사명&gt;
              </code>{" "}
              형식으로 검색 → 특정 카드 인덱싱 여부 확인
            </li>
          </ol>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            본 사이트는 신용보증기금 공식 사이트인가요?
          </h2>
          <p>
            <strong>아닙니다.</strong> 본 사이트는 신용보증기금 Start-up NEST 전 기수 졸업 기업이
            자발적으로 결성한 <strong>비공식 동문 커뮤니티</strong>이며,
            운영은 동문 기업 중 하나인 주식회사 워터리아(Water-RIA)가 담당합니다.
          </p>
          <p>
            신용보증기금 공식 사이트는{" "}
            <a
              href="https://www.kodit.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              https://www.kodit.co.kr
            </a>
            입니다.
          </p>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            어떻게 우리 회사 소개를 등록하나요?
          </h2>
          <p>
            <Link href="/" className="text-accent hover:underline">
              메인 페이지
            </Link>{" "}
            우상단의 <strong>[+ 새 기업 소개 추가]</strong> 버튼을 누르고, 자사
            홈페이지 URL이나 보도자료·뉴스 기사 URL을 입력하면 자동으로 매거진 형식의
            카드가 생성됩니다. 별도 회원가입이나 로그인은 필요하지 않습니다.
          </p>
          <p>
            자동 추출이 어려운 경우(예: SPA 사이트, 사내 인증 페이지) 수동 입력 폼으로
            직접 작성할 수도 있습니다.
          </p>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            카드 등록·내림 관리 코드는 어떻게 받나요?
          </h2>
          <p>
            카드 등록·수정·내림 시 동일한 관리 코드가 사용됩니다. 코드는 동문 단톡방
            공지 또는 운영자 직접 안내를 통해 받을 수 있습니다. 본인 카드는 셀프로
            등록·수정·내림할 수 있으며, 코드를 분실하셨거나 운영자 권한이 필요한
            변경은{" "}
            <a
              href="mailto:srbae@w-proj.com"
              className="text-accent hover:underline"
            >
              운영자 이메일
            </a>
            {" "}또는{" "}
            <a
              href="https://github.com/seong-ro/nest-alum1/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              GitHub Issues
            </a>
            로 요청해주세요.
          </p>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            AI를 사용하나요?
          </h2>
          <p>
            본문 요약은 AI API 호출이 아닌 <strong>TextRank + MMR</strong> 알고리즘 기반
            추출 요약을 사용합니다. 원본 사이트의 본문에서 핵심 문장을 선별하는
            방식으로, 사실 왜곡 위험은 낮지만 표현이 단조로울 수 있습니다.
          </p>
          <p>
            AI API 미사용 정책으로 OpenAI·Anthropic·Google Cloud AI 등 외부 유료 서비스
            의존성이 0이며, 영구 무료 운영이 보장됩니다.
          </p>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            검색 엔진과 AI 답변에 노출되나요?
          </h2>
          <p>
            네, 사이트 전체가 Google·Naver·Bing 인덱싱 + ChatGPT·Claude·Perplexity·Gemini
            등 AI 답변 엔진 친화적으로 구성되어 있습니다. JSON-LD 구조화 데이터,
            llms.txt(GEO 표준), 동적 sitemap을 통해 검색 노출과 AI 인용 가능성을 모두
            높였습니다.
          </p>
          <p>
            본 사이트는 다음 검색어로 매칭됩니다: <em>신용보증기금 NEST 17기</em>,{" "}
            <em>신보 NEST 17기 동문</em>, <em>스타트업 네스트 18기 졸업</em>,{" "}
            <em>KODIT Start-up NEST Alumni</em>, <em>Start-up NEST 17기 졸업 기업</em>,
            <em>Start-up NEST 18기 졸업 기업</em>.
          </p>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            Start-up NEST 프로그램 개요 (참고)
          </h2>
          <p>
            <strong>신용보증기금(신보, KODIT) Start-up NEST</strong>는 신용보증기금이
            운영하는 액셀러레이션 프로그램입니다. 매 기수마다 일정 수의 스타트업이
            선발되어 다음과 같은 지원을 받습니다.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>신용보증 우대</strong> — 보증 한도 확대, 보증료 우대 등
              자금 조달 측면의 지원
            </li>
            <li>
              <strong>투자 연계</strong> — 신보의 투자 펀드 출자 또는 외부 VC와의
              매칭 기회 제공
            </li>
            <li>
              <strong>멘토링 프로그램</strong> — 분야별 전문가 멘토와의 1:1 매칭
              및 정기 멘토링 세션
            </li>
            <li>
              <strong>네트워킹 행사</strong> — 동기 기수 간 네트워킹, 선후배 기수
              교류 행사 (SOUND 등)
            </li>
            <li>
              <strong>해외 진출 지원</strong> — 해외 투자자 매칭, 글로벌 컨퍼런스
              참가 기회
            </li>
            <li>
              <strong>공간 지원</strong> — Start-up NEST 전용 공간 (서울 마포 등)
              일정 기간 무료 이용
            </li>
          </ul>
          <p>
            17기는 2023년에 졸업했으며, 18기는 2024년에 졸업했습니다. 각 기수의
            졸업 기업은 통상 20~40개 내외이며, 본 갤러리는 이 두 기수의 졸업
            기업 중 자발적으로 참여한 동문의 정보를 매거진 형식으로 정리하여
            제공합니다.
          </p>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            SOUND 행사와 Alumni 1기 출범
          </h2>
          <p>
            <strong>SOUND</strong>는 신용보증기금이 매년 개최하는 Start-up NEST
            동문 네트워킹 행사입니다. 17기·18기가 졸업 후 처음으로 함께 모인
            <strong> SOUND2025 행사 (2025년 12월 15일)</strong>에서 두 기수의
            졸업 기업이 첫 번째 동문 커뮤니티 (Alumni 1기)를 결성하기로
            의기투합했고, 본 갤러리 사이트는 이때 출범한 동문 커뮤니티의 첫 번째
            구체적 결과물입니다.
          </p>
          <p>
            본 사이트는 다음과 같은 단계를 거쳐 만들어졌습니다.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>2025년 12월 15일</strong> — SOUND2025 행사에서 17기·18기
              합동 Alumni 1기 결성 의기투합
            </li>
            <li>
              <strong>2026년 1월</strong> — 동문 단톡방을 통한 운영 방식 논의,
              커뮤니티 갤러리 형식 결정
            </li>
            <li>
              <strong>2026년 2~3월</strong> — 주식회사 워터리아가 갤러리 사이트
              개발 착수, TextRank + MMR 알고리즘 기반 카드 자동 생성 구현
            </li>
            <li>
              <strong>2026년 4월</strong> — 베타 버전 공개, 첫 5개 동문 기업 카드
              등록 (워터리아·도와주다·모두의권리 외)
            </li>
            <li>
              <strong>2026년 5월</strong> — SEO·GEO 인프라 완성, 동문 기업
              본격 등록 시작
            </li>
          </ul>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            기술 스택 및 인프라
          </h2>
          <p>
            본 갤러리 사이트는 다음 기술 스택으로 구축되었습니다.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Frontend</strong>: Next.js 15 (App Router) + React 19 +
              Tailwind CSS v3 — 서버 컴포넌트 기반 SSR/ISR
            </li>
            <li>
              <strong>Backend</strong>: Vercel Serverless Functions (Edge Runtime
              부분 적용) + Server Actions
            </li>
            <li>
              <strong>Database</strong>: Upstash Redis (Tokyo region) — 카드 데이터
              persistent 저장
            </li>
            <li>
              <strong>본문 추출</strong>: cheerio (HTML 파싱) + 자체 구현 TextRank
              알고리즘 (LexRank 변종) + MMR 다양성 보장
            </li>
            <li>
              <strong>SEO/GEO</strong>: JSON-LD 구조화 데이터 (Organization,
              WebSite, WebPage, Article, BreadcrumbList, FAQPage, CollectionPage)
              + 동적 sitemap.xml + 2026 GEO 표준 llms.txt
            </li>
            <li>
              <strong>Hosting</strong>: Vercel Hobby plan + GitHub (소스 공개)
              + Cloudflare 백업 마이그레이션 plan
            </li>
            <li>
              <strong>특이사항</strong>: AI API 미사용 (OpenAI·Anthropic·Google
              Cloud AI 등 외부 LLM 호출 없음). 모든 본문 요약은 무료 오픈소스
              알고리즘으로 처리되어 외부 유료 서비스 의존성 0
            </li>
          </ul>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            운영 주체와 문의
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>운영 기업: 주식회사 워터리아 (Water-RIA Inc.) — Start-up NEST 동문 기업</li>
            <li>운영자: 배성로 (Start-up NEST 동문)</li>
            <li>
              문의 이메일:{" "}
              <a
                href="mailto:srbae@w-proj.com"
                className="text-accent hover:underline"
              >
                srbae@w-proj.com
              </a>
            </li>
            <li>
              GitHub:{" "}
              <a
                href="https://github.com/seong-ro/nest-alum1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                github.com/seong-ro/nest-alum1
              </a>
            </li>
          </ul>
        </section>

        <footer className="mt-16 pt-8 border-t border-border">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-accent text-white font-medium hover:bg-accent-hover transition-colors focus-ring"
          >
            ← 갤러리로 돌아가기
          </Link>
        </footer>
      </article>
    </main>
  );
}
