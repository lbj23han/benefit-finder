'use client';

import { FilterState, SortOption } from '@/types';

interface FilterBarProps {
  filter: FilterState;
  onFilterChange: (f: FilterState) => void;
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  onReset: () => void;
}

const categories = [
  { value: null, label: '전체' },
  { value: 'housing', label: '주거' },
  { value: 'employment', label: '취업' },
  { value: 'education', label: '교육' },
  { value: 'childcare', label: '보육' },
  { value: 'welfare', label: '복지' },
  { value: 'business', label: '창업' },
];

export default function FilterBar({ filter, onFilterChange, sort, onSortChange, onReset }: FilterBarProps) {
  const hasActiveFilter = filter.category !== null || filter.keyword !== '';

  return (
    <div className="space-y-2">
      {/* Category chips + reset */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.label}
            onClick={() => onFilterChange({ ...filter, category: cat.value })}
            className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              filter.category === cat.value
                ? 'bg-[#1B6B4A] text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}

        {/* Reset chip — only visible when a filter is active */}
        {hasActiveFilter && (
          <button
            onClick={onReset}
            className="flex-shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-red-50 text-red-500 border border-red-200 transition-colors"
          >
            <span>✕</span> 필터 초기화
          </button>
        )}
      </div>

      {/* Sort row */}
      <div className="flex items-center justify-end">
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none"
        >
          <option value="recommended">추천순</option>
          <option value="amount">금액순</option>
          <option value="deadline">마감순</option>
        </select>
      </div>
    </div>
  );
}
