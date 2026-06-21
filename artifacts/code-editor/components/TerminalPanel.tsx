import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { type SupportedLanguage, useIDE } from "@/context/IDEContext";

// ─── Piston API — free, no auth, runs code on real servers ─────────────────
const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

const PISTON_RUNTIMES: Record<string, { language: string; version: string }> = {
  python:     { language: "python",     version: "3.10.0" },
  node:       { language: "javascript", version: "18.15.0" },
  javascript: { language: "javascript", version: "18.15.0" },
  typescript: { language: "typescript", version: "5.0.3" },
  java:       { language: "java",       version: "15.0.2" },
  bash:       { language: "bash",       version: "5.2.0" },
  cpp:        { language: "cpp",        version: "10.2.0" },
  rust:       { language: "rust",       version: "1.68.2" },
  go:         { language: "go",         version: "1.16.2" },
};

async function runWithPiston(code: string, lang: string, stdin = ""): Promise<{ stdout: string; stderr: string; code: number }> {
  const runtime = PISTON_RUNTIMES[lang] ?? PISTON_RUNTIMES["bash"];
  const res = await fetch(PISTON_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: runtime.language,
      version: runtime.version,
      files: [{ name: "main", content: code }],
      stdin,
      run_timeout: 10000,
    }),
  });
  if (!res.ok) throw new Error(`Piston error ${res.status}`);
  const data = await res.json();
  return {
    stdout: data.run?.stdout ?? "",
    stderr: data.run?.stderr ?? data.compile?.stderr ?? "",
    code: data.run?.code ?? 0,
  };
}

// ─── Local built-in commands ────────────────────────────────────────────────
const EXEC_LANGS: SupportedLanguage[] = ["python","javascript","typescript","bash","java","cpp","rust","go"];

function getExecLang(lang: SupportedLanguage): string {
  if (lang === "javascript" || lang === "typescript") return lang;
  if (lang === "python") return "python";
  if (lang === "java") return "java";
  if (lang === "cpp") return "cpp";
  if (lang === "rust") return "rust";
  if (lang === "go") return "go";
  return "bash";
}

