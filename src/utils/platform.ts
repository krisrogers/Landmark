import { Capacitor } from '@capacitor/core';

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export function isWeb(): boolean {
  return Capacitor.getPlatform() === 'web';
}

export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

export function getPlatform(): 'android' | 'ios' | 'web' {
  return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
}

export function supportsFileSystem(): boolean {
  return isNative() || ('storage' in navigator && 'getDirectory' in navigator.storage);
}

export function supportsGeolocation(): boolean {
  return 'geolocation' in navigator || isNative();
}

export function supportsCamera(): boolean {
  return isNative() || ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices);
}

export function supportsAudioRecording(): boolean {
  return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
}
