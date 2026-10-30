import * as THREE from 'three';

/**
 * Fullscreen post-processing shader implementing:
 * 1. Sub-texel smooth camera offset (uSubpixelOffset) for 60fps butter-smooth camera pan
 *    without 3D texel shimmering (the "A Short Hike / Dead Cells" pixel camera technique)
 * 2. Depth + Normal/Luminance 4-neighbor pixel outline kernel
 * 3. World-space / Screen-space Cloud-Dapple mask inspection
 * 4. Perceptual OKLab color quantization (default 6 levels) + 4x4 ordered Bayer dithering
 */
export function createPostProcessMaterial(
  colorTexture: THREE.Texture,
  depthTexture: THREE.DepthTexture,
  resolution: THREE.Vector2
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: colorTexture },
      tDepth: { value: depthTexture },
      uResolution: { value: resolution.clone() },
      uSubpixelOffset: { value: new THREE.Vector2(0, 0) },
      uOklabLevels: { value: 6.0 },
      uBayerStrength: { value: 1.0 },
      uOutlineStrength: { value: 0.85 },
      uRenderPassMode: { value: 0 }, // 0 = final, 1 = raw, 2 = dapple-mask, 3 = outlines-shadows
      uBgColor: { value: new THREE.Color('#F4F1EA') },
      uTimePhase: { value: 0.0 },
      uDappleIntensity: { value: 0.68 },
      uGlobalTint: { value: new THREE.Color('#FFFDF9') },
      uGlobalTintStrength: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;
      uniform vec2 uResolution;
      uniform vec2 uSubpixelOffset;
      uniform float uOklabLevels;
      uniform float uBayerStrength;
      uniform float uOutlineStrength;
      uniform int uRenderPassMode;
      uniform vec3 uBgColor;
      uniform float uTimePhase;
      uniform float uDappleIntensity;
      uniform vec3 uGlobalTint;
      uniform float uGlobalTintStrength;

      varying vec2 vUv;

      // 4x4 ordered Bayer matrix normalized to [-0.5, 0.5]
      float bayer4x4(vec2 pixelCoord) {
        int x = int(mod(pixelCoord.x, 4.0));
        int y = int(mod(pixelCoord.y, 4.0));
        int idx = y * 4 + x;
        float m = 0.0;
        if (idx == 0) m = 0.0;
        else if (idx == 1) m = 8.0;
        else if (idx == 2) m = 2.0;
        else if (idx == 3) m = 10.0;
        else if (idx == 4) m = 12.0;
        else if (idx == 5) m = 4.0;
        else if (idx == 6) m = 14.0;
        else if (idx == 7) m = 6.0;
        else if (idx == 8) m = 3.0;
        else if (idx == 9) m = 11.0;
        else if (idx == 10) m = 1.0;
        else if (idx == 11) m = 9.0;
        else if (idx == 12) m = 15.0;
        else if (idx == 13) m = 7.0;
        else if (idx == 14) m = 13.0;
        else m = 5.0;
        return (m / 16.0) - 0.46875;
      }

      vec3 srgbToLinear(vec3 c) {
        return pow(max(c, vec3(0.0)), vec3(2.2));
      }

      vec3 linearToSrgb(vec3 c) {
        return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));
      }

      vec3 linearToOklab(vec3 c) {
        float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
        float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
        float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;

        float l_ = pow(max(l, 0.0), 1.0 / 3.0);
        float m_ = pow(max(m, 0.0), 1.0 / 3.0);
        float s_ = pow(max(s, 0.0), 1.0 / 3.0);

        return vec3(
          0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
          1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
          0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
        );
      }

      vec3 oklabToLinear(vec3 lab) {
        float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
        float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
        float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;

        float l = l_ * l_ * l_;
        float m = m_ * m_ * m_;
        float s = s_ * s_ * s_;

        return vec3(
          +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
          -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
        );
      }

      float luma(vec3 c) {
        return dot(c, vec3(0.299, 0.587, 0.114));
      }

      void main() {
        vec2 texelSize = 1.0 / uResolution;
        // Shift UV by the sub-texel camera remainder so camera pans at 60fps native display resolution!
        vec2 shiftedUv = clamp(vUv + uSubpixelOffset * texelSize, texelSize * 0.5, 1.0 - texelSize * 0.5);
        vec2 pixelCoord = floor(shiftedUv * uResolution);
        vec2 snappedUv = (pixelCoord + 0.5) * texelSize;

        vec4 centerSample = texture2D(tDiffuse, snappedUv);
        float dCenter = texture2D(tDepth, snappedUv).r;

        float dLeft  = texture2D(tDepth, snappedUv + vec2(-texelSize.x, 0.0)).r;
        float dRight = texture2D(tDepth, snappedUv + vec2( texelSize.x, 0.0)).r;
        float dUp    = texture2D(tDepth, snappedUv + vec2(0.0,  texelSize.y)).r;
        float dDown  = texture2D(tDepth, snappedUv + vec2(0.0, -texelSize.y)).r;

        vec3 cLeft  = texture2D(tDiffuse, snappedUv + vec2(-texelSize.x, 0.0)).rgb;
        vec3 cRight = texture2D(tDiffuse, snappedUv + vec2( texelSize.x, 0.0)).rgb;
        vec3 cUp    = texture2D(tDiffuse, snappedUv + vec2(0.0,  texelSize.y)).rgb;
        vec3 cDown  = texture2D(tDiffuse, snappedUv + vec2(0.0, -texelSize.y)).rgb;

        bool isBg = dCenter > 0.9992;

        if (uRenderPassMode == 2) {
          if (isBg) {
            gl_FragColor = vec4(uBgColor, 1.0);
            return;
          }
          vec2 p = (snappedUv - 0.5) * 8.0;
          float wave1 = sin(p.x * 1.9 + p.y * 1.4 - uTimePhase);
          float wave2 = cos(p.x * 1.2 - p.y * 2.1 + uTimePhase * 2.0);
          float dapple = smoothstep(-0.45, 0.55, 0.55 * wave1 + 0.45 * wave2);
          float dither = bayer4x4(pixelCoord) * 0.18;
          float qDapple = floor((dapple + dither) * 4.0 + 0.5) / 4.0;
          vec3 maskCol = mix(vec3(0.14, 0.17, 0.22), vec3(0.92, 0.88, 0.72), clamp(qDapple, 0.0, 1.0));
          gl_FragColor = vec4(maskCol, 1.0);
          return;
        }

        float depthDiff =
          abs(dCenter - dLeft) +
          abs(dCenter - dRight) +
          abs(dCenter - dUp) +
          abs(dCenter - dDown);

        float colorDiff =
          abs(luma(centerSample.rgb) - luma(cLeft)) +
          abs(luma(centerSample.rgb) - luma(cRight)) +
          abs(luma(centerSample.rgb) - luma(cUp)) +
          abs(luma(centerSample.rgb) - luma(cDown));

        float silhouetteEdge = step(0.012, depthDiff);
        float creaseEdge = step(0.26, colorDiff) * step(depthDiff, 0.012) * 0.55;
        float edgeMask = clamp((silhouetteEdge + creaseEdge) * uOutlineStrength, 0.0, 1.0);

        if (uRenderPassMode == 3) {
          if (isBg && silhouetteEdge < 0.5) {
            gl_FragColor = vec4(uBgColor, 1.0);
            return;
          }
          float shadowDarkness = smoothstep(0.32, 0.10, luma(centerSample.rgb));
          vec3 inkCol = mix(uBgColor, vec3(0.09, 0.08, 0.11), max(edgeMask, shadowDarkness * 0.85));
          gl_FragColor = vec4(inkCol, 1.0);
          return;
        }

        if (isBg) {
          gl_FragColor = vec4(uBgColor, 1.0);
          return;
        }

        // Apply Day-Night Global Scene Tint (preserving warm brazier/lantern highlights & natural stone balance)
        float sampleLuma = luma(centerSample.rgb);
        float warmGlowMask = smoothstep(0.50, 0.90, centerSample.r) * smoothstep(0.05, 0.35, centerSample.r - centerSample.b);
        float effectiveTintWeight = uGlobalTintStrength * 0.65 * (1.0 - warmGlowMask * 0.82);
        vec3 tintedSample = mix(
          centerSample.rgb,
          centerSample.rgb * mix(vec3(1.0), uGlobalTint * 1.15, 0.55) + uGlobalTint * sampleLuma * 0.14,
          effectiveTintWeight
        );

        if (uRenderPassMode == 1) {
          gl_FragColor = vec4(clamp(tintedSample, 0.0, 1.0), 1.0);
          return;
        }

        vec3 lin = srgbToLinear(clamp(tintedSample, 0.0, 1.0));
        vec3 lab = linearToOklab(lin);

        float bayer = bayer4x4(pixelCoord) * uBayerStrength;
        float levels = max(3.0, uOklabLevels);

        // Quantize perceptual lightness L with subtle ordered Bayer dithering
        lab.x = clamp(floor((lab.x + bayer / (levels * 1.65)) * levels + 0.5) / levels, 0.04, 0.96);

        // Preserve cohesive dark-fantasy chroma (OKLab a/b live in [-0.14, +0.14];
        // use fine perceptual chroma steps and gentle desaturation so stone never snaps to neon yellow/magenta)
        float chromaRestraint = 0.84;
        float fineChromaSteps = max(48.0, floor(levels * 8.0));
        lab.y = floor((lab.y * chromaRestraint + bayer * 0.002) * fineChromaSteps + 0.5) / fineChromaSteps;
        lab.z = floor((lab.z * chromaRestraint + bayer * 0.002) * fineChromaSteps + 0.5) / fineChromaSteps;

        vec3 quantLinear = clamp(oklabToLinear(lab), 0.0, 1.0);
        vec3 quantSrgb = linearToSrgb(quantLinear);

        vec3 outlineColor = quantSrgb * 0.25 + vec3(0.04, 0.04, 0.03);
        vec3 finalRgb = mix(quantSrgb, outlineColor, edgeMask);

        gl_FragColor = vec4(finalRgb, 1.0);
      }
    `,
    depthWrite: false,
    depthTest: false,
  });
}
