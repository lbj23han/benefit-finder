import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: '이용약관',
  robots: { index: false },
};

const EFFECTIVE_DATE = '2025년 1월 1일';
const LAST_UPDATED   = '2026년 3월 21일';

export default function TermsPage() {
  return (
    <AppShell>
      <div className="flex flex-col">
        <header className="bg-white px-5 pt-12 pb-5 lg:pt-8 border-b border-gray-50 flex items-center gap-3">
          <Link href="/profile" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <svg className="w-5 h-5 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-extrabold text-[#1a1a1a]">이용약관</h1>
        </header>

        <div className="px-5 py-6 space-y-6 max-w-2xl lg:px-8 text-sm text-[#333] leading-relaxed">

          <div className="bg-[#E0F2EC] rounded-2xl p-4">
            <p className="text-xs text-[#1B6B4A]">시행일: {EFFECTIVE_DATE} · 최종 수정: {LAST_UPDATED}</p>
          </div>

          <Section title="제1조 (목적)">
            <p>
              본 약관은 혜택줍줍(이하 &quot;서비스&quot;)의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
            </p>
          </Section>

          <Section title="제2조 (서비스 설명)">
            <p>혜택줍줍은 다음 기능을 제공하는 정부 혜택 정보 안내 서비스입니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>공공데이터포털(data.go.kr) 및 정부24 API 기반 정부 지원 혜택 정보 제공</li>
              <li>이용자 조건(나이·지역·직업 등)에 따른 맞춤 혜택 추천</li>
              <li>혜택 북마크 기능</li>
            </ul>
          </Section>

          <Section title="제3조 (면책 조항)">
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <p className="font-bold text-amber-800 mb-2 flex items-center gap-1"><AlertTriangle size={14} /> 중요 고지</p>
              <ul className="list-disc pl-5 space-y-2 text-amber-800">
                <li>
                  서비스에서 제공하는 혜택 정보는 <strong>참고용</strong>이며, 실제 수혜 자격·금액·기간은 해당 기관의 공식 안내를 따릅니다.
                </li>
                <li>
                  정부 정책은 수시로 변경될 수 있으며, 서비스가 모든 변경 사항을 즉시 반영하지 못할 수 있습니다.
                </li>
                <li>
                  외부 기관 링크(복지로·정부24 등)는 해당 기관의 서비스 변경에 따라 작동하지 않을 수 있습니다.
                </li>
                <li>
                  서비스는 혜택 신청 결과 또는 실제 수혜 여부에 대한 법적 책임을 지지 않습니다.
                </li>
              </ul>
            </div>
          </Section>

          <Section title="제4조 (이용자의 의무)">
            <ul className="list-disc pl-5 space-y-1">
              <li>서비스를 상업적 목적으로 무단 이용하거나 데이터를 무단 수집하지 않을 것</li>
              <li>서비스의 정상적 운영을 방해하는 행위를 하지 않을 것</li>
              <li>타인의 권리를 침해하는 방식으로 서비스를 이용하지 않을 것</li>
            </ul>
          </Section>

          <Section title="제5조 (지식재산권)">
            <p>
              서비스의 UI·디자인·소스코드에 대한 저작권은 서비스 운영자에게 있습니다.
              정책 데이터는 공공데이터포털의 공공누리 라이선스에 따릅니다.
              서비스 소스코드는 GitHub에 공개되어 있으며 비상업적 이용 시 자유롭게 참고할 수 있습니다.
            </p>
          </Section>

          <Section title="제6조 (서비스 변경 및 중단)">
            <p>
              서비스는 사전 고지 없이 기능을 변경하거나 서비스를 중단할 수 있습니다.
              서비스 중단으로 인한 손해에 대해 운영자는 책임을 지지 않습니다.
            </p>
          </Section>

          <Section title="제7조 (준거법 및 관할)">
            <p>
              본 약관은 대한민국 법률에 따라 해석되며, 분쟁 발생 시 대한민국 법원을 관할 법원으로 합니다.
            </p>
          </Section>

          <div className="pt-4 border-t border-gray-100">
            <Link href="/privacy" className="text-[#2A9D8F] text-sm font-medium">개인정보처리방침 보기 →</Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-extrabold text-[#1a1a1a] mb-2">{title}</h2>
      <div className="space-y-2 text-[#444]">{children}</div>
    </section>
  );
}