function runLocal(cmd: string, args: string[], ctx: { currentProject: any }): string | null {
  switch (cmd) {
    case "help":
      return [
        "─── HackerStudio Terminal ───────────────────────────",
        "  run           run current file (via Piston engine)",
        "  python <code> run python snippet",
        "  node <code>   run javascript snippet",
        "  ls            list project files",
        "  pwd           print working directory",
        "  echo [text]   print text",
        "  cat <file>    show file content",
        "  clear         clear terminal",
        "  date          current date/time",
        "  whoami        current user",
        "  version       app version",
        "─────────────────────────────────────────────────────",
        "Powered by Piston (emkc.org) — runs Python, JS, Java, C++, Rust, Go, Bash",
      ].join("\n");
    case "ls":
      if (!ctx.currentProject) return "(no project open)";
      return ctx.currentProject.files.length === 0
        ? "(no files)"
        : ctx.currentProject.files.map((f: any) => `  ${f.name}`).join("\n");
    case "pwd":
      return ctx.currentProject ? `/projects/${ctx.currentProject.name}` : "/";
    case "echo":
      return args.join(" ");
    case "clear":
      return "__CLEAR__";
    case "date":
      return new Date().toLocaleString();
    case "whoami":
      return "hackerstudio";
    case "version":
      return "HackerStudio v1.0.0 · Piston execution engine";
    case "cat": {
      if (!ctx.currentProject || !args[0]) return "Usage: cat <filename>";
      const f = ctx.currentProject.files.find((x: any) => x.name === args[0]);
      return f ? f.content : `cat: ${args[0]}: No such file`;
    }
    default:
      return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function TerminalPanel() {
  const { terminalHistory, addTerminalLine, clearTerminal, colors, activeFile, currentProject, toggleTerminal, fontSize } = useIDE();
  const [command, setCommand] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const listRef = useRef<FlatList>(null);

  const scrollToEnd = () => setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 80);

  const handleRun = async () => {
    const raw = command.trim();
    if (!raw || running) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addTerminalLine({ type: "input", text: `❯ ${raw}` });
    setCmdHistory(prev => [raw, ...prev.slice(0, 49)]);
    setHistIdx(-1);
    setCommand("");
    scrollToEnd();

    const parts = raw.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Local command?
    const localResult = runLocal(cmd, args, { currentProject });
    if (localResult !== null) {
      if (localResult === "__CLEAR__") clearTerminal();
      else addTerminalLine({ type: "output", text: localResult });
      scrollToEnd();
      return;
    }

    // Determine what to run via Piston
    let lang = "bash";
    let code = raw;

    if (cmd === "run" && activeFile && EXEC_LANGS.includes(activeFile.language)) {
      lang = getExecLang(activeFile.language);
      code = activeFile.content;
      addTerminalLine({ type: "info", text: `Running ${activeFile.name} via Piston...` });
    } else if ((cmd === "python" || cmd === "python3") && args.length > 0) {
      lang = "python";
      code = args.join(" ");
      addTerminalLine({ type: "info", text: "Running python snippet..." });
    } else if (cmd === "node" && args.length > 0) {
      lang = "javascript";
      code = args.join(" ");
      addTerminalLine({ type: "info", text: "Running javascript snippet..." });
    } else {
      lang = "bash";
      code = raw;
    }

    setRunning(true);
    try {
      const result = await runWithPiston(code, lang);
      if (result.stdout.trim()) {
        result.stdout.trim().split("\n").forEach(line => addTerminalLine({ type: "output", text: line }));
      }
      if (result.stderr.trim()) {
        result.stderr.trim().split("\n").forEach(line => addTerminalLine({ type: "error", text: line }));
      }
      if (!result.stdout.trim() && !result.stderr.trim()) {
        addTerminalLine({ type: "info", text: `Process exited with code ${result.code}` });
      }
    } catch (e: any) {
      addTerminalLine({ type: "error", text: `Error: ${e?.message ?? "Unknown error"}` });
      addTerminalLine({ type: "info", text: "Check your internet connection. Piston requires internet." });
    } finally {
      setRunning(false);
    }
    scrollToEnd();
  };

  const getLineStyle = (type: string) => {
    switch (type) {
      case "error":   return { color: colors.terminalError };
      case "input":   return { color: colors.terminalPrompt, fontWeight: "bold" as const };
      case "warning": return { color: colors.terminalWarning };
      case "info":    return { color: colors.terminalInfo };
      default:        return { color: colors.terminalText };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.terminalBg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.dot, { backgroundColor: "#ff5f57" }]} />
          <View style={[styles.dot, { backgroundColor: "#ffbd2e" }]} />
          <View style={[styles.dot, { backgroundColor: "#27c93f" }]} />
          <Text style={[styles.headerTitle, { color: colors.mutedText }]}>  TERMINAL  </Text>
          <View style={[styles.engineBadge, { backgroundColor: colors.success + "22" }]}>
            <Text style={[styles.engineText, { color: colors.success }]}>● Piston</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {activeFile && EXEC_LANGS.includes(activeFile.language) && (
            <TouchableOpacity
              style={[styles.runBtn, { backgroundColor: colors.success + "22" }]}
              onPress={() => { setCommand("run"); setTimeout(handleRun, 0); }}
              disabled={running}
            >
              {running
                ? <ActivityIndicator size="small" color={colors.success} />
                : <Feather name="play" size={12} color={colors.success} />
              }
              <Text style={[styles.runBtnText, { color: colors.success }]}>
                {running ? "Running" : `Run ${activeFile.name}`}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={clearTerminal} style={styles.iconBtn}>
            <Feather name="trash-2" size={14} color={colors.mutedText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleTerminal} style={styles.iconBtn}>
            <Feather name="x" size={14} color={colors.mutedText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Output */}
      <FlatList
        ref={listRef}
        data={terminalHistory}
        keyExtractor={item => item.id}
        style={styles.output}
        contentContainerStyle={styles.outputContent}
        renderItem={({ item }) => (
          <Text style={[styles.termLine, { fontSize: fontSize - 2 }, getLineStyle(item.type)]}>
            {item.text}
          </Text>
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
      />

      {/* Input row */}
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0}>
        <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.terminalBg }]}>
          <Text style={[styles.prompt, { color: colors.terminalPrompt }]}>❯</Text>
          <TextInput
            style={[styles.input, { color: colors.terminalText, fontSize: fontSize - 1 }]}
            value={command}
            onChangeText={setCommand}
            placeholder="Type command... (help for list)"
            placeholderTextColor={colors.mutedText + "88"}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            onSubmitEditing={handleRun}
            blurOnSubmit={false}
            returnKeyType="send"
            editable={!running}
          />
          {cmdHistory.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                const ni = Math.min(histIdx + 1, cmdHistory.length - 1);
                setHistIdx(ni);
                setCommand(cmdHistory[ni] ?? "");
              }}
              style={styles.iconBtn}
            >
              <Feather name="chevron-up" size={16} color={colors.mutedText} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleRun}
            disabled={running || !command.trim()}
            style={[styles.sendBtn, { backgroundColor: running ? colors.muted : colors.accent }]}
          >
            {running
              ? <ActivityIndicator size="small" color="#fff" />
              : <Feather name="send" size={13} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 0 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  headerTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  engineBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 },
  engineText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  runBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5,
  },
  runBtnText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  iconBtn: { padding: 4 },
  output: { flex: 1 },
  outputContent: { padding: 10, paddingBottom: 4, gap: 1 },
  termLine: { fontFamily: "monospace", lineHeight: 20, paddingVertical: 1 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, gap: 8,
  },
  prompt: { fontFamily: "monospace", fontSize: 16, fontWeight: "bold" as const },
  input: { flex: 1, fontFamily: "monospace", paddingVertical: 2 },
  sendBtn: {
    width: 32, height: 32, borderRadius: 6,
    alignItems: "center", justifyContent: "center",
  },
});
