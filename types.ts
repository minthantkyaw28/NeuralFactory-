export enum SimulationState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR'
}

export interface RobotJoints {
  base: number;     
  shoulder: number; 
  elbow: number;    
  wristPitch: number; 
  wristRoll: number;  
  gripper: number;  
}

// Global Factory State
export interface FactoryState {
  conveyorPos: number; // 0 to 100
  satelliteStage: number; // 0 to 5
  // Station Status: 'IDLE' | 'WORKING' | 'DONE'
  stations: ('IDLE' | 'WORKING' | 'DONE')[]; 
  robot1Joints: RobotJoints; // 6-Axis (Propulsion)
  robot2Position: { x: number, z: number, grab: number }; // Gantry (Structure)
  robot3Angle: number; // Scanner (QA)
}

export interface SimulationContextType {
  factory: FactoryState;
  setFactory: React.Dispatch<React.SetStateAction<FactoryState>>;
  code: string;
  setCode: (code: string) => void;
  status: SimulationState;
  setStatus: (status: SimulationState) => void;
  currentLine: number;
  logs: string[];
  addLog: (msg: string) => void;
}

export const INITIAL_JOINTS: RobotJoints = {
  base: 0, shoulder: -20, elbow: 45, wristPitch: -25, wristRoll: 0, gripper: 0
};

export const INITIAL_FACTORY: FactoryState = {
  conveyorPos: 0,
  satelliteStage: 0,
  stations: ['IDLE', 'IDLE', 'IDLE', 'IDLE', 'IDLE', 'IDLE'],
  robot1Joints: INITIAL_JOINTS,
  robot2Position: { x: 0, z: 0, grab: 0 },
  robot3Angle: 0
};

export const INITIAL_CODE = `// SATELLITE PRODUCTION LINE V1
// Sequence: Frame -> Gantry -> 6-Axis -> Panels -> Thermal -> QA

LOG Starting Production Cycle
WAIT 500

LOG [STATION 1] Dispensing Core Frame
ACTIVATE_STATION 1
WAIT 1000
ADVANCE_CONVEYOR 20

LOG [STATION 2] Gantry: Mounting Bus
ACTIVATE_STATION 2
WAIT 1500
ADVANCE_CONVEYOR 40

LOG [STATION 3] 6-Axis: Installing Propulsion
MOVE_ROBOT_1 BASE 90 SHOULDER 0 ELBOW 45
WAIT 500
ACTIVATE_STATION 3
WAIT 1000
MOVE_ROBOT_1 BASE 0
ADVANCE_CONVEYOR 60

LOG [STATION 4] Auto-Welder: Solar Arrays
ACTIVATE_STATION 4
WAIT 1000
ADVANCE_CONVEYOR 80

LOG [STATION 5] Chamber: Thermal Shielding
ACTIVATE_STATION 5
WAIT 1500
ADVANCE_CONVEYOR 100

LOG [STATION 6] Scanner: Final QA
ACTIVATE_STATION 6
WAIT 1000

LOG Production Complete. Resetting Line.
WAIT 1000
RESET_LINE
`;