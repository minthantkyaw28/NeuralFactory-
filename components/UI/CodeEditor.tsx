import React, { useEffect, useRef } from 'react';

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  currentLine: number;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, setCode, currentLine, readOnly = false }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = code.split('\n');

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  return (
    <div className="flex h-full font-mono text-sm border border-gray-700 rounded bg-gray-950">
      {/* Line Numbers */}
      <div 
        ref={lineNumbersRef}
        className="hidden md:block w-12 bg-gray-900 text-gray-500 text-right pr-2 pt-2 select-none overflow-hidden"
      >
        {lines.map((_, i) => (
          <div 
            key={i} 
            className={`${i === currentLine ? 'text-yellow-400 bg-gray-800 font-bold' : ''}`}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Text Area */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={(e) => !readOnly && setCode(e.target.value)}
        onScroll={handleScroll}
        className={`flex-1 bg-transparent text-gray-100 p-2 resize-none focus:outline-none focus:ring-0 leading-6 ${readOnly ? 'opacity-80' : ''}`}
        spellCheck={false}
      />
    </div>
  );
};

export default CodeEditor;
