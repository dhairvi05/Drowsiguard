import { Audio } from 'expo-audio';
import * as Haptics from 'expo-haptics';

// Paths to sound asset files
const soundFiles = {
  driverSoft: require('../assets/sounds/soft_music.mp3'),
  driverCritical: require('../assets/sounds/driver_critical.mp3'),
  passengerNormal: require('../assets/sounds/passenger_normal.mp3'),
  passengerCritical: require('../assets/sounds/passenger_critical.mp3'),
};

// Sound refs to allow start/stop
let driverSoftSound = null;
let driverCriticalSound = null;
let passengerNormalSound = null;
let passengerCriticalSound = null;

export async function playDriverSoft(loop = true) {
  if (driverSoftSound) await driverSoftSound.unloadAsync();
  driverSoftSound = new Audio.Sound();
  await driverSoftSound.loadAsync(soundFiles.driverSoft);
  await driverSoftSound.setIsLoopingAsync(loop);
  await driverSoftSound.playAsync();
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
export async function stopDriverSoft() {
  if (driverSoftSound) await driverSoftSound.stopAsync();
}
export async function playDriverCritical() {
  if (driverCriticalSound) await driverCriticalSound.unloadAsync();
  driverCriticalSound = new Audio.Sound();
  await driverCriticalSound.loadAsync(soundFiles.driverCritical);
  await driverCriticalSound.setIsLoopingAsync(false);
  await driverCriticalSound.playAsync();
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
export async function playPassengerNormal() {
  if (passengerNormalSound) await passengerNormalSound.unloadAsync();
  passengerNormalSound = new Audio.Sound();
  await passengerNormalSound.loadAsync(soundFiles.passengerNormal);
  await passengerNormalSound.setIsLoopingAsync(false);
  await passengerNormalSound.playAsync();
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
export async function playPassengerCritical() {
  if (passengerCriticalSound) await passengerCriticalSound.unloadAsync();
  passengerCriticalSound = new Audio.Sound();
  await passengerCriticalSound.loadAsync(soundFiles.passengerCritical);
  await passengerCriticalSound.setIsLoopingAsync(false);
  await passengerCriticalSound.playAsync();
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
export async function stopAllSounds() {
  if (driverSoftSound) await driverSoftSound.stopAsync();
  if (driverCriticalSound) await driverCriticalSound.stopAsync();
  if (passengerNormalSound) await passengerNormalSound.stopAsync();
  if (passengerCriticalSound) await passengerCriticalSound.stopAsync();
}
