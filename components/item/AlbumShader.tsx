"use client";

import { useEffect, useRef } from "react";

const vertex = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = `
precision mediump float;
uniform vec2 resolution;
uniform float elapsed;
uniform float hue;

vec3 color(float shift) {
  return 0.58 + 0.42 * cos(6.28318 * (hue + shift + vec3(0.0, 0.66, 0.33)));
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float drift = 1.0 - exp(-elapsed * 1.4);
  vec2 p = (uv - 0.5) * vec2(resolution.x / resolution.y, 1.0);
  p.x += 0.32 * sin(p.y * 4.6 + drift * 1.8);
  p.y += 0.14 * sin(p.x * 3.8 - drift * 2.0);
  float band = 0.5 + 0.5 * sin(8.0 * length(p * vec2(0.58, 1.0)) - drift * 1.7);
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  vec3 ink = mix(color(0.03), color(0.26), smoothstep(0.12, 0.94, band));
  gl_FragColor = vec4(ink + (grain - 0.5) * 0.07, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, kind: number, source: string) {
  const shader = gl.createShader(kind);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

export function AlbumShader({ seed }: { seed: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || motion.matches) return;
    const gl = element.getContext("webgl", { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) return;

    const program = gl.createProgram();
    const mesh = gl.createBuffer();
    const vs = compile(gl, gl.VERTEX_SHADER, vertex);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
    let frame = 0;

    function dispose() {
      cancelAnimationFrame(frame);
      if (!gl || !element) return;
      element.removeAttribute("data-rendered");
      gl.deleteBuffer(mesh);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    }

    if (!program || !mesh || !vs || !fs) {
      dispose();
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      dispose();
      return;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, element.width, element.height);
    gl.uniform2f(gl.getUniformLocation(program, "resolution"), element.width, element.height);
    let hash = 0;
    for (const char of seed) hash = (Math.imul(31, hash) + char.charCodeAt(0)) >>> 0;
    gl.uniform1f(gl.getUniformLocation(program, "hue"), (hash % 360) / 360);
    const time = gl.getUniformLocation(program, "elapsed");
    const started = performance.now();

    function draw(now: number) {
      if (!gl || !element || motion.matches || gl.isContextLost()) return;
      gl.uniform1f(time, (now - started) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!element.dataset.rendered) element.dataset.rendered = "true";
      // Settle after the entrance so a quiet drawer doesn't keep rendering.
      if (now - started < 1700) frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);
    return dispose;
  }, [seed]);

  return <canvas ref={canvas} width={440} height={180} className="detail-shader" aria-hidden="true" />;
}
