"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector2 } from "three";
import * as THREE_WEBGPU from "three/webgpu";
import { add, float, luminance, max, mul, pass, sub } from "three/tsl";
import GaussianBlurNode from "three/examples/jsm/tsl/display/GaussianBlurNode.js";

const ZERO = float(0);

export type WebGPUBloomProps = {
  active: boolean;
  threshold?: number;
  intensity?: number;
  sigma?: number;
};

// Lightweight bloom for the WebGPU path using TSL + PostProcessing
export function WebGPUBloom({
  active,
  threshold = 0.66,
  intensity = 1.5,
  sigma = 4,
}: WebGPUBloomProps) {
  const { gl, scene, camera, size, viewport } = useThree();
  const postProcessingRef = useRef<THREE_WEBGPU.PostProcessing | null>(null);
  const sizeRef = useRef(new Vector2());
  const drawSizeRef = useRef(new Vector2());

  const disposePost = useCallback(() => {
    const post = postProcessingRef.current as unknown;
    if (post && typeof post === "object" && "dispose" in post) {
      const dispose = (post as { dispose?: unknown }).dispose;
      if (typeof dispose === "function") {
        Reflect.apply(dispose as () => void, post, []);
      }
    }
    postProcessingRef.current = null;
  }, []);

  const getRenderSize = useCallback(() => {
    const renderer = gl as unknown as {
      getPixelRatio?: () => number;
      getDrawingBufferSize?: (target: Vector2) => void;
      getSize?: (target: Vector2) => void;
    };
    const ratio = renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
    if (renderer.getDrawingBufferSize) {
      renderer.getDrawingBufferSize(drawSizeRef.current);
      return {
        x: Math.max(1, Math.round(drawSizeRef.current.x)),
        y: Math.max(1, Math.round(drawSizeRef.current.y)),
      };
    }
    if (renderer.getSize) {
      renderer.getSize(sizeRef.current);
      return {
        x: Math.max(1, Math.round(sizeRef.current.x * ratio)),
        y: Math.max(1, Math.round(sizeRef.current.y * ratio)),
      };
    }
    return { x: 0, y: 0 };
  }, [gl]);

  useEffect(() => {
    const isWebGPU =
      gl instanceof THREE_WEBGPU.WebGPURenderer ||
      (gl as unknown as { isWebGPURenderer?: boolean })?.isWebGPURenderer === true;

    // Always dispose previous instance when inputs change.
    disposePost();

    if (!active || !isWebGPU) {
      disposePost();
      return;
    }

    // Avoid creating WebGPU postprocessing while the renderer/canvas is still at the default tiny size
    // (common during refresh/HMR). Creating targets at 300x150 can later cause resolveTarget size mismatches.
    const renderSize = getRenderSize();
    if (renderSize.x <= 320 || renderSize.y <= 240) {
      return;
    }

    const scenePass = pass(scene, camera);
    const sceneTexture = scenePass.getTextureNode();
    const thresholdNode = float(threshold);

    const blurNode = new GaussianBlurNode(
      sceneTexture,
      null,
      Math.max(1, Math.round(sigma))
    );

    const brightMask = max(sub(luminance(sceneTexture), thresholdNode), ZERO);
    const composed = add(sceneTexture, mul(blurNode, mul(brightMask, float(intensity))));

    const post = new THREE_WEBGPU.PostProcessing(
      gl as unknown as ConstructorParameters<typeof THREE_WEBGPU.PostProcessing>[0]
    );
    const sizedPost = post as unknown as { setSize?: (w: number, h: number) => void };
    if (typeof sizedPost.setSize === "function" && renderSize.x > 0 && renderSize.y > 0) {
      sizedPost.setSize(renderSize.x, renderSize.y);
    }
    post.outputNode = composed;
    post.needsUpdate = true;

    postProcessingRef.current = post;

    return () => {
      disposePost();
    };
  }, [active, camera, disposePost, getRenderSize, gl, intensity, scene, sigma, threshold, size.height, size.width, viewport.dpr]);

  useFrame(() => {
    const post = postProcessingRef.current;
    if (!post || !active) return;

    try {
      // Skip if output is not ready (avoids undefined texture/image during init)
      const hasOutput = "outputNode" in (post as unknown as object);
      if (!hasOutput) return;

      // Ensure internal quad mesh exists before rendering (defensive against partial init during refresh)
      const hasQuad = "_quadMesh" in (post as unknown as object);
      if (!hasQuad) return;

      // Call with explicit receiver to avoid `this` being undefined under edge-case bundling/HMR.
      const render = (post as unknown as { render?: unknown }).render;
      if (typeof render !== "function") return;
      Reflect.apply(render as () => void, post, []);
    } catch (err) {
      console.warn("WebGPU bloom render skipped:", err);
      disposePost();
    }
  }, 1);

  return <></>;
}
