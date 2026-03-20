import { UserProfile } from '@/types';
import { getOccupationLabel, getIncomeLabel, getHouseholdLabel } from '@/lib/utils';

interface ProfileSummaryProps {
  profile: UserProfile;
}

const ageGroupLabel = {
  youth: '청년 (20~34세)',
  prime: '중년 (35~49세)',
  senior: '시니어 (50세+)',
};

export default function ProfileSummary({ profile }: ProfileSummaryProps) {
  const items = [
    { label: '나이대', value: ageGroupLabel[profile.ageGroup] },
    { label: '지역', value: profile.region },
    { label: '직업', value: getOccupationLabel(profile.occupation) },
    { label: '소득', value: getIncomeLabel(profile.incomeLevel) },
    { label: '가구', value: getHouseholdLabel(profile.householdType) },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">내 프로필</h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.label} className="bg-[#F4F8F6] rounded-lg px-3 py-2">
            <p className="text-[10px] text-[#888] mb-0.5">{item.label}</p>
            <p className="text-sm font-semibold text-[#1a1a1a]">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
