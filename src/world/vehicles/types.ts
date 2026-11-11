import type * as THREE from 'three';
export interface Vehicle {
  group: THREE.Group;          // origin on the ground at the vehicle centre, +Z = forward, wheels resting on y=0
  body: THREE.Group;           // sprung mass; pivot at ground-centre so rotation.z rolls and .x pitches about the contact patch
  wheels: THREE.Object3D[];    // each spins about its local X; fronts first
  steer: THREE.Object3D[];     // front-wheel steer pivots: rotate .y
  length: number; width: number; height: number; wheelRadius: number; wheelbase: number;
  lights: { brake(on: boolean): void; indicate(side: 'l' | 'r' | null, on: boolean): void };
}
export type CarStyle = 'sedan' | 'hatch' | 'wagon' | 'pickup' | 'van' | 'taxi' | 'suv' | 'mini';
