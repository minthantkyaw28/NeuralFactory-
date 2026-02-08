import React, { Suspense, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, Text, Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import RobotArm from './Robot';
import { FactoryState, LineState } from '../../types';

interface FactorySceneProps {
  factory: FactoryState;
}

// --- SHARED MATERIALS ---
const floorMat = new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.6 });
const darkMetal = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.5 });
const concreteMat = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.9 });

// --- DECORATIONS ---

const HazardBorder: React.FC<{ width: number; depth: number }> = ({ width, depth }) => {
  const thickness = 1.2; 
  const hazardMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: "#fbbf24",  // Amber 400
    emissive: "#fbbf24",
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.5
  }), []);

  return (
    <group position={[0, 0.02, 0]}>
       {/* Top */}
       <mesh position={[0, 0, -depth/2]} rotation={[-Math.PI/2, 0, 0]}>
         <planeGeometry args={[width, thickness]} />
         <primitive object={hazardMaterial} />
       </mesh>
       {/* Bottom */}
       <mesh position={[0, 0, depth/2]} rotation={[-Math.PI/2, 0, 0]}>
         <planeGeometry args={[width, thickness]} />
         <primitive object={hazardMaterial} />
       </mesh>
       {/* Left */}
       <mesh position={[-width/2, 0, 0]} rotation={[-Math.PI/2, 0, Math.PI/2]}>
         <planeGeometry args={[depth, thickness]} />
         <primitive object={hazardMaterial} />
       </mesh>
       {/* Right */}
       <mesh position={[width/2, 0, 0]} rotation={[-Math.PI/2, 0, Math.PI/2]}>
         <planeGeometry args={[depth, thickness]} />
         <primitive object={hazardMaterial} />
       </mesh>
    </group>
  );
};

const FactoryWalls: React.FC = () => {
  return (
    <group>
      {/* Back Wall (Upper Side) - Moved to -2500 (Half of 5000 Z) */}
      <mesh position={[0, 2500, -2500]} receiveShadow>
        <boxGeometry args={[9500, 5000, 50]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} /> {/* Darker wall for contrast */}
      </mesh>
      {/* Wall Panel Details */}
      <Grid position={[0, 2500, -2450]} args={[9000, 5000]} rotation={[Math.PI/2, 0, 0]} cellSize={100} cellColor="#334155" sectionColor="#475569" infiniteGrid={false} />
    </group>
  );
};

const ConveyorBelt: React.FC = () => {
    return (
        <group position={[0, 0, 6]}>
            {/* Main Belt Surface - Darker, Stronger Texture */}
            <mesh position={[0, 0, 0]} receiveShadow>
                <boxGeometry args={[320, 0.4, 4]} />
                <meshStandardMaterial color="#475569" roughness={0.7} />
            </mesh>
            
            <Grid position={[0, 0.21, 0]} args={[320, 4]} cellSize={2} cellThickness={1.5} cellColor="#94a3b8" sectionThickness={0} />

            {/* Side Rails - Black Metal */}
            <mesh position={[0, 0.1, 2.2]}>
                <boxGeometry args={[320, 0.6, 0.4]} />
                <meshStandardMaterial color="#020617" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.1, -2.2]}>
                <boxGeometry args={[320, 0.6, 0.4]} />
                <meshStandardMaterial color="#020617" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Support Legs */}
            {[-100, -50, 0, 50, 100].map((x, i) => (
                <group key={i} position={[x, -2, 0]}>
                    <mesh position={[0, 0, 2]}>
                        <cylinderGeometry args={[0.2, 0.2, 4]} />
                        <meshStandardMaterial color="#1e293b" />
                    </mesh>
                     <mesh position={[0, 0, -2]}>
                        <cylinderGeometry args={[0.2, 0.2, 4]} />
                        <meshStandardMaterial color="#1e293b" />
                    </mesh>
                </group>
            ))}
        </group>
    );
};

