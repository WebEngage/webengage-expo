"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { withWebEngageIos } = require("./webengage/withWebEngageIos");
const { withWebEngageAndroid } = require("./webengage/withWebEngageAndroid");
const { withWebEngageSPM } = require("./webengage/withWebEngageSPM");
const withWebEngage = (config, props) => {
    if (!props) {
        throw new Error('You are trying to use the WebEngage plugin without any props.');
    }
    config = withWebEngageIos(config, props);
    config = withWebEngageAndroid(config, props);
    if (props.ios && props.ios.useSPM) {
        config = withWebEngageSPM(config, {
            spmRepoUrl: props.ios.spmRepoUrl,
            spmBranch: props.ios.spmBranch,
            useCore: props.ios.useCore,
        });
    }
    return config;
};
exports.default = withWebEngage;
