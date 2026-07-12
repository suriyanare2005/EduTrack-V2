import React from 'react';
import { Input } from '@/components/ui/input';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '0',
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    const numericValue = rawValue ? parseInt(rawValue, 10) : 0;
    onChange(numericValue);
  };

  // Format currency with Indian local rules for thousands separation (e.g. 10,00,000)
  const formatCurrency = (val: number | string): string => {
    const num = Number(val);
    if (!num || isNaN(num) || num === 0) return '';
    return num.toLocaleString('en-IN');
  };

  return (
    <div className="relative flex items-center w-full">
      <div className="absolute left-3 pointer-events-none text-text-secondary select-none font-sans">
        ₹
      </div>
      <Input
        type="text"
        inputMode="numeric"
        value={formatCurrency(value)}
        onChange={handleChange}
        className={`pl-8 font-mono text-text-primary text-base ${className}`}
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
};