const OverheadCrane: React.FC = () => (
  <group position={[0, 12, 0]}>
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[16, 1, 1]} />
      <meshStandardMaterial color="#f59e0b" metalness={0.7} roughness={0.2} />
    </mesh>
    <mesh position={[0, -1, 0]}>
       <boxGeometry args={[2, 1.5, 2]} />
       <meshStandardMaterial color="#0f172a" />
    </mesh>
    <mesh position={[0, -4, 0]}>
       <cylinderGeometry args={[0.1, 0.1, 6]} />
       <meshStandardMaterial color="#000" />
    </mesh>
    <mesh position={[0, -6.5, 0]}>
       <torusGeometry args={[0.6, 0.1, 16, 100]} />
       <meshStandardMaterial color="#000" />
    </mesh>
  </group>
);

const HumanoidRobot: React.FC<{
  color: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  behavior: 'IDLE' | 'PATROL';
  patrolRange?: { start: number; end: number; zOffset: number };
  variant: 'HEAVY' | 'SCOUT' | 'ENGINEER';
}> = ({ color, position, rotation = [0, 0, 0], behavior, patrolRange, variant }) => {
  const group = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.Group>(null);
  
  // Random offset to de-sync animations
  const offset = useMemo(() => Math.random() * 100, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime + offset;
    
    if (behavior === 'PATROL' && patrolRange && group.current) {
       const patrolSpeed = variant === 'SCOUT' ? 0.6 : 0.4;
       const range = patrolRange.end - patrolRange.start;
       // 0..1 progress
       const progress = (Math.sin(t * patrolSpeed) + 1) / 2;
       
       const currentX = patrolRange.start + (progress * range);
       group.current.position.x = currentX;
       group.current.position.z = patrolRange.zOffset; 

       const dir = Math.cos(t * patrolSpeed);
       group.current.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;

       // Walking Animation
       const limbSpeed = variant === 'SCOUT' ? 12 : 8;
       if(leftLeg.current) leftLeg.current.rotation.x = Math.sin(t * limbSpeed) * 0.6;
       if(rightLeg.current) rightLeg.current.rotation.x = -Math.sin(t * limbSpeed) * 0.6;
       if(leftArm.current) leftArm.current.rotation.x = -Math.sin(t * limbSpeed) * 0.6;
       if(rightArm.current) rightArm.current.rotation.x = Math.sin(t * limbSpeed) * 0.6;

    } else if (behavior === 'IDLE') {
       if(leftArm.current) leftArm.current.rotation.z = Math.sin(t * 2) * 0.05 + 0.1;
       if(rightArm.current) rightArm.current.rotation.z = -Math.sin(t * 2) * 0.05 - 0.1;
       if(group.current) group.current.rotation.y = rotation[1] + Math.sin(t * 0.5) * 0.1;
       
       // Head scanning
       if(head.current && variant === 'SCOUT') {
           head.current.rotation.y = Math.sin(t * 1.5) * 0.5;
       }
    }
  });

  // Scale Logic: Robots are now ~50% (2/4) the size of the machines (approx 6-7 units high)
  // Base geometry height is ~2.0 units. 
  // Scale 3.5 = ~7 units high
  // Scale 2.5 = ~5 units high
  const baseScale = variant === 'HEAVY' ? 3.5 : variant === 'SCOUT' ? 2.5 : 3.0;

  return (
    <group ref={group} position={position} rotation={rotation} scale={baseScale}>
       {/* --- Floating UI Label (Robot) - Original Larger Style --- */}
       <Html position={[0, 2.5, 0]} center>
          <div className="pointer-events-none select-none flex flex-col items-center">
            <div className="bg-gray-900/85 backdrop-blur-sm border border-gray-600 px-2 py-1 rounded shadow-xl mb-1 transform transition-transform hover:scale-110">
               <div className="text-[10px] font-bold text-white font-mono tracking-wider flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_5px_currentColor]" style={{ backgroundColor: color, color: color }} />
                 {variant}
               </div>
            </div>
            {/* Simple connector line to robot head */}
            <div className="w-px h-3 bg-gradient-to-b from-gray-600 to-transparent"></div>
          </div>
       </Html>

       {/* --- BODY --- */}
       <mesh position={[0, 1.2, 0]} castShadow>
         {variant === 'HEAVY' 
            ? <boxGeometry args={[0.8, 0.9, 0.5]} /> // Bulky chest
            : <boxGeometry args={[0.5, 0.8, 0.3]} /> // Standard/Slim chest
         }
         <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
       </mesh>

       {/* --- HEAVY VARIANT EXTRAS --- */}
       {variant === 'HEAVY' && (
         <group>
            {/* Shoulder Pads */}
            <mesh position={[-0.5, 1.6, 0]}>
                <boxGeometry args={[0.3, 0.3, 0.4]} />
                <meshStandardMaterial color="#fcd34d" metalness={0.5} />
            </mesh>
            <mesh position={[0.5, 1.6, 0]}>
                <boxGeometry args={[0.3, 0.3, 0.4]} />
                <meshStandardMaterial color="#fcd34d" metalness={0.5} />
            </mesh>
            {/* Backpack Power Unit */}
            <mesh position={[0, 1.3, -0.35]}>
                <boxGeometry args={[0.5, 0.6, 0.3]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
         </group>
       )}

       {/* --- SCOUT VARIANT EXTRAS --- */}
       {variant === 'SCOUT' && (
         <group>
            {/* Antenna */}
            <mesh position={[0.15, 2.1, -0.1]}>
                <cylinderGeometry args={[0.02, 0.02, 0.6]} />
                <meshStandardMaterial color="#94a3b8" />
            </mesh>
            {/* Jetpack/Sensor pack */}
            <mesh position={[0, 1.4, -0.2]}>
                <boxGeometry args={[0.3, 0.4, 0.15]} />
                <meshStandardMaterial color="#e2e8f0" />
            </mesh>
         </group>
       )}

       {/* --- HEAD --- */}
       <group ref={head} position={[0, variant === 'HEAVY' ? 1.85 : 1.8, 0]}>
          <mesh castShadow>
            {variant === 'SCOUT' 
                ? <boxGeometry args={[0.25, 0.25, 0.3]} /> // Slim head
                : <boxGeometry args={[0.3, 0.3, 0.3]} />   // Normal/Heavy head
            }
            <meshStandardMaterial color="#0f172a" roughness={0.5} />
          </mesh>
          {/* Eyes/Visor */}
          <mesh position={[0, 0, variant === 'SCOUT' ? 0.16 : 0.16]}>
            <planeGeometry args={[0.2, variant === 'SCOUT' ? 0.05 : 0.1]} />
            <meshStandardMaterial 
                color={variant === 'SCOUT' ? "#10b981" : "#00f0ff"} 
                emissive={variant === 'SCOUT' ? "#10b981" : "#00f0ff"} 
                emissiveIntensity={1} 
            />
          </mesh>
       </group>

       {/* --- ARMS --- */}
       <group position={[0, 0, 0]}>
           {/* Offset arms for heavy variant */}
           <mesh ref={leftArm} position={[-0.35 - (variant === 'HEAVY' ? 0.15 : 0), 1.4, 0]} castShadow>
              <boxGeometry args={[variant === 'HEAVY' ? 0.2 : 0.15, 0.7, variant === 'HEAVY' ? 0.2 : 0.15]} />
              <meshStandardMaterial color={color} />
           </mesh>
           <mesh ref={rightArm} position={[0.35 + (variant === 'HEAVY' ? 0.15 : 0), 1.4, 0]} castShadow>
              <boxGeometry args={[variant === 'HEAVY' ? 0.2 : 0.15, 0.7, variant === 'HEAVY' ? 0.2 : 0.15]} />
              <meshStandardMaterial color={color} />
           </mesh>
       </group>

       {/* --- LEGS --- */}
       <group position={[0, 0.8, 0]}>
          <mesh ref={leftLeg} position={[-0.15, -0.4, 0]} castShadow>
             <boxGeometry args={[0.18, 0.8, 0.18]} />
             <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh ref={rightLeg} position={[0.15, -0.4, 0]} castShadow>
             <boxGeometry args={[0.18, 0.8, 0.18]} />
             <meshStandardMaterial color="#334155" />
          </mesh>
       </group>
    </group>
  );
};

