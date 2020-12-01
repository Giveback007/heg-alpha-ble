import type { StateManager } from '@giveback007/util-lib/dist/browser';
import { html } from 'lit-html';
import type { HegState } from './@types';

const nth = (n: number, to = 2) => (n || 0).toFixed(to);

export function btStatsModal(s: HegState, stateUpdater: StateManager<HegState>['setState']) {
    const sps = s.SPS ? `${(s.SPS + '').padStart(2, ' ')} => ${nth(s.SPS/s.ufSPS * 100, 0)}%` : '--';

    return html`<div id="bt-stats" style="${s.showBtStats ? '' : 'display: none;'}">
        <div>Connected: <span id='device-connected'>${s.isConnected}</span></div>
        <div>SPS: <span id='device-sps'>${s.ufSPS ? s.ufSPS : '--'}|${sps}</span></div>
        <div>SPS Err: <span id='device-sps-errors'>${s.spsErrors} | ${nth(s.spsErrors/s.ufSPS * 100, 0)}%</span></div>
        <button id="bt-stats-off" @click=${() => stateUpdater({ showBtStats: false })}>X</button>
    </div>`;
}

export const btStatsCSS = `
    #bt-stats {
        padding: 5px;
        border: 1px solid black;
        width: 225px;
        font-size: 12px;
        box-shadow: -0.5px 0.5px #888888;
        position: fixed;
        right: 5px;
        top: 45px;
        background: white;
    }
    #bt-stats span {
        color: red;
    }
    #bt-stats-off {
        font-size: 10px;
        position: absolute;
        border: 1px solid black;
        right: 3px;
        top: 3px;
    }`;
