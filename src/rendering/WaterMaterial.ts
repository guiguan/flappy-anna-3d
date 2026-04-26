import * as THREE from 'three';
import { FOG_DENSITY } from '../constants';

export function createWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFogColor: { value: new THREE.Color(0x9ec8d8) },
      uFogDensity: { value: FOG_DENSITY },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying float vHeight;

      void main() {
        vec3 pos = position;
        float wave  = sin(pos.x * 0.4  + uTime * 0.8)  * 0.35;
        wave       += sin(pos.x * 0.25 + pos.z * 0.2 + uTime * 1.2) * 0.25;
        wave       += cos(pos.x * 0.12 + uTime * 0.55) * 0.2;
        wave       += sin(pos.x * 0.06 + uTime * 0.3)  * 0.5;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;

        // Fade waves at distant Z for a flat horizon against the sky
        float zFade = smoothstep(-45.0, -25.0, worldPos.z);
        pos.y += wave * zFade;
        vHeight = wave * zFade;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      varying vec3 vWorldPos;
      varying float vHeight;

      void main() {
        vec3 deep  = vec3(0.02, 0.24, 0.42);
        vec3 mid   = vec3(0.06, 0.38, 0.55);
        vec3 light = vec3(0.12, 0.52, 0.68);
        vec3 foam  = vec3(0.75, 0.85, 0.90);

        float t = vHeight * 0.7 + 0.5;
        float band = floor(t * 4.0) / 4.0;
        vec3 col = mix(deep, light, band);

        float foamMask = smoothstep(0.25, 0.5, vHeight);
        col = mix(col, foam, foamMask * 0.35);

        float fogDepth = length(vWorldPos - cameraPosition);
        float fogFactor = 1.0 - exp(-uFogDensity * fogDepth * fogDepth);
        col = mix(col, uFogColor, fogFactor);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
