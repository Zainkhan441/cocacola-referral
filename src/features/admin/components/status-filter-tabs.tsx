import { cn } from "@/lib/utils";

type StatusFilterTabsProps<T extends string> = {
  options: ReadonlyArray<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
};

export function StatusFilterTabs<T extends string>({
  options,
  value,
  onChange,
}: StatusFilterTabsProps<T>) {
  return (
    <div className="flex gap-1 overflow-x-auto">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-brand text-white"
              : "text-white/60 hover:bg-white/5 hover:text-white",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
