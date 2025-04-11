import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { Html, useGLTF, useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { getElevation } from '../utils/waveUtils'
import * as THREE from 'three'

// Import quotes data
import quotesData from './quotes.json'

function Blossom({ amount = 10, highlightRadius = 5 }) {
    const { scene, raycaster, mouse, camera } = useThree()
    const blossomGLTF = useGLTF('/models/sakura.glb')
    const aoMap = useTexture('/AOMaps/AO.png')

    // Refs for scene objects and calculations
    const waterMeshRef = useRef(null)
    const meshRef = useRef()
    const planeRef = useRef()
    const dummy = useMemo(() => new THREE.Object3D(), [])

    // Use a single state object instead of multiple useState hooks
    // This prevents unnecessary re-renders when only some values change
    const [blossomState, setBlossomState] = useState({
        highlightedIndices: [],
        intersectPoint: null,
        selectedBlossomIndex: null,
        hoveredBlossomIndex: null,
        htmlPosition: [0, 0, 0],
        isHtmlVisible: false
    })

    // Use refs for data that doesn't need to trigger renders
    const blossomData = useRef({
        positions: [],
        floatSeeds: [],
        rotationSpeeds: [],
        scales: [],
        originalScales: [],
        originalColors: null,
        hoverColors: null,
        authors: []
    })

    // Extract authors from quotes - memoized to avoid recalculation
    const authors = useMemo(() => {
        if (quotesData && quotesData.quotes) {
            return quotesData.quotes.map(item => item.author);
        }
        return [
            "Thich Nhat Hanh", "Lao Tzu", "Bodhidharma", "Dogen",
            "Shunryu Suzuki", "Alan Watts", "Zen Proverb",
            "Rumi", "Eckhart Tolle", "Zen Saying"
        ];
    }, []);

    // Function to check if the new position is too close to existing ones
    const isTooClose = useCallback((newPos, positions, minDistance = 2) => {
        for (let i = 0; i < positions.length; i++) {
            const existingPos = positions[i]
            if (newPos.distanceTo(existingPos) < minDistance) {
                return true
            }
        }
        return false
    }, [])

    // Initialize instance data - only run once
    useEffect(() => {
        const tempPositions = []
        const tempFloatSeeds = []
        const tempRotSpeeds = []
        const tempScales = []
        const tempAuthors = []

        for (let i = 0; i < amount; i++) {
            let newPos
            do {
                newPos = new THREE.Vector3(
                    (Math.random() - 0.5) * 150,
                    0,
                    (Math.random() - 0.5) * 150
                )
            } while (isTooClose(newPos, tempPositions))

            tempPositions.push(newPos)
            tempFloatSeeds.push(Math.random() * 0.5 + 1)
            tempRotSpeeds.push((Math.random() * 0.002 + 0.001) * (Math.random() > 0.5 ? 1 : -1))
            const scale = Math.random() * 0.5 + 0.5
            tempScales.push(scale)

            // Assign an author to this blossom
            const authorIndex = i % authors.length
            tempAuthors.push(authors[authorIndex])
        }

        // Store all this data in the ref instead of separate refs
        blossomData.current = {
            ...blossomData.current,
            positions: tempPositions,
            floatSeeds: tempFloatSeeds,
            rotationSpeeds: tempRotSpeeds,
            scales: tempScales,
            originalScales: [...tempScales],
            authors: tempAuthors
        }

        // Initialize color arrays
        const instanceColors = new Float32Array(amount * 3)
        const origColors = new Float32Array(amount * 3)
        const hoverColors = new Float32Array(amount * 3)

        // Fill with default colors
        for (let i = 0; i < amount; i++) {
            // Original (white)
            origColors[i * 3] = 1.0
            origColors[i * 3 + 1] = 1.0
            origColors[i * 3 + 2] = 1.0

            // Copy to instance colors (initial state)
            instanceColors[i * 3] = 1.0
            instanceColors[i * 3 + 1] = 1.0
            instanceColors[i * 3 + 2] = 1.0

            // Hover colors (light pink)
            hoverColors[i * 3] = 1.0      // R
            hoverColors[i * 3 + 1] = 0.7  // G
            hoverColors[i * 3 + 2] = 0.8  // B
        }

        blossomData.current.originalColors = origColors
        blossomData.current.hoverColors = hoverColors

    }, [amount, authors, isTooClose])

    // Apply AO map to the blossom material - only run once
    useEffect(() => {
        blossomGLTF.scene.traverse((child) => {
            if (child.isMesh) {
                const materialAoMap = aoMap.clone()
                materialAoMap.flipY = false
                child.material.aoMap = materialAoMap
                child.material.aoMapIntensity = 1
                child.material.needsUpdate = true
            }
        })
    }, [blossomGLTF, aoMap])

    // Find water mesh only once
    const findWaterMesh = useCallback(() => {
        if (waterMeshRef.current) return
        scene.traverse((object) => {
            if (
                object.isMesh &&
                object.material?.type === 'ShaderMaterial' &&
                object.material.uniforms?.uWavesAmplitude
            ) {
                waterMeshRef.current = object
            }
        })
    }, [scene])

    useEffect(() => {
        findWaterMesh()
        const intervalId = setInterval(() => {
            findWaterMesh()
            if (waterMeshRef.current) clearInterval(intervalId)
        }, 500)
        return () => clearInterval(intervalId)
    }, [findWaterMesh])

    // Extract geometry and material from GLTF - memoized to prevent recreation
    const geometry = useMemo(() => {
        let geom = null
        blossomGLTF.scene.traverse((child) => {
            if (child.isMesh && !geom) {
                geom = child.geometry.clone()
            }
        })
        return geom
    }, [blossomGLTF])

    const material = useMemo(() => {
        let mat = null
        blossomGLTF.scene.traverse((child) => {
            if (child.isMesh && !mat) {
                mat = child.material.clone()
                mat.vertexColors = true
            }
        })
        return mat
    }, [blossomGLTF])

    // Find quote by author - memoized to avoid recalculation
    const quotesByAuthor = useMemo(() => {
        const quoteMap = {}
        if (quotesData && quotesData.quotes) {
            quotesData.quotes.forEach(q => {
                quoteMap[q.author] = q.quote
            })
        }
        return quoteMap
    }, [])

    // Optimized update of highlighted blossoms - moved outside of render loop
    const updateHighlightedBlossoms = useCallback((intersectPoint) => {
        if (!intersectPoint) {
            setBlossomState(prev => ({
                ...prev,
                highlightedIndices: [],
                hoveredBlossomIndex: null,
                // Only show HTML if something is selected
                isHtmlVisible: prev.selectedBlossomIndex !== null
            }))
            return
        }

        const { positions } = blossomData.current
        const newHighlightedIndices = []
        let closestIndex = -1
        let closestDistSq = Infinity

        for (let i = 0; i < amount; i++) {
            const pos = positions[i]

            const dx = pos.x - intersectPoint.x
            const dz = pos.z - intersectPoint.z
            const distanceSquared = dx * dx + dz * dz

            if (distanceSquared <= highlightRadius * highlightRadius) {
                newHighlightedIndices.push(i)

                if (distanceSquared < closestDistSq) {
                    closestDistSq = distanceSquared
                    closestIndex = i
                }
            }
        }

        setBlossomState(prev => {
            // If there's a selected blossom, keep the HTML position on it
            // Only update HTML position if nothing is selected
            let newHtmlPosition = prev.htmlPosition
            let newIsHtmlVisible = prev.isHtmlVisible

            if (prev.selectedBlossomIndex !== null) {
                // If something is selected, keep the HTML visible and positioned at the selected blossom
                const selectedPos = positions[prev.selectedBlossomIndex]
                newHtmlPosition = [selectedPos.x, selectedPos.y + 1.5, selectedPos.z]
                newIsHtmlVisible = true
            } else if (closestIndex !== -1) {
                // Nothing selected, but hovering over a blossom
                const blossomPos = positions[closestIndex]
                newHtmlPosition = [blossomPos.x, blossomPos.y + 1.5, blossomPos.z]
                newIsHtmlVisible = true
            } else {
                // Nothing selected or hovered
                newIsHtmlVisible = false
            }

            return {
                ...prev,
                highlightedIndices: newHighlightedIndices,
                hoveredBlossomIndex: prev.selectedBlossomIndex === null ? closestIndex : null,
                htmlPosition: newHtmlPosition,
                isHtmlVisible: newIsHtmlVisible
            }
        })
    }, [amount, highlightRadius])

    // Optimized plane click handler - batches state updates
    const handlePlaneClick = useCallback((event) => {
        event.stopPropagation()

        const { highlightedIndices, intersectPoint, selectedBlossomIndex } = blossomState
        const { positions } = blossomData.current

        if (highlightedIndices.length > 0 && intersectPoint) {
            let closestIndex = -1
            let closestDistSq = Infinity

            for (const idx of highlightedIndices) {
                const pos = positions[idx]
                const dx = pos.x - intersectPoint.x
                const dz = pos.z - intersectPoint.z
                const distSq = dx * dx + dz * dz

                if (distSq < closestDistSq) {
                    closestDistSq = distSq
                    closestIndex = idx
                }
            }

            if (closestIndex !== -1) {
                // Toggle selection
                const newSelectedIndex = selectedBlossomIndex === closestIndex ? null : closestIndex

                // Update HTML position if needed
                let newHtmlPosition = blossomState.htmlPosition
                if (newSelectedIndex !== null) {
                    const blossomPos = positions[newSelectedIndex]
                    newHtmlPosition = [blossomPos.x, blossomPos.y + 1.5, blossomPos.z]
                }

                setBlossomState(prev => ({
                    ...prev,
                    selectedBlossomIndex: newSelectedIndex,
                    htmlPosition: newHtmlPosition,
                    isHtmlVisible: newSelectedIndex !== null
                }))
            }
        } else {
            // Clicked on empty space - clear selection
            setBlossomState(prev => ({
                ...prev,
                selectedBlossomIndex: null,
                isHtmlVisible: false
            }))
        }
    }, [blossomState])

    // Throttle for raycasting operations to reduce performance impact
    const raycastThrottleRef = useRef({ lastTime: 0, throttleInterval: 50 })

    // Main animation loop - optimized to reduce calculations
    useFrame((state) => {
        if (!meshRef.current) return

        const time = state.clock.elapsedTime

        // Check if water mesh exists and has the required properties
        const waveParams = waterMeshRef.current?.material?.uniforms && {
            wavesAmplitude: waterMeshRef.current.material.uniforms.uWavesAmplitude.value,
            wavesSpeed: waterMeshRef.current.material.uniforms.uWavesSpeed.value,
            wavesFrequency: waterMeshRef.current.material.uniforms.uWavesFrequency.value,
            wavesPersistence: waterMeshRef.current.material.uniforms.uWavesPersistence.value,
            wavesLacunarity: waterMeshRef.current.material.uniforms.uWavesLacunarity.value,
            wavesIterations: waterMeshRef.current.material.uniforms.uWavesIterations.value,
            time
        }

        if (!waveParams) return

        // Throttle raycasting to improve performance
        const currentTime = state.clock.elapsedTime * 1000 // Convert to ms
        if (currentTime - raycastThrottleRef.current.lastTime > raycastThrottleRef.current.throttleInterval) {
            raycastThrottleRef.current.lastTime = currentTime

            // Handle raycasting for detecting plane intersection
            raycaster.setFromCamera(mouse, camera)

            // Check for intersection with the invisible plane
            if (planeRef.current) {
                const planeIntersects = raycaster.intersectObject(planeRef.current)

                if (planeIntersects.length > 0) {
                    const newIntersectPoint = planeIntersects[0].point
                    setBlossomState(prev => ({ ...prev, intersectPoint: newIntersectPoint }))
                    updateHighlightedBlossoms(newIntersectPoint)
                } else {
                    setBlossomState(prev => ({ ...prev, intersectPoint: null }))
                    updateHighlightedBlossoms(null)
                }
            }
        }

        // Update HTML position if selected blossom exists
        if (blossomState.selectedBlossomIndex !== null) {
            const selectedPos = blossomData.current.positions[blossomState.selectedBlossomIndex]
            const newPosition = [selectedPos.x, selectedPos.y + 1.5, selectedPos.z]

            // Only update if position changed significantly (avoid unnecessary re-renders)
            const currentPos = blossomState.htmlPosition
            const dx = currentPos[0] - newPosition[0]
            const dy = currentPos[1] - newPosition[1]
            const dz = currentPos[2] - newPosition[2]
            const distSq = dx * dx + dy * dy + dz * dz

            if (distSq > 0.01) {
                setBlossomState(prev => ({ ...prev, htmlPosition: newPosition }))
            }
        }

        // Get local refs to data for performance
        const {
            positions, floatSeeds, rotationSpeeds,
            originalScales, originalColors, hoverColors
        } = blossomData.current

        const { highlightedIndices, selectedBlossomIndex } = blossomState

        // Update instance positions and rotations
        for (let i = 0; i < amount; i++) {
            const pos = positions[i]
            const floatSeed = floatSeeds[i]
            const rotSpeed = rotationSpeeds[i]
            const originalScale = originalScales[i]

            const speed = 0.005 * waveParams.wavesSpeed * floatSeed
            pos.x -= speed * 1.5
            pos.z -= speed * 1.5

            if (pos.x < -100) pos.x = 80
            if (pos.z < -100) pos.z = 80

            const elevation = getElevation(pos.x, pos.z, waveParams)
            pos.y = (elevation * 5) + 0.35

            dummy.position.copy(pos)
            dummy.rotation.set(
                Math.PI / 2,
                0,
                (time * rotSpeed * 50)
            )

            // Check if this instance needs special treatment
            const isSelected = selectedBlossomIndex === i
            const isHighlighted = highlightedIndices.includes(i)

            if (isSelected) {
                dummy.scale.setScalar(originalScale * 1.5)

                if (meshRef.current.instanceColor) {
                    meshRef.current.instanceColor.array[i * 3] = 1.0
                    meshRef.current.instanceColor.array[i * 3 + 1] = 0.5
                    meshRef.current.instanceColor.array[i * 3 + 2] = 0.7
                }
            } else if (isHighlighted && hoverColors) {
                dummy.scale.setScalar(originalScale * 1.2)

                if (meshRef.current.instanceColor) {
                    meshRef.current.instanceColor.array[i * 3] = hoverColors[i * 3]
                    meshRef.current.instanceColor.array[i * 3 + 1] = hoverColors[i * 3 + 1]
                    meshRef.current.instanceColor.array[i * 3 + 2] = hoverColors[i * 3 + 2]
                }
            } else if (originalColors) {
                dummy.scale.setScalar(originalScale)

                if (meshRef.current.instanceColor) {
                    meshRef.current.instanceColor.array[i * 3] = originalColors[i * 3]
                    meshRef.current.instanceColor.array[i * 3 + 1] = originalColors[i * 3 + 1]
                    meshRef.current.instanceColor.array[i * 3 + 2] = originalColors[i * 3 + 2]
                }
            }

            dummy.updateMatrix()
            meshRef.current.setMatrixAt(i, dummy.matrix)
        }

        // Update instance data
        meshRef.current.instanceMatrix.needsUpdate = true
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true
        }
    })

    return (
        <>
            {/* HTML display for author/quote */}
            {blossomState.isHtmlVisible && (
                <Html position={blossomState.htmlPosition} center distanceFactor={50}>
                    <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.85)',
                        borderRadius: '8px',
                        padding: '10px',
                        textAlign: 'center',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                        width: '250px',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                    }}>
                        {blossomState.selectedBlossomIndex !== null ? (
                            // Show quote when selected - priority display
                            <div>
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    marginBottom: '8px',
                                    color: '#d57e9c'
                                }}>
                                    {blossomData.current.authors[blossomState.selectedBlossomIndex]}
                                </div>
                                <div style={{
                                    fontStyle: 'italic',
                                    fontSize: '14px',
                                    color: '#333'
                                }}>
                                    "{quotesByAuthor[blossomData.current.authors[blossomState.selectedBlossomIndex]] || "No quote found"}"
                                </div>
                            </div>
                        ) : blossomState.hoveredBlossomIndex !== null ? (
                            // Only show hover content when nothing is selected
                            <div style={{
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: '#d57e9c'
                            }}>
                                {blossomData.current.authors[blossomState.hoveredBlossomIndex]}
                            </div>
                        ) : null}
                    </div>
                </Html>
            )}

            {geometry && material ? (
                <instancedMesh
                    ref={meshRef}
                    args={[geometry, material, amount]}
                />
            ) : null}

            {/* Invisible plane for raycasting */}
            <mesh
                ref={planeRef}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0, 0]}
                onClick={handlePlaneClick}
                visible={false}
            >
                <planeGeometry args={[300, 300]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
        </>
    )
}

export default Blossom