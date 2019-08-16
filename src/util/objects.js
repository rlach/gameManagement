function removeUndefined(obj) {
    for (let k in obj) {
        if (
            obj.hasOwnProperty(k) &&
            (obj[k] === undefined ||
                (Array.isArray(obj[k]) && obj[k].length === 0))
        ) {
            delete obj[k];
        }
    }
    return obj;
}

function ensureArray(obj) {
    if (!obj) {
        return [];
    } else {
        return Array.isArray(obj) ? obj : [obj];
    }
}

module.exports = { removeUndefined, ensureArray };
