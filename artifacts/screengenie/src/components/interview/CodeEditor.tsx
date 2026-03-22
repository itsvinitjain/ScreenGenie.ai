import { useState, useRef, useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Play, Loader2, Send, ChevronDown, Terminal, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const LANGUAGES = [
  { value: "javascript", label: "JavaScript", icon: "JS", monacoLang: "javascript" },
  { value: "typescript", label: "TypeScript", icon: "TS", monacoLang: "typescript" },
  { value: "python", label: "Python", icon: "PY", monacoLang: "python" },
  { value: "java", label: "Java", icon: "JV", monacoLang: "java" },
  { value: "cpp", label: "C++", icon: "C+", monacoLang: "cpp" },
  { value: "c", label: "C", icon: "C", monacoLang: "c" },
  { value: "csharp", label: "C#", icon: "C#", monacoLang: "csharp" },
  { value: "go", label: "Go", icon: "GO", monacoLang: "go" },
  { value: "rust", label: "Rust", icon: "RS", monacoLang: "rust" },
  { value: "ruby", label: "Ruby", icon: "RB", monacoLang: "ruby" },
  { value: "php", label: "PHP", icon: "HP", monacoLang: "php" },
  { value: "swift", label: "Swift", icon: "SW", monacoLang: "swift" },
  { value: "kotlin", label: "Kotlin", icon: "KT", monacoLang: "kotlin" },
  { value: "scala", label: "Scala", icon: "SC", monacoLang: "scala" },
  { value: "perl", label: "Perl", icon: "PL", monacoLang: "perl" },
  { value: "r", label: "R", icon: "R", monacoLang: "r" },
  { value: "haskell", label: "Haskell", icon: "HS", monacoLang: "haskell" },
  { value: "lua", label: "Lua", icon: "LU", monacoLang: "lua" },
  { value: "bash", label: "Bash", icon: "SH", monacoLang: "shell" },
  { value: "sql", label: "SQL", icon: "SQ", monacoLang: "sql" },
] as const;

const DEFAULT_CODE: Record<string, string> = {
  javascript: '// Write your solution here\nconsole.log("Hello, World!");\n',
  typescript: '// Write your solution here\nconst greeting: string = "Hello, World!";\nconsole.log(greeting);\n',
  python: '# Write your solution here\nprint("Hello, World!")\n',
  java: 'public class prog {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
  csharp: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n',
  rust: 'fn main() {\n    println!("Hello, World!");\n}\n',
  ruby: '# Write your solution here\nputs "Hello, World!"\n',
  php: '<?php\necho "Hello, World!\\n";\n',
  swift: 'import Foundation\nprint("Hello, World!")\n',
  kotlin: 'fun main() {\n    println("Hello, World!")\n}\n',
  scala: 'object Main extends App {\n    println("Hello, World!")\n}\n',
  perl: '#!/usr/bin/perl\nuse strict;\nuse warnings;\nprint "Hello, World!\\n";\n',
  r: '# Write your solution here\ncat("Hello, World!\\n")\n',
  haskell: 'main :: IO ()\nmain = putStrLn "Hello, World!"\n',
  lua: '-- Write your solution here\nprint("Hello, World!")\n',
  bash: '#!/bin/bash\necho "Hello, World!"\n',
  sql: 'SELECT "Hello, World!" AS greeting;\n',
};

export interface PasteEvent {
  timestamp: string;
  pastedText: string;
  lineNumber: number;
  charLength: number;
}

interface CodeEditorProps {
  onSubmitCode?: (code: string, language: string, output: string) => void;
  disabled?: boolean;
  sessionId?: number;
  onPasteDetected?: (event: PasteEvent) => void;
}

export function CodeEditor({ onSubmitCode, disabled, sessionId, onPasteDetected }: CodeEditorProps) {
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(DEFAULT_CODE.javascript);
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const pasteDecorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const pasteEventsRef = useRef<PasteEvent[]>([]);

  const handleEditorMount: OnMount = (editorInstance, monaco) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;

    monaco.editor.defineTheme("nexus-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "569CD6" },
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
        { token: "type", foreground: "4EC9B0" },
      ],
      colors: {
        "editor.background": "#0a0a12",
        "editor.foreground": "#d4d4d4",
        "editor.lineHighlightBackground": "#ffffff08",
        "editorCursor.foreground": "#00d4ff",
        "editor.selectionBackground": "#00d4ff30",
        "editorLineNumber.foreground": "#ffffff20",
        "editorLineNumber.activeForeground": "#00d4ff80",
        "editor.inactiveSelectionBackground": "#00d4ff15",
      },
    });
    monaco.editor.setTheme("nexus-dark");

    editorInstance.addAction({
      id: "run-code",
      label: "Run Code",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => handleRunRef.current(),
    });

    pasteDecorationsRef.current = editorInstance.createDecorationsCollection([]);

    editorInstance.onDidPaste((e) => {
      const model = editorInstance.getModel();
      if (!model) return;

      const pastedText = model.getValueInRange(e.range);
      if (pastedText.trim().length < 3) return;

      const pasteEvent: PasteEvent = {
        timestamp: new Date().toISOString(),
        pastedText: pastedText.substring(0, 500),
        lineNumber: e.range.startLineNumber,
        charLength: pastedText.length,
      };

      pasteEventsRef.current.push(pasteEvent);
      onPasteDetected?.(pasteEvent);

      if (sessionId) {
        fetch(`/api/sessions/${sessionId}/proctor-event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "paste_detected",
            timestamp: pasteEvent.timestamp,
            details: `Pasted ${pastedText.length} chars at line ${e.range.startLineNumber}: "${pastedText.substring(0, 100)}${pastedText.length > 100 ? "..." : ""}"`,
          }),
        }).catch(() => {});
      }

      const currentDecorations = pasteDecorationsRef.current;
      if (currentDecorations) {
        const existing = (currentDecorations as any)._decorationIds
          ? []
          : [];
        currentDecorations.append([
          {
            range: e.range,
            options: {
              inlineClassName: "pasted-code-marker",
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            },
          },
        ]);
      }
    });
  };

  const handleRunRef = useRef(async () => {});

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguage(lang);
    setCode(DEFAULT_CODE[lang] || "");
    setStdout("");
    setStderr("");
    setExitCode(null);
    setShowLangMenu(false);
  }, []);

  const handleRun = useCallback(async () => {
    if (isRunning || disabled) return;
    setIsRunning(true);
    setStdout("");
    setStderr("");
    setExitCode(null);

    try {
      const res = await fetch("/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code }),
      });

      if (!res.ok) {
        setStderr(`Error: HTTP ${res.status}`);
        setExitCode(1);
        return;
      }

      const result = await res.json() as { stdout: string; stderr: string; exitCode: number; timedOut: boolean };
      setStdout(result.stdout || "");
      setStderr(result.stderr || "");
      setExitCode(result.exitCode);

      if (result.timedOut) {
        setStderr((prev) => (prev ? prev + "\n" : "") + "[Execution timed out]");
      }
    } catch (err) {
      setStderr(err instanceof Error ? err.message : "Unknown execution error");
      setExitCode(1);
    } finally {
      setIsRunning(false);
    }
  }, [language, code, isRunning, disabled]);

  useEffect(() => {
    handleRunRef.current = handleRun;
  }, [handleRun]);

  const handleSubmitToAI = useCallback(() => {
    if (onSubmitCode && !disabled) {
      const combinedOutput = [stdout, stderr].filter(Boolean).join("\n");
      onSubmitCode(code, language, combinedOutput);
    }
  }, [code, language, stdout, stderr, onSubmitCode, disabled]);

  const currentLang = LANGUAGES.find((l) => l.value === language);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-mono"
          >
            <span className="text-primary font-bold text-xs">{currentLang?.icon}</span>
            <span className="text-white/80">{currentLang?.label}</span>
            <ChevronDown className="w-3 h-3 text-white/40" />
          </button>

          {showLangMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
              <div className="absolute top-full left-0 mt-1 z-50 bg-[#0d0d15] border border-white/10 rounded-lg shadow-xl overflow-y-auto max-h-[320px] min-w-[160px]">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => handleLanguageChange(lang.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/10 transition-colors ${
                      language === lang.value ? "bg-primary/20 text-primary" : "text-white/70"
                    }`}
                  >
                    <span className="font-bold text-xs w-5">{lang.icon}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border-green-600/30 font-mono text-xs"
            onClick={handleRun}
            disabled={isRunning || disabled}
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {isRunning ? "Running..." : "Run"}
          </Button>

          {onSubmitCode && (
            <Button
              size="sm"
              variant="glow"
              className="h-8 gap-1.5 font-mono text-xs"
              onClick={handleSubmitToAI}
              disabled={disabled || !code.trim()}
            >
              <Send className="w-3.5 h-3.5" />
              Submit to AI
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        <Editor
          height="100%"
          language={currentLang?.monacoLang || "javascript"}
          value={code}
          onChange={(val) => setCode(val || "")}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 12 },
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontLigatures: true,
            bracketPairColorization: { enabled: true },
            readOnly: disabled,
            contextmenu: false,
            suggest: {
              showKeywords: true,
              showSnippets: true,
            },
          }}
          loading={
            <div className="flex items-center justify-center h-full text-white/30 text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading editor...
            </div>
          }
        />
      </div>

      <div
        className={`border-t border-white/10 bg-[#06060a] transition-all duration-200 ${
          outputExpanded ? "h-64" : "h-32"
        }`}
      >
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-white/40" />
            <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Output</span>
            {exitCode !== null && (
              <span
                className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                  exitCode === 0
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                exit: {exitCode}
              </span>
            )}
          </div>
          <button
            onClick={() => setOutputExpanded(!outputExpanded)}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            {outputExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="p-3 overflow-auto h-[calc(100%-32px)] text-xs font-mono leading-relaxed">
          {!stdout && !stderr ? (
            <span className="text-white/20 italic">Run your code to see output here...</span>
          ) : (
            <>
              {stdout && (
                <pre className="text-green-400/90 whitespace-pre-wrap">{stdout}</pre>
              )}
              {stderr && (
                <pre className="text-red-400/90 whitespace-pre-wrap mt-1 pt-1 border-t border-red-500/20">{stderr}</pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
