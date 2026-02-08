import React, { Suspense, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import RobotArm from './Robot';
import { FactoryState } from '../../types';

interface FactorySceneProps {
  factory: FactoryState;
}

// --- SHARED MATERIALS ---
const metalMat = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.3, metalness: 0.8 });
const hazardMat = new THREE.MeshStandardMaterial({ color: "#fbbf24", roughness: 0.8 }); // Yellow
const floorMat = new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.6 });
const darkMetal = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.5 });

// --- DECORATIONS ---

const HazardBorder: React.FC<{ width: number; depth: number }> = ({ width, depth }) => {
  const thickness = 0.5;
  return (
    <group position={[0, 0.02, 0]}>
       {/* Top */}
       <mesh position={[0, 0, -depth/2]} rotation={[-Math.PI/2, 0, 0]}>
         <planeGeometry args={[width, thickness]} />
         <meshStandardMaterial color="#fbbf24" />
       </mesh>
       {/* Bottom */}
       <mesh position={[0, 0, depth/2]} rotation={[-Math.PI/2, 0, 0]}>
         <planeGeometry args={[width, thickness]} />
         <meshStandardMaterial color="#fbbf24" />
       </mesh>
       {/* Left */}
       <mesh position={[-width/2, 0, 0]} rotation={[-Math.PI/2, 0, Math.PI/2]}>
         <planeGeometry args={[depth, thickness]} />
         <meshStandardMaterial color="#fbbf24" />
       </mesh>
       {/* Right */}
       <mesh position={[width/2, 0, 0]} rotation={[-Math.PI/2, 0, Math.PI/2]}>
         <planeGeometry args={[depth, thickness]} />
         <meshStandardMaterial color="#fbbf24" />
       </mesh>
    </group>
  );
};

const StorageRack: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 2, 0]}>
      <boxGeometry args={[1, 4, 3]} />
      <meshStandardMaterial color="#334155" />
    </mesh>
    <mesh position={[0, 1, 0]}>
       <boxGeometry args={[1.1, 0.2, 3.1]} />
       <meshStandardMaterial color="#fbbf24" />
    </mesh>
    <mesh position={[0, 3, 0]}>
       <boxGeometry args={[1.1, 0.2, 3.1]} />
       <meshStandardMaterial color="#fbbf24" />
    </mesh>
  </group>
);

const OverheadCrane: React.FC = () => (
  <group position={[0, 8, 0]}>
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[14, 0.5, 0.5]} />
      <meshStandardMaterial color="#f59e0b" />
    </mesh>
    <mesh position={[0, -0.5, 0]}>
       <boxGeometry args={[1, 1, 1]} />
       <meshStandardMaterial color="#1e293b" />
    </mesh>
    <mesh position={[0, -2, 0]}>
       <cylinderGeometry args={[0.05, 0.05, 3]} />
       <meshStandardMaterial color="#000" />
    </mesh>
    <mesh position={[0, -3.5, 0]}>
       <torusGeometry args={[0.3, 0.05, 16, 100]} />
       <meshStandardMaterial color="#000" />
    </mesh>
  </group>
);

const FactoryUnit: React.FC<{ 
  name: string; 
  position: [number, number, number]; 
  children?: React.ReactNode 
}> = ({ name, position, children }) => {
  return (
    <group position={position}>
      {/* Unit Floor Marking */}
      <HazardBorder width={18} depth={18} />
      
      {/* Unit Label */}
      <Text 
        position={[-8, 0.2, 8]} 
        rotation={[-Math.PI/2, 0, 0]} 
        fontSize={1.2} 
        color="#64748b" 
        anchorX="left" 
        anchorY="bottom"
      >
        {name.toUpperCase()}
      </Text>

      {/* Pillars */}
      <mesh position={[-8.5, 4, -8.5]}>
         <boxGeometry args={[0.5, 8, 0.5]} />
         <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[8.5, 4, -8.5]}>
         <boxGeometry args={[0.5, 8, 0.5]} />
         <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* Decorations */}
      <OverheadCrane />
      <StorageRack position={[-7, 0, -5]} />
      <StorageRack position={[7, 0, -5]} />

      {/* Machines/Content */}
      <group position={[0, 0, 0]}>
        {children}
      </group>
    </group>
  );
};

