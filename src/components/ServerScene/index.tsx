"use client";

import dynamic from "next/dynamic";
import type { ServerSceneProps } from "./GameScene";

// Defer the WebGL/physics bundle until the browser mounts; keep real rack physics.
const GameScene = dynamic(() => import("./GameScene").then(module => module.ServerScene), { ssr: false });

export function ServerScene(props: ServerSceneProps) {
  return <GameScene {...props} />;
}
