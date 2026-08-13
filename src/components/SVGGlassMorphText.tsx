import React, { useMemo } from "react";

export function SVGGlassMorphText({
  children,
  textProps,
  ...props
}: {
  children: string;
  textProps?: React.SVGProps<SVGTextElement>;
} & React.SVGProps<SVGSVGElement>) {
  const id = useMemo(() => {
    return (
      "svg-glass-morph-text-" + Math.random().toString(36).substring(2, 15)
    );
  }, []);

  const width = useMemo(() => {
    return +(props.width ?? children.length * 24);
  }, [children, props.width]);
  const height = +(props.height ?? 40);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      {...props}
    >
      <defs>
        {/* The text becomes a mask */}
        <mask id={id + "-fill"} maskUnits="userSpaceOnUse">
          {/* <rect width="100" height="100" fill="black" /> */}
          <text
            fontWeight="bold"
            x={width / 2}
            y={height / 2}
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize="40"
            // fontFamily="var(--font-display)"
            fill="white"
            {...textProps}
          >
            {children}
          </text>
        </mask>
        <mask id={id + "-stroke"} maskUnits="userSpaceOnUse">
          {/* <rect width="100" height="100" fill="black" /> */}
          <text
            fontWeight="bold"
            x={width / 2}
            y={height / 2}
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize="40"
            // fontFamily="var(--font-display)"
            stroke="white"
            strokeWidth="4"
            {...textProps}
          >
            {children}
          </text>
        </mask>
      </defs>
      <foreignObject
        x="0"
        y="0"
        width={width}
        height={height}
        mask={`url(#${id}-stroke)`}
      >
        <div
          className="w-full h-full 
              glassmorph glassmorph-glow-opacity-100 glassmorph-glow-coverage-10
              glassmorph-bgcolor-[rgba(255,255,255,0.2)]
          "
          // style={
          //   {
          //     "--glassmorphism-bg__opacity": "1",
          //     "--glassmorphism-bg__extent": "10%",
          //     "--_base-glassmorphism-bg-color": "hsla(from white h s l / 0.0)",
          //   } as React.CSSProperties
          // }
        ></div>
      </foreignObject>
      <foreignObject
        x="0"
        y="0"
        width={width}
        height={height}
        mask={`url(#${id}-fill)`}
      >
        <div
          className="w-full h-full 
            glassmorph glassmorph-glow-opacity-70 
            glassmorph-bgcolor-[rgba(255,255,255,0.7)]
          "
          // style={
          //   {
          //     "--glassmorphism-bg__opacity": "0.7",
          //     "--glassmorphism-bg__extent": "10%",
          //     "--_base-glassmorphism-bg-color": "hsla(from white h s l / 0.7)",
          //   } as React.CSSProperties
          // }
        ></div>
      </foreignObject>
    </svg>
  );
}
