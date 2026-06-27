import React from 'react';

interface EmptyStateProps {
  illustration: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  illustration,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto my-8">
      <div className="mb-6 text-slate-400 dark:text-slate-500 max-w-[180px] w-full aspect-square flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 rounded-full p-6">
        {illustration}
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary mb-6 leading-relaxed">{description}</p>
      {action && <div className="w-full flex justify-center">{action}</div>}
    </div>
  );
};
