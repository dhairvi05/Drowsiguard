import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function AlertBanner({
  visible,
  alert,
  onHide,
  onClick
}) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const hideTimeout = useRef(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 16
      }).start();
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      hideTimeout.current = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          if (onHide) onHide();
        });
      }, 6000);
    } else {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [visible]);

  if (!visible || !alert) return null;

  return (
    <Animated.View style={[styles.banner, {transform: [{ translateY }]}]}>
      <TouchableOpacity style={styles.inner} activeOpacity={0.85} onPress={onClick}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>!</Text>
        </View>
        <View style={styles.textGroup}>
          <Text style={styles.title}>Drowsiness Detected!</Text>
          <Text style={styles.detail}>Confidence: {(alert.confidence * 100).toFixed(1)}%</Text>
          <Text style={styles.detail}>Time: {new Date(alert.timestamp).toLocaleTimeString()}</Text>
          {alert.driverId && <Text style={styles.detail}>Driver: {alert.driverId}</Text>}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  inner: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  iconCircle: {
    backgroundColor: '#fff',
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: {
    color: '#ef4444',
    fontSize: 26,
    fontWeight: 'bold',
  },
  textGroup: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 4,
  },
  detail: {
    fontSize: 13,
    color: '#fee2e2',
  }
});