// --- SATELLITE COMPONENT (Unchanged geometry, just positional logic updated in parent) ---
const SatelliteProduct: React.FC<{ stage: number; position: [number, number, number] }> = ({ stage, position }) => {
  const group = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (group.current) {
        group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, position[0], delta * 3);
        group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        group.current.position.z = position[2];
    }
  });

  return (
    <group ref={group} position={[position[0], position[1], position[2]]}>
      <mesh position={[0, -0.6, 0]} castShadow>
        <boxGeometry args={[2.5, 0.2, 2.5]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* STAGE 1: Core Frame */}
      {stage >= 1 && (
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[2, 4, 2]} />
          <meshStandardMaterial color="#94a3b8" wireframe={stage === 1} />
        </mesh>
      )}

      {/* STAGE 2: Bus Structure */}
      {stage >= 2 && (
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[2.1, 4.1, 2.1]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.5} />
        </mesh>
      )}

      {/* STAGE 3: Propulsion */}
      {stage >= 3 && (
        <group position={[0, -1, 0]}>
            <mesh position={[0, -1, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.6, 1.2, 32]} />
                <meshStandardMaterial color="#b91c1c" />
            </mesh>
        </group>
      )}

      {/* STAGE 4: Solar Panels */}
      {stage >= 4 && (
        <group>
             <mesh position={[1.1, 1, 0]} rotation={[0,0, stage >= 5 ? -Math.PI/2 : -0.2]}>
                <boxGeometry args={[0.2, 4, 1.5]} />
                <meshStandardMaterial color="#1e3a8a" />
             </mesh>
             <mesh position={[-1.1, 1, 0]} rotation={[0,0, stage >= 5 ? Math.PI/2 : 0.2]}>
                <boxGeometry args={[0.2, 4, 1.5]} />
                <meshStandardMaterial color="#1e3a8a" />
             </mesh>
        </group>
      )}

      {/* STAGE 5: Thermal Shielding */}
      {stage >= 5 && (
        <group>
           <mesh position={[0, 1, 0]} castShadow>
              <boxGeometry args={[2.2, 4.2, 2.2]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} envMapIntensity={2} />
           </mesh>
        </group>
      )}
    </group>
  );
};

// --- STATIONS (Scaled up for Mega Factory) ---

const StationDispenser: React.FC<{ active: boolean }> = ({ active }) => (
  <group position={[0, 0, -4]}>
    <mesh position={[0, 4, 0]}>
       <boxGeometry args={[6, 8, 6]} />
       <meshStandardMaterial color="#475569" />
    </mesh>
    <mesh position={[0, 6, 3]} rotation={[Math.PI/4, 0, 0]}>
       <boxGeometry args={[4, 2, 2]} />
       <meshStandardMaterial color={active ? "#22c55e" : "#ef4444"} emissive={active ? "#22c55e" : "#000000"} />
    </mesh>
  </group>
);

const StationGantry: React.FC<{ active: boolean }> = ({ active }) => {
    const gantryRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (active && gantryRef.current) {
            gantryRef.current.position.y = 4 + Math.sin(state.clock.elapsedTime * 3) * 1;
        }
    });
    return (
        <group position={[0, 0, 0]}>
            <mesh position={[-4, 5, 0]}><boxGeometry args={[1, 10, 1]} /><meshStandardMaterial color="#eab308" /></mesh>
            <mesh position={[4, 5, 0]}><boxGeometry args={[1, 10, 1]} /><meshStandardMaterial color="#eab308" /></mesh>
            <mesh position={[0, 9, 0]}><boxGeometry args={[10, 1, 1]} /><meshStandardMaterial color="#334155" /></mesh>
            <group ref={gantryRef} position={[0, 4, 0]}>
                <mesh position={[0, 2, 0]}><boxGeometry args={[2, 2, 2]} /><meshStandardMaterial color="#f97316" /></mesh>
                <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 4]} /><meshStandardMaterial color="#94a3b8" /></mesh>
            </group>
        </group>
    )
}

const StationPropulsion: React.FC<{ factory: FactoryState }> = ({ factory }) => (
    <group position={[0, 0, -5]}>
        {/* Scale up the robot for the mega factory view */}
        <group scale={2}>
            <RobotArm joints={factory.robot1Joints} />
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
            <mesh position={[0, 2, 0]}><cylinderGeometry args={[1, 2, 4]} /><meshStandardMaterial color="#0f172a" /></mesh>
            <group position={[0, 4, 0]} ref={group}>
                <mesh position={[0, 0, 0]}><boxGeometry args={[6, 1, 1]} /><meshStandardMaterial color="#f97316" /></mesh>
                <mesh position={[2.5, -2, 0]}><cylinderGeometry args={[0.2, 0.2, 4]} /><meshStandardMaterial color="#94a3b8" /></mesh>
                <mesh position={[-2.5, -2, 0]}><cylinderGeometry args={[0.2, 0.2, 4]} /><meshStandardMaterial color="#94a3b8" /></mesh>
            </group>
        </group>
    )
}

const StationChamber: React.FC<{ active: boolean }> = ({ active }) => (
    <group position={[0, 0, -4]}>
        <mesh position={[0, 3, 0]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[3, 3, 8, 32]} />
            <meshStandardMaterial color="#cbd5e1" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 3, 0]} rotation={[0, 0, Math.PI/2]}>
             <cylinderGeometry args={[2.5, 2.5, 7.8, 32]} />
             <meshStandardMaterial color="#000" /> 
        </mesh>
        {active && <pointLight position={[0, 3, 0]} color="orange" intensity={5} distance={10} />}
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
            <mesh position={[0, 3, 0]}><boxGeometry args={[1, 6, 1]} /><meshStandardMaterial color="#334155" /></mesh>
            <group position={[0, 5, 0]} ref={ref}>
                <mesh rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.5, 0.5, 2]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
                <mesh position={[2, 0, 0]}><boxGeometry args={[1, 2, 1]} /><meshStandardMaterial color="#10b981" /></mesh>
                {active && <mesh position={[2, -3, 0]}><coneGeometry args={[1, 6, 32]} /><meshStandardMaterial color="#10b981" transparent opacity={0.2} /></mesh>}
            </group>
        </group>
    )
}

const ShippingDock: React.FC = () => (
    <group position={[0, 0, -2]}>
        <mesh position={[3, 2, -2]}><boxGeometry args={[4, 4, 8]} /><meshStandardMaterial color="#854d0e" /></mesh>
        <mesh position={[-3, 2, -4]}><boxGeometry args={[4, 4, 4]} /><meshStandardMaterial color="#854d0e" /></mesh>
        <Text position={[0, 4, 2]} color="white" fontSize={1} rotation={[0, Math.PI, 0]}>LOGISTICS</Text>
    </group>
)

