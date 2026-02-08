import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Square, RefreshCw, Cpu, MessageSquare, Terminal, AlertCircle, Satellite, Factory } from 'lucide-react';
import FactoryScene from './components/World/FactoryScene';
import CodeEditor from './components/UI/CodeEditor';
import { generatePLCCode } from './services/geminiService';
import { FactoryState, SimulationState, INITIAL_FACTORY, INITIAL_CODE, RobotJoints } from './types';

const App: React.FC = () => {
  // --- State ---
  const [factory, setFactory] = useState<FactoryState>(INITIAL_FACTORY);
  const [code, setCode] = useState<string>(INITIAL_CODE);
  const [status, setStatus] = useState<SimulationState>(SimulationState.IDLE);
  const [currentLine, setCurrentLine] = useState<number>(-1);
  const [logs, setLogs] = useState<string[]>(["OrbitSim Manufacturing Pipeline Initialized."]);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  
  // Refs
  const codeLinesRef = useRef<string[]>([]);
  const currentLineRef = useRef<number>(-1);
  const statusRef = useRef<SimulationState>(SimulationState.IDLE);
  const factoryRef = useRef<FactoryState>(INITIAL_FACTORY);

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { factoryRef.current = factory; }, [factory]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  };

  // --- Parser ---
  const parseLine = (line: string): { type: 'CMD' | 'COMMENT' | 'EMPTY', duration?: number, action?: () => void } => {
    const trimmed = line.trim().toUpperCase();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return { type: 'COMMENT' };

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];

    // Logging
    if (cmd === 'LOG') {
      const msg = line.substring(3).trim();
      return { type: 'CMD', duration: 50, action: () => addLog(msg) };
    }

    // Waiting
    if (cmd === 'WAIT') {
      const ms = parseInt(parts[1], 10);
      return { type: 'CMD', duration: isNaN(ms) ? 500 : ms };
    }

    // Pipeline: Reset
    if (cmd === 'RESET_LINE') {
      return { 
        type: 'CMD', 
        duration: 1000, 
        action: () => setFactory(INITIAL_FACTORY) 
      };
    }

    // Pipeline: Move Conveyor
    if (cmd === 'ADVANCE_CONVEYOR') {
      const targetPos = parseInt(parts[1], 10) || 0;
      return {
        type: 'CMD',
        duration: 2000, // Takes time to move
        action: () => setFactory(prev => ({ ...prev, conveyorPos: targetPos }))
      };
    }

    // Pipeline: Activate Station (and upgrade satellite)
    if (cmd === 'ACTIVATE_STATION') {
      const id = parseInt(parts[1], 10);
      return {
        type: 'CMD',
        duration: 2000, // Station work time
        action: () => {
          setFactory(prev => {
            const newStations = [...prev.stations];
            if (id >= 1 && id <= 6) newStations[id-1] = 'WORKING';
            
            // Logic to upgrade satellite based on station
            let newStage = prev.satelliteStage;
            // Upgrade logic: must be at station to upgrade
            // Simple logic for simulation:
            if (id === 1 && prev.conveyorPos <= 10) newStage = 1;
            if (id === 2 && prev.conveyorPos >= 10 && prev.conveyorPos <= 30) newStage = 2;
            if (id === 3 && prev.conveyorPos >= 30 && prev.conveyorPos <= 50) newStage = 3;
            if (id === 4 && prev.conveyorPos >= 50 && prev.conveyorPos <= 70) newStage = 4;
            if (id === 5 && prev.conveyorPos >= 70 && prev.conveyorPos <= 90) newStage = 5;

            return { ...prev, stations: newStations, satelliteStage: newStage };
          });

          // Turn off station after duration (handled by separate timeout in effect or just toggle here for simplicity? 
          // For simplicity, we just set working, then a subsequent logic could set idle, but for this viz, 
          // we'll just leave it 'WORKING' for the duration of the step, then 'DONE' implicitly by next moves)
          setTimeout(() => {
             setFactory(prev => {
                 const newStations = [...prev.stations];
                 if (id >= 1 && id <= 6) newStations[id-1] = 'IDLE';
                 return { ...prev, stations: newStations };
             })
          }, 1900);
        }
      };
    }

    // Pipeline: Manual Robot 1 Move
    if (cmd === 'MOVE_ROBOT_1') {
      const updates: Partial<RobotJoints> = {};
      for (let i = 1; i < parts.length; i += 2) {
        const joint = parts[i];
        const val = parseFloat(parts[i + 1]);
        if (!isNaN(val)) {
          if (joint === 'BASE') updates.base = val;
          if (joint === 'SHOULDER') updates.shoulder = val;
          if (joint === 'ELBOW') updates.elbow = val;
          if (joint === 'WRIST_PITCH') updates.wristPitch = val;
          if (joint === 'WRIST_ROLL') updates.wristRoll = val;
        }
      }
      return {
        type: 'CMD',
        duration: 1000,
        action: () => setFactory(prev => ({ ...prev, robot1Joints: { ...prev.robot1Joints, ...updates } }))
      };
    }

    return { type: 'EMPTY' };
  };

  // Execution Loop
  const executeStep = useCallback(async () => {
    if (statusRef.current !== SimulationState.RUNNING) return;

    const lineIdx = currentLineRef.current + 1;
    if (lineIdx >= codeLinesRef.current.length) {
      setStatus(SimulationState.IDLE);
      addLog("Program Complete.");
      setCurrentLine(-1);
      return;
    }

    setCurrentLine(lineIdx);
    currentLineRef.current = lineIdx;
    
    const line = codeLinesRef.current[lineIdx];
    const instruction = parseLine(line);

    if (instruction.action) {
      instruction.action();
    }

    if (instruction.type === 'CMD') {
      await new Promise(resolve => setTimeout(resolve, instruction.duration || 100));
    } else {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    requestAnimationFrame(executeStep);
  }, []);

  const handleRun = () => {
    if (status === SimulationState.RUNNING) return;
    
    codeLinesRef.current = code.split('\n');
    currentLineRef.current = -1;
    setStatus(SimulationState.RUNNING);
    addLog("Starting Production Run...");
    setTimeout(executeStep, 100);
  };

  const handleStop = () => {
    setStatus(SimulationState.IDLE);
    setCurrentLine(-1);
    addLog("Production Halted.");
  };

  const handleReset = () => {
    handleStop();
    setFactory(INITIAL_FACTORY);
    addLog("Factory Reset.");
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    addLog("AI: Optimizing Pipeline...");
    const generated = await generatePLCCode(aiPrompt);
    setCode(generated);
    addLog("AI: Schedule Generated.");
    setIsAiLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800 shadow-lg">
        <div className="flex items-center gap-3">
          <Factory className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">OrbitSim <span className="text-blue-500">Ultimate</span></h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Advanced Manufacturing Simulation</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
            <div className="flex gap-4 text-xs font-mono text-gray-400">
                <div className="flex flex-col items-center">
                    <span className="text-gray-600">THROUGHPUT</span>
                    <span className="text-green-400">1 UNIT/HR</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-gray-600">YIELD</span>
                    <span className="text-blue-400">99.8%</span>
                </div>
            </div>
            <div className={`flex items-center gap-2 text-sm px-4 py-1.5 rounded-full border ${
                status === SimulationState.RUNNING ? 'bg-green-950/30 text-green-400 border-green-800' : 'bg-gray-800 text-gray-400 border-gray-700'
            }`}>
                <div className={`w-2 h-2 rounded-full ${status === SimulationState.RUNNING ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                {status}
            </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANEL */}
        <div className="w-[400px] flex flex-col border-r border-gray-800 bg-gray-900/50 backdrop-blur-sm z-10">
          
          {/* AI Input */}
          <div className="p-4 border-b border-gray-800">
             <div className="flex items-center justify-between text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
               <div className="flex items-center gap-2"><Cpu className="w-3 h-3"/> Pipeline Controller</div>
               {process.env.API_KEY ? <span className="text-green-500">AI ACTIVE</span> : <span className="text-red-500">OFFLINE</span>}
             </div>
             <div className="relative">
                <textarea 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAiGenerate())}
                    placeholder="Describe production sequence (e.g. 'Build a satellite with extra QA testing')" 
                    className="w-full h-24 bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none placeholder-gray-600 transition-all"
                />
                <button 
                    onClick={handleAiGenerate}
                    disabled={isAiLoading || !process.env.API_KEY}
                    className="absolute bottom-3 right-3 bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-md transition-colors disabled:opacity-50"
                >
                    <MessageSquare className="w-4 h-4" />
                </button>
             </div>
          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col min-h-0 bg-gray-950">
            <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex justify-between items-center text-[10px] text-gray-500 uppercase font-mono">
              <span>main_sequence.plc</span>
              <span>L{code.split('\n').length}</span>
            </div>
            <div className="flex-1 relative">
              <CodeEditor code={code} setCode={setCode} currentLine={currentLine} readOnly={status === SimulationState.RUNNING} />
            </div>
          </div>

        </div>

        {/* RIGHT PANEL (SCENE) */}
        <div className="flex-1 flex flex-col relative bg-gray-950">
          
          {/* Overlay Stats */}
          <div className="absolute top-6 left-6 z-10 flex gap-2">
            <button onClick={handleRun} disabled={status === SimulationState.RUNNING} className="p-3 bg-green-600 hover:bg-green-500 disabled:opacity-30 disabled:grayscale rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95">
                <Play className="w-6 h-6 fill-current text-white" />
            </button>
            <button onClick={handleStop} disabled={status === SimulationState.IDLE} className="p-3 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:grayscale rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95">
                <Square className="w-6 h-6 fill-current text-white" />
            </button>
            <button onClick={handleReset} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95">
                <RefreshCw className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* 3D Canvas */}
          <div className="flex-1 min-h-0">
             <FactoryScene factory={factory} />
          </div>

          {/* Bottom Logs */}
          <div className="h-40 border-t border-gray-800 bg-gray-900/80 backdrop-blur flex flex-col">
             <div className="px-4 py-2 border-b border-gray-800 text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-2">
                <Terminal className="w-3 h-3" /> Production Log
             </div>
             <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5">
                {logs.map((log, i) => (
                    <div key={i} className="text-gray-400 border-l-2 border-gray-700 pl-3">
                        <span className="text-gray-600 mr-2">{log.substring(1, 10)}</span>
                        {log.substring(12)}
                    </div>
                ))}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;