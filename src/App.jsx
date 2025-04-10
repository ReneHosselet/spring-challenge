import './App.css'
import { Canvas } from '@react-three/fiber'
import { Center, ContactShadows, Environment, OrbitControls, Stars, Text3D } from '@react-three/drei'
import Water from './components/water'
import Blossom from './components/blossom'
import Ground from './components/ground'
import { Suspense, useEffect, useState } from 'react'
import { Leva, useControls } from 'leva'
import { DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing'

function App() {
  const amountOfBlossoms = 100
  const [showLeva, setShowLeva] = useState(false)

  // 👇 Depth of Field controls
  const dofControls = useControls('Depth of Field', {
    focusDistance: { value: 1.0, min: 0, max: 1, step: 0.0001 },
    focalLength: { value: 0.05, min: 0, max: 1, step: 0.0001 },
    bokehScale: { value: 6, min: 0, max: 10, step: 0.1 }
  })

  // State to track focus distance dynamically based on mouse movement
  const [focusDistance, setFocusDistance] = useState(dofControls.focusDistance);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'l') {
        setShowLeva(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleMouseMove(event) {
    setTimeout(() => {
      const invertedY = window.innerHeight - event.clientY;
      const newFocusDistance = (invertedY / window.innerHeight) / 15;
      setFocusDistance(newFocusDistance); // Update the state, React will re-render and update the DOF effect
    }, 1000 / 60);
  }

  return (
    <>
      <Canvas onMouseMove={handleMouseMove} camera={{ position: [25, 21, 0], fov: 55 }} gl={{ antialias: true, pixelRatio: 1 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.1} />
          <Environment files="/environments/River_006_Spring_2k.hdr" background />
          <ambientLight intensity={1} />
          <rectAreaLight position={[0, 10, 0]} intensity={15} castShadow />
          <Blossom amount={amountOfBlossoms} highlightRadius={3} />
          <Water />
          <Ground />
          <Center position={[7, -6, 0]}>
            <Text3D font="/fonts/Inter_Bold.json"
              height={0.05}
              position={[0, 0, 0]} scale={[3, 3, 3]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} >
              SPRING-CHALLENGE
              <meshPhysicalMaterial color={"#8d1900"} />
            </Text3D>
          </Center>
          <ContactShadows
            position={[7, -5.05, 0]}
            opacity={0.4}
            scale={100}
            blur={2}
            far={5}
          />
          <OrbitControls enablePan={false} enabled={false} enableZoom={false} />
          {/* <OrbitControls enablePan={false} enabled={false} maxPolarAngle={Math.PI / 2 / 1.8} minPolarAngle={Math.PI / 2 / 1.8} enableZoom={false} /> */}
          <EffectComposer>
            <Vignette
              intensity={0.25}
            />
            <DepthOfField
              focusDistance={focusDistance}  // Use the dynamic focus distance state
              focalLength={dofControls.focalLength}
              bokehScale={dofControls.bokehScale}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
      <Leva hidden={!showLeva} />
    </>
  )
}

export default App
