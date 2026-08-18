export function FilmReel({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
      fill="none"
    >
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="4" />
      <circle cx="32" cy="32" r="11" stroke="currentColor" strokeWidth="3.2" />
      <circle cx="32" cy="32" r="4.2" fill="currentColor" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const r = 20.5;
        const a = (deg * Math.PI) / 180;
        const x = 32 + r * Math.cos(a);
        const y = 32 + r * Math.sin(a);
        return <circle key={deg} cx={x} cy={y} r="3.1" fill="currentColor" />;
      })}
    </svg>
  );
}

export function AlwaysOnLogo({
  size = "md",
  glow = false,
}: {
  size?: "sm" | "md" | "lg";
  glow?: boolean;
}) {
  const scale =
    size === "lg"
      ? { always: "text-[1.35rem] tracking-[0.42em]", on: "text-[4.6rem]", reel: "h-[3.7rem] w-[3.7rem]" }
      : size === "sm"
        ? { always: "text-[0.58rem] tracking-[0.38em]", on: "text-[1.55rem]", reel: "h-[1.2rem] w-[1.2rem]" }
        : { always: "text-[0.7rem] tracking-[0.4em]", on: "text-[2.05rem]", reel: "h-[1.55rem] w-[1.55rem]" };

  return (
    <div
      className={`flex flex-col items-center leading-none text-white ${glow ? "logo-glow" : ""}`}
    >
      <span className={`font-logo ${scale.always}`}>ALWAYS</span>
      <span className={`mt-0.5 flex items-center font-logo ${scale.on}`}>
        <FilmReel className={`${scale.reel} shrink-0`} />
        <span
          className="-ml-[0.12em]"
          style={{
            clipPath: "polygon(22% 0, 100% 0, 100% 100%, 0 100%, 0 28%)",
          }}
        >
          N
        </span>
      </span>
    </div>
  );
}
