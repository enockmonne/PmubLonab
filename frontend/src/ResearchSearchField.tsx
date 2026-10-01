import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "./theme";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  label?: string;
  hint?: string;
  testID?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function ResearchSearchField({
  value,
  onChangeText,
  placeholder,
  label = "Recherche",
  hint,
  testID,
  children,
  style,
}: Props) {
  return (
    <View style={[styles.panel, style]}>
      <View style={styles.labelRow}>
        <View style={styles.signal} />
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.shortcut}>Explorer</Text>
      </View>
      <View style={styles.field}>
        <View style={styles.iconBox}>
          <Ionicons name="search" size={18} color="#FFFFFF" />
        </View>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.searchMuted}
          autoCorrect={false}
          returnKeyType="search"
        />
        {value.length > 0 ? (
          <TouchableOpacity
            accessibilityLabel="Effacer la recherche"
            onPress={() => onChangeText("")}
            hitSlop={10}
          >
            <Ionicons name="close-circle" size={20} color={theme.colors.searchMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brandStrong,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowColor: theme.colors.brandStrong,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
  },
  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 10,
  },
  signal: {
    backgroundColor: theme.colors.accent,
    borderRadius: 3,
    height: 6,
    marginRight: 8,
    width: 6,
  },
  label: {
    color: "#FFFFFF",
    flex: 1,
    fontFamily: theme.fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  shortcut: {
    color: theme.colors.brandMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  field: {
    alignItems: "center",
    backgroundColor: theme.colors.searchSurface,
    borderColor: theme.colors.searchBorder,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 10,
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: theme.colors.accent,
    borderRadius: 9,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  input: {
    color: theme.colors.searchText,
    flex: 1,
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    lineHeight: 20,
    minWidth: 0,
    paddingVertical: 8,
  },
  hint: {
    color: theme.colors.brandMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 9,
  },
});
