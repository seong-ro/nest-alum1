import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  title: "신용보증기금 Start-up NEST 17기·18기 동문 커뮤니티 소개 | 신보 NEST Alumni 1기",
  description:
    "신용보증기금(신보, KODIT) Start-up NEST 17기와 18기를 졸업한 기업이 자발적으로 결성한 동문 커뮤니티 갤러리 소개. 신보 NEST 17기, 스타트업 네스트 18기 출신 기업의 협력 허브.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "신용보증기금 Start-up NEST 17기·18기 동문 커뮤니티 소개",
    description:
      "신보 NEST 17기·18기 동문이 결성한 비공식 동문 커뮤니티 Alumni 1기 갤러리.",
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
            본 사이트는 <strong>Start-up NEST 17기</strong>와{" "}
            <strong>Start-up NEST 18기</strong>를 졸업한 동문 기업들이 자발적으로
            결성한 비공식 동문 커뮤니티 갤러리입니다.
          </p>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            왜 17기·18기가 함께 1기를 만들었나요?
          </h2>
          <p>
            <strong>신용보증기금 Start-up NEST 17기</strong>와{" "}
            <strong>스타트업 네스트 18기</strong>는 비슷한 시기에 졸업한 두 기수입니다.
            기존 NEST 동문 커뮤니티가 별도로 존재하지 않았기 때문에, 두 기수의 졸업 기업이
            함께 첫 세대(Alumni 1기)를 결성하여 동문 갤러리를 출범했습니다.
          </p>
          <p>
            출범일은 <strong>2025년 12월 15일</strong>이며,{" "}
            <strong>SOUND2025</strong> 행사에서 공식 발족했습니다. 이후 NEST 19기, 20기 등
            후속 기수 졸업 기업도 순차적으로 합류할 수 있도록 열려 있습니다.
          </p>

          <h2 className="text-[1.4rem] font-semibold mt-10 mb-4 text-fg">
            본 사이트는 신용보증기금 공식 사이트인가요?
          </h2>
          <p>
            <strong>아닙니다.</strong> 본 사이트는 신용보증기금 Start-up NEST 17기·18기
            졸업 기업이 자발적으로 결성한 <strong>비공식 동문 커뮤니티</strong>이며,
            운영은 동문 기업 중 하나인 주식회사 워터리아(Water-RIA)가 무료 봉사 형태로
            담당하고 있습니다.
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
            카드 등록·내림 비밀번호는?
          </h2>
          <p>
            모든 카드의 등록·내림 비밀번호는{" "}
            <strong className="font-mono text-accent">1718</strong>입니다. (NEST 17기·18기를
            의미합니다) 본인 카드는 누구나 셀프로 등록·수정·내림할 수 있습니다.
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
            운영 주체와 문의
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>운영 기업: 주식회사 워터리아 (Water-RIA Inc.)</li>
            <li>운영자: 배성로 (Start-up NEST 동문)</li>
            <li>운영 방식: 자발적 무료 봉사</li>
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
