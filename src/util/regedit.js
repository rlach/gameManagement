/* istanbul ignore file */
async function list(key) {
    const { Registry } = await import('rage-edit/src/index.mjs');

    return (await Registry.get(key)).$values;
}

async function has(key, name) {
    const { Registry } = await import('rage-edit/src/index.mjs');

    return Registry.has(key, name);
}

async function set(key, name, value, type) {
    const { Registry } = await import('rage-edit/src/index.mjs');

    return Registry.set(key, name, value, type);
}

module.exports = { has, set, list };
