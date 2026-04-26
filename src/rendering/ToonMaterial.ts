import * as THREE from 'three';

// Creates a gradient map texture for toon shading with multiple steps.
// Brighter pixels = more direct light, darker = more shadow.
export function createToonGradientMap(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 128, 0);
  // Bright to dark: highlight → mid-light → shadow → deep shadow
  gradient.addColorStop(0.0, '#ffddaa');    // highlight
  gradient.addColorStop(0.25, '#ffcc88');   // mid-light
  gradient.addColorStop(0.5, '#cc8844');    // shadow
  gradient.addColorStop(0.75, '#885533');   // dark shadow
  gradient.addColorStop(1.0, '#332211');    // deep shadow

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  return texture;
}

// Factory for MeshToonMaterial with our custom gradient map
export function createToonMaterial(color: number | string): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: createToonGradientMap(),
    // No smoothstep between light and shadow for crisp cel-shading look
  });
}
