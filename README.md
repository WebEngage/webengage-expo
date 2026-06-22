# 📲 webengage-expo

**An Expo Config Plugin to integrate WebEngage into your Expo app.**

This plugin makes it easy to add WebEngage SDK configuration to your Expo app during the build process.

---

## 🚀 Installation

1️⃣ Install the plugin in your project:

```bash
npm install webengage-expo
# or
yarn add webengage-expo
```

2️⃣ Also install react-native-webengage plugin

```bash
npm i react-native-webengage
```

---

## 🛠️ Configuration

In your `app.json` or `app.config.js`, add the plugin under the `plugins` key and configure it as needed:

```json
{
  "expo": {
    "name": "YourApp",
    "slug": "your-app",
    "plugins": [
      [
        "./node_modules/webengage-expo/src/withWebEngage.js",
        {
          "push": {
            "mode": "development"
          },
          "ios": {
            "WEGLicenseCode": "LICENSE_CODE",
            "WEGLogLevel": "VERBOSE",
            "WEGEnvironment": "DEFAULT",
            "WEGAutoRegister": true
          },
          "android": {
            "manifest": {
              "com.webengage.sdk.android.environment": "ENVIRONMENT",
              "com.webengage.sdk.android.key": "LICENSE_CODE",
              "com.webengage.sdk.android.debug": false
            }
          }
        }
      ]
    ]
  }
}
```

### Options:

For iOS

| Key                   | Description                                              | Required |
| --------------------- | -------------------------------------------------------- | -------- |
| `push.mode`           | Push notification mode: `development` or `production`    | ✅       |
| `ios.WEGLicenseCode`  | Your WebEngage license code                              | ✅       |
| `ios.WEGLogLevel`     | Log level (`DEFAULT`,`VERBOSE`)                          | Optional |
| `ios.WEGEnvironment`  | `DEFAULT`, `IN`, or `KSA`                                | ✅       |
| `ios.WEGAutoRegister` | Automatically register for push notifications permission | Optional |

For Android
| Key | Description | Required |
|-------------------------|-----------------------------------------------------------|----------|
| `manifest.com.webengage.sdk.android.environment` | `us`, `in` ,`ksa` | ✅ |
| `manifest.com.webengage.sdk.android.key` | Your WebEngage license code | ✅ |
| `manifest.com.webengage.sdk.android.debug` | Log level (`true`,`false`) | Optional |

---

## Usage

After completing the configuration step above, you can start using WebEngage in your Expo project.

✅ Since this plugin is designed for Expo, you do not need to follow the native Android/iOS integration steps from the official React Native guide.
🚀 Just use the JavaScript API in your app code.

JavaScript APIs you can use, see the [WebEngage React Native Documentation](https://docs.webengage.com/docs/react-native).

### ⚠️ Note on Updates

If you make changes to the plugin configuration (e.g., app.json or native plugin settings), you will need to create a new build of your app and upload it to the Play Store / App Store.

If you only update the JavaScript code in your project (e.g., tracking events, setting user attributes, etc.), you can simply publish an OTA (Over The Air) update without rebuilding the app.

## 🧪 Development & Testing

If you want to test your integration:

✅ Run on iOS Simulator or Android Emulator after building locally:

```bash
# Build and run your native iOS project
npx expo run:ios

# Build and run your native Android project
npx expo run:android
```

## 📄 License

[MIT](https://github.com/WebEngage/webengage-expo/blob/main/LICENSE)
