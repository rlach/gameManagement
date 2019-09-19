/* istanbul ignore file */
const { Registry } = require('rage-edit');

async function list(key) {
    return (await Registry.get(key)).$values;
}

async function has(key, name) {
    return Registry.has(key, name);
}

async function set(key, name, value, type) {
    return Registry.set(key, name, value, type);
}

module.exports = { has, set, list };
