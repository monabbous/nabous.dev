import { MathUtils, Vector3 } from "three";

type Shot = { angle: number; radius: number; height: number; focus: [number, number, number] };

// Establish → dolly into the open gap → arc away for reading → closing wide.
// Polar coordinates keep the camera outside the rack throughout the orbit.
const desktopShots: Shot[] = [
  { angle: 0.72, radius: 213, height: 100, focus: [0, 0, -5] },
  { angle: 0.08, radius: 140, height: 38, focus: [10, 3, -10] },
  { angle: -0.5, radius: 235, height: 72, focus: [0, 2, -5] },
  { angle: -0.6, radius: 250, height: 85, focus: [-3, 4, -8] },
  { angle: -0.9, radius: 265, height: 98, focus: [-3, 3, -8] },
];
const mobileShots: Shot[] = [
  { angle: 0.72, radius: 235, height: 105, focus: [10, -4, -10] },
  { angle: 0.18, radius: 205, height: 62, focus: [10, 1, -10] },
  { angle: -0.08, radius: 275, height: 90, focus: [14, -4, -8] },
  { angle: 0.05, radius: 290, height: 100, focus: [12, -5, -8] },
  { angle: -0.18, radius: 295, height: 110, focus: [10, -5, -8] },
];

export type ScrollStop = { y: number; shot: number };

export function createScrollStops(height: number, spaceTop: number, projectsTop: number, blogTop: number, careerTop: number): ScrollStop[] {
  const points = [
    { y: 0, shot: 0 },
    { y: Math.max(0, spaceTop - height * 0.55), shot: 0 },
    { y: Math.max(1, spaceTop + height * 0.05), shot: 1 },
    { y: projectsTop - height * 0.05, shot: 2 },
    { y: blogTop - height * 0.95, shot: 2 },
    { y: blogTop - height * 0.25, shot: 3 },
    { y: careerTop - height * 0.95, shot: 3 },
    { y: careerTop - height * 0.25, shot: 4 },
  ];
  // Content or a very short viewport must never reverse the timeline.
  return points.map((point, index) => {
    if (index) point.y = Math.max(points[index - 1].y + 1, point.y);
    return point;
  });
}

export function scrollShot(scrollY: number, stops: ScrollStop[]): number {
  for (let index = 1; index < stops.length; index++) {
    const previous = stops[index - 1];
    const next = stops[index];
    if (scrollY <= next.y) {
      if (previous.shot === next.shot) return previous.shot;
      const t = MathUtils.smootherstep(scrollY, previous.y, next.y);
      return MathUtils.lerp(previous.shot, next.shot, t);
    }
  }
  return stops.at(-1)?.shot ?? 0;
}

/** Sample into reusable vectors: reversible scrubbing, without allocating new vectors. */
export function sampleScrollCamera(shot: number, width: number, height: number, position: Vector3, focus: Vector3): number {
  const value = MathUtils.clamp(shot, 0, desktopShots.length - 1);
  const index = Math.min(Math.floor(value), desktopShots.length - 2);
  const t = value - index;
  const desktop = MathUtils.smoothstep(width, 640, 1024);
  const a = mobileShots[index], b = mobileShots[index + 1];
  const c = desktopShots[index], d = desktopShots[index + 1];
  const mix = (mobileA: number, mobileB: number, desktopA: number, desktopB: number) =>
    MathUtils.lerp(MathUtils.lerp(mobileA, mobileB, t), MathUtils.lerp(desktopA, desktopB, t), desktop);
  const angle = mix(a.angle, b.angle, c.angle, d.angle);
  const radius = mix(a.radius, b.radius, c.radius, d.radius);
  position.set(10 + Math.sin(angle) * radius, mix(a.height, b.height, c.height, d.height), -10 + Math.cos(angle) * radius);
  focus.set(mix(a.focus[0], b.focus[0], c.focus[0], d.focus[0]), mix(a.focus[1], b.focus[1], c.focus[1], d.focus[1]), mix(a.focus[2], b.focus[2], c.focus[2], d.focus[2]));
  // Preserve horizontal room on very narrow phones, without a dramatic zoom.
  const aspect = Math.max(0.2, width / Math.max(1, height));
  return MathUtils.radToDeg(2 * Math.atan(Math.tan(MathUtils.degToRad(9) / 2) * Math.max(1, 0.52 / aspect)));
}

export function cameraDamping(delta: number, rate = 7): number {
  return 1 - Math.exp(-rate * Math.min(Math.max(delta, 0), 0.1));
}

// A small bank follows the reveal's arc, then returns to level for reading.
export function scrollCameraBank(shot: number, width: number): number {
  if (shot <= 0 || shot >= 2) return 0;
  const degrees = MathUtils.lerp(0.65, 1.6, MathUtils.smoothstep(width, 640, 1024));
  return Math.sin(shot * Math.PI) * MathUtils.degToRad(degrees);
}
