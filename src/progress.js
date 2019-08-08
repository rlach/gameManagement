const cliProgress = require('cli-progress');

const format = '[{bar}] {percentage}% | ETA: {eta_formatted} | Duration: {duration_formatted} | {value}/{total}';

const bar = new cliProgress.Bar(
    {
        format: `progressbar`,
        align: 'right'
    },
    cliProgress.Presets.shades_classic
);

function getBar() {
    return bar;
}

function updateName(progressBar, name) {
    progressBar.format = `${name} ${format}`;
}

module.exports = { getBar, updateName };
