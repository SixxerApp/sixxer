import { initials, colorFromString } from "@/lib/format";

export function InitialAvatar({
  name,
  size = 40,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const inits = initials(name);
  const color = colorFromString(name);
  const fontSize = Math.round(size * 0.4);
  return (
    <span
      className={
        "inline-grid place-items-center rounded-full font-semibold text-white shrink-0 " + className
      }
      style={{ width: size, height: size, background: color, fontSize }}
      aria-hidden
    >
      {inits}
    </span>
  );
}
