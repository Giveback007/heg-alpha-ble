import { min, sec } from '@giveback007/util-lib';
import type { StateManager } from '@giveback007/util-lib/dist/browser';
import type { HegData, HegState, HegTuple } from './@types';
import { genHegData, sma, timeSma } from './heg-connection.util';

const decoder = new TextDecoder('utf-8');

export class HegEventHandler {

    private rawRatio: number[] = [];
    private data: HegData[] = [];

    private secT = Math.floor(Date.now() / 1000) * 1000 + 1000;

    private spsErrors: number = 0; // number of SPS errors per second
    private ufSPS: number = 0; // unfiltered SPS
    private SPS: number = 0; // Samples Per Second

    constructor(
        private char: BluetoothRemoteGATTCharacteristic,
        private stateUpdater: StateManager<HegState>['setState']
    ) { }

    async start() {
        this.char.startNotifications();
        this.char.addEventListener('characteristicvaluechanged', this.handleValue);
        this.stateUpdater({ sessionStart: Date.now() });
    }

    async end () {
        this.char.stopNotifications();
        this.char.removeEventListener('characteristicvaluechanged', this.handleValue);

        this.stateUpdater({ SPS: 0, ufSPS: 0 });
    }

    private handleSPS({ SPS, ufSPS, spsErrors } = this) {
        this.stateUpdater({ SPS, ufSPS, spsErrors });

        this.spsErrors = 0;
        this.SPS = 0;
        this.ufSPS = 0;
    }

    private handleValue = (ev: Event) => {
        const t = Date.now();

        if (t >= this.secT) {
            this.secT = Math.floor(t / 1000) * 1000 + 1000;
            this.handleSPS();
        }

        this.ufSPS++;
        const dataView = (ev.target as BluetoothRemoteGATTCharacteristic)?.value;
        const rawVal = decoder.decode(dataView);

        if (!rawVal) return;

        const arr = rawVal.split('|').map(x => parseFloat(x)) as HegTuple;
        const rt = arr[2]; // ratio

        // filter (NaN, 0 & n < 0) values
        if (!rt || rt < 0) return this.spsErrors++;

        // Filter values 30% out of raw-average/per-half-second
        this.rawRatio[this.rawRatio.length] = rt;
        const rawSMA = sma(this.rawRatio, 5);

        const prct = 0.3;
        if (rt < rawSMA * (1 - prct) || rt > rawSMA * (1 + prct)) return;

        const val = genHegData(arr, t, this.data);
        this.data[this.data.length] = val;

        val.sma2s = timeSma(this.data, sec(2));
        val.sma10s = timeSma(this.data, sec(10));
        val.sma1m = timeSma(this.data, min(1));
        val.sma5m = timeSma(this.data, min(5));
        val.sma10m = timeSma(this.data, min(10));

        this.stateUpdater({ sessionData: [...this.data], lastVal: val });
        this.SPS++;

        return;
    }
}
