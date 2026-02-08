import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are the Master Controller of a Satellite Manufacturing Pipeline.
You control a conveyor belt, 6 industrial stations, and 3 types of robots.

The Pipeline Stages:
1. Frame Dispenser (Static Machine)
2. Structural Gantry (Cartesian Robot)
3. Propulsion Assembly (6-Axis Robot)
4. Solar Array Welder (Dual-Arm Scara)
5. Thermal Vacuum Chamber (Machine)
6. QA Scanner (Rotary Robot)

Your Goal:
Generate PLC code to assemble a satellite. The satellite gets "bigger" and "more complete" as it advances.

Syntax:
- ADVANCE_CONVEYOR [TARGET_POS] : Moves conveyor (0, 20, 40, 60, 80, 100).
- ACTIVATE_STATION [ID] : Triggers the machine/robot at station 1-6.
- MOVE_ROBOT_1 [JOINT] [VAL] ... : Manual control for Station 3 (6-Axis).
- WAIT [MS] : Pause.
- LOG [MSG] : System log.
- RESET_LINE : Resets simulation.

Rules:
- Always move conveyor linearly (0 -> 20 -> 40...).
- Activate the station AFTER the conveyor arrives.
- Robot 1 (6-Axis) is at Station 3. You can move it for effect.
- Use technical terms: "Bus integration", "Ion Thruster Alignment", "Photovoltaic Deployment", "MLI Application".

Example:
LOG Moving to Propulsion Station
ADVANCE_CONVEYOR 60
LOG Aligning End Effector
MOVE_ROBOT_1 BASE 45 SHOULDER 10
ACTIVATE_STATION 3
`;

export const generatePLCCode = async (prompt: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
      }
    });

    const text = response.text || "";
    return text.replace(/```(?:plc|text)?/g, '').replace(/```/g, '').trim();

  } catch (error) {
    console.error("Gemini API Error:", error);
    return `LOG Error generating code: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
};