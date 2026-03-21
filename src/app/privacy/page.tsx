import type { Metadata } from 'next';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  robots: { index: false },
};

const EFFECTIVE_DATE = '2025년 1월 1일';
const LAST_UPDATED   = '2026년 3월 21일';

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className="flex flex-col">
        <header className="bg-white px-5 pt-12 pb-5 lg:pt-8 border-b border-gray-50 flex items-center gap-3">
          <Link href="/profile" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <svg className="w-5 h-5 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-extrabold text-[#1a1a1a]">개인정보처리방침</h1>
        </header>

        <div className="px-5 py-6 space-y-6 max-w-2xl lg:px-8 text-sm text-[#333] leading-relaxed">

          <div className="bg-[#E0F2EC] rounded-2xl p-4">
            <p className="text-xs text-[#1B6B4A]">시행일: {EFFECTIVE_DATE} · 최종 수정: {LAST_UPDATED}</p>
          </div>

          <p>
            혜택줍줍(이하 &quot;서비스&quot;)은 이용자의 개인정보를 소중히 여기며, 개인정보보호법 및 관련 법령을 준수합니다.
            본 방침은 서비스가 수집하는 정보, 사용 방법 및 이용자의 권리를 설명합니다.
          </p>

          <Section title="1. 수집하는 정보">
            <p>서비스는 맞춤 혜택 추천을 위해 아래 정보를 <strong>기기 내 브라우저(localStorage)에만</strong> 저장합니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>나이대 (10년 단위 구간)</li>
              <li>거주 지역 (시·도 단위)</li>
              <li>직업 유형</li>
              <li>소득 수준 (중위소득 구간)</li>
              <li>가구 유형</li>
              <li>북마크한 혜택 목록 (정책 ID)</li>
            </ul>
            <p className="mt-3 text-xs text-[#888]">
              ※ 위 정보는 이용자의 기기에만 저장되며, 서버·외부로 전송되지 않습니다.
              이름·주민등록번호·연락처 등 식별 가능한 개인정보는 수집하지 않습니다.
            </p>
          </Section>

          <Section title="2. 정보의 이용 목적">
            <ul className="list-disc pl-5 space-y-1">
              <li>맞춤 정부 지원 혜택 추천 및 필터링</li>
              <li>북마크 기능 제공</li>
              <li>이 외의 목적으로는 일절 사용하지 않습니다</li>
            </ul>
          </Section>

          <Section title="3. 정보의 보관 및 파기">
            <p>
              수집 정보는 브라우저 localStorage에 저장되며, 보관 기간은 이용자가 직접 삭제하거나
              브라우저 데이터를 초기화할 때까지입니다.
              앱 내 &apos;프로필 초기화&apos; 기능을 통해 즉시 삭제할 수 있습니다.
            </p>
          </Section>

          <Section title="4. 제3자 제공 및 위탁">
            <p>수집한 정보를 제3자에게 제공하거나 위탁하지 않습니다.</p>
            <p className="mt-2">단, 서비스 운영을 위해 아래 외부 서비스를 이용합니다.</p>
            <table className="w-full mt-2 text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 border border-gray-200">서비스</th>
                  <th className="text-left p-2 border border-gray-200">목적</th>
                  <th className="text-left p-2 border border-gray-200">개인정보 전달 여부</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border border-gray-200">Vercel</td>
                  <td className="p-2 border border-gray-200">웹 호스팅</td>
                  <td className="p-2 border border-gray-200">IP 등 서버 접속 로그 (Vercel 정책 적용)</td>
                </tr>
                <tr>
                  <td className="p-2 border border-gray-200">공공데이터포털 (data.go.kr)</td>
                  <td className="p-2 border border-gray-200">정책 데이터 수집</td>
                  <td className="p-2 border border-gray-200">없음 (서버 간 통신)</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="5. 이용자의 권리">
            <ul className="list-disc pl-5 space-y-1">
              <li>저장된 정보 확인: 앱 내 &apos;내 정보&apos; 탭</li>
              <li>정보 수정: 각 항목 탭하여 즉시 변경 가능</li>
              <li>정보 삭제: 앱 내 &apos;프로필 초기화&apos; 또는 브라우저 데이터 삭제</li>
            </ul>
          </Section>

          <Section title="6. 쿠키 및 추적 기술">
            <p>
              서비스는 별도의 쿠키 또는 사용자 추적 기술을 사용하지 않습니다.
              브라우저의 localStorage만 사용하며, 이는 쿠키와 달리 서버로 자동 전송되지 않습니다.
            </p>
          </Section>

          <Section title="7. 미성년자 보호">
            <p>
              서비스는 만 14세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다.
              만 14세 미만의 이용자는 보호자의 동의 하에 서비스를 이용해 주세요.
            </p>
          </Section>

          <Section title="8. 개인정보처리방침 변경">
            <p>
              방침이 변경될 경우 앱 내 공지 또는 본 페이지를 통해 안내합니다.
              변경 전 내용은 GitHub 커밋 이력에서 확인할 수 있습니다.
            </p>
          </Section>

          <Section title="9. 문의">
            <p>
              개인정보 관련 문의는 GitHub Issues를 통해 접수해 주세요.
              (github.com/lbj23han/benefit-finder)
            </p>
          </Section>

          <div className="pt-4 border-t border-gray-100">
            <Link href="/terms" className="text-[#2A9D8F] text-sm font-medium">이용약관 보기 →</Link>
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
