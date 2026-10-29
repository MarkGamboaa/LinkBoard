import LinkBoardMark from "./assets/linkboard-mark.svg";

export default function BrandLogo({ markClassName = "h-8 w-8", textClassName = "text-2xl sm:text-3xl", weightClassName = "font-bold", className = "", showMark = true }) {
  const wordmark = (
    <span className={`${textClassName} ${weightClassName} bg-gradient-to-r from-[#4632e6] to-[#2563eb] bg-clip-text font-logo text-transparent`}>
      LinkBoard
    </span>
  );

  if (!showMark) {
    return <span className={className}>{wordmark}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img src={LinkBoardMark} alt="" aria-hidden="true" className={`${markClassName} shrink-0`} />
      {wordmark}
    </span>
  );
}
