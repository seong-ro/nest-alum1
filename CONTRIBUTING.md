# Contributing to Folio Cards

## 개발 환경

```bash
git clone https://github.com/seong-ro/nest-alum1.git
cd nest-alum1
npm install
npm run dev
```

Node 20 이상 권장. 작업 전 항상 `main`에서 브랜치를 따세요.

## 제출 전 체크

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run build       # production 빌드 검증
```

모든 검사가 통과해야 CI가 성공합니다.

## 커밋 컨벤션

Conventional Commits를 권장합니다.

- `feat:` 새로운 기능
- `fix:` 버그 수정
- `docs:` 문서만
- `style:` 코드 동작 변경 없는 포맷팅
- `refactor:` 기능 변경 없는 리팩터
- `perf:` 성능 개선
- `test:` 테스트만
- `chore:` 빌드/도구/의존성

예: `feat(summarizer): MMR lambda 조정으로 중복 감소`

## 아키텍처 가이드

- `lib/` — 순수 함수, 외부 I/O 최소화. 결정론적이어야 합니다.
- `app/actions.ts` — 서버 전용. URL fetch와 파일 파싱만.
- `components/` — 렌더 전용. 데이터 가공은 `lib/`에 위치.
- 새 문서 형식 추가 시 `lib/document-parser.ts`의 분기를 추가하고 타입도 확장.

## 요약 알고리즘 변경 주의사항

`lib/summarizer.ts`는 다음 불변 조건을 지켜야 합니다:
1. **결정론적** — 동일 입력은 동일 출력을 반환.
2. **외부 호출 없음** — 네트워크/AI API 금지.
3. **한국어·영어 양쪽 품질 유지** — `test-summarizer/` 샘플로 검증.

## 디자인 시스템 변경

`app/globals.css`의 `@theme` 토큰을 수정할 때는 3개 팔레트(paper/ink/clay)가 모두 정상 렌더되는지 확인하세요.

## 라이선스

PR을 보내면 MIT 라이선스로 기여에 동의한 것으로 간주합니다.
