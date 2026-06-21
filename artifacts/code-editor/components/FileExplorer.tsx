import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { type FileItem, type SupportedLanguage, useIDE } from "@/context/IDEContext";
import NewFileModal from "./NewFileModal";

const FILE_ICONS: Record<string, string> = {
  ".py": "layers", ".js": "zap", ".ts": "zap", ".tsx": "zap",
  ".jsx": "zap", ".java": "coffee", ".sh": "terminal",
  ".html": "globe", ".css": "droplet", ".json": "database",
  ".md": "file-text", ".txt": "file-text", ".cpp": "cpu",
  ".c": "cpu", ".rs": "anchor", ".go": "box",
};

const FILE_COLORS: Record<string, string> = {
  ".py": "#3776ab", ".js": "#f7df1e", ".ts": "#3178c6", ".tsx": "#61dafb",
  ".jsx": "#61dafb", ".java": "#ed8b00", ".sh": "#4ec9b0", ".html": "#e34c26",
  ".css": "#264de4", ".json": "#cbcb41", ".md": "#083fa1", ".cpp": "#004482",
  ".rs": "#ce422b", ".go": "#00acd7",
};

function getExt(name: string) {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx) : "";
}

function FileIcon({ name, size = 15 }: { name: string; size?: number }) {
  const ext = getExt(name);
  return <Feather name={(FILE_ICONS[ext] ?? "file") as any} size={size} color={FILE_COLORS[ext] ?? "#858585"} />;
}

interface ContextMenu {
  visible: boolean;
  file: FileItem | null;
  x: number;
  y: number;
}

