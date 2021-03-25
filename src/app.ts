import {SpectrumRenderer} from '@audio/SpectrumRenderer';
import {drawSkeleton} from '@renderer/drawSkeleton';
import {drawSpectrum, renderSpectrum} from '@renderer/renderSpectrum';
import {downloadBlob} from '@utils/downloadBlob';
import {on} from '@utils/events';
import {realSize} from '@utils/realSize';
import {throttlePromise} from '@utils/throttlePromise';
import './styles/_index.scss';

// Canvas, context and spectrum renderer
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const context = canvas.getContext('2d', {
    alpha: false
}) as CanvasRenderingContext2D;

let renderer: SpectrumRenderer | undefined;

// Configuration
export type Configuration = typeof config;
const config = {

    // Analyzer options
    analyzer: {
        minDecibels: -120,
        maxDecibels: -20
    },

    // Visual options
    visuals: {
        graphMargin: [40, 100, 35, 65],
        decibelBarWidth: 10,
        tickMinDistance: 50,
        tickThickness: 1,
        tickLength: 10
    }
};

// Main functions
const startRendering = throttlePromise(async () => {
    if (renderer) {
        await renderSpectrum({renderer, context, config});
        redraw();
    }
}, 500);

const redraw = () => {

    // Resize (and clear canvas by this)
    const {width, height} = realSize(canvas);
    canvas.width = width;
    canvas.height = height;

    // Draw UI skeleton
    drawSkeleton({renderer, context, config});

    // Draw current spectrum
    renderer && drawSpectrum({renderer, context, config});

    // Start next render cycle
    startRendering();
};

const toggleHelpScreen = () => document.getElementById('help')?.classList.toggle('visible');
const downloadSpectrum = (spectrumOnly?: boolean) => {
    if (renderer?.canvas) {
        const filename = renderer.file.name
            .replace(/\W+/g, '-')
            .replace(/\.[^.]+$/, '');

        (spectrumOnly ? renderer?.canvas : canvas).toBlob(blob => {
            blob && downloadBlob(blob, `spectrum-${filename}.png`);
        }, 'image/png');
    }
};

// Wait for files
on('#canvas', ['dragover', 'drop'], (evt: DragEvent) => {
    evt.preventDefault();

    if (!evt.dataTransfer) {
        return;
    }

    // Show copy icon for this data-transfer
    evt.dataTransfer.dropEffect = 'copy';

    // React to when a file is dropped
    if (evt.type === 'drop') {
        const file = evt.dataTransfer.files?.[0];

        if (file) {
            renderer = undefined;
            redraw();

            renderer = new SpectrumRenderer(file, {
                width: screen.availWidth,
                height: screen.availHeight,
                maxDecibels: config.analyzer.maxDecibels,
                minDecibels: config.analyzer.minDecibels
            });

            redraw();
        }
    }
});

// Shortcuts
on(window, 'keydown', (evt: KeyboardEvent) => {
    if (evt.ctrlKey || evt.metaKey) {
        evt.preventDefault();

        switch (evt.code) {
            case 'KeyS': {
                return downloadSpectrum(evt.shiftKey);
            }
            case 'ArrowUp': {
                config.analyzer[evt.shiftKey ? 'minDecibels' : 'maxDecibels'] += 1;
                return redraw();
            }
            case 'ArrowDown': {
                config.analyzer[evt.shiftKey ? 'minDecibels' : 'maxDecibels'] -= 1;
                return redraw();
            }
        }
    } else {
        switch (evt.code) {
            case 'KeyF': {
                document.getElementById('header')?.classList.toggle('visible');
                return redraw();
            }
            case 'KeyH': {
                return toggleHelpScreen();
            }
        }
    }
});

// React to browser changes
window.addEventListener('resize', redraw);
document.addEventListener('fullscreenchange', redraw);

// Buttons
document.getElementById('help-screen-btn')?.addEventListener('click', toggleHelpScreen);
document.getElementById('help')?.addEventListener('click', toggleHelpScreen);

// Initialize
redraw();
