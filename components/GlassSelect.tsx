import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type GlassSelectOption = { value: string; label: string };
export type GlassSelectGroup = { label: string; options: GlassSelectOption[] };

const triggerClass =
  "w-full h-10 bg-white/5 border border-white/10 backdrop-blur-xl rounded-xl px-4 text-[12px] font-bold text-white data-placeholder:text-white/25 focus-visible:bg-white/10 focus-visible:ring-1 focus-visible:ring-white/20";

type GlassSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options?: GlassSelectOption[];
  groups?: GlassSelectGroup[];
  className?: string;
  size?: "sm" | "default";
};

export function GlassSelect({
  value,
  onValueChange,
  placeholder = "Select…",
  options,
  groups,
  className,
  size = "default",
}: GlassSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger size={size} className={cn(triggerClass, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {groups?.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel className="text-[10px] uppercase tracking-widest text-white/30 px-2 py-1">
              {group.label}
            </SelectLabel>
            {group.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
        {options?.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
