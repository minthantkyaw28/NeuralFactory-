import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';
import { RobotJoints } from '../../types';

interface RobotProps {
  joints: RobotJoints;
}

const RobotArm: React.FC<RobotProps> = ({ joints }) => {
  // Refs for direct manipulation if needed, but we use declarative props mostly
  const baseRef = useRef<Group>(null);
  const shoulderRef = useRef<Group>(null);
  const elbowRef = useRef<Group>(null);
  const wristPitchRef = useRef<Group>(null);
  const wristRollRef = useRef<Group>(null);

  // Convert degrees to radians
  const degToRad = (deg: number) => deg * (Math.PI / 180);

  // Smooth interpolation for visual fidelity
  useFrame((state, delta) => {
    const speed = 4 * delta; // Animation speed factor

    if (baseRef.current) {
      baseRef.current.rotation.y += (degToRad(joints.base) - baseRef.current.rotation.y) * speed;
    }
    if (shoulderRef.current) {
      shoulderRef.current.rotation.z += (degToRad(joints.shoulder) - shoulderRef.current.rotation.z) * speed;
    }
    if (elbowRef.current) {
      elbowRef.current.rotation.z += (degToRad(joints.elbow) - elbowRef.current.rotation.z) * speed;
    }
    if (wristPitchRef.current) {
      wristPitchRef.current.rotation.z += (degToRad(joints.wristPitch) - wristPitchRef.current.rotation.z) * speed;
    }
    if (wristRollRef.current) {
      wristRollRef.current.rotation.y += (degToRad(joints.wristRoll) - wristRollRef.current.rotation.y) * speed;
    }
  });

  // Bolder Industrial Theme
  const materialColor = "#f1f5f9"; // Bright White / Slate 100
  const accentColor = "#ea580c";   // High-Vis Orange
  const metalColor = "#1e293b";    // Dark Gunmetal

  return (
    <group position={[0, 0, 0]}>
      {/* Base Pedestal (Fixed) */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[1, 1.2, 0.5, 32]} />
        <meshStandardMaterial color={metalColor} roughness={0.4} metalness={0.8} />
      </mesh>

      {/* J1: Base Rotation (Y-Axis) */}
      <group ref={baseRef} position={[0, 0.5, 0]}>
        {/* Turret */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.8, 0.8, 1, 32]} />
          <meshStandardMaterial color={materialColor} roughness={0.3} metalness={0.2} />
        </mesh>
        {/* Branding Stripe */}
        <mesh position={[0, 0.5, 0.81]} rotation={[0,0,0]}>
          <planeGeometry args={[0.5, 0.8]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.2} />
        </mesh>

        {/* J2: Shoulder (Z-Axis) */}
        <group ref={shoulderRef} position={[0, 0.8, 0]}>
          {/* Shoulder Joint Visual */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 1.3, 32]} />
            <meshStandardMaterial color={metalColor} roughness={0.3} metalness={0.9} />
          </mesh>

          {/* Upper Arm */}
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.7, 3, 0.7]} />
            <meshStandardMaterial color={materialColor} roughness={0.2} />
          </mesh>
          <mesh position={[0.36, 1.5, 0]}>
             <planeGeometry args={[0.1, 2.5]} />
             <meshStandardMaterial color={metalColor} />
          </mesh>

          {/* J3: Elbow (Z-Axis) */}
          <group ref={elbowRef} position={[0, 2.8, 0]}>
             {/* Elbow Joint Visual */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.5, 0.5, 1.2, 32]} />
              <meshStandardMaterial color={accentColor} roughness={0.3} metalness={0.5} />
            </mesh>

            {/* Forearm */}
            <mesh position={[0.5, 1.0, 0]} rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.6, 2.5, 0.6]} />
              <meshStandardMaterial color={materialColor} roughness={0.2} />
            </mesh>

            {/* J4: Wrist Pitch (Z-Axis relative to forearm) */}
            <group ref={wristPitchRef} position={[1.4, 1.9, 0]} rotation={[0, 0, -Math.PI/4]}>
               <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.35, 0.35, 0.9, 16]} />
                  <meshStandardMaterial color={metalColor} metalness={0.8} />
               </mesh>

               {/* Wrist Link */}
               <mesh position={[0, 0.4, 0]}>
                 <boxGeometry args={[0.45, 0.8, 0.45]} />
                 <meshStandardMaterial color={materialColor} />
               </mesh>

               {/* J5: Wrist Roll (Y-Axis) */}
               <group ref={wristRollRef} position={[0, 0.8, 0]}>
                 {/* Flange */}
                 <mesh position={[0, 0.1, 0]}>
                    <cylinderGeometry args={[0.4, 0.4, 0.2, 16]} />
                    <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
                 </mesh>

                 {/* Precision Gripper Mechanism */}
                 <group position={[0, 0.2, 0]}>
                    <mesh position={[0, 0.2, 0]}>
                       <boxGeometry args={[0.7, 0.15, 0.3]} />
                       <meshStandardMaterial color="#0f172a" />
                    </mesh>

                    {/* Fingers (Rubber tipped for satellite parts) */}
                    <mesh position={[-0.25 + (joints.gripper/100)*0.05, 0.5, 0]}>
                       <boxGeometry args={[0.08, 0.6, 0.2]} />
                       <meshStandardMaterial color="#334155" metalness={0.7} />
                    </mesh>
                    <mesh position={[-0.25 + (joints.gripper/100)*0.05, 0.75, 0]}>
                       <boxGeometry args={[0.09, 0.1, 0.21]} />
                       <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.5} /> 
                    </mesh>

                    <mesh position={[0.25 - (joints.gripper/100)*0.05, 0.5, 0]}>
                       <boxGeometry args={[0.08, 0.6, 0.2]} />
                       <meshStandardMaterial color="#334155" metalness={0.7} />
                    </mesh>
                    <mesh position={[0.25 - (joints.gripper/100)*0.05, 0.75, 0]}>
                       <boxGeometry args={[0.09, 0.1, 0.21]} />
                       <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.5} /> 
                    </mesh>
                 </group>
               </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

export default RobotArm;