function removeUndefined(obj) {
    for (let k in obj) if (obj[k] === undefined || (Array.isArray(obj[k]) && obj[k].length === 0)) delete obj[k];
    return obj;
}

module.exports = { removeUndefined };
