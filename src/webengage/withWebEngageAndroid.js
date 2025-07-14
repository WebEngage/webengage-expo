const { withAndroidManifest } = require('@expo/config-plugins');

const withWebEngageMetaData = (config, manifestProps = {}) => {
    return withAndroidManifest(config, (modConfig) => {
        const application = modConfig.modResults.manifest.application?.[0];

        if (!application) {
            throw new Error("Cannot find <application> in AndroidManifest.xml");
        }

        const metaData = application['meta-data'] ?? [];

        // Add WebEngage enabled flag if missing
        if (!metaData.some(m => m.$['android:name'] === 'com.webengage.expo_enabled')) {
            metaData.push({
                $: {
                    'android:name': 'com.webengage.expo_enabled',
                    'android:value': 'true',
                },
            });
        }

        // Add all user-provided manifest meta-data
        Object.entries(manifestProps).forEach(([key, value]) => {
            const exists = metaData.find(m => m.$['android:name'] === key);
            if (!exists) {
                metaData.push({
                    $: {
                        'android:name': key,
                        'android:value': String(value),
                    },
                });
            }
        });

        application['meta-data'] = metaData;

        return modConfig;
    });
};

const withWebEngageAndroid = (config, props = {}) => {
    const manifestProps = props?.android?.manifest || {};

    if (!props.android) {
        console.warn(
            '[WebEngage] You are using the WebEngage plugin without android config. SDK may not be properly initialized.'
        );
    }

    return withWebEngageMetaData(config, manifestProps);
};

module.exports = {
    withWebEngageAndroid,
};
