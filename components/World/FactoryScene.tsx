import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, Text } from '@react-three/drei';
import * as THREE from 'three';
import RobotArm from './Robot';
import { FactoryState } from '../../types';

interface FactorySceneProps {
  factory: FactoryState;
}

// --- SHARED MATERIALS ---
const metalMat = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.3, metalness: 0.8 });
const hazardMat = new THREE.MeshStandardMaterial({ color: "#fbbf24", roughness: 0.8 }); // Yellow
const lightMat = new THREE.MeshStandardMaterial({ color: "#22d3ee", emissive: "#22d3ee", emissiveIntensity: 2 });
const darkMat = new THREE.MeshStandardMaterial({ color: "#1e293b" });

// --- SATELLITE COMPONENT ---
const SatelliteProduct: React.FC<{ stage: number; position: [number, number, number] }> = ({ stage, position }) => {
  const group = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (group.current) {
        // Floating effect
        group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, position[0], delta * 2);
    }
  });

  return (
    <group ref={group} position={[position[0], position[1], position[2]]}>
      {/* STAGE 0: Empty Pallet */}
      <mesh position={[0, -0.6, 0]}>
        <boxGeometry args={[1.5, 0.2, 1.5]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* STAGE 1: Core Frame */}
      {stage >= 1 && (
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[1, 2, 1]} />
          <meshStandardMaterial color="#94a3b8" wireframe={stage === 1} />
        </mesh>
      )}

      {/* STAGE 2: Bus Structure (Solid) */}
      {stage >= 2 && (
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[1.1, 2.1, 1.1]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.5} />
        </mesh>
      )}

      {/* STAGE 3: Propulsion (Bottom Nozzle) */}
      {stage >= 3 && (
        <group position={[0, -0.5, 0]}>
            <mesh position={[0, -0.6, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.3, 0.6, 32]} />
                <meshStandardMaterial color="#b91c1c" />
            </mesh>
        </group>
      )}

      {/* STAGE 4: Solar Panels (Folded then Deployed) */}
      {stage >= 4 && (
        <group>
             <mesh position={[0.6, 1, 0]} rotation={[0,0, stage >= 5 ? -Math.PI/2 : -0.2]}>
                <boxGeometry args={[0.1, 1.5, 0.8]} />
                <meshStandardMaterial color="#1e3a8a" />
             </mesh>
             <mesh position={[-0.6, 1, 0]} rotation={[0,0, stage >= 5 ? Math.PI/2 : 0.2]}>
                <boxGeometry args={[0.1, 1.5, 0.8]} />
                <meshStandardMaterial color="#1e3a8a" />
             </mesh>
        </group>
      )}

      {/* STAGE 5: Thermal Shielding (Gold Foil) & Antenna */}
      {stage >= 5 && (
        <group>
           <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[1.15, 2.15, 1.15]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} envMapIntensity={2} />
           </mesh>
           <mesh position={[0, 1.6, 0]}>
              <cylinderGeometry args={[0.1, 0.5, 0.5]} />
              <meshStandardMaterial color="white" />
           </mesh>
        </group>
      )}
    </group>
  );
};

// --- STATIONS ---

// Station 1: Frame Dispenser
const StationDispenser: React.FC<{ active: boolean; x: number }> = ({ active, x }) => (
  <group position={[x, 0, -2]}>
    <mesh position={[0, 2, 0]}>
       <boxGeometry args={[2, 4, 2]} />
       <meshStandardMaterial color="#475569" />
    </mesh>
    <mesh position={[0, 3, 1]} rotation={[Math.PI/4, 0, 0]}>
       <boxGeometry args={[1.5, 1, 1]} />
       <meshStandardMaterial color={active ? "#22c55e" : "#ef4444"} emissive={active ? "#22c55e" : "#000000"} />
    </mesh>
    <Text position={[0, 4.2, 0]} fontSize={0.5} color="#334155">STATION 1</Text>
  </group>
);

