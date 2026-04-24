import { Search } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/lib/cn';

interface SearchFieldProps {
  buttonLabel?: string;
  className?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder: string;
  value: string;
}

export function SearchField({
  buttonLabel = 'Search',
  className,
  disabled = false,
  onChange,
  onSearch,
  placeholder,
  value,
}: SearchFieldProps) {
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center', className)}>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onSearch();
            }
          }}
          placeholder={placeholder}
          className="pl-10"
          disabled={disabled}
        />
      </div>

      <Button onClick={onSearch} disabled={disabled}>
        {buttonLabel}
      </Button>
    </div>
  );
}
