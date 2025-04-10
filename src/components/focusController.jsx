import { useThree, useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'

function FocusController({ targetRef, dofControls }) {
    const { camera } = useThree()
    const currentFocus = useRef(dofControls.focusDistance)

    // This effect is for debugging the focus target position
    useEffect(() => {
        if (targetRef.current) {
            console.log("Current Focus Target Position: ", targetRef.current)
        }
    }, [targetRef])

    useFrame(() => {
        if (!targetRef.current || !camera) return

        // Calculate distance and normalize
        const distance = camera.position.distanceTo(targetRef.current)
        const normalized = Math.min(1, Math.max(0, distance / 100))

        // Smooth interpolation
        currentFocus.current += (normalized - currentFocus.current) * 0.05

        // Update DOF controls
        dofControls.focusDistance = currentFocus.current
    })

    return null
}

export default FocusController
