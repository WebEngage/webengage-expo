import { NativeModule, requireNativeModule } from "expo";

declare class WebengageExpoModule extends NativeModule {}

// This call loads the native module object from the JSI.
// The native module is intentionally empty — it exists solely to register
// the ExpoAppDelegateSubscriber (iOS) and Android module for SDK initialization.
// All JS-facing APIs are provided by react-native-webengage.
export default requireNativeModule<WebengageExpoModule>("WebengageExpo");
