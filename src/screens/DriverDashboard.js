import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  StatusBar,
  Platform,
  Image,
  Pressable,
  ScrollView,
  RefreshControl,
  Switch,
  Linking,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import AlertBadge from "../components/AlertBadge";
import {
  playDriverSoft,
  stopDriverSoft,
  playDriverCritical,
  stopAllSounds,
} from "../utils/soundManager";
import * as Haptics from "expo-haptics";
import axios from "axios";
import { getApiBaseUrl } from "../config/network";

const Tab = createBottomTabNavigator();

const ScreenWrapper = ({ children, style }) => (
  <SafeAreaView
    style={[
      styles.safeArea,
      { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
      style,
    ]}
  >
    {children}
  </SafeAreaView>
);

const DriverHomeScreen = () => {
  const navigation = useNavigation();
  const { user, socket } = useContext(AuthContext);
  const [refreshing, setRefreshing] = useState(false);
  const [alertLevel, setAlertLevel] = useState("clear");
  const [showNormalModal, setShowNormalModal] = useState(false);
  const [showCriticalOverlay, setShowCriticalOverlay] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  };

  useEffect(() => {
    if (!socket) return;
    const handleNormal = () => {
      setAlertLevel("normal");
      setShowNormalModal(true);
      setShowCriticalOverlay(false);
      playDriverSoft();
    };
    const handleCritical = () => {
      setAlertLevel("critical");
      setShowNormalModal(false);
      setShowCriticalOverlay(true);
      stopDriverSoft();
      playDriverCritical();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    };
    const handleClear = () => {
      setAlertLevel("clear");
      setShowNormalModal(false);
      setShowCriticalOverlay(false);
      stopAllSounds();
    };

    socket.on("driver_alert_normal", handleNormal);
    socket.on("driver_alert_critical", handleCritical);
    socket.on("driver_alert_clear", handleClear);

    return () => {
      socket.off("driver_alert_normal", handleNormal);
      socket.off("driver_alert_critical", handleCritical);
      socket.off("driver_alert_clear", handleClear);
      stopAllSounds();
    };
  }, [socket]);

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22d3ee"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.welcome}>Welcome Back, {user?.name}</Text>
          <Text style={styles.subtext}>Here’s your dashboard overview</Text>
        </View>
        <AlertBadge level={alertLevel} />
        <View style={styles.divider} />
        <Pressable style={styles.card} android_ripple={null}>
          <Image source={require("../assets/user.png")} style={styles.avatar} />
          <View>
            <Text style={styles.cardTitleText}>{user?.name}</Text>
            <Text style={styles.cardSubText}>{user?.role}</Text>
          </View>
        </Pressable>
        <View style={styles.tilesRow}>
          <View style={styles.tile}>
            <View style={styles.tileIconCircle}>
              <Ionicons name="time-outline" size={18} color="#22d3ee" />
            </View>
            <Text style={styles.tileValue}>--</Text>
            <Text style={styles.tileLabel}>Hours Driven</Text>
          </View>
          <View style={styles.tile}>
            <View style={styles.tileIconCircle}>
              <Ionicons name="alert-circle-outline" size={18} color="#f59e0b" />
            </View>
            <Text style={styles.tileValue}>--</Text>
            <Text style={styles.tileLabel}>Alerts</Text>
          </View>
          <View style={styles.tile}>
            <View style={styles.tileIconCircle}>
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="#22c55e"
              />
            </View>
            <Text style={styles.tileValue}>--</Text>
            <Text style={styles.tileLabel}>Sessions</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("Logs")}
            activeOpacity={1}
          >
            <Ionicons name="document-text-outline" size={20} color="#22d3ee" />
            <Text style={styles.actionText}>Logs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={1}
          >
            <Ionicons name="person-outline" size={20} color="#a78bfa" />
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>
        </View>
        <Pressable
          style={styles.cameraBtn}
          onPress={() => navigation.navigate("Camera")}
          android_ripple={null}
        >
          <Text style={styles.cameraBtnText}>Start Detecting Drowsiness</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showNormalModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Stay Alert</Text>
            <Text style={styles.modalText}>
              Signs of drowsiness detected. Please stay focused.
            </Text>
            <Button title="Ok" onPress={() => setShowNormalModal(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={showCriticalOverlay} transparent animationType="fade">
        <View style={styles.criticalOverlay}>
          <Text style={styles.criticalTitle}>CRITICAL ALERT</Text>
          <Text style={styles.criticalText}>
            Pull over safely immediately. You are critically drowsy.
          </Text>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

const LogsScreen = () => {
  const { user } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    if (!user?.id) return;
    setLoadingLogs(true);
    try {
      const resp = await axios.get(`${getApiBaseUrl()}/driver/logs/${user.id}`);
      setLogs(resp.data.logs || []);
    } catch (e) {
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs().finally(() => setRefreshing(false));
  };

  return (
    <FlatList
      contentContainerStyle={styles.container}
      ListHeaderComponent={<Text style={styles.title}>Driver Logs</Text>}
      data={logs}
      keyExtractor={(item, idx) => item._id || String(idx)}
      renderItem={({ item }) => (
        <View style={styles.cardAlt}>
          <Text style={styles.cardText}>Type: {item.eventType}</Text>
          <Text style={styles.cardText}>
            Time: {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>
      )}
      ListEmptyComponent={
        !loadingLogs && (
          <View style={styles.cardAlt}>
            <Text style={styles.cardText}>No logs available yet.</Text>
          </View>
        )
      }
      ListFooterComponent={
        loadingLogs && (
          <ActivityIndicator color="#22d3ee" style={{ marginVertical: 12 }} />
        )
      }
      refreshing={refreshing}
      onRefresh={handleRefresh}
      showsVerticalScrollIndicator={false}
    />
  );
};

const ProfileScreen = () => {
  const { logout, user } = useContext(AuthContext);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  return (
    <ScreenWrapper style={darkModeEnabled ? styles.safeAreaDark : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require("../assets/user.png")} style={styles.image} />
        <Text style={[styles.name_text, darkModeEnabled && styles.textLight]}>
          {user?.name}
        </Text>
        <Text style={[styles.center_text, darkModeEnabled && styles.textLight]}>
          {user?.email}
        </Text>
        <Text style={[styles.center_text, darkModeEnabled && styles.textLight]}>
          {user?.role}
        </Text>

        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={[styles.settingsCard, darkModeEnabled && styles.settingsCardDark]}>
          <View style={styles.settingRowTall}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={20} color="#94a3b8" />
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: "#334155", true: "#22d3ee" }}
              thumbColor="#0b1220"
            />
          </View>
          <View style={styles.settingRowTall}>
            <View style={styles.rowLeft}>
              <Ionicons name="moon-outline" size={20} color="#94a3b8" />
              <Text style={styles.settingLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: "#334155", true: "#a78bfa" }}
              thumbColor="#0b1220"
            />
          </View>
          <TouchableOpacity style={styles.settingRowTall}>
            <View style={styles.rowLeft}>
              <Ionicons name="create-outline" size={20} color="#94a3b8" />
              <Text style={styles.settingLabel}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingRowTall}
            onPress={() => Linking.openURL("mailto:support@drowsiguard.app")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="help-circle-outline" size={20} color="#94a3b8" />
              <Text style={styles.settingLabel}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
};

export default function DriverDashboard() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Dashboard") iconName = "speedometer-outline";
          else if (route.name === "Logs") iconName = "document-text";
          else if (route.name === "Profile") iconName = "person";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#22d3ee",
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "#0b1220",
          borderTopColor: "transparent",
          marginHorizontal: 16,
          marginBottom: Platform.OS === "android" ? 24 : 16,
          height: 64,
          borderRadius: 16,
          paddingBottom: Platform.OS === "android" ? 14 : 8,
          paddingTop: 8,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 16,
          elevation: 6,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DriverHomeScreen} />
      <Tab.Screen name="Logs" component={LogsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
    paddingBottom: Platform.OS === "android" ? 24 : 0,
  },
  safeAreaDark: {
    backgroundColor: "#050816",
  },
  container: {
    paddingBottom: 120,
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 10,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#1f2937",
    marginVertical: 12,
  },
  welcome: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
  },
  subtext: {
    fontSize: 14,
    color: "#abc5d3ff",
    marginTop: 4,
  },
  name_text: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  center_text: {
    color: "#ffffff",
    fontSize: 16,
    textAlign: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    marginTop: 10,
    color: "#ffffff",
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#81e4f9",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: "#ffffffff",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  cardAlt: {
    backgroundColor: "#0b1220",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  tilesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tile: {
    flex: 1,
    backgroundColor: "#0b1220",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    alignItems: "center",
  },
  tileIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  tileValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  tileLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "#0b1220",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  actionText: {
    color: "#e2e8f0",
    fontWeight: "600",
    marginLeft: 8,
  },
  cardTitleText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  cardSubText: {
    fontSize: 14,
    color: "#ffffff",
    opacity: 0.9,
    marginTop: 2,
  },
  cardText: {
    fontSize: 16,
    color: "#ffffff",
  },
  cameraBtn: {
    marginTop: 20,
    backgroundColor: "#81e4f9",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    width: "70%",
    alignSelf: "center",
  },
  cameraBtnText: {
    fontWeight: "bold",
    color: "#000000",
    textAlign: "center",
  },
  settingsCard: {
    backgroundColor: "#0b1220",
    borderRadius: 14,
    paddingVertical: 6,
    marginTop: 8,
    marginBottom: 20,
  },
  settingRowTall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingLabel: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 8,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutBtn: {
    marginTop: 30,
    backgroundColor: "#FF5252",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: "50%",
    alignItems: "center",
    alignSelf: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  modalCard: {
    backgroundColor: "#0b1220",
    padding: 24,
    borderRadius: 16,
    width: "100%",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },
  modalText: {
    color: "#cbd5f5",
    fontSize: 15,
    marginBottom: 16,
  },
  criticalOverlay: {
    flex: 1,
    backgroundColor: "rgba(220, 38, 38, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  criticalTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 10,
  },
  criticalText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
});