export default function FileExplorer() {
  const {
    currentProject, projects, openFiles, activeFile, colors,
    openFile, deleteFile, createFile, createProject, renameFile,
    duplicateFile, copyFile, pasteFile, clipboardFile, selectProject, setActivePanel,
  } = useIDE();
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showProjectList, setShowProjectList] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ visible: false, file: null, x: 0, y: 0 });
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleFilePress = (file: FileItem) => {
    Haptics.selectionAsync();
    openFile(file);
  };

  const handleLongPress = (file: FileItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContextMenu({ visible: true, file, x: 0, y: 0 });
  };

  const closeContext = () => setContextMenu({ visible: false, file: null, x: 0, y: 0 });

  const handleContextAction = (action: string) => {
    const file = contextMenu.file!;
    closeContext();
    switch (action) {
      case "open": openFile(file); break;
      case "rename":
        setRenameTarget(file);
        setRenameValue(file.name);
        break;
      case "copy": copyFile(file); break;
      case "duplicate": duplicateFile(file.id); break;
      case "delete":
        Alert.alert("Delete File", `Delete "${file.name}"?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteFile(file.id) },
        ]);
        break;
    }
  };

  const handleCreateFile = (name: string, language: SupportedLanguage) => {
    const file = createFile(name, language);
    if (file) openFile(file);
    setShowNewFile(false);
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    createProject(newProjectName.trim());
    setNewProjectName("");
    setShowNewProject(false);
  };

  const handleRenameConfirm = () => {
    if (!renameTarget || !renameValue.trim()) return;
    renameFile(renameTarget.id, renameValue.trim());
    setRenameTarget(null);
  };

  if (!currentProject) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.sidebar }]}>
        {showNewProject ? (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>New Project</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
              value={newProjectName}
              onChangeText={setNewProjectName}
              placeholder="project-name"
              placeholderTextColor={colors.mutedText}
              autoFocus
              onSubmitEditing={handleCreateProject}
            />
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={handleCreateProject}>
                <Text style={styles.btnWhite}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.muted }]} onPress={() => setShowNewProject(false)}>
                <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Feather name="folder" size={44} color={colors.mutedText} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Project Open</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedText }]}>Create a project to start coding</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={() => setShowNewProject(true)}>
              <Feather name="plus" size={15} color="#fff" />
              <Text style={styles.btnWhite}>New Project</Text>
            </TouchableOpacity>
            {projects.length > 0 && (
              <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.border }]} onPress={() => setShowProjectList(true)}>
                <Feather name="folder" size={15} color={colors.mutedText} />
                <Text style={[styles.btnText, { color: colors.mutedText }]}>Open Existing</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  }

  const files = currentProject.files;

  return (
    <View style={[styles.container, { backgroundColor: colors.sidebar }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.mutedText }]}>EXPLORER</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowNewFile(true)} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="file-plus" size={15} color={colors.mutedText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowNewProject(true)} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="folder-plus" size={15} color={colors.mutedText} />
          </TouchableOpacity>
          {clipboardFile && (
            <TouchableOpacity onPress={pasteFile} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="clipboard" size={15} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Project row */}
      <TouchableOpacity
        style={[styles.projectRow, { borderBottomColor: colors.border }]}
        onPress={() => setShowProjectList(true)}
        onLongPress={() => {
          Alert.alert("Switch Project", "Open another project?", [
            { text: "Cancel", style: "cancel" },
            { text: "Project List", onPress: () => setShowProjectList(true) },
          ]);
        }}
      >
        <Feather name="chevron-down" size={13} color={colors.mutedText} />
        <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>
          {currentProject.name.toUpperCase()}
        </Text>
        <Feather name="more-horizontal" size={13} color={colors.mutedText} />
      </TouchableOpacity>

      {/* File list */}
      {files.length === 0 ? (
        <TouchableOpacity
          style={styles.addFirstFile}
          onPress={() => setShowNewFile(true)}
        >
          <Feather name="plus-circle" size={14} color={colors.accent} />
          <Text style={[styles.addFileText, { color: colors.accent }]}>Create first file</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={files}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const isActive = activeFile?.id === item.id;
            const openFile2 = openFiles.find(f => f.id === item.id);
            const isModified = openFile2?.modified;
            return (
              <TouchableOpacity
                style={[
                  styles.fileRow,
                  isActive && { backgroundColor: colors.selection },
                ]}
                onPress={() => handleFilePress(item)}
                onLongPress={() => handleLongPress(item)}
                delayLongPress={400}
                activeOpacity={0.7}
              >
                <FileIcon name={item.name} />
                <Text
                  style={[styles.fileName, { color: openFile2 ? colors.text : colors.mutedText }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {isModified && <View style={[styles.modDot, { backgroundColor: colors.accent }]} />}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* File context menu modal */}
      <Modal transparent visible={contextMenu.visible} onRequestClose={closeContext} animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeContext}>
          <View style={[styles.contextMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.contextTitle, { color: colors.mutedText }]} numberOfLines={1}>
              {contextMenu.file?.name}
            </Text>
            {[
              { action: "open", icon: "external-link", label: "Open" },
              { action: "rename", icon: "edit-2", label: "Rename" },
              { action: "copy", icon: "copy", label: "Copy" },
              { action: "duplicate", icon: "files", label: "Duplicate" },
              { action: "delete", icon: "trash-2", label: "Delete", danger: true },
            ].map(item => (
              <TouchableOpacity
                key={item.action}
                style={styles.contextItem}
                onPress={() => handleContextAction(item.action)}
              >
                <Feather name={item.icon as any} size={15} color={item.danger ? colors.error : colors.text} />
                <Text style={[styles.contextLabel, { color: item.danger ? colors.error : colors.text }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rename modal */}
      <Modal transparent visible={!!renameTarget} onRequestClose={() => setRenameTarget(null)} animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setRenameTarget(null)}>
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Rename File</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
              selectTextOnFocus
              onSubmitEditing={handleRenameConfirm}
            />
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={handleRenameConfirm}>
                <Text style={styles.btnWhite}>Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.muted }]} onPress={() => setRenameTarget(null)}>
                <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Project list modal */}
      <Modal transparent visible={showProjectList} onRequestClose={() => setShowProjectList(false)} animationType="slide">
        <View style={[styles.overlay, { justifyContent: "flex-end" }]}>
          <View style={[styles.projectListCard, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Projects</Text>
            {projects.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.projectItem,
                  { borderBottomColor: colors.border },
                  currentProject?.id === p.id && { backgroundColor: colors.selection },
                ]}
                onPress={() => { selectProject(p); setShowProjectList(false); }}
              >
                <Feather name="folder" size={16} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.projectItemName, { color: colors.text }]}>{p.name}</Text>
                  <Text style={[styles.projectItemMeta, { color: colors.mutedText }]}>
                    {p.files.length} files · {new Date(p.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {currentProject?.id === p.id && <Feather name="check" size={14} color={colors.accent} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.newProjectRow, { borderTopColor: colors.border }]}
              onPress={() => { setShowProjectList(false); setShowNewProject(true); }}
            >
              <Feather name="plus" size={15} color={colors.accent} />
              <Text style={[styles.newProjectText, { color: colors.accent }]}>New Project</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* New project modal */}
      {showNewProject && (
        <Modal transparent visible animationType="fade">
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowNewProject(false)}>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>New Project</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
                value={newProjectName}
                onChangeText={setNewProjectName}
                placeholder="project-name"
                placeholderTextColor={colors.mutedText}
                autoFocus
                onSubmitEditing={handleCreateProject}
              />
              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={handleCreateProject}>
                  <Text style={styles.btnWhite}>Create</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { backgroundColor: colors.muted }]} onPress={() => setShowNewProject(false)}>
                  <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <NewFileModal visible={showNewFile} onClose={() => setShowNewFile(false)} onCreate={handleCreateFile} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1,
  },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  headerActions: { flexDirection: "row", gap: 10 },
  iconBtn: { padding: 2 },
  projectRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1,
  },
  projectName: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, flex: 1 },
  fileRow: {
    flexDirection: "row", alignItems: "center",
    paddingLeft: 20, paddingRight: 10, paddingVertical: 7, gap: 8,
  },
  fileName: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  modDot: { width: 6, height: 6, borderRadius: 3 },
  addFirstFile: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 14, margin: 10, borderRadius: 6,
  },
  addFileText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, marginTop: 8,
  },
  outlineBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, borderWidth: 1,
  },
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center", justifyContent: "center",
  },
  contextMenu: {
    width: 220, borderRadius: 10, borderWidth: 1,
    overflow: "hidden", paddingVertical: 4,
  },
  contextTitle: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#3d3d3d",
  },
  contextItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  contextLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  formCard: {
    width: "85%", borderRadius: 10, borderWidth: 1,
    padding: 18, gap: 12,
  },
  formTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  textInput: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    paddingHorizontal: 10, paddingVertical: 9,
    borderWidth: 1, borderRadius: 6,
  },
  btnRow: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  btnWhite: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium" },
  btnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  projectListCard: {
    width: "100%", borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingBottom: 24, maxHeight: "80%",
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#666", alignSelf: "center", marginVertical: 10,
  },
  sheetTitle: { fontSize: 16, fontFamily: "Inter_700Bold", paddingHorizontal: 16, marginBottom: 8 },
  projectItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  projectItemName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  projectItemMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  newProjectRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1,
  },
  newProjectText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
