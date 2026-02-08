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

  // Aerospace / Cleanroom Theme
  const materialColor = "#ffffff"; // Clean White
  const accentColor = "#2563eb";   // Aerospace Blue
  const metalColor = "#94a3b8";    // Aluminum/Silver

  return (
    <group position={[0, 0, 0]}>
      {/* Base Pedestal (Fixed) */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[1, 1.2, 0.5, 32]} />
        <meshStandardMaterial color={metalColor} roughness={0.3} metalness={0.8} />
      </mesh>

      {/* J1: Base Rotation (Y-Axis) */}
      <group ref={baseRef} position={[0, 0.5, 0]}>
        {/* Turret */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.8, 0.8, 1, 32]} />
          <meshStandardMaterial color={materialColor} roughness={0.5} />
        </mesh>
        {/* Branding Stripe */}
        <mesh position={[0, 0.5, 0.81]} rotation={[0,0,0]}>
          <planeGeometry args={[0.5, 0.2]} />
          <meshStandardMaterial color={accentColor} />
        </mesh>

        {/* J2: Shoulder (Z-Axis) */}
        <group ref={shoulderRef} position={[0, 0.8, 0]}>
          {/* Shoulder Joint Visual */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 1.25, 32]} />
            <meshStandardMaterial color={accentColor} roughness={0.4} />
          </mesh>

          {/* Upper Arm */}
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.6, 3, 0.6]} />
            <meshStandardMaterial color={materialColor} />
          </mesh>
          <mesh position={[0.31, 1.5, 0]}>
             <planeGeometry args={[0.1, 2]} />
             <meshStandardMaterial color="#e5e7eb" />
          </mesh>

          {/* J3: Elbow (Z-Axis) */}
          <group ref={elbowRef} position={[0, 2.8, 0]}>
             {/* Elbow Joint Visual */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 1.1, 32]} />
              <meshStandardMaterial color={accentColor} roughness={0.4} />
            </mesh>

            {/* Forearm */}
            <mesh position={[0.5, 1.0, 0]} rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.5, 2.5, 0.5]} />
              <meshStandardMaterial color={materialColor} />
            </mesh>

            {/* J4: Wrist Pitch (Z-Axis relative to forearm) */}
            <group ref={wristPitchRef} position={[1.4, 1.9, 0]} rotation={[0, 0, -Math.PI/4]}>
               <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.3, 0.3, 0.8, 16]} />
                  <meshStandardMaterial color={metalColor} />
               </mesh>

               {/* Wrist Link */}
               <mesh position={[0, 0.4, 0]}>
                 <boxGeometry args={[0.4, 0.8, 0.4]} />
                 <meshStandardMaterial color={materialColor} />
               </mesh>

               {/* J5: Wrist Roll (Y-Axis) */}
               <group ref={wristRollRef} position={[0, 0.8, 0]}>
                 {/* Flange */}
                 <mesh position={[0, 0.1, 0]}>
                    <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
                    <meshStandardMaterial color="#64748b" metalness={0.6} />
                 </mesh>

                 {/* Precision Gripper Mechanism */}
                 <group position={[0, 0.2, 0]}>
                    <mesh position={[0, 0.2, 0]}>
                       <boxGeometry args={[0.6, 0.1, 0.2]} />
                       <meshStandardMaterial color="#1f2937" />
                    </mesh>

                    {/* Fingers (Rubber tipped for satellite parts) */}
                    <mesh position={[-0.25 + (joints.gripper/100)*0.05, 0.5, 0]}>
                       <boxGeometry args={[0.05, 0.6, 0.15]} />
                       <meshStandardMaterial color="#374151" />
                    </mesh>
                    <mesh position={[-0.25 + (joints.gripper/100)*0.05, 0.75, 0]}>
                       <boxGeometry args={[0.06, 0.1, 0.16]} />
                       <meshStandardMaterial color="#blue" /> 
                    </mesh>

                    <mesh position={[0.25 - (joints.gripper/100)*0.05, 0.5, 0]}>
                       <boxGeometry args={[0.05, 0.6, 0.15]} />
                       <meshStandardMaterial color="#374151" />
                    </mesh>
                    <mesh position={[0.25 - (joints.gripper/100)*0.05, 0.75, 0]}>
                       <boxGeometry args={[0.06, 0.1, 0.16]} />
                       <meshStandardMaterial color="#blue" /> 
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