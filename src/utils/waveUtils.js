// Utility functions to calculate wave height and normal based on the water shader
import { Vector3 } from 'three';

// A simplified implementation of the shader's noise function for JavaScript
// This won't match exactly with the shader but will give a similar effect
function snoise(v) {
  // Using a simplified 2D noise function
  const x = v[0];
  const y = v[1];
  
  // Create a more complex noise pattern using sine and cosine
  return Math.sin(x * 10) * Math.cos(y * 10) * 0.5 +
         Math.sin(x * 20 + y * 5) * 0.25 +
         Math.cos(x * 5 - y * 15) * 0.25;
}

// Calculate elevation at any point (simplified version of the shader function)
export function getElevation(x, z, params) {
  const { 
    wavesAmplitude, 
    wavesSpeed, 
    wavesFrequency, 
    wavesPersistence, 
    wavesLacunarity, 
    wavesIterations,
    time 
  } = params;

  const pos = [x, z];
  
  let elevation = 0.0;
  let amplitude = 1.0;
  let frequency = wavesFrequency;
  
  // Apply multiple octaves of noise similar to the shader
  for (let i = 0; i < wavesIterations; i++) {
    const p = [
      pos[0] * frequency + time * wavesSpeed,
      pos[1] * frequency + time * wavesSpeed
    ];
    
    const noiseValue = snoise(p);
    elevation += amplitude * noiseValue;
    amplitude *= wavesPersistence;
    frequency *= wavesLacunarity || 2.0; // Default to 2.0 if lacunarity is 0
  }
  
  elevation *= wavesAmplitude;
  
  return elevation;
}

// Calculate the normal vector at any point on the water surface
export function getNormalAtPoint(x, z, params) {
  // Calculate the elevation at the current point
  const elevation = getElevation(x, z, params);
  
  // Use a small epsilon value for calculating partial derivatives
  const eps = 0.001;
  
  // Calculate elevations at nearby points
  const elevationX = getElevation(x - eps, z, params);
  const elevationZ = getElevation(x, z - eps, params);
  
  // Calculate tangent and bitangent vectors (similar to the shader)
  const tangent = new Vector3(eps, elevationX - elevation, 0).normalize();
  const bitangent = new Vector3(0, elevationZ - elevation, eps).normalize();
  
  // Calculate the normal as the cross product of tangent and bitangent
  const normal = new Vector3().crossVectors(tangent, bitangent).normalize();
  
  return normal;
}