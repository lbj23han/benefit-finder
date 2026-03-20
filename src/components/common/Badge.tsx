'use client';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'blue' | 'gray' | 'red' | 'orange' | 'purple';
  size?: 'sm' | 'md';
}

const variantMap = {
  green: 'bg-[#E0F2EC] text-[#1B6B4A]',
  blue: 'bg-blue-100 text-blue-700',
  gray: 'bg-gray-100 text-gray-600',
  red: 'bg-red-100 text-red-600',
  orange: 'bg-orange-100 text-orange-700',
  purple: 'bg-purple-100 text-purple-700',
};

const sizeMap = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
};

export default function Badge({ children, variant = 'green', size = 'sm' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variantMap[variant]} ${sizeMap[size]}`}>
      {children}
    </span>
  );
}
