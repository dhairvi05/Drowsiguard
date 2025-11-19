import React, { useState, useRef, useEffect, useContext } from 'react';
import { Button, StyleSheet, Text, View, Dimensions, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getMlServerUrl } from '../config/network';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CameraScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back'); // 'back' or 'front'
  const [detections, setDetections] = useState([]);
  const cameraRef = useRef(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [seriousAlertVisible, setSeriousAlertVisible] = useState(false);
  const alertTimerRef = useRef(null);
  const seriousAlertTimerRef = useRef(null);
  const drowsyStartTimeRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDetection, setLastDetection] = useState(null);

  // Capture and send frame to backend every 500ms
  // Inside your useEffect
useEffect(() => {
  let interval;
  if (permission?.granted) {
    interval = setInterval(async () => {
      if (!cameraRef.current || isProcessing) return;

      setIsProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7, mute: true });
        
        if (!photo || !photo.base64) {
          console.log('No photo data received');
          return;
        }

        console.log('Sending image to ML server...');
        const response = await fetch(`${getMlServerUrl()}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: photo.base64, driverId: user?.id }),
        });

        if (!response.ok) {
          console.log('ML server response not ok:', response.status, response.statusText);
          return;
        }

        const result = await response.json();
        console.log('ML server response:', result);
        
        let dets = [];
        if (Array.isArray(result.detections)) {
          dets = result.detections;
        } else if (result.detections) {
          dets = [result.detections]; // wrap single object into array
        }
        setDetections(dets);
        setLastDetection(dets.length > 0 ? dets[0] : null);

        // Debug log to check backend output
        console.log("Backend detections:", dets);

        // Check if drowsy with confidence > 0.5
        const isDrowsy = dets.length > 0 && dets[0].label === "0" && dets[0].confidence > 0.5;
        
        if (isDrowsy) {
          // Start tracking drowsy time if not already started
          if (drowsyStartTimeRef.current === null) {
            drowsyStartTimeRef.current = Date.now();
            console.log('DROWSINESS DETECTED! Starting timer...');
          }
          
          const drowsyDuration = Date.now() - drowsyStartTimeRef.current;
          
          // Show serious alert after 10 seconds
          if (drowsyDuration >= 10000) {
            console.log('SERIOUS DROWSINESS ALERT!');
            setSeriousAlertVisible(true);
            if (seriousAlertTimerRef.current) clearTimeout(seriousAlertTimerRef.current);
            seriousAlertTimerRef.current = setTimeout(() => setSeriousAlertVisible(false), 3000);
          }
          // Show regular alert after 5 seconds
          else if (drowsyDuration >= 5000) {
            console.log('DROWSINESS WARNING!');
            setAlertVisible(true);
            if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
            alertTimerRef.current = setTimeout(() => setAlertVisible(false), 2000);
          }
        } else {
          // Reset drowsy timer if not drowsy
          drowsyStartTimeRef.current = null;
          setAlertVisible(false);
          setSeriousAlertVisible(false);
        }
      } catch (err) {
        console.log('Error detecting:', err);
        console.log('Error details:', err.message);
      } finally {
        setIsProcessing(false);
      }
    }, 1000); // 1 second interval
  }
  return () => clearInterval(interval);
}, [permission]);


  if (!permission) {
    return <View style={styles.center}><Text>Loading…</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>We need your permission to show the camera</Text>
        <Button title="Grant permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
      <View style={styles.backButtonWrapper}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{padding: 6}}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {alertVisible && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>⚠️ Drowsiness Warning!</Text>
        </View>
      )}

      {seriousAlertVisible && (
        <View style={styles.seriousAlertOverlay}>
          <View style={styles.seriousAlertBanner}>
            <Text style={styles.seriousAlertText}>CRITICAL ALERT! </Text>
            <Text style={styles.seriousAlertSubtext}>You have been drowsy for 10+ seconds!</Text>
            <Text style={styles.seriousAlertSubtext}>Please take a break or pull over!</Text>
          </View>
        </View>
      )}

      {/* Always show detection info */}
      {lastDetection && (
        <View style={styles.confidenceBanner}>
          <Text style={styles.alertText}>
            {lastDetection.label === "0" ? "Drowsy" : "Not Drowsy"} ({Math.round(lastDetection.confidence * 100)}%)
          </Text>
        </View>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <View style={styles.processingBanner}>
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}

      <View style={styles.controls}>
        <Button
          title={`Flip to ${facing === 'back' ? 'front' : 'back'}`}
          onPress={() => setFacing(prev => (prev === 'back' ? 'front' : 'back'))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  controls: { position: 'absolute', bottom: 40, left: 20, right: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  alertBanner: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  confidenceBanner: {
    position: 'absolute',
    top: 60, // slightly above alertBanner
    alignSelf: 'center',
    backgroundColor: 'rgba(255,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    zIndex: 1000,
  },
  alertText: {
    color: '#000000',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  processingBanner: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,255,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    zIndex: 1000,
  },
  processingText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  seriousAlertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  seriousAlertBanner: {
    backgroundColor: '#dc2626',
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  seriousAlertText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 10,
  },
  seriousAlertSubtext: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 5,
  },
  label: {
    color: 'red',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    fontSize: 12,
  },
  backButtonWrapper: {
    position: 'absolute',
    top: 36,
    left: 12,
    zIndex: 999,
  },
});
