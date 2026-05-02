import type { EditorialCardData } from "@/lib/types";

/**
 * 회사 기본정보 사이드 패널 — 상세 뷰에 표시.
 * 대표자·전화·이메일·주소를 협업 컨택용으로 정돈된 형태로 노출.
 * mailto:·tel: 링크로 즉시 컨택 가능.
 */
export function ContactPanel({
  contactInfo,
}: {
  contactInfo?: EditorialCardData["contactInfo"];
}) {
  if (!contactInfo) return null;
  const { representative, phone, email, address } = contactInfo;

  // 모두 비어있으면 렌더 안 함
  if (!representative && !phone && !email && !address) return null;

  return (
    <aside
      className="rounded-lg border p-5 mb-8"
      style={{
        backgroundColor: "var(--card-bg-soft)",
        borderColor: "var(--card-border)",
      }}
      aria-labelledby="contact-panel-title"
    >
      <h3
        id="contact-panel-title"
        className="text-[0.7rem] font-mono font-semibold tracking-widest uppercase mb-4"
        style={{ color: "var(--card-accent)" }}
      >
        Contact · 협업 컨택
      </h3>
      <dl className="space-y-3 text-[0.875rem]">
        {representative ? (
          <ContactRow
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
            label="대표"
            value={representative}
          />
        ) : null}
        {phone ? (
          <ContactRow
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            }
            label="전화"
            value={
              <a
                href={`tel:${phone.replace(/-/g, "")}`}
                className="hover:underline"
                style={{ color: "var(--card-accent)" }}
              >
                {phone}
              </a>
            }
          />
        ) : null}
        {email ? (
          <ContactRow
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            }
            label="이메일"
            value={
              <a
                href={`mailto:${email}`}
                className="hover:underline break-all"
                style={{ color: "var(--card-accent)" }}
              >
                {email}
              </a>
            }
          />
        ) : null}
        {address ? (
          <ContactRow
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            }
            label="주소"
            value={address}
          />
        ) : null}
      </dl>
    </aside>
  );
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="shrink-0 mt-0.5"
        style={{ color: "var(--card-ink)", opacity: 0.5 }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <dt
          className="text-[0.7rem] font-mono uppercase tracking-wider mb-0.5"
          style={{ color: "var(--card-ink)", opacity: 0.55 }}
        >
          {label}
        </dt>
        <dd
          className="font-medium leading-snug"
          style={{ color: "var(--card-ink)" }}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}
