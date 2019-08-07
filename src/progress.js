const cliProgress = require('cli-progress');

const format = '[{bar}] {percentage}% | ETA: {eta_formatted} | Duration: {duration_formatted} | {value}/{total}';

function getBar(name) {
    return new cliProgress.Bar(
        {
            format: `${name} ${format}`,
            align: 'right'
        },
        cliProgress.Presets.shades_classic
    );
}

function updateName(progressBar, name) {
    progressBar.format = `${name} ${format}`;
}

module.exports = { getBar, updateName };