const FactoryScene: React.FC<FactorySceneProps> = ({ factory }) => {
  // --- LAYOUT CONSTANTS ---
  // Unit Width = 20 (including gaps). 7 Units.
  // Center positions for units:
  // Unit 1: -75
  // Unit 2: -50
  // Unit 3: -25
  // Unit 4: 0
  // Unit 5: 25
  // Unit 6: 50
  // Unit 7: 75
  
  // Mapping ConveyorPos (0-100) to World X
  // 0 -> Unit 1 (-75)
  // 20 -> Unit 2 (-50)
  // 40 -> Unit 3 (-25)
  // 60 -> Unit 4 (0)
  // 80 -> Unit 5 (25)
  // 100 -> Unit 6 (50)
  // (Extrapolate to 120 -> Unit 7 (75))
  
  const mapPosToX = (pos: number) => {
      // Linear interpolation: y = mx + c
      // (0, -75), (100, 50)
      // m = (50 - (-75)) / 100 = 1.25
      // y = 1.25 * pos - 75
      return (pos * 1.25) - 75;
  };

  const productX = mapPosToX(factory.conveyorPos);

  return (
    <div className="w-full h-full bg-slate-300 rounded-lg overflow-hidden shadow-2xl border border-gray-400">
      <Canvas shadows camera={{ position: [0, 60, 80], fov: 35, far: 2000 }}>
        {/* Dimmer Fog - matches bg */}
        <fog attach="fog" args={['#cbd5e1', 80, 400]} />
        
        <Suspense fallback={null}>
          <Environment preset="city" />
          <ambientLight intensity={0.4} />
          <directionalLight position={[20, 50, 20]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />

          <group position={[0, -2, 0]}>
            
            {/* --- MEGA FACTORY FLOOR --- */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
              <planeGeometry args={[300, 100]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
            </mesh>
            <Grid position={[0, 0.05, 0]} args={[300, 100]} cellSize={5} cellColor="#94a3b8" sectionColor="#64748b" />

            {/* --- MAIN CONVEYOR BELT --- */}
            <mesh position={[0, 0, 0]} receiveShadow>
                <boxGeometry args={[200, 0.5, 4]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
            {/* Moving Belt Lines */}
            <Grid position={[0, 0.26, 0]} args={[200, 4]} cellSize={2} cellThickness={1} cellColor="#64748b" sectionThickness={0} />


            {/* --- UNIT 1: FRAME FABRICATION --- */}
            <FactoryUnit name="Unit 1: Frame Fabrication" position={[-75, 0, 0]}>
                <StationDispenser active={factory.stations[0] === 'WORKING'} />
            </FactoryUnit>

            {/* --- UNIT 2: STRUCTURAL ASSEMBLY --- */}
            <FactoryUnit name="Unit 2: Structural Assembly" position={[-50, 0, 0]}>
                <StationGantry active={factory.stations[1] === 'WORKING'} />
            </FactoryUnit>

            {/* --- UNIT 3: AVIONICS INTEGRATION --- */}
            <FactoryUnit name="Unit 3: Avionics Integration" position={[-25, 0, 0]}>
                <StationPropulsion factory={factory} />
            </FactoryUnit>

            {/* --- UNIT 4: PAYLOAD INSTALLATION --- */}
            <FactoryUnit name="Unit 4: Payload Installation" position={[0, 0, 0]}>
                <StationWelder active={factory.stations[3] === 'WORKING'} />
            </FactoryUnit>

            {/* --- UNIT 5: THERMAL VACUUM --- */}
            <FactoryUnit name="Unit 5: Thermal Vacuum Testing" position={[25, 0, 0]}>
                <StationChamber active={factory.stations[4] === 'WORKING'} />
            </FactoryUnit>

            {/* --- UNIT 6: QUALITY INSPECTION --- */}
            <FactoryUnit name="Unit 6: Quality Inspection" position={[50, 0, 0]}>
                <StationScanner active={factory.stations[5] === 'WORKING'} />
            </FactoryUnit>

            {/* --- UNIT 7: SHIPPING --- */}
            <FactoryUnit name="Unit 7: Packaging & Shipping" position={[75, 0, 0]}>
                <ShippingDock />
            </FactoryUnit>

            {/* --- PRODUCT --- */}
            {/* Floating smoothly along the entire mega-line */}
            <SatelliteProduct stage={factory.satelliteStage} position={[productX, 2, 0]} />

            <ContactShadows opacity={0.4} scale={200} blur={2} far={4} color="#000000" />
          </group>

        </Suspense>
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.2} target={[0, 0, 0]} maxDistance={150} />
      </Canvas>
    </div>
  );
};

export default FactoryScene;