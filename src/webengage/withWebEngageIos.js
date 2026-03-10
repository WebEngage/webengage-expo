
const { withInfoPlist, withEntitlementsPlist, withXcodeProject, withDangerousMod } = require("@expo/config-plugins");

const fs = require('fs');
const path = require('path');

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
            throw new Error(`
        Missing required "mode" key in your app.json or app.config.js file for "WebEngage-expo-plugin".
        "mode" can be either "development" or "production".
        Please see WebEngage-expo-plugin's README.md for more details.`);
        }
        newConfig.modResults["aps-environment"] = props.mode;
        return newConfig;
    });
};


// Remote Notification
const withRemoteNotificationsPermissions = (config) => {
    const BACKGROUND_MODE_KEYS = ["remote-notification", "fetch"];
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

// App group
const withAppGroupPermissions = (config) => {
    const APP_GROUP_KEY = "com.apple.security.application-groups";
    return withEntitlementsPlist(config, (newConfig) => {
        if (!Array.isArray(newConfig.modResults[APP_GROUP_KEY])) {
            newConfig.modResults[APP_GROUP_KEY] = [];
        }
        const modResultsArray = newConfig.modResults[APP_GROUP_KEY];
        const entitlement = `group.${newConfig?.ios?.bundleIdentifier || ""
            }.WEGNotificationGroup`;
        if (modResultsArray.indexOf(entitlement) !== -1) {
            return newConfig;
        }
        modResultsArray.push(entitlement);

        return newConfig;
    });
};


//FOR RCTBRIDGE issue
const BRIDGING_HEADER_LINES = [
    '#import <React/RCTBridge.h>',
    '#import <React/RCTBundleURLProvider.h>',
    '#import <React/RCTRootView.h>',
    '#import <React/RCTLinkingManager.h>',
];


function withWebEngageBridgingHeader(config) {
    return withDangerousMod(config, [
        'ios',
        (config) => {
            const { projectRoot } = config.modRequest;
            const iosPath = path.join(projectRoot, 'ios');
            const projectName = getProjectName(iosPath);
            const projectPath = path.join(iosPath, `${projectName}.xcodeproj/project.pbxproj`);
            const bridgingHeaderPath = findOrCreateBridgingHeaderPath(projectPath, iosPath, projectName);
            const fullPath = path.join(iosPath, bridgingHeaderPath);

            let contents = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
            const updatedLines = contents.split('\n');
            let modified = false;

            BRIDGING_HEADER_LINES.forEach((line) => {
                if (!updatedLines.includes(line)) {
                    updatedLines.push(line);
                    modified = true;
                }
            });

            if (modified) {
                fs.writeFileSync(fullPath, updatedLines.join('\n'), 'utf8');
                console.log(`✅ Added React imports to bridging header: ${bridgingHeaderPath}`);
            } else {
                console.log(`ℹ️ Bridging header already contains all React imports`);
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

function findOrCreateBridgingHeaderPath(projectFilePath, iosPath, projectName) {
    let pbxproj = fs.readFileSync(projectFilePath, 'utf8');
    const match = pbxproj.match(/SWIFT_OBJC_BRIDGING_HEADER = ([^;]+);/);
    
    if (match) {
        const headerPath = match[1].trim().replace(/^"|"$/g, '');
        console.log(`🔷 Found bridging header: ${headerPath}`);
        return headerPath;
    }

    const headerPath = `${projectName}/${projectName}-Bridging-Header.h`;
    const fullPath = path.join(iosPath, headerPath);
    
    if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, '', 'utf8');
    }

    pbxproj = pbxproj.replace(
        /(SWIFT_OBJC_BRIDGING_HEADER = )/g,
        `$1"${headerPath}"; //\n\t\t\t\tSWIFT_OBJC_BRIDGING_HEADER = `
    );
    
    if (!pbxproj.includes(`SWIFT_OBJC_BRIDGING_HEADER = "${headerPath}"`)) {
        pbxproj = pbxproj.replace(
            /buildSettings = \{/,
            `buildSettings = {\n\t\t\t\tSWIFT_OBJC_BRIDGING_HEADER = "${headerPath}";`
        );
    }
    
    fs.writeFileSync(projectFilePath, pbxproj, 'utf8');
    console.log(`✅ Created bridging header: ${headerPath}`);
    return headerPath;
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
exports.withWebEngageIos = withWebEngageIos;