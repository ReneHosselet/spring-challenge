import { useEffect, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { RepeatWrapping, SRGBColorSpace, TextureLoader } from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import GroundShader from '../shaders/groundShader';

// Create a shader material using drei's shaderMaterial helper
const GroundShaderMaterial = shaderMaterial(
  GroundShader.uniforms,
  GroundShader.vertexShader,
  GroundShader.fragmentShader
);

// Extend the R3F namespace to include our custom material
extend({ GroundShaderMaterial });

function Ground() {
  // Reference to the shader material
  const materialRef = useRef();

  // Load a texture for the ground
  const groundTexture = useLoader(TextureLoader, '/textures/sand2.jpg');

  useEffect(() => {
    if (groundTexture) {
      groundTexture.repeat.set(20, 20);
      groundTexture.wrapS = RepeatWrapping;
      groundTexture.wrapT = RepeatWrapping;
    }
  }, [groundTexture]);

  // Update the time uniform on each frame
  // useFrame((state, delta) => {
  //   if (materialRef.current) {
  //     materialRef.current.uniforms.uTime.value += delta;
  //   }
  // });

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -7, 0]}>
      <planeGeometry args={[250, 250]} />
      <groundShaderMaterial
        ref={materialRef}
        uTexture={groundTexture}
        uCausticsColor={[0.0, 0.5, 1.0]} // Blue-ish color for water caustics
        uCausticsIntensity={1.2}
        uCausticsScale={3.0}
        uCausticsSpeed={0.2}
      />
    </mesh>
  );
}

export default Ground;