const cliProgress = require('cli-progress');

const format =
    '{percentage}% (ETA: {eta_formatted} | DUR: {duration_formatted}) {value}/{total}';

const bar = new cliProgress.Bar(
    {
        format: `Progress ${format}`,
        barsize: 20,
        align: 'right',
    },
    cliProgress.Presets.legacy
);

function getBar(operation) {
    if (operation) {
        updateName(operation);
    }
    return bar;
}

function updateName(name) {
    bar.format = `${name} ${format}`;
}

module.exports = { getBar, updateName };
