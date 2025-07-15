"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { withWebEngageIos } = require("./webengage/withWebEngageIos");
const { withWebEngageAndroid } = require("./webengage/withWebEngageAndroid");
const withWebEngage = (config, props) => {
    if (!props) {
        throw new Error('You are trying to use the WebEngage plugin without any props.');
    }
    config = withWebEngageIos(config, props);
    config = withWebEngageAndroid(config, props);
    return config;
};
exports.default = withWebEngage;
