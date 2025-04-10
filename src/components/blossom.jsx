import { useRef, useEffect, useMemo, useState } from 'react'
import { Html, useGLTF, useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { getElevation } from '../utils/waveUtils'
import * as THREE from 'three'

// Import quotes data
import quotesData from './quotes.json'

function Blossom({ amount = 10, highlightRadius = 5 }) {
    const { scene, raycaster, mouse, camera } = useThree()
    const blossomGLTF = useGLTF('./models/sakura.glb')
    const aoMap = useTexture('./AOMaps/AO.png')
    const waterMeshRef = useRef(null)
    const meshRef = useRef()
    const planeRef = useRef()
    const dummy = useMemo(() => new THREE.Object3D(), [])

    // State to track which instances are being highlighted
    const [highlightedIndices, setHighlightedIndices] = useState([])
    // State to track raycast intersection point
    const [intersectPoint, setIntersectPoint] = useState(null)
    // State to track the selected blossom for quotes
    const [selectedBlossomIndex, setSelectedBlossomIndex] = useState(null)
    // State to track hoveredBlossom for showing author
    const [hoveredBlossomIndex, setHoveredBlossomIndex] = useState(null)
    // Position for the HTML element
    const [htmlPosition, setHtmlPosition] = useState([0, 0, 0])
    // State to control visibility of the HTML element
    const [isHtmlVisible, setIsHtmlVisible] = useState(false)

    // Store original colors to restore them when hover ends
    const originalColors = useRef(null)
    // Store custom colors for hover state
    const hoverColors = useRef(null)

    const positions = useRef([])
    const floatSeeds = useRef([])
    const rotationSpeeds = useRef([])
    const scales = useRef([])
    const originalScales = useRef([])

    // Store author names for each blossom
    const blossomAuthors = useRef([])

    // Extract authors from quotes
    const authors = useMemo(() => {
        // If quotesData is imported directly
        if (quotesData && quotesData.quotes) {
            return quotesData.quotes.map(item => item.author);
        }
        // Fallback if import doesn't work
        return [
            "Thich Nhat Hanh", "Lao Tzu", "Bodhidharma", "Dogen",
            "Shunryu Suzuki", "Alan Watts", "Zen Proverb",
            "Rumi", "Eckhart Tolle", "Zen Saying"
        ];
    }, []);

    // Function to check if the new position is too close to existing ones
    const isTooClose = (newPos, positions, minDistance = 2) => {
        for (let i = 0; i < positions.length; i++) {
            const existingPos = positions[i]
            if (newPos.distanceTo(existingPos) < minDistance) {
                return true
            }
        }
        return false
    }

    // Initialize instance data
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
            } while (isTooClose(newPos, tempPositions)) // Ensure the new position is not too close

            tempPositions.push(newPos)
            tempFloatSeeds.push(Math.random() * 0.5 + 1)
            tempRotSpeeds.push((Math.random() * 0.002 + 0.001) * (Math.random() > 0.5 ? 1 : -1))
            const scale = Math.random() * 0.5 + 0.5
            tempScales.push(scale)

            // Assign an author to this blossom
            // If there are more blossoms than authors, start repeating authors
            const authorIndex = i % authors.length
            tempAuthors.push(authors[authorIndex])
        }

        positions.current = tempPositions
        floatSeeds.current = tempFloatSeeds
        rotationSpeeds.current = tempRotSpeeds
        scales.current = tempScales
        originalScales.current = [...tempScales]
        blossomAuthors.current = tempAuthors
    }, [amount, authors])

    // Apply AO map to the blossom material
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

    const findWaterMesh = () => {
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
    }

    useEffect(() => {
        findWaterMesh()
        const intervalId = setInterval(() => {
            findWaterMesh()
            if (waterMeshRef.current) clearInterval(intervalId)
        }, 500)
        return () => clearInterval(intervalId)
    }, [scene])

    // Setup color arrays for hover effect
    useEffect(() => {
        if (!meshRef.current || !meshRef.current.instanceColor) {
            // Initialize instanceColor if it doesn't exist yet
            if (meshRef.current && !meshRef.current.instanceColor) {
                const instanceColors = new Float32Array(amount * 3);

                // Set default colors (white)
                for (let i = 0; i < amount; i++) {
                    instanceColors[i * 3] = 1.0;     // R
                    instanceColors[i * 3 + 1] = 1.0; // G
                    instanceColors[i * 3 + 2] = 1.0; // B
                }

                meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(instanceColors, 3);
            }
            return;
        }

        // Store original colors
        if (!originalColors.current) {
            originalColors.current = new Float32Array(amount * 3);
            for (let i = 0; i < amount * 3; i++) {
                originalColors.current[i] = 1.0; // Default white color
            }
        }

        // Create hover colors (light pink for sakura blossoms)
        if (!hoverColors.current) {
            hoverColors.current = new Float32Array(amount * 3);
            for (let i = 0; i < amount; i++) {
                hoverColors.current[i * 3] = 1.0;     // R (pink tint)
                hoverColors.current[i * 3 + 1] = 0.7; // G (reduced for pink)
                hoverColors.current[i * 3 + 2] = 0.8; // B (slight blue for pink)
            }
        }
    }, [amount, meshRef]);

    // Check which blossoms are within radius of intersection point
    const updateHighlightedBlossoms = () => {
        if (!intersectPoint) {
            setHighlightedIndices([]);
            setHoveredBlossomIndex(null);
            setIsHtmlVisible(selectedBlossomIndex !== null);
            return;
        }

        const newHighlightedIndices = [];
        let closestIndex = -1;
        let closestDistSq = Infinity;

        // Check each blossom's distance to the intersection point (only checking x and z)
        for (let i = 0; i < amount; i++) {
            const pos = positions.current[i];

            // Calculate distance in x-z plane (ignoring y)
            const dx = pos.x - intersectPoint.x;
            const dz = pos.z - intersectPoint.z;
            const distanceSquared = dx * dx + dz * dz;

            // If within radius, add to highlighted indices
            if (distanceSquared <= highlightRadius * highlightRadius) {
                newHighlightedIndices.push(i);

                // Track the closest blossom for hover
                if (distanceSquared < closestDistSq) {
                    closestDistSq = distanceSquared;
                    closestIndex = i;
                }
            }
        }

        setHighlightedIndices(newHighlightedIndices);

        // Update the hovered blossom index and HTML position
        if (closestIndex !== -1) {
            setHoveredBlossomIndex(closestIndex);

            // Compute position for the HTML element (above the blossom)
            const blossomPos = positions.current[closestIndex];
            setHtmlPosition([blossomPos.x, blossomPos.y + 1.5, blossomPos.z]); // Position it 1.5 units above the blossom
            setIsHtmlVisible(true);
        } else {
            setHoveredBlossomIndex(null);
            setIsHtmlVisible(selectedBlossomIndex !== null);
        }
    }

    // Animate blossoms and handle highlighting
    useFrame((state) => {
        if (!meshRef.current) return;

        const time = state.clock.elapsedTime;
        const waveParams = waterMeshRef.current?.material?.uniforms && {
            wavesAmplitude: waterMeshRef.current.material.uniforms.uWavesAmplitude.value,
            wavesSpeed: waterMeshRef.current.material.uniforms.uWavesSpeed.value,
            wavesFrequency: waterMeshRef.current.material.uniforms.uWavesFrequency.value,
            wavesPersistence: waterMeshRef.current.material.uniforms.uWavesPersistence.value,
            wavesLacunarity: waterMeshRef.current.material.uniforms.uWavesLacunarity.value,
            wavesIterations: waterMeshRef.current.material.uniforms.uWavesIterations.value,
            time
        };

        if (!waveParams) return;

        // Handle raycasting for detecting plane intersection
        raycaster.setFromCamera(mouse, camera);

        // Check for intersection with the invisible plane
        if (planeRef.current) {
            const planeIntersects = raycaster.intersectObject(planeRef.current);

            if (planeIntersects.length > 0) {
                setIntersectPoint(planeIntersects[0].point);
                updateHighlightedBlossoms();
            } else {
                setIntersectPoint(null);
                setHighlightedIndices([]);
                setHoveredBlossomIndex(null);
                setIsHtmlVisible(selectedBlossomIndex !== null);
            }
        }

        // Update HTML position if selected blossom exists
        if (selectedBlossomIndex !== null) {
            const selectedPos = positions.current[selectedBlossomIndex];
            setHtmlPosition([selectedPos.x, selectedPos.y + 1.5, selectedPos.z]);
        }

        // Update instance positions and rotations
        for (let i = 0; i < amount; i++) {
            const pos = positions.current[i];
            const floatSeed = floatSeeds.current[i];
            const rotSpeed = rotationSpeeds.current[i];
            const originalScale = originalScales.current[i];

            const speed = 0.005 * waveParams.wavesSpeed * floatSeed;
            pos.x -= speed;
            pos.z -= speed;

            if (pos.x < -100) pos.x = 80;
            if (pos.z < -100) pos.z = 80;

            const elevation = getElevation(pos.x, pos.z, waveParams);
            pos.y = (elevation * 5) + 0.35;

            dummy.position.copy(pos);
            dummy.rotation.set(
                Math.PI / 2,
                0,
                (time * rotSpeed * 50)
            );

            // If this is a highlighted instance or the selected instance, make it larger
            const isHighlighted = highlightedIndices.includes(i);
            const isSelected = selectedBlossomIndex === i;

            if (isSelected) {
                // Selected blossoms are larger and have a different color
                dummy.scale.setScalar(originalScale * 1.5);

                if (meshRef.current.instanceColor) {
                    // Make selected blossom more vibrant pink
                    meshRef.current.instanceColor.array[i * 3] = 1.0;         // R
                    meshRef.current.instanceColor.array[i * 3 + 1] = 0.5;     // G
                    meshRef.current.instanceColor.array[i * 3 + 2] = 0.7;     // B
                }
            } else if (isHighlighted) {
                dummy.scale.setScalar(originalScale * 1.2); // 20% bigger when highlighted

                // Update color if we have instance colors
                if (meshRef.current.instanceColor) {
                    meshRef.current.instanceColor.array[i * 3] = hoverColors.current[i * 3];
                    meshRef.current.instanceColor.array[i * 3 + 1] = hoverColors.current[i * 3 + 1];
                    meshRef.current.instanceColor.array[i * 3 + 2] = hoverColors.current[i * 3 + 2];
                }
            } else {
                dummy.scale.setScalar(originalScale);

                // Reset color if we have instance colors
                if (meshRef.current.instanceColor) {
                    meshRef.current.instanceColor.array[i * 3] = originalColors.current[i * 3];
                    meshRef.current.instanceColor.array[i * 3 + 1] = originalColors.current[i * 3 + 1];
                    meshRef.current.instanceColor.array[i * 3 + 2] = originalColors.current[i * 3 + 2];
                }
            }

            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
        }
    });

    // Extract geometry and material from GLTF
    const geometry = useMemo(() => {
        let geom = null;
        blossomGLTF.scene.traverse((child) => {
            if (child.isMesh && !geom) {
                geom = child.geometry.clone();
            }
        });
        return geom;
    }, [blossomGLTF]);

    const material = useMemo(() => {
        let mat = null;
        blossomGLTF.scene.traverse((child) => {
            if (child.isMesh && !mat) {
                mat = child.material.clone();

                // Make sure the material can show instance colors
                mat.vertexColors = true;
            }
        });
        return mat;
    }, [blossomGLTF]);

    // Find the quote for a given author
    const findQuoteByAuthor = (author) => {
        if (quotesData && quotesData.quotes) {
            const quoteObj = quotesData.quotes.find(q => q.author === author);
            return quoteObj ? quoteObj.quote : "No quote found";
        }
        return "Quote data not available";
    };

    // Handle click on the invisible plane
    const handlePlaneClick = (event) => {
        // Prevent the default behavior to avoid any issues
        event.stopPropagation();

        if (highlightedIndices.length > 0) {
            // Find the closest blossom to the intersection point
            if (intersectPoint) {
                let closestIndex = -1;
                let closestDistSq = Infinity;

                for (const idx of highlightedIndices) {
                    const pos = positions.current[idx];
                    const dx = pos.x - intersectPoint.x;
                    const dz = pos.z - intersectPoint.z;
                    const distSq = dx * dx + dz * dz;

                    if (distSq < closestDistSq) {
                        closestDistSq = distSq;
                        closestIndex = idx;
                    }
                }

                if (closestIndex !== -1) {
                    // Toggle selection - if already selected, deselect it
                    if (selectedBlossomIndex === closestIndex) {
                        setSelectedBlossomIndex(null);
                    } else {
                        setSelectedBlossomIndex(closestIndex);

                        // Update HTML position
                        const blossomPos = positions.current[closestIndex];
                        setHtmlPosition([blossomPos.x, blossomPos.y + 1.5, blossomPos.z]);
                    }
                    setIsHtmlVisible(selectedBlossomIndex !== closestIndex);
                }
            }
        } else {
            // Clicked on empty space - clear selection
            setSelectedBlossomIndex(null);
            setIsHtmlVisible(false);
        }
    };

    return (
        <>
            {/* HTML display for author/quote */}
            {isHtmlVisible && (
                <Html position={htmlPosition} center distanceFactor={50}>
                    <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.85)',
                        borderRadius: '8px',
                        padding: '10px',
                        textAlign: 'center',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                        width: '250px',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none', // Prevent the HTML from blocking raycasts
                    }}>
                        {selectedBlossomIndex !== null ? (
                            // Show quote when selected
                            <div>
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    marginBottom: '8px',
                                    color: '#d57e9c' // Pink color for the author name
                                }}>
                                    {blossomAuthors.current[selectedBlossomIndex]}
                                </div>
                                <div style={{
                                    fontStyle: 'italic',
                                    fontSize: '14px',
                                    color: '#333'
                                }}>
                                    "{findQuoteByAuthor(blossomAuthors.current[selectedBlossomIndex])}"
                                </div>
                            </div>
                        ) : hoveredBlossomIndex !== null ? (
                            // Show just author when hovered
                            <div style={{
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: '#d57e9c' // Pink color for the author name
                            }}>
                                {blossomAuthors.current[hoveredBlossomIndex]}
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
                visible={false} // Make it invisible
            >
                <planeGeometry args={[300, 300]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
        </>
    );
}

export default Blossom;