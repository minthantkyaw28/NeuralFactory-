import React from 'react';

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

// State for a single production line
export interface LineState {
  conveyorPos: number; // 0 to 100
  satelliteStage: number; // 0 to 5
  // Station Status: 'IDLE' | 'WORKING' | 'DONE'
  stations: ('IDLE' | 'WORKING' | 'DONE')[]; 
  robot1Joints: RobotJoints; // 6-Axis (Propulsion)
}

// Global Factory State
export interface FactoryState {
  lines: LineState[]; // Array of lines (we will have 3)
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

export const INITIAL_LINE_STATE: LineState = {
  conveyorPos: 0,
  satelliteStage: 0,
  stations: ['IDLE', 'IDLE', 'IDLE', 'IDLE', 'IDLE', 'IDLE'],
  robot1Joints: INITIAL_JOINTS,
};

export const INITIAL_FACTORY: FactoryState = {
  // Create 3 identical lines
  lines: [
    { ...INITIAL_LINE_STATE },
    { ...INITIAL_LINE_STATE },
    { ...INITIAL_LINE_STATE }
  ]
};

export const INITIAL_CODE = `// MASS PRODUCTION CONTROLLER
// Controls 3 Parallel Lines simultaneously

LOG Starting Mass Production Cycle
WAIT 500

LOG [ALL LINES] Dispensing Frames
ACTIVATE_STATION 1
WAIT 1000
ADVANCE_CONVEYOR 20

LOG [ALL LINES] Gantry: Mounting Buses
ACTIVATE_STATION 2
WAIT 1500
ADVANCE_CONVEYOR 40

LOG [ALL LINES] 6-Axis: Propulsion Install
MOVE_ROBOT_1 BASE 90 SHOULDER 0 ELBOW 45
WAIT 500
ACTIVATE_STATION 3
WAIT 1000
MOVE_ROBOT_1 BASE 0
ADVANCE_CONVEYOR 60

LOG [ALL LINES] Auto-Welder: Solar Arrays
ACTIVATE_STATION 4
WAIT 1000
ADVANCE_CONVEYOR 80

LOG [ALL LINES] Chamber: Thermal Testing
ACTIVATE_STATION 5
WAIT 1500
ADVANCE_CONVEYOR 100

LOG [ALL LINES] Scanner: Final QA
ACTIVATE_STATION 6
WAIT 1000

LOG Batch Complete. Resetting Facility.
WAIT 1000
RESET_LINE
`;