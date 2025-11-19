import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io } from 'socket.io-client';
import { getHost } from '../config/network';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  // load user from storage (e.g., after reopening app)
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem("user");
        if (savedUser) setUser(JSON.parse(savedUser));
      } catch (e) {
        console.log("Error loading user", e);
      } finally {
        setLoading(false); // Done loading
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    // Establish socket connection after user logs in
    if (user) {
      const sock = io(`http://${getHost()}:5000`);
      setSocket(sock);
      if (user.role === 'Driver' && user.id) {
        sock.emit('joinDriverRoom', { driverId: user.id });
      }
      // Could add passenger join here as needed
      return () => sock.disconnect();
    }
  }, [user]);

  const login = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem("user", JSON.stringify(userData));
  };


  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, socket }}>
      {children}
    </AuthContext.Provider>
  );
};
