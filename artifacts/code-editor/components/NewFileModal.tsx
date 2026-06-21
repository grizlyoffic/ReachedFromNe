import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { type SupportedLanguage, useIDE } from "@/context/IDEContext";

const LANGUAGES: { id: SupportedLanguage; label: string; icon: string; color: string }[] = [
  { id: "python", label: "Python", icon: "layers", color: "#3776ab" },
  { id: "javascript", label: "JavaScript", icon: "zap", color: "#f7df1e" },
  { id: "typescript", label: "TypeScript", icon: "zap", color: "#3178c6" },
  { id: "java", label: "Java", icon: "coffee", color: "#ed8b00" },
  { id: "bash", label: "Bash / Shell", icon: "terminal", color: "#4ec9b0" },
  { id: "html", label: "HTML", icon: "globe", color: "#e34c26" },
  { id: "css", label: "CSS", icon: "droplet", color: "#264de4" },
  { id: "json", label: "JSON", icon: "database", color: "#cbcb41" },
  { id: "text", label: "Plain Text", icon: "file-text", color: "#858585" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, language: SupportedLanguage) => void;
}

export default function NewFileModal({ visible, onClose, onCreate }: Props) {
  const { colors } = useIDE();
  const [name, setName] = useState("");
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>("python");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), selectedLang);
    setName("");
    setSelectedLang("python");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>New File</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={colors.mutedText} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.mutedText }]}>File Name</Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.input },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="main"
            placeholderTextColor={colors.mutedText}
            autoFocus
            onSubmitEditing={handleCreate}
          />

          <Text style={[styles.label, { color: colors.mutedText }]}>Language</Text>
          <ScrollView style={styles.langList} showsVerticalScrollIndicator={false}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.id}
                style={[
                  styles.langRow,
                  selectedLang === lang.id && {
                    backgroundColor: colors.selection,
                    borderRadius: 4,
                  },
                ]}
                onPress={() => setSelectedLang(lang.id)}
              >
                <Feather name={lang.icon as any} size={16} color={lang.color} />
                <Text style={[styles.langLabel, { color: colors.text }]}>{lang.label}</Text>
                {selectedLang === lang.id && (
                  <Feather name="check" size={14} color={colors.accent} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.muted }]}
              onPress={onClose}
            >
              <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.accent }]}
              onPress={handleCreate}
            >
              <Text style={[styles.btnText, { color: "#fff" }]}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    width: "88%",
    maxHeight: "80%",
    borderRadius: 8,
    padding: 20,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  input: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 4,
  },
  langList: {
    maxHeight: 220,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 9,
    gap: 10,
  },
  langLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 4,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  btnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
