import type * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";

export type DebrisPickTarget = {
  id: string;
  object: THREE.Object3D;
  body: RapierRigidBody;
};

export type HeldTarget = {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: number;
};
