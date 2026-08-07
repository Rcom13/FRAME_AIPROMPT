"use client";
/* eslint-disable @next/next/no-img-element -- small bundled provider marks keep their native pixels */

import { useState } from "react";

export default function ProviderLogo({ src, short, name, className = "" }: { src?: string; short: string; name: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState("");
  const failed=Boolean(src&&failedSrc===src);

  return <span className={`provider-logo ${className}`.trim()} aria-label={`${name} logo`}>
    {!failed && src ? <img src={src} alt="" onError={() => setFailedSrc(src)} /> : <b>{short}</b>}
  </span>;
}