const FactoryUnit: React.FC<{ 
  name: string; 
  position: [number, number, number]; 
  status?: string;
  children?: React.ReactNode 
}> = ({ name, position, status, children }) => {
  return (
    <group position={position}>
      {/* --- Machine Status Dialog --- */}
      {status && (
         <Html position={[0, 18, 0]} center distanceFactor={100} zIndexRange={[100, 0]}>
            <div className="flex flex-col items-center pointer-events-none">
                <div className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-md shadow-2xl transition-all duration-500
                    ${status === 'WORKING' 
                        ? 'bg-blue-950/80 border-blue-500/50 scale-110 shadow-blue-900/20' 
                        : 'bg-gray-900/60 border-gray-700/50 opacity-60 scale-90'}
                `}>
                    {status === 'WORKING' && (
                        <div className="absolute -inset-1 bg-blue-500/20 blur-lg rounded-full animate-pulse" />
                    )}
                    
                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'WORKING' ? 'bg-blue-400 animate-ping' : 'bg-gray-500'}`} />
                    <span className={`text-[10px] font-black tracking-[0.2em] ${status === 'WORKING' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {status}
                    </span>
                </div>
                {status === 'WORKING' && (
                     <div className="mt-1 w-12 h-0.5 bg-gray-800 rounded overflow-hidden">
                         <div className="h-full bg-blue-500 w-full animate-pulse" />
                     </div>
                )}
                 <div className="w-px h-8 bg-gradient-to-b from-gray-500/20 to-transparent mt-1" />
            </div>
         </Html>
       )}

      {/* Unit Floor Marking */}
      <HazardBorder width={18} depth={18} />
      
      {/* Unit Label */}
      <Text 
        position={[8.5, 0.2, 12]} 
        rotation={[-Math.PI/2, 0, 0]} 
        fontSize={2.5} 
        fontWeight={900}
        color="#ffffff" 
        anchorX="left" 
        anchorY="bottom"
        outlineWidth={0.08}
        outlineColor="#000000"
      >
        {name.toUpperCase()}
      </Text>

      {/* Pillars - Darker and more metallic */}
      <mesh position={[-8.5, 6, -8.5]}>
         <boxGeometry args={[1, 12, 1]} />
         <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[8.5, 6, -8.5]}>
         <boxGeometry args={[1, 12, 1]} />
         <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Decorations */}
      <OverheadCrane />

      {/* Machines/Content */}
      <group position={[0, 0, 0]}>
        {children}
      </group>
    </group>
  );
};

// --- SATELLITE COMPONENT ---
const SatelliteProduct: React.FC<{ stage: number; position: [number, number, number] }> = ({ stage, position }) => {
  const group = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (group.current) {
        group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, position[0], delta * 3);
        group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        group.current.position.z = position[2];

        // Add slow idle rotation to showcase specular highlights (shininess)
        if (stage >= 2) {
             group.current.rotation.y += delta * 0.2;
             group.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.05;
        } else {
             // Reset rotation for stage 0/1 to keep it stable during build
             group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, 0, delta * 2);
             group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0, delta * 2);
        }
    }
  });

  return (
    <group ref={group} position={[position[0], position[1], position[2]]}>
      {/* Base Platform - Metallic and Techy */}
      <mesh position={[0, -0.6, 0]} castShadow>
        <boxGeometry args={[2.5, 0.2, 2.5]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* STAGE 1: Core Frame - High Contrast Wireframe Neon */}
      {stage >= 1 && (
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[2, 4, 2]} />
          <meshStandardMaterial 
            color="#38bdf8" 
            wireframe={stage === 1} 
            emissive="#0ea5e9" 
            emissiveIntensity={stage === 1 ? 0.8 : 0.1} 
            transparent={stage === 1}
            opacity={0.8}
          />
        </mesh>
      )}

      {/* STAGE 2: Bus Structure - High Polished Chrome/Aluminum */}
      {stage >= 2 && (
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[2.1, 4.1, 2.1]} />
          <meshStandardMaterial 
            color="#f8fafc" 
            metalness={1.0} 
            roughness={0.1} 
            envMapIntensity={2.5}
          />
        </mesh>
      )}

      {/* STAGE 3: Propulsion - Glowing Plasma Engine */}
      {stage >= 3 && (
        <group position={[0, -1, 0]}>
            <mesh position={[0, -1, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.8, 1.4, 32]} />
                <meshStandardMaterial 
                    color="#ef4444" 
                    emissive="#f87171" 
                    emissiveIntensity={2.0} 
                    toneMapped={false}
                />
            </mesh>
            <pointLight position={[0, -1.5, 0]} color="#ef4444" intensity={5} distance={5} />
        </group>
      )}

      {/* STAGE 4: Solar Panels - Photovoltaic Glass */}
      {stage >= 4 && (
        <group>
             <mesh position={[1.1, 1, 0]} rotation={[0,0, stage >= 5 ? -Math.PI/2 : -0.2]}>
                <boxGeometry args={[0.2, 4, 1.5]} />
                <meshStandardMaterial 
                    color="#1e40af" 
                    metalness={0.9} 
                    roughness={0.0} 
                    emissive="#172554"
                    emissiveIntensity={0.2}
                />
             </mesh>
             <mesh position={[-1.1, 1, 0]} rotation={[0,0, stage >= 5 ? Math.PI/2 : 0.2]}>
                <boxGeometry args={[0.2, 4, 1.5]} />
                <meshStandardMaterial 
                    color="#1e40af" 
                    metalness={0.9} 
                    roughness={0.0} 
                    emissive="#172554"
                    emissiveIntensity={0.2}
                />
             </mesh>
        </group>
      )}

      {/* STAGE 5: Thermal Shielding - High Gloss Gold Foil */}
      {stage >= 5 && (
        <group>
           <mesh position={[0, 1, 0]} castShadow>
              <boxGeometry args={[2.2, 4.2, 2.2]} />
              <meshStandardMaterial 
                color="#fbbf24" 
                metalness={1.0} 
                roughness={0.05} 
                envMapIntensity={4.0} 
                normalScale={new THREE.Vector2(0.2, 0.2)}
              />
           </mesh>
        </group>
      )}
    </group>
  );
};

// --- STATIONS ---

const StationDispenser: React.FC<{ active: boolean }> = ({ active }) => (
  <group position={[0, 0, -4]}>
    <mesh position={[0, 6, 0]}>
       <boxGeometry args={[10, 12, 8]} />
       <meshStandardMaterial color="#2563eb" roughness={0.3} metalness={0.5} />
    </mesh>
    <mesh position={[0, 9, 4.5]} rotation={[Math.PI/4, 0, 0]}>
       <boxGeometry args={[6, 3, 3]} />
       <meshStandardMaterial color={active ? "#22c55e" : "#ef4444"} emissive={active ? "#22c55e" : "#7f1d1d"} emissiveIntensity={0.8} />
    </mesh>
  </group>
);

const StationGantry: React.FC<{ active: boolean }> = ({ active }) => {
    const gantryRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (active && gantryRef.current) {
            gantryRef.current.position.y = 6 + Math.sin(state.clock.elapsedTime * 3) * 1.5;
        }
    });
    return (
        <group position={[0, 0, 0]}>
            <mesh position={[-7, 7, 0]}><boxGeometry args={[1.5, 14, 1.5]} /><meshStandardMaterial color="#facc15" metalness={0.6} roughness={0.3} /></mesh>
            <mesh position={[7, 7, 0]}><boxGeometry args={[1.5, 14, 1.5]} /><meshStandardMaterial color="#facc15" metalness={0.6} roughness={0.3} /></mesh>
            <mesh position={[0, 13, 0]}><boxGeometry args={[16, 1.5, 1.5]} /><meshStandardMaterial color="#020617" roughness={0.3} /></mesh>
            <group ref={gantryRef} position={[0, 6, 0]}>
                <mesh position={[0, 3, 0]}><boxGeometry args={[3, 3, 3]} /><meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.2} /></mesh>
                <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.3, 0.3, 6]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} /></mesh>
            </group>
        </group>
    )
}

const StationPropulsion: React.FC<{ lineState: LineState }> = ({ lineState }) => (
    <group position={[0, 0, -5]}>
        <mesh position={[0, 0.5, 0]}>
           <cylinderGeometry args={[4, 5, 1, 32]} />
           <meshStandardMaterial color="#4f46e5" metalness={0.5} />
        </mesh>
        <group scale={3.5} position={[0, 1, 0]}>
            <RobotArm joints={lineState.robot1Joints} />
        </group>
    </group>
);

const StationWelder: React.FC<{ active: boolean }> = ({ active }) => {
    const group = useRef<THREE.Group>(null);
    useFrame((state) => {
        if(active && group.current) {
            group.current.rotation.y += 0.05;
        }
    });
    return (
        <group position={[0, 0, -4]}>
            <mesh position={[0, 3, 0]}><cylinderGeometry args={[2, 3, 6, 32]} /><meshStandardMaterial color="#dc2626" metalness={0.6} roughness={0.3} /></mesh>
            <group position={[0, 6, 0]} ref={group}>
                <mesh position={[0, 0, 0]}><boxGeometry args={[10, 1.5, 1.5]} /><meshStandardMaterial color="#ea580c" /></mesh>
                <mesh position={[4, -3, 0]}><cylinderGeometry args={[0.3, 0.3, 6]} /><meshStandardMaterial color="#cbd5e1" metalness={0.9} /></mesh>
                <mesh position={[-4, -3, 0]}><cylinderGeometry args={[0.3, 0.3, 6]} /><meshStandardMaterial color="#cbd5e1" metalness={0.9} /></mesh>
            </group>
        </group>
    )
}

const StationChamber: React.FC<{ active: boolean }> = ({ active }) => (
    <group position={[0, 0, -4]}>
        <mesh position={[0, 5, 0]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[5, 5, 14, 32]} />
            <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.15} side={THREE.DoubleSide} /> {/* Copper/Gold finish */}
        </mesh>
        <mesh position={[0, 5, 0]} rotation={[0, 0, Math.PI/2]}>
             <cylinderGeometry args={[4.2, 4.2, 13.8, 32]} />
             <meshStandardMaterial color="#0f172a" /> 
        </mesh>
        <mesh position={[-6, 1, 0]}><boxGeometry args={[2, 2, 8]} /><meshStandardMaterial color="#334155" /></mesh>
        <mesh position={[6, 1, 0]}><boxGeometry args={[2, 2, 8]} /><meshStandardMaterial color="#334155" /></mesh>
        {active && <pointLight position={[0, 5, 0]} color="#f59e0b" intensity={20} distance={30} />}
    </group>
);

const StationScanner: React.FC<{ active: boolean }> = ({ active }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if(active && ref.current) {
            ref.current.rotation.y = state.clock.elapsedTime;
        }
    });
    return (
        <group position={[0, 0, -4]}>
            <mesh position={[0, 5, 0]}><boxGeometry args={[2, 10, 2]} /><meshStandardMaterial color="#0891b2" metalness={0.4} /></mesh>
            <group position={[0, 8, 0]} ref={ref}>
                <mesh rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.8, 0.8, 4]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
                <mesh position={[3, 0, 0]}><boxGeometry args={[2, 3, 2]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.2} /></mesh>
                {active && <mesh position={[3, -4, 0]}><coneGeometry args={[2, 8, 32]} /><meshStandardMaterial color="#22c55e" transparent opacity={0.3} /></mesh>}
            </group>
        </group>
    )
}

const ShippingDock: React.FC = () => (
    <group position={[0, 0, -2]}>
        <mesh position={[3, 3, -2]}><boxGeometry args={[6, 6, 10]} /><meshStandardMaterial color="#b91c1c" roughness={0.3} /></mesh>
        <mesh position={[-3, 3, -4]}><boxGeometry args={[6, 6, 6]} /><meshStandardMaterial color="#1e3a8a" roughness={0.3} /></mesh>
        <Text position={[0, 7, 2]} color="white" fontSize={1.5} rotation={[0, Math.PI, 0]} outlineWidth={0.05} outlineColor="#000">LOGISTICS</Text>
    </group>
);

// --- COMPONENT FOR A SINGLE PRODUCTION LINE ---
const ProductionLine: React.FC<{ lineState: LineState, position: [number, number, number], labelSuffix: string }> = ({ lineState, position, labelSuffix }) => {
  const mapPosToX = (pos: number) => {
      return (pos * 2.0) - 120;
  };

  const productX = mapPosToX(lineState.conveyorPos);

  // Scaled 27x (Increased from 25x)
  return (
    <group position={position} scale={27}>
       {/* --- MAIN CONVEYOR BELT --- */}
       <ConveyorBelt />

        {/* --- UNIT 1: FRAME FABRICATION --- */}
        <FactoryUnit name={`Line ${labelSuffix} - Frame`} position={[-120, 0, 0]} status={lineState.stations[0]}>
            <StationDispenser active={lineState.stations[0] === 'WORKING'} />
        </FactoryUnit>

        {/* --- UNIT 2: STRUCTURAL ASSEMBLY --- */}
        <FactoryUnit name={`Line ${labelSuffix} - Structure`} position={[-80, 0, 0]} status={lineState.stations[1]}>
            <StationGantry active={lineState.stations[1] === 'WORKING'} />
        </FactoryUnit>

        {/* --- UNIT 3: AVIONICS INTEGRATION --- */}
        <FactoryUnit name={`Line ${labelSuffix} - Avionics`} position={[-40, 0, 0]} status={lineState.stations[2]}>
            <StationPropulsion lineState={lineState} />
        </FactoryUnit>

        {/* --- UNIT 4: PAYLOAD INSTALLATION --- */}
        <FactoryUnit name={`Line ${labelSuffix} - Payload`} position={[0, 0, 0]} status={lineState.stations[3]}>
            <StationWelder active={lineState.stations[3] === 'WORKING'} />
        </FactoryUnit>

        {/* --- UNIT 5: THERMAL VACUUM --- */}
        <FactoryUnit name={`Line ${labelSuffix} - TVAC`} position={[40, 0, 0]} status={lineState.stations[4]}>
            <StationChamber active={lineState.stations[4] === 'WORKING'} />
        </FactoryUnit>

        {/* --- UNIT 6: QUALITY INSPECTION --- */}
        <FactoryUnit name={`Line ${labelSuffix} - QA`} position={[80, 0, 0]} status={lineState.stations[5]}>
            <StationScanner active={lineState.stations[5] === 'WORKING'} />
        </FactoryUnit>

        {/* --- UNIT 7: SHIPPING --- */}
        <FactoryUnit name={`Line ${labelSuffix} - Shipping`} position={[120, 0, 0]} status="READY">
            <ShippingDock />
        </FactoryUnit>

        {/* --- PRODUCT --- */}
        <SatelliteProduct stage={lineState.satelliteStage} position={[productX, 2, 6]} />
        
        {/* --- ROBOT STAFF --- */}
        {/* Stationary 1: Heavy Duty Security - Positioned clear of Frame Fab (Moved further out to Z=20 for larger size) */}
        <HumanoidRobot 
          variant="HEAVY"
          color="#f97316" // Orange
          position={[-90, 0, 20]} 
          rotation={[0, Math.PI, 0]} // Looking at line
          behavior="IDLE" 
        />
        {/* Stationary 2: Engineer inspecting Chamber - Positioned clear of TVAC (Moved further out to Z=-20) */}
        <HumanoidRobot 
          variant="ENGINEER"
          color="#0ea5e9" // Sky Blue
          position={[50, 0, -20]} 
          rotation={[0, 0, 0]} // Looking at line
          behavior="IDLE" 
        />
        {/* Walker 1: Agile Scout - Patrolling Left Side (Z=22 clear path) */}
        <HumanoidRobot 
          variant="SCOUT"
          color="#eab308" // Yellow
          position={[0, 0, 22]} 
          behavior="PATROL"
          patrolRange={{ start: -100, end: 0, zOffset: 22 }}
        />
        {/* Walker 2: Engineer - Patrolling Right Side (Z=-22 clear path) */}
        <HumanoidRobot 
          variant="ENGINEER"
          color="#84cc16" // Lime
          position={[0, 0, -22]} 
          behavior="PATROL"
          patrolRange={{ start: 20, end: 100, zOffset: -22 }}
        />
    </group>
  );
};

const CameraRig: React.FC<{ factory: FactoryState, controlsRef: React.RefObject<any> }> = ({ factory, controlsRef }) => {
  const { camera } = useThree();
  const prevConveyorPos = useRef(0);
  const isFollowing = useRef(false);

  useFrame((state, delta) => {
    const line = factory.lines[1];
    const currentPos = line.conveyorPos;
    
    // Map 0..100 -> World X
    const getWorldX = (pos: number) => ((pos * 2.0) - 120) * 27;
    
    const targetX = getWorldX(currentPos);
    const prevTargetX = getWorldX(prevConveyorPos.current);
    const moveDelta = targetX - prevTargetX;

    if (controlsRef.current) {
       // CASE 1: RESET (Conveyor is 0)
       if (currentPos === 0) {
           isFollowing.current = false;
           // Gentle lerp back to wide shot if we aren't there
           const wideTarget = new THREE.Vector3(0, 0, 0);
           const widePos = new THREE.Vector3(0, 3500, 6000);
           
           controlsRef.current.target.lerp(wideTarget, delta * 2);
           camera.position.lerp(widePos, delta * 2);
       } 
       // CASE 2: JUST STARTED (Transition to 30-degree view)
       else if (currentPos > 0 && !isFollowing.current) {
           isFollowing.current = true;
           
           // Set the initial "Cinema" angle (30 degrees)
           // Target: Satellite + Y offset
           // Camera: Target + Z offset + Y elevation
           const initialTarget = new THREE.Vector3(targetX, 200, 0);
           const initialCamPos = new THREE.Vector3(targetX, 1200, 1732); // 30 deg elevation

           controlsRef.current.target.copy(initialTarget);
           camera.position.copy(initialCamPos);
       }
       // CASE 3: FOLLOWING (Apply Delta)
       else if (isFollowing.current) {
           // Move target to new satellite position
           controlsRef.current.target.x = targetX;
           
           // Move camera by the exact same amount the satellite moved.
           // This preserves the user's manual zoom/orbit/rotation relative to the satellite.
           camera.position.x += moveDelta;
       }
       
       controlsRef.current.update();
    }

    prevConveyorPos.current = currentPos;
  });

  return null;
}

const FactoryScene: React.FC<FactorySceneProps> = ({ factory }) => {
  const controlsRef = useRef<any>(null);

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden shadow-2xl border border-gray-700">
      {/* Camera adapted for Scale 20 */}
      <Canvas shadows camera={{ position: [0, 3500, 6000], fov: 60, far: 20000 }}>
        <CameraRig factory={factory} controlsRef={controlsRef} />
        {/* Fog matched to new scale */}
        <fog attach="fog" args={['#0f172a', 3000, 12000]} />
        
        <Suspense fallback={null}>
          <Environment preset="warehouse" />
          
          <ambientLight intensity={4.0} color="#ffffff" />
          <hemisphereLight intensity={3.0} color="#ffffff" groundColor="#334155" />
          
          <directionalLight position={[500, 3000, 500]} intensity={6.0} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} />

          {/* --- SPOTLIGHTS (Scaled Down) --- */}
          {/* Spacing lines 1500 apart */}
          <spotLight position={[0, 3000, -1500]} angle={1.0} penumbra={1} intensity={4000000} color="#ffffff" distance={8000} castShadow />
          <spotLight position={[0, 3000, 0]} angle={1.0} penumbra={1} intensity={4000000} color="#ffffff" distance={8000} castShadow />
          <spotLight position={[0, 3000, 1500]} angle={1.0} penumbra={1} intensity={4000000} color="#ffffff" distance={8000} castShadow />

          <group position={[0, -200, 0]}>
            
            {/* --- FLOOR (9000x5000) --- */}
            {/* Maintains the "long floor" look for scale 20 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
              <planeGeometry args={[9000, 5000]} />
              <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
            </mesh>
            <Grid position={[0, 0.05, 0]} args={[9000, 5000]} cellSize={200} cellColor="#334155" sectionColor="#475569" />

            {/* --- WALLS (Scaled Down) --- */}
            <FactoryWalls />

            {/* --- PRODUCTION LINES (Scale 25) --- */}
            {/* Spaced 1500 apart. */}
            <ProductionLine lineState={factory.lines[0]} position={[0, 0, -1500]} labelSuffix="A" />
            <ProductionLine lineState={factory.lines[1]} position={[0, 0, 0]} labelSuffix="B" />
            <ProductionLine lineState={factory.lines[2]} position={[0, 0, 1500]} labelSuffix="C" />

            <ContactShadows opacity={0.6} scale={9000} blur={5} far={200} color="#000000" />
          </group>

        </Suspense>
        <OrbitControls ref={controlsRef} makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.2} target={[0, 0, 0]} maxDistance={10000} />
      </Canvas>
    </div>
  );
};

export default FactoryScene;