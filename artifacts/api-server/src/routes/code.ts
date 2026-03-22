import { Router, type IRouter } from "express";

const router: IRouter = Router();

const WANDBOX_API = "https://wandbox.org/api/compile.json";

const LANGUAGE_MAP: Record<string, { compiler: string; displayVersion: string }> = {
  javascript: { compiler: "nodejs-20.17.0", displayVersion: "20.17.0" },
  typescript: { compiler: "typescript-5.6.2", displayVersion: "5.6.2" },
  python: { compiler: "cpython-3.12.7", displayVersion: "3.12.7" },
  java: { compiler: "openjdk-jdk-22+36", displayVersion: "22" },
  cpp: { compiler: "gcc-13.2.0", displayVersion: "13.2.0 (g++)" },
  c: { compiler: "gcc-13.2.0-c", displayVersion: "13.2.0 (gcc)" },
  csharp: { compiler: "mono-6.12.0.200", displayVersion: "6.12 (Mono)" },
  go: { compiler: "go-1.23.2", displayVersion: "1.23.2" },
  rust: { compiler: "rust-1.82.0", displayVersion: "1.82.0" },
  ruby: { compiler: "ruby-3.3.5", displayVersion: "3.3.5" },
  php: { compiler: "php-8.3.12", displayVersion: "8.3.12" },
  swift: { compiler: "swift-5.10.1", displayVersion: "5.10.1" },
  kotlin: { compiler: "kotlin-2.0.21", displayVersion: "2.0.21" },
  scala: { compiler: "scala-3.5.1", displayVersion: "3.5.1" },
  perl: { compiler: "perl-5.40.0", displayVersion: "5.40.0" },
  r: { compiler: "r-4.4.1", displayVersion: "4.4.1" },
  haskell: { compiler: "ghc-9.8.2", displayVersion: "9.8.2" },
  lua: { compiler: "lua-5.4.7", displayVersion: "5.4.7" },
  bash: { compiler: "bash", displayVersion: "5.x" },
  sql: { compiler: "sqlite-3.46.1", displayVersion: "SQLite 3.46.1" },
};

const JAVA_WRAPPER_PREFIX = 'public class prog {\n';
const JAVA_WRAPPER_SUFFIX = '\n}';

function wrapJavaCode(code: string): string {
  if (code.includes("class ")) return code;
  if (code.includes("public static void main")) {
    return JAVA_WRAPPER_PREFIX + code + JAVA_WRAPPER_SUFFIX;
  }
  return code;
}

router.post("/code/execute", async (req, res): Promise<void> => {
  const { language, code } = req.body;

  if (!language || !code) {
    res.status(400).json({ error: "language and code are required" });
    return;
  }

  const langConfig = LANGUAGE_MAP[language];
  if (!langConfig) {
    const supported = Object.keys(LANGUAGE_MAP).join(", ");
    res.status(400).json({ error: `Unsupported language: ${language}. Supported: ${supported}` });
    return;
  }

  if (code.length > 50000) {
    res.status(400).json({ error: "Code too large (max 50KB)" });
    return;
  }

  try {
    const sourceCode = language === "java" ? wrapJavaCode(code) : code;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const wandboxRes = await fetch(WANDBOX_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: sourceCode,
        compiler: langConfig.compiler,
        "runtime-option-raw": language === "python" ? "" : undefined,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!wandboxRes.ok) {
      const errText = await wandboxRes.text();
      res.json({
        stdout: "",
        stderr: `Execution service error: ${wandboxRes.status} - ${errText}`,
        exitCode: 1,
        language,
        version: langConfig.displayVersion,
        timedOut: false,
      });
      return;
    }

    const result = await wandboxRes.json() as {
      program_output?: string;
      program_error?: string;
      compiler_output?: string;
      compiler_error?: string;
      status?: string;
      signal?: string;
    };

    const stdout = (result.program_output || "").substring(0, 10000);
    const compilerOut = result.compiler_output || "";
    const compilerErr = result.compiler_error || "";
    const programErr = result.program_error || "";
    const stderr = [compilerErr, compilerOut, programErr].filter(Boolean).join("\n").substring(0, 5000);
    const exitCode = result.status === "0" ? 0 : (result.signal ? 137 : 1);
    const timedOut = result.signal === "Killed" || result.signal === "SIGKILL";

    res.json({
      stdout,
      stderr: stderr || "",
      exitCode: result.status ? parseInt(result.status, 10) : exitCode,
      language,
      version: langConfig.displayVersion,
      timedOut,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      res.json({
        stdout: "",
        stderr: "Code execution timed out (15s limit)",
        exitCode: 1,
        language,
        version: langConfig.displayVersion,
        timedOut: true,
      });
      return;
    }

    res.status(500).json({
      stdout: "",
      stderr: `Execution error: ${err instanceof Error ? err.message : "Unknown error"}`,
      exitCode: 1,
      language,
      version: langConfig.displayVersion,
      timedOut: false,
    });
  }
});

export default router;
