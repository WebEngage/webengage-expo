// Re-export the native module registration.
// This module is intentionally empty — it exists to trigger native SDK initialization
// via ExpoAppDelegateSubscriber (iOS) and the Android module.
// For JS APIs (tracking, user, push), use react-native-webengage directly.
export { default } from "./WebengageExpoModule";
