const cliProgress = require('cli-progress');

const format =
    '[{bar}] {percentage}% | ETA: {eta_formatted} | Duration: {duration_formatted} | {value}/{total}';

const bar = new cliProgress.Bar(
    {
        format: `Progress ${format}`,
        align: 'right',
    },
    cliProgress.Presets.shades_classic
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
