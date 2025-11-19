import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Switch,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import AlertBadge from "../components/AlertBadge";
import AlertBanner from "../components/AlertBanner";
import { getApiBaseUrl } from "../config/network";
import {
  playPassengerNormal,
  playPassengerCritical,
  stopAllSounds,
} from "../utils/soundManager";
import * as Haptics from "expo-haptics";

const Tab = createBottomTabNavigator();

const ScreenWrapper = ({ children }) => (
  <SafeAreaView
    style={[
      styles.safeArea,
      { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
    ]}
  >
    {children}
  </SafeAreaView>
);

const PassengerHomeScreen = () => {
  const { user, socket } = useContext(AuthContext);
  const [inputDriverId, setInputDriverId] = useState("");
  const [joinedDriverId, setJoinedDriverId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [alertLevel, setAlertLevel] = useState("clear");
  const [toastData, setToastData] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [criticalVisible, setCriticalVisible] = useState(false);
  const toastTimer = useRef(null);
  const criticalTimer = useRef(null);

  const fetchLogs = async (driverId) => {
    setLoadingLogs(true);
    try {
      const resp = await axios.get(`${getApiBaseUrl()}/driver/logs/${driverId}`);
      setLogs(resp.data.logs || []);
    } catch (e) {
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleJoin = () => {
    if (inputDriverId.trim().length === 0) return;
    const targetId = inputDriverId.trim();
    setJoinedDriverId(targetId);
    fetchLogs(targetId);
  };

  const handleRefresh = () => {
    if (!joinedDriverId) return;
    setRefreshing(true);
    fetchLogs(joinedDriverId).finally(() => setRefreshing(false));
  };

  useEffect(() => {
    setAlertLevel("clear");
    setToastVisible(false);
    setCriticalVisible(false);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    if (criticalTimer.current) {
      clearInterval(criticalTimer.current);
      criticalTimer.current = null;
    }
    stopAllSounds();
  }, [joinedDriverId]);

  useEffect(() => {
    if (!socket || !joinedDriverId) return;
    socket.emit("joinPassengerRoom", { driverId: joinedDriverId });

    const handleNormal = () => {
      setAlertLevel("normal");
      setCriticalVisible(false);
      setToastData({
        confidence: 1,
        timestamp: Date.now(),
        driverId: joinedDriverId,
      });
      setToastVisible(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastVisible(false), 5000);
      playPassengerNormal();
    };

    const handleCritical = () => {
      setAlertLevel("critical");
      setCriticalVisible(true);
      setToastVisible(false);
      playPassengerCritical();
      startCriticalVibration();
    };

    const handleClear = () => {
      setAlertLevel("clear");
      setToastVisible(false);
      setCriticalVisible(false);
      stopAllSounds();
    };

    socket.on("passenger_alert_normal", handleNormal);
    socket.on("passenger_alert_critical", handleCritical);
    socket.on("passenger_alert_clear", handleClear);

    return () => {
      socket.off("passenger_alert_normal", handleNormal);
      socket.off("passenger_alert_critical", handleCritical);
      socket.off("passenger_alert_clear", handleClear);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (criticalTimer.current) {
        clearInterval(criticalTimer.current);
        criticalTimer.current = null;
      }
      stopAllSounds();
    };
  }, [socket, joinedDriverId]);

  const startCriticalVibration = () => {
    const start = Date.now();
    if (criticalTimer.current) {
      clearInterval(criticalTimer.current);
    }
    criticalTimer.current = setInterval(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (Date.now() - start >= 3000 && criticalTimer.current) {
        clearInterval(criticalTimer.current);
        criticalTimer.current = null;
      }
    }, 400);
  };

  return (
    <ScreenWrapper>
      <AlertBadge level={alertLevel} />
      <FlatList
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
              <Text style={styles.cardText}>No logs to display</Text>
            </View>
          )
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.welcome}>
              Hi {user?.name}, subscribe to your driver’s ride alerts.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Driver ID"
                placeholderTextColor="#81e4f9"
                value={inputDriverId}
                onChangeText={setInputDriverId}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
                <Ionicons name="checkmark" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            {joinedDriverId && (
              <Text style={styles.trackingText}>
                Tracking Driver: {joinedDriverId}
              </Text>
            )}
            <Text style={styles.sectionTitle}>Driver Logs</Text>
            {loadingLogs && (
              <ActivityIndicator
                color="#22d3ee"
                style={{ marginVertical: 12 }}
              />
            )}
          </View>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />

      <AlertBanner
        visible={toastVisible}
        alert={toastData}
        onHide={() => setToastVisible(false)}
        onClick={() => setToastVisible(false)}
      />

      <Modal visible={criticalVisible} transparent animationType="fade">
        <View style={styles.criticalOverlay}>
          <Text style={styles.criticalTitle}>Driver in Critical State</Text>
          <Text style={styles.criticalText}>
            Your driver is critically drowsy. Contact them immediately or request
            assistance.
          </Text>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

const PassengerProfileScreen = () => {
  const { user, logout } = useContext(AuthContext);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <Text style={styles.welcome}>Passenger Profile</Text>
        <View style={styles.cardAlt}>
          <Text style={styles.cardText}>Name: {user?.name}</Text>
          <Text style={styles.cardText}>Email: {user?.email}</Text>
          <Text style={styles.cardText}>Role: {user?.role}</Text>
        </View>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.cardAlt}>
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
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
};

export default function PassengerDashboard() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName = "information-circle";
          if (route.name === "Alerts") iconName = "notifications";
          if (route.name === "Profile") iconName = "person";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#22d3ee",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          backgroundColor: "#0b1220",
          borderTopColor: "transparent",
        },
      })}
    >
      <Tab.Screen name="Alerts" component={PassengerHomeScreen} />
      <Tab.Screen name="Profile" component={PassengerProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 16,
  },
  welcome: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginTop: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  input: {
    flex: 1,
    backgroundColor: "#0b1220",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#22d3ee",
    marginRight: 8,
  },
  joinButton: {
    backgroundColor: "#22d3ee",
    padding: 12,
    borderRadius: 10,
  },
  trackingText: {
    color: "#81e4f9",
    marginTop: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 12,
  },
  cardAlt: {
    backgroundColor: "#0b1220",
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardText: {
    color: "#fff",
    fontSize: 15,
  },
  criticalOverlay: {
    flex: 1,
    backgroundColor: "rgba(190, 24, 93, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  criticalTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },
  criticalText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  settingRowTall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
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
  logoutBtn: {
    marginTop: 24,
    backgroundColor: "#FF5252",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

