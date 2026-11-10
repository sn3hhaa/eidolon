import * as THREE from 'three';
import { Track } from './Track';

/**
 * A camera shot: the camera travels along a position spline while aiming at a
 * point travelling along a target spline. Progress along each spline, the
 * field of view and the roll are keyframed Tracks, so the whole shot is a pure
 * function of scene-local time.
 */
export interface CameraShot {
  /** Control points of the camera path (Catmull-Rom, arc-length parameterised). */
  position: THREE.Vector3[];
  /** Control points of the look-at path. A single point = fixed target. */
  target: THREE.Vector3[];
  /** 0..1 progress along the position path over time. */
  travel: Track;
  /** 0..1 progress along the target path over time (defaults to `travel`). */
  aim?: Track;
  /** Vertical field of view in degrees over time. */
  fov: Track;
  /** Roll around the view axis in degrees over time. */
  roll?: Track;
  /** Subtle floating drift (world units) so the camera never feels locked off. */
  drift?: { amplitude: number; speed: number; phase?: number };
}

function makeCurve(points: THREE.Vector3[]): THREE.CatmullRomCurve3 | null {
  if (points.length < 2) return null;
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  curve.arcLengthDivisions = 600;
  curve.updateArcLengths();
  return curve;
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private readonly posCurve: THREE.CatmullRomCurve3 | null;
  private readonly tgtCurve: THREE.CatmullRomCurve3 | null;
  private readonly pos = new THREE.Vector3();
  private readonly tgt = new THREE.Vector3();

  constructor(
    private readonly shot: CameraShot,
    aspect = 16 / 9,
    near = 0.05,
    far = 600,
  ) {
    this.camera = new THREE.PerspectiveCamera(shot.fov.at(0), aspect, near, far);
    this.posCurve = makeCurve(shot.position);
    this.tgtCurve = makeCurve(shot.target);
  }

  /** Pose the camera for scene-local time t. */
  apply(t: number): void {
    const { shot, camera, pos, tgt } = this;
    const u = THREE.MathUtils.clamp(shot.travel.at(t), 0, 1);
    const v = THREE.MathUtils.clamp((shot.aim ?? shot.travel).at(t), 0, 1);

    if (this.posCurve) this.posCurve.getPointAt(u, pos);
    else pos.copy(shot.position[0]);
    if (this.tgtCurve) this.tgtCurve.getPointAt(v, tgt);
    else tgt.copy(shot.target[0]);

    if (shot.drift) {
      const { amplitude: a, speed: s, phase: p = 0 } = shot.drift;
      pos.x += a * (Math.sin(t * s * 0.83 + p) + 0.5 * Math.sin(t * s * 1.91 + p * 2.3));
      pos.y += a * (Math.cos(t * s * 0.71 + p * 1.7) + 0.5 * Math.sin(t * s * 1.63 + p));
    }

    camera.position.copy(pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(tgt);
    if (shot.roll) camera.rotateZ(THREE.MathUtils.degToRad(shot.roll.at(t)));
    camera.fov = shot.fov.at(t);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }
}
