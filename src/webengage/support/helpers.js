"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const WEBENGAGE_PLUGIN_PROPS = [
    "auto_enable_push_permission",
    "license_code",
    "environment",
    "loglevel"
];

/**
 * Validate props against a schema.
 * @param {object} props
 * @param {Array<{key: string, type: string, required?: boolean}>} schema
 */
function validateProps(props, schema) {
    for (const { key, type, required = false } of schema) {
        if (!(key in props)) {
            if (required) {
                throw new Error(`WebEngage Expo Plugin: '${key}' is required.`);
            } else {
                continue;
            }
        }

        const value = props[key];

        if (typeof value !== type) {
            throw new Error(
                `WebEngage Expo Plugin: '${key}' must be of type ${type}.`
            );
        }

        // Extra check: for strings, disallow empty strings
        if (type === "string" && value.trim() === "") {
            throw new Error(
                `WebEngage Expo Plugin: '${key}' cannot be an empty string.`
            );
        }
    }

    // Check for unknown props
    const inputProps = Object.keys(props);
    for (const prop of inputProps) {
        if (!WEBENGAGE_PLUGIN_PROPS.includes(prop)) {
            throw new Error(
                `WebEngage Expo Plugin: Invalid property '${prop}' provided.`
            );
        }
    }
}

function validatePluginProps(props) {
    const schema = [
        { key: "license_code", type: "string", required: true },
        { key: "environment", type: "string", required: true },
        { key: "auto_enable_push_permission", type: "boolean", required: false },
        { key: "loglevel", type: "string", required: false }
    ];

    validateProps(props, schema);
}

exports.validatePluginProps = validatePluginProps;
