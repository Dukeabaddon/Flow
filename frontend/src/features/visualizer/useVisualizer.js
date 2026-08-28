import { useRef, useCallback } from 'react';
import { SHADER_SOURCE } from './shaders/cymatic';
import { visualSpecFromPrompt } from '@backend/visual';

const TRANSITION_DURATION = 1500;

function snapshot(vals) {
  return {
    color1: [...vals.color1],
    color2: [...vals.color2],
    complexity: vals.complexity,
    speed: vals.speed,
    mode: vals.mode,
    texture: vals.texture,
    dirX: vals.dirX,
    dirY: vals.dirY,
    rotate: vals.rotate,
    scale: vals.scale,
    warp: vals.warp,
  };
}

export function useVisualizer(canvasRef) {
  const glRef = useRef(null);
  const programRef = useRef(null);
  const uniformsRef = useRef({});
  const startTimeRef = useRef(Date.now());
  const frameIdRef = useRef(null);
  const fromSpecRef = useRef(null);
  const toSpecRef = useRef(null);
  const transitionStartRef = useRef(0);
  const isTransitioningRef = useRef(false);

  const currentValsRef = useRef({
    ...visualSpecFromPrompt('flow idle'),
    bass: 0,
  });

  const initShader = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;
    glRef.current = gl;

    const vertSrc = `
      attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `;

    const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, SHADER_SOURCE);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader link error:', gl.getProgramInfoLog(program));
      return;
    }

    programRef.current = program;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    uniformsRef.current = {
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_bass: gl.getUniformLocation(program, 'u_bass'),
      u_color1: gl.getUniformLocation(program, 'u_color1'),
      u_color2: gl.getUniformLocation(program, 'u_color2'),
      u_complexity: gl.getUniformLocation(program, 'u_complexity'),
      u_speed: gl.getUniformLocation(program, 'u_speed'),
      u_mode: gl.getUniformLocation(program, 'u_mode'),
      u_dir: gl.getUniformLocation(program, 'u_dir'),
      u_rotate: gl.getUniformLocation(program, 'u_rotate'),
      u_scale: gl.getUniformLocation(program, 'u_scale'),
      u_warp: gl.getUniformLocation(program, 'u_warp'),
      u_texture: gl.getUniformLocation(program, 'u_texture'),
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', handleResize);

    startTimeRef.current = Date.now();
    renderLoop();
  }, []);

  const applySpec = useCallback((spec) => {
    if (!spec) return;
    fromSpecRef.current = snapshot(currentValsRef.current);
    toSpecRef.current = spec;
    transitionStartRef.current = Date.now();
    isTransitioningRef.current = true;
  }, []);

  const renderLoop = useCallback(() => {
    const gl = glRef.current;
    const uniforms = uniformsRef.current;
    if (!gl || !programRef.current) return;

    const vals = currentValsRef.current;
    const time = (Date.now() - startTimeRef.current) / 1000;

    if (isTransitioningRef.current && fromSpecRef.current && toSpecRef.current) {
      const elapsed = Date.now() - transitionStartRef.current;
      const t = Math.min(elapsed / TRANSITION_DURATION, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const from = fromSpecRef.current;
      const to = toSpecRef.current;

      vals.color1 = lerpVec3(from.color1, to.color1, ease);
      vals.color2 = lerpVec3(from.color2, to.color2, ease);
      vals.complexity = lerp(from.complexity, to.complexity, ease);
      vals.speed = lerp(from.speed, to.speed, ease);
      vals.mode = lerp(from.mode, to.mode, ease);
      vals.texture = lerp(from.texture, to.texture, ease);
      vals.dirX = lerp(from.dirX, to.dirX, ease);
      vals.dirY = lerp(from.dirY, to.dirY, ease);
      vals.rotate = lerp(from.rotate, to.rotate, ease);
      vals.scale = lerp(from.scale, to.scale, ease);
      vals.warp = lerp(from.warp, to.warp, ease);

      if (t >= 1) {
        isTransitioningRef.current = false;
      }
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(uniforms.u_time, time);
    gl.uniform2f(uniforms.u_resolution, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(uniforms.u_bass, vals.bass);
    gl.uniform3fv(uniforms.u_color1, vals.color1);
    gl.uniform3fv(uniforms.u_color2, vals.color2);
    gl.uniform1f(uniforms.u_complexity, vals.complexity);
    gl.uniform1f(uniforms.u_speed, vals.speed);
    gl.uniform1f(uniforms.u_mode, vals.mode);
    gl.uniform2f(uniforms.u_dir, vals.dirX, vals.dirY);
    gl.uniform1f(uniforms.u_rotate, vals.rotate);
    gl.uniform1f(uniforms.u_scale, vals.scale);
    gl.uniform1f(uniforms.u_warp, vals.warp);
    gl.uniform1f(uniforms.u_texture, vals.texture);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    frameIdRef.current = requestAnimationFrame(renderLoop);
  }, []);

  const updateUniforms = useCallback(({ bass }) => {
    currentValsRef.current.bass = bass;
  }, []);

  const cleanup = useCallback(() => {
    if (frameIdRef.current) {
      cancelAnimationFrame(frameIdRef.current);
    }
  }, []);

  return { initShader, updateUniforms, cleanup, applySpec };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpVec3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}
