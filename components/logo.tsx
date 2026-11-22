import { UNIVERSITY_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
- Временный знак: остроконечная шляпа волшебника.
- Собственный рисунок, не связан с логотипами реальных вузов.
- Финальный логотип — на этапе 1 (docs/DESIGN.md).
- Серверный компонент: название вуза — из UNIVERSITY_NAME (lib/config.ts).
 */
export function Logo({
  className,
  withText = true,
  inverse = false,
}: {
  className?: string;
  withText?: boolean;
  /** Светлый знак для тёмного/цветного фона */
  inverse?: boolean;
}) {
  const bg = inverse ? "fill-on-primary" : "fill-primary";
  const fg = inverse ? "fill-primary" : "fill-on-primary";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" className={bg} />
        {/* Колпак волшебника с лёгким наклоном кончика */}
        <path
          d="M10 20.5 L15.5 7.5 Q16.5 6 19 8.5 L17.5 10.5 L22 20.5 Z"
          className={fg}
        />
        {/* Поля шляпы */}
        <rect x="6" y="21.5" width="20" height="2" rx="1" className={fg} />
      </svg>
      {withText && (
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold text-text">{UNIVERSITY_NAME}</span>
          <span className="block text-[11px] text-muted">цифровой деканат</span>
        </span>
      )}
    </span>
  );
}