// Station 2: Gantry Robot (Robot 2)
const StationGantry: React.FC<{ active: boolean; x: number }> = ({ active, x }) => {
    const gantryRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (active && gantryRef.current) {
            gantryRef.current.position.y = 2 + Math.sin(state.clock.elapsedTime * 5) * 0.5;
        }
    });
    return (
        <group position={[x, 0, 0]}>
            {/* Pillars */}
            <mesh position={[-1.5, 2.5, -1.5]}><boxGeometry args={[0.2, 5, 0.2]} /><meshStandardMaterial color="#eab308" /></mesh>
            <mesh position={[1.5, 2.5, -1.5]}><boxGeometry args={[0.2, 5, 0.2]} /><meshStandardMaterial color="#eab308" /></mesh>
            {/* Beam */}
            <mesh position={[0, 4.8, -1.5]}><boxGeometry args={[4, 0.4, 0.4]} /><meshStandardMaterial color="#334155" /></mesh>
            
            {/* Moving Head */}
            <group ref={gantryRef} position={[0, 2, 0]}>
                <mesh position={[0, 2, -1.5]}><boxGeometry args={[0.8, 0.8, 0.8]} /><meshStandardMaterial color="#f97316" /></mesh>
                <mesh position={[0, 1, -1.5]}><cylinderGeometry args={[0.1, 0.1, 2]} /><meshStandardMaterial color="#94a3b8" /></mesh>
                <mesh position={[0, 0, -1.5]}><boxGeometry args={[1, 0.1, 1]} /><meshStandardMaterial color="#1e293b" /></mesh>
            </group>
            <Text position={[0, 5.5, -1.5]} fontSize={0.5} color="#334155">STATION 2: GANTRY</Text>
        </group>
    )
}

// Station 3: 6-Axis Robot (Robot 1 - The main one we control)
const StationPropulsion: React.FC<{ factory: FactoryState; x: number }> = ({ factory, x }) => (
    <group position={[x, 0, -2.5]}>
        <RobotArm joints={factory.robot1Joints} />
        <Text position={[0, 4, 0]} fontSize={0.5} color="#334155">STATION 3: 6-AXIS</Text>
    </group>
);

// Station 4: Solar Welder (Dual Arms)
const StationWelder: React.FC<{ active: boolean; x: number }> = ({ active, x }) => {
    const group = useRef<THREE.Group>(null);
    useFrame((state) => {
        if(active && group.current) {
            group.current.rotation.y += 0.1;
        }
    });
    return (
        <group position={[x, 0, -2]}>
            <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.5, 0.8, 2]} /><meshStandardMaterial color="#0f172a" /></mesh>
            <group position={[0, 2, 0]} ref={group}>
                <mesh position={[0, 0, 0]}><boxGeometry args={[2, 0.4, 0.4]} /><meshStandardMaterial color="#f97316" /></mesh>
                <mesh position={[1, -0.5, 0]}><cylinderGeometry args={[0.1, 0.1, 1]} /><meshStandardMaterial color="#94a3b8" /></mesh>
                <mesh position={[-1, -0.5, 0]}><cylinderGeometry args={[0.1, 0.1, 1]} /><meshStandardMaterial color="#94a3b8" /></mesh>
            </group>
            <Text position={[0, 3.5, 0]} fontSize={0.5} color="#334155">STATION 4: WELD</Text>
        </group>
    )
}

// Station 5: Thermal Chamber
const StationChamber: React.FC<{ active: boolean; x: number }> = ({ active, x }) => (
    <group position={[x, 0, -2]}>
        <mesh position={[0, 1.5, 0]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[1.5, 1.5, 4, 32, 1, true]} />
            <meshStandardMaterial color="#cbd5e1" side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>
        {active && (
             <pointLight position={[0, 1.5, 0]} color="orange" intensity={2} distance={5} />
        )}
        <Text position={[0, 3.5, 0]} fontSize={0.5} color="#334155">STATION 5: VACUUM</Text>
    </group>
);

// Station 6: QA Scanner (Robot 3)
const StationScanner: React.FC<{ active: boolean; x: number }> = ({ active, x }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if(active && ref.current) {
            ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.5;
        }
    });
    return (
        <group position={[x, 0, -2]}>
            <mesh position={[0, 1, 0]}><boxGeometry args={[0.5, 2, 0.5]} /><meshStandardMaterial color="#334155" /></mesh>
            <group position={[0, 2, 0.5]} ref={ref}>
                <mesh rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 1]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
                <mesh position={[0, 0, 0.5]}><boxGeometry args={[0.5, 0.5, 0.2]} /><meshStandardMaterial color="#10b981" /></mesh>
                {active && <mesh position={[0, 0, 2]} rotation={[Math.PI/2, 0, 0]}><coneGeometry args={[0.5, 3, 32]} /><meshStandardMaterial color="#10b981" transparent opacity={0.3} /></mesh>}
            </group>
            <Text position={[0, 3.5, 0]} fontSize={0.5} color="#334155">STATION 6: QA</Text>
        </group>
    )
}

const FactoryScene: React.FC<FactorySceneProps> = ({ factory }) => {
  // Map conveyor position (0-100) to X coordinates (-15 to 15)
  // Stations at: 0 -> -12, 20 -> -7, 40 -> -2, 60 -> 3, 80 -> 8, 100 -> 13
  const conveyorToX = (pos: number) => (pos / 100) * 25 - 12.5;

  return (
    <div className="w-full h-full bg-slate-300 rounded-lg overflow-hidden shadow-2xl border border-gray-400">
      <Canvas shadows camera={{ position: [0, 10, 20], fov: 40, far: 1000 }}>
        {/* Dimmer Fog - Slate 300 to match darker background */}
        <fog attach="fog" args={['#cbd5e1', 50, 300]} />
        
        <Suspense fallback={null}>
          <Environment preset="city" />
          {/* Reduced ambient light for dimmer feel */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 5]} intensity={1} castShadow />

          <group position={[0, -2, 0]}>
            {/* CONVEYOR BELT */}
            <mesh position={[0, 0, 0]} receiveShadow>
                <boxGeometry args={[40, 0.5, 3]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
            {/* Moving Belt Texture effect */}
            <Grid position={[0, 0.26, 0]} args={[40, 3]} cellSize={0.5} cellThickness={1} cellColor="#64748b" sectionThickness={0} />

            {/* PRODUCT */}
            <SatelliteProduct stage={factory.satelliteStage} position={[conveyorToX(factory.conveyorPos), 1, 0]} />

            {/* STATIONS */}
            <StationDispenser active={factory.stations[0] === 'WORKING'} x={conveyorToX(0)} />
            <StationGantry active={factory.stations[1] === 'WORKING'} x={conveyorToX(20)} />
            <StationPropulsion factory={factory} x={conveyorToX(40)} />
            <StationWelder active={factory.stations[3] === 'WORKING'} x={conveyorToX(60)} />
            <StationChamber active={factory.stations[4] === 'WORKING'} x={conveyorToX(80)} />
            <StationScanner active={factory.stations[5] === 'WORKING'} x={conveyorToX(100)} />

            {/* FLOOR - Slightly darker gray (slate-200 equivalent) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
              <planeGeometry args={[100, 40]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
            </mesh>
            
            {/* GRID - Darker lines for contrast on dimmer floor */}
            <Grid 
              position={[0, 0, 0]} 
              args={[60, 20]} 
              cellSize={2} 
              cellColor="#94a3b8" 
              sectionColor="#64748b" 
            />

            <ContactShadows opacity={0.3} scale={50} blur={2} far={4} color="#000000" />
          </group>

        </Suspense>
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.2} target={[0, 0, 0]} />
      </Canvas>
    </div>
  );
};

export default FactoryScene;