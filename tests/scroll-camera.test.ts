import assert from "node:assert/strict";
import { test } from "node:test";
import { PerspectiveCamera, Vector3 } from "three";
import { cameraDamping, createScrollStops, sampleScrollCamera, scrollCameraBank, scrollShot } from "../src/components/ServerScene/scroll-camera";

test("camera stays above the floor and outside the rack across phone, tablet and desktop paths", () => {
  const position = new Vector3(), focus = new Vector3();
  const camera = new PerspectiveCamera();
  const corner = new Vector3();
  for (const [width, height] of [[320, 932], [390, 844], [844, 390], [768, 1024], [1440, 900]]) {
    for (let step = 0; step <= 400; step++) {
      const fov = sampleScrollCamera(step / 100, width, height, position, focus);
      assert.ok([...position, ...focus, fov].every(Number.isFinite));
      assert.ok(position.y >= 38);
      assert.ok(position.distanceTo(focus) > 140);
      assert.ok(fov >= 9 && fov < 15);
      camera.position.copy(position);
      camera.fov = fov;
      camera.aspect = width / height;
      camera.lookAt(focus);
      camera.rotateZ(scrollCameraBank(step / 100, width));
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      // Check the rack's actual resting bounds against the viewport, not just
      // camera distance: a safe orbit can still crop a subject on a phone.
      for (const x of [5, 15]) for (const y of [-1.25, 8.25]) for (const z of [-15, -5]) {
        corner.set(x, y, z).project(camera);
        assert.ok(Math.abs(corner.x) < 1 && Math.abs(corner.y) < 1, `rack clipped at ${width}x${height}, shot ${step / 100}`);
      }
    }
  }
});

test("the reveal bank is restrained on mobile and level throughout reading sections", () => {
  assert.ok(Math.abs(scrollCameraBank(0.5, 390)) < Math.abs(scrollCameraBank(0.5, 1440)));
  for (const shot of [0, 2, 2.5, 3, 4]) assert.equal(scrollCameraBank(shot, 1440), 0);
  assert.ok(Math.abs(scrollCameraBank(0.5, 1440)) < Math.PI / 90);
});

test("section-driven camera holds the introduction and ending and retraces the same path", () => {
  for (const height of [390, 844, 1200]) {
    const stops = createScrollStops(height, height, height * 1.5, height * 3, height * 5);
    assert.equal(scrollShot(-100, stops), 0);
    assert.equal(scrollShot(height * 0.2, stops), 0);
    assert.equal(scrollShot(height * 8, stops), 4);
    const forward = Array.from({ length: 101 }, (_, i) => scrollShot(i * height / 20, stops));
    assert.deepEqual([...forward].reverse(), Array.from({ length: 101 }, (_, i) => scrollShot((100 - i) * height / 20, stops)));
    assert.ok(forward.every((value, i) => !i || value >= forward[i - 1]));
    for (const stop of stops) {
      assert.ok(Math.abs(scrollShot(stop.y + 0.01, stops) - scrollShot(stop.y - 0.01, stops)) < 0.001);
    }
  }
});

test("camera settling takes the same time at 30, 60 and 120 fps", () => {
  const settle = (fps: number) => {
    let value = 0;
    for (let frame = 0; frame < fps; frame++) value += (1 - value) * cameraDamping(1 / fps);
    return value;
  };
  assert.ok(Math.abs(settle(30) - settle(120)) < 1e-10);
  assert.ok(Math.abs(settle(60) - settle(120)) < 1e-10);
  assert.ok(cameraDamping(10) < 1); // Returning to a hidden tab cannot teleport.
});
