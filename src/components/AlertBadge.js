import React from "react";
import { View, Text, StyleSheet } from "react-native";

const colorMap = {
  clear: "#16a34a",
  normal: "#facc15",
  critical: "#dc2626",
};

const labelMap = {
  clear: "Normal",
  normal: "Drowsy",
  critical: "Critical",
};

export default function AlertBadge({ level = "clear" }) {
  const color = colorMap[level] || colorMap.clear;
  const label = labelMap[level] || labelMap.clear;

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b1220",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  text: {
    color: "#fff",
    fontWeight: "600",
  },
});