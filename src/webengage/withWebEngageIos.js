
const {
  withInfoPlist,
  withEntitlementsPlist,
  withXcodeProject,
  withDangerousMod,
} = require('@expo/config-plugins');

const fs = require('fs');
const path = require('path');

const BRIDGING_HEADER_LINES = [
  '#import <React/RCTBridge.h>',
  '#import <React/RCTBundleURLProvider.h>',
  '#import <React/RCTRootView.h>',
  '#import <React/RCTLinkingManager.h>',
];

// For Plist
function withWebEngageSettings(config, props = {}) {
  return withInfoPlist(config, (c) => {
    Object.entries(props).forEach(([key, value]) => {
      c.modResults[key] = value;
    });
    return c;
  });
}


//For AppEnvironment

function withAppEnvironment(config, props = {}) {
  return withEntitlementsPlist(config, (newConfig) => {
    if (props?.mode == null) {
      throw new Error(
        `
        Missing required "mode" key in your app.json or app.config.js file for "WebEngage-expo-plugin".
        "mode" can be either "development" or "production".
        Please see WebEngage-expo-plugin's README.md for more details.`
      );
    }
    newConfig.modResults['aps-environment'] = props.mode;
    return newConfig;
  });
}

// Remote Notification
const withRemoteNotificationsPermissions = (config) => {
  const BACKGROUND_MODE_KEYS = ['remote-notification', 'fetch'];
  return withInfoPlist(config, (newConfig) => {
    if (!Array.isArray(newConfig.modResults.UIBackgroundModes)) {
      newConfig.modResults.UIBackgroundModes = [];
    }
    for (const key of BACKGROUND_MODE_KEYS) {
      if (!newConfig.modResults.UIBackgroundModes.includes(key)) {
        newConfig.modResults.UIBackgroundModes.push(key);
      }
    }
    return newConfig;
  });
};

const withAppGroupPermissions = (config) => {
  const APP_GROUP_KEY = 'com.apple.security.application-groups';
  return withEntitlementsPlist(config, (newConfig) => {
    if (!Array.isArray(newConfig.modResults[APP_GROUP_KEY])) {
      newConfig.modResults[APP_GROUP_KEY] = [];
    }
    const modResultsArray = newConfig.modResults[APP_GROUP_KEY];
    const entitlement = `group.${newConfig?.ios?.bundleIdentifier || ''}.WEGNotificationGroup`;
    if (modResultsArray.indexOf(entitlement) !== -1) {
      return newConfig;
    }
    modResultsArray.push(entitlement);

    return newConfig;
  });
};


//FOR RCTBRIDGE issue
function readBridgingHeaderFromPbx(pbxprojContents) {
  // Try a few tolerant regexes (quoted and unquoted)
  const regexes = [
    /SWIFT_OBJC_BRIDGING_HEADER\s*=\s*"([^"]+)";/, // "path";
    /SWIFT_OBJC_BRIDGING_HEADER\s*=\s*([^;]+);/, // unquoted path;
  ];
  for (const rx of regexes) {
    const m = pbxprojContents.match(rx);
    if (m && m[1]) {
      return m[1].trim().replace(/^"|"$/g, '');
    }
  }
  return null;
}

/**
 * Insert SWIFT_OBJC_BRIDGING_HEADER into pbxproj for each buildSettings block.
 * Returns the header relative path that was ensured.
 *
 * - projectFilePath: absolute path to project.pbxproj
 * - iosPath: absolute path to ios directory
 * - projectName: name of the Xcode project (folder inside ios, e.g. "MyApp")
 */
function ensureBridgingHeader(projectFilePath, iosPath, projectName) {
  let pbxproj = fs.readFileSync(projectFilePath, 'utf8');

  // If it's already present, return the found path.
  const existing = readBridgingHeaderFromPbx(pbxproj);
  if (existing) {
    console.log(`🔷 Found existing SWIFT_OBJC_BRIDGING_HEADER: ${existing}`);
    return existing;
  }

  // Choose a default bridging header relative to ios/ folder
  const defaultRelative = `${projectName}/${projectName}-Bridging-Header.h`;
  console.log(
    `🔶 SWIFT_OBJC_BRIDGING_HEADER not found — injecting default: ${defaultRelative}`
  );

  // Build insertion snippet (with semicolon; keep formatting similar to pbxproj)
  const insertSnippet = `\n\t\t\tSWIFT_OBJC_BRIDGING_HEADER = "${defaultRelative}";`;

  // Insert the snippet after every "buildSettings = {" occurrence.
  // This is robust for Expo-generated pbxproj where each build configuration has such a block.
  const newPbxproj = pbxproj.replace(/buildSettings = \{/g, (m) => m + insertSnippet);

  if (newPbxproj === pbxproj) {
    // Insertion failed for some reason
    throw new Error('Failed to inject SWIFT_OBJC_BRIDGING_HEADER into project.pbxproj');
  }

  // Write modified pbxproj back
  fs.writeFileSync(projectFilePath, newPbxproj, 'utf8');
  console.log(`✅ Injected SWIFT_OBJC_BRIDGING_HEADER into ${projectFilePath}`);

  // Ensure the header file exists under ios/<defaultRelative>
  const fullHeaderPath = path.join(iosPath, defaultRelative);
  const headerDir = path.dirname(fullHeaderPath);
  if (!fs.existsSync(headerDir)) {
    fs.mkdirSync(headerDir, { recursive: true });
    console.log(`📁 Created directory ${headerDir}`);
  }

  if (!fs.existsSync(fullHeaderPath)) {
    // Create a minimal stub bridging header and include the React imports so your mod continues to work.
    const stubLines = [
      `// ${path.basename(fullHeaderPath)}`,
      '#import <Foundation/Foundation.h>',
      '', // blank line
      ...BRIDGING_HEADER_LINES,
      '',
    ];
    fs.writeFileSync(fullHeaderPath, stubLines.join('\n'), 'utf8');
    console.log(`📝 Created bridging header at ${fullHeaderPath}`);
  } else {
    // If file exists, ensure it contains the React imports (we'll append later in main flow)
    console.log(`ℹ️ Bridging header already exists at ${fullHeaderPath}`);
  }

  return defaultRelative;
}

/**
 * Read bridging header path from existing pbxproj or return null.
 */
function findBridgingHeaderPath(projectFilePath) {
  const pbxproj = fs.readFileSync(projectFilePath, 'utf8');
  const found = readBridgingHeaderFromPbx(pbxproj);
  return found || null;
}

function withWebEngageBridgingHeader(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const { projectRoot } = config.modRequest;
      const iosPath = path.join(projectRoot, 'ios');

      // Validate ios dir
      if (!fs.existsSync(iosPath)) {
        throw new Error('ios directory not found. Run `expo prebuild --platform ios` first.');
      }

      const projectName = getProjectName(iosPath);
      const projectPath = path.join(iosPath, `${projectName}.xcodeproj/project.pbxproj`);

      if (!fs.existsSync(projectPath)) {
        throw new Error(`Could not find project.pbxproj at expected path: ${projectPath}`);
      }

      // Ensure pbxproj has SWIFT_OBJC_BRIDGING_HEADER (inject if missing) and ensure header file exists
      let bridgingHeaderRelative;
      try {
        bridgingHeaderRelative = ensureBridgingHeader(projectPath, iosPath, projectName);
      } catch (e) {
        // If ensure failed for any reason, try to read it (maybe insertion isn't possible) or surface error
        const fallback = findBridgingHeaderPath(projectPath);
        if (!fallback) {
          throw e;
        }
        bridgingHeaderRelative = fallback;
      }

      const fullHeaderPath = path.join(iosPath, bridgingHeaderRelative);

      // Read the header file (it should exist now)
      let contents = '';
      try {
        contents = fs.readFileSync(fullHeaderPath, 'utf8');
      } catch (e) {
        throw new Error(`Could not read bridging header at ${fullHeaderPath}: ${e}`);
      }

      // Ensure BRIDGING_HEADER_LINES are present (append if missing)
      const lines = contents.split(/\r?\n/);
      let modified = false;
      for (const line of BRIDGING_HEADER_LINES) {
        if (!lines.includes(line)) {
          lines.push(line);
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(fullHeaderPath, lines.join('\n'), 'utf8');
        console.log(`✅ Added React imports to bridging header: ${bridgingHeaderRelative}`);
      } else {
        console.log(`ℹ️ Bridging header already contains all React imports: ${bridgingHeaderRelative}`);
      }

      return config;
    },
  ]);
}

function getProjectName(iosPath) {
  const files = fs.readdirSync(iosPath);
  const xcodeproj = files.find((f) => f.endsWith('.xcodeproj'));
  if (!xcodeproj) {
    throw new Error('Could not find .xcodeproj in ios directory');
  }
  return xcodeproj.replace(/\.xcodeproj$/, '');
}


const withWebEngageIos = (config, props) => {
  if (!props.ios) {
    throw new Error('You are trying to use the WebEngage plugin without any ios props.');
  }
  config = withWebEngageSettings(config, props.ios);

  if (!props.push) {
    throw new Error('You are trying to use the WebEngage plugin without any push props.');
  }
  config = withAppEnvironment(config, props.push);
  config = withRemoteNotificationsPermissions(config);
  config = withAppGroupPermissions(config);
  config = withWebEngageBridgingHeader(config);
  return config;
};

module.exports = {
  withWebEngageIos,
};