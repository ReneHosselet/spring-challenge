import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color } from 'three';
import { useControls, folder } from 'leva';
import { vertexShader, fragmentShader, defaultUniforms } from '../shaders/waterShader';

function Water() {
    const materialRef = useRef();
    const { scene } = useThree();

    // Create Leva controls for shader uniforms
    const controls = useControls({
        'Water Waves': folder({
            wavesAmplitude: {
                value: defaultUniforms.uWavesAmplitude.value,
                min: 0.01,
                max: 0.5,
                step: 0.01,
                label: 'Amplitude'
            },
            wavesSpeed: {
                value: defaultUniforms.uWavesSpeed.value,
                min: 0.1,
                max: 2.0,
                step: 0.1,
                label: 'Speed'
            },
            wavesFrequency: {
                value: defaultUniforms.uWavesFrequency.value,
                min: 0.01,
                max: 0.5,
                step: 0.01,
                label: 'Frequency'
            },
            wavesPersistence: {
                value: defaultUniforms.uWavesPersistence.value,
                min: 0.1,
                max: 0.9,
                step: 0.05,
                label: 'Persistence'
            },
            wavesLacunarity: {
                value: defaultUniforms.uWavesLacunarity.value,
                min: 1.0,
                max: 4.0,
                step: 0.1,
                label: 'Lacunarity'
            },
            wavesIterations: {
                value: defaultUniforms.uWavesIterations.value,
                min: 1,
                max: 8,
                step: 1,
                label: 'Iterations'
            },
        }),
        'Water Colors': folder({
            opacity: {
                value: defaultUniforms.uOpacity.value,
                min: 0.1,
                max: 1.0,
                step: 0.05,
                label: 'Opacity'
            },
            troughColor: {
                value: `rgb(${defaultUniforms.uTroughColor.value[0] * 255}, ${defaultUniforms.uTroughColor.value[1] * 255}, ${defaultUniforms.uTroughColor.value[2] * 255})`,
                label: 'Trough Color'
            },
            surfaceColor: {
                // value: `rgb(${defaultUniforms.uSurfaceColor.value[0] * 255}, ${defaultUniforms.uSurfaceColor.value[1] * 255}, ${defaultUniforms.uSurfaceColor.value[2] * 255})`,
                value: `rgb(${95}, ${56}, ${56})`,
                label: 'Surface Color'
            },
            peakColor: {
                value: `rgb(${defaultUniforms.uPeakColor.value[0] * 255}, ${defaultUniforms.uPeakColor.value[1] * 255}, ${defaultUniforms.uPeakColor.value[2] * 255})`,
                label: 'Peak Color'
            },
        }),
        'Thresholds': folder({
            peakThreshold: {
                value: defaultUniforms.uPeakThreshold.value,
                min: -0.2,
                max: 0.2,
                step: 0.01,
                label: 'Peak Threshold'
            },
            peakTransition: {
                value: defaultUniforms.uPeakTransition.value,
                min: 0.01,
                max: 0.1,
                step: 0.01,
                label: 'Peak Transition'
            },
            troughThreshold: {
                value: defaultUniforms.uTroughThreshold.value,
                min: -0.2,
                max: 0.2,
                step: 0.01,
                label: 'Trough Threshold'
            },
            troughTransition: {
                value: defaultUniforms.uTroughTransition.value,
                min: 0.01,
                max: 0.1,
                step: 0.01,
                label: 'Trough Transition'
            },
        }),
        'Fresnel Effect': folder({
            fresnelScale: {
                value: defaultUniforms.uFresnelScale.value,
                min: 0.1,
                max: 2.0,
                step: 0.1,
                label: 'Fresnel Scale'
            },
            fresnelPower: {
                value: defaultUniforms.uFresnelPower.value,
                min: 1.0,
                max: 5.0,
                step: 0.1,
                label: 'Fresnel Power'
            },
        }),
        'Rendering': folder({
            wireframe: {
                value: false,
                label: 'Wireframe'
            },
        }),
    });

    // Use the environment map from the scene
    useEffect(() => {
        if (scene.environment && materialRef.current) {
            // Clone the environment map to create a new texture instance
            const envMapClone = scene.environment.clone();
            materialRef.current.uniforms.uEnvironmentMap.value = envMapClone;
            materialRef.current.needsUpdate = true;
        }
    }, [scene]);

    // Helper function to convert color string to array
    const colorToArray = (colorString) => {
        const color = new Color(colorString);
        return [color.r, color.g, color.b];
    };

    // Update uniforms on each frame
    useFrame((state) => {
        if (materialRef.current) {
            // Update time uniform
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

            // Update wave uniforms
            materialRef.current.uniforms.uWavesAmplitude.value = controls.wavesAmplitude;
            materialRef.current.uniforms.uWavesSpeed.value = controls.wavesSpeed;
            materialRef.current.uniforms.uWavesFrequency.value = controls.wavesFrequency;
            materialRef.current.uniforms.uWavesPersistence.value = controls.wavesPersistence;
            materialRef.current.uniforms.uWavesLacunarity.value = controls.wavesLacunarity;
            materialRef.current.uniforms.uWavesIterations.value = controls.wavesIterations;

            // Update color uniforms
            materialRef.current.uniforms.uOpacity.value = controls.opacity;
            materialRef.current.uniforms.uTroughColor.value = colorToArray(controls.troughColor);
            materialRef.current.uniforms.uSurfaceColor.value = colorToArray(controls.surfaceColor);
            materialRef.current.uniforms.uPeakColor.value = colorToArray(controls.peakColor);

            // Update threshold uniforms
            materialRef.current.uniforms.uPeakThreshold.value = controls.peakThreshold;
            materialRef.current.uniforms.uPeakTransition.value = controls.peakTransition;
            materialRef.current.uniforms.uTroughThreshold.value = controls.troughThreshold;
            materialRef.current.uniforms.uTroughTransition.value = controls.troughTransition;

            // Update fresnel uniforms
            materialRef.current.uniforms.uFresnelScale.value = controls.fresnelScale;
            materialRef.current.uniforms.uFresnelPower.value = controls.fresnelPower;

            // Update wireframe
            materialRef.current.wireframe = controls.wireframe;
        }
    });

    return (
        <mesh rotation-x={-Math.PI / 2}>
            <planeGeometry args={[200, 200, 512, 512]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={{
                    ...defaultUniforms,
                }}
                transparent={true}
                wireframe={controls.wireframe}
            />
        </mesh>
    );
}

export default Water;