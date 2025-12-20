import { useMemo } from "react";

export function SVGGlassMorph({
  children,
}: { children: React.ReactNode } & React.SVGProps<SVGSVGElement>) {
  const id = useMemo(() => {
    return "svg-glass-morph-" + Math.random().toString(36).substring(2, 15);
  }, []);

  return (
    <div className="relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="absolute top-0 left-0 w-full h-full"
      >
        <defs>
          {/* The text becomes a mask */}
          <mask id={id + "-fill"} maskUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="black" />
            <svg
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="white"
              color="white"
            >
              {children}
            </svg>
          </mask>
          <mask id={id + "-stroke"} maskUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="black" />
            <svg
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="transparent"
              stroke="white"
              strokeWidth={"10%"}
            >
              {children}
            </svg>
          </mask>
        </defs>
        <foreignObject width="100%" height="100%" mask={`url(#${id}-stroke)`}>
          <div className="opacity-0">{children}</div>
          <div
            className="
              w-full h-full absolute top-0 left-0 
              glassmorph glassmorph-glow-opacity-100 glassmorph-glow-coverage-10
              glassmorph-bgcolor-[rgba(255,255,255,0.2)]
              "
          ></div>
        </foreignObject>
        <foreignObject width="100%" height="100%" mask={`url(#${id}-fill)`}>
          <div className="opacity-0">{children}</div>
          <div
            className="w-full h-full absolute top-0 left-0 
              glassmorph glassmorph-glow-opacity-70 
              glassmorph-bgcolor-[rgba(255,255,255,0.7)]
              "
          ></div>
        </foreignObject>
      </svg>
      <div className="opacity-0">{children}</div>
    </div>
  );
}
