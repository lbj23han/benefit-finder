import React from 'react';
import { Search } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-[#1B6B4A] mb-4 opacity-40">
        {icon ?? <Search size={48} />}
      </div>
      <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">{title}</h3>
      {description && <p className="text-sm text-[#888] mb-6">{description}</p>}
      {action}
    </div>
  );
}
