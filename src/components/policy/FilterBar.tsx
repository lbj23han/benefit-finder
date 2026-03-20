'use client';

import { FilterState, SortOption } from '@/types';

interface FilterBarProps {
  filter: FilterState;
  onFilterChange: (f: FilterState) => void;
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
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

export default function FilterBar({ filter, onFilterChange, sort, onSortChange }: FilterBarProps) {
  return (
    <div className="space-y-2">
      {/* Category chips */}
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
      </div>

      {/* Sort + active only row */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => onFilterChange({ ...filter, activeOnly: !filter.activeOnly })}
            className={`w-9 h-5 rounded-full transition-colors relative ${
              filter.activeOnly ? 'bg-[#1B6B4A]' : 'bg-gray-200'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                filter.activeOnly ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </div>
          <span className="text-xs text-gray-600">신청 가능한 것만</span>
        </label>

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
