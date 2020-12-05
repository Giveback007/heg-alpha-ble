import { copyToClipboard, StateManager } from '@giveback007/browser-utils';
import { arrGetByIds, isType, objRemoveKeys, rand, uiid } from '@giveback007/util-lib';
import { render } from 'lit-html';
import type { HegSession, HegState } from './@types';
import { btStatsCSS, btStatsModal } from './bt-stats-modal';
import { HegEventHandler } from './heg-event-handler';

const encoder = new TextEncoder();

const serviceUUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const rxUUID      = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const txUUID      = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

const initState: HegState = {
    pastSessions: [],
    sessionData: [], // current session data
    sessionStart: 0, // current session start time
    isReading: false,
    isConnected: false,
    lastVal: null,
    showBtStats: false,
    SPS: 0,
    ufSPS: 0,
    spsErrors: 0,
    isSimMode: false,
}

export class HegConnection extends StateManager<HegState> {

    private device: BluetoothDevice | null = null;
    private server: BluetoothRemoteGATTServer | null = null;
    private cmdChar: BluetoothRemoteGATTCharacteristic | null = null;
    private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
    private hegValueChangeHandler: HegEventHandler | null = null;
    // private simData: HegData[] | 'random' = 'random';

    private get s() { return this.getState(); }

     // simulated sessions do not get added to pastSessions array.
    constructor(args = { startInSimMode: false }) {
        super({
            ...initState,
            isSimMode: args.startInSimMode
        }, {
            id: 'HegConnection',
            useKeys: ['showBtStats', 'pastSessions']
        });

        const styleSheet: HTMLStyleElement = document.createElement('style');
        styleSheet.innerText = btStatsCSS;
        document.head.appendChild(styleSheet);

        const btStatsRoot = document.createElement('div');
        document.body.appendChild(btStatsRoot);
        (window as any).hegToggleBtStats = this.toggleBtStats;

        this.subToKeys(
            ['isConnected', 'showBtStats', 'SPS', 'ufSPS', 'spsErrors'],
            (s) => render(btStatsModal(s, this.setState), btStatsRoot)
        );

        this.subToKeys('isSimMode', ({ isSimMode }) =>
            isSimMode ? this.startSimMode() : this.stopSimMode())
    }

    /** WARNING: DO NOT USE! */
    setState: StateManager<HegState>['setState'] = this.setState;

    startSimMode() {
        if (this.s.isSimMode) return;

        this.stopReadingHEG();
        this.disconnect();
        this.setState({ isSimMode: true });
    }

    stopSimMode() {
        if (!this.s.isSimMode) return;
        this.setState(objRemoveKeys(initState, ['pastSessions']));
    }

    // /** Set simulator data, `'random'` for randomly generated data */
    // setSimData(data?: string | HegData[] | 'random') {
    //     if (!this.s.isSimMode) throw new Error('simMode not activated');

    //     if (data === 'random' || isType(data, 'undefined'))
    //         return this.simData = 'random';

    //     if (isType(data, 'string')) {
    //         const x = arrGetByIds(this.s.pastSessions, [data]);
    //         if (!x.length) throw new Error('no session by id: ' + data + 'found');

    //         data = x[0].data;
    //     }

    //     return this.simData = data;
    // }

    /**
     * @param data an `id` of pastSession or an `HegData[]` to use for sim
     * if no value given random session from pastSessions will be used;
     */
    async runSim() {
        if (!this.s.isSimMode) throw new Error('simMode not activated');

        // generate //
        const sessionStart = Date.now();
        let time = 0;
        time = time + rand(70, 200);
        // while

        // const { pastSessions } = this.s;
        // if (!pastSessions.length) throw new Error('no sessions to simulate');
        // // if (!pastSessions.length) // use a session from JSON // should not run in production
        // if (isType(data, 'undefined')) {
        //     const idx = rand(0, pastSessions.length - 1);
        //     data = pastSessions[idx].data;
        // }

        // if (isType(data, 'string')) {
        //     const x = arrGetByIds(pastSessions, [data]);
        //     if (!x.length) throw new Error('no session by id: ' + data + 'found');

        //     data = x[0].data;
        // }


        // if this.simData
        // if (isType(this.simData, 'array')) {
        //     const data = this.simData;
        //     const sessionStart = Date.now();
        //     const timeDiff = (sessionStart) - data[0].time;
        //     this.setState({ sessionStart })

        //     for (const x of data) {
        //         const waitForT = (x.time + timeDiff) - Date.now();
        //         if (waitForT > 0) await wait(waitForT);

        //         const val = { ...x, time: Date.now() };
        //         const sessionData = [...this.s.sessionData, val];
        //         this.setState({ sessionData, lastVal: val });
        //     }
        // }
    }

    async connect() {
        if (this.s.isSimMode) {
            this.setState({ isConnected: true });
            return true;
        }

        this.device = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'HEG' }],
            optionalServices: [serviceUUID]
        });

        const btServer = await this.device.gatt?.connect();
        if (!btServer) throw new Error('no connection');
        this.server = btServer;

        const service = await this.server.getPrimaryService(serviceUUID);

        // Send command to start HEG automatically (if not already started)
        this.cmdChar = await service.getCharacteristic(rxUUID);
        this.characteristic = await service.getCharacteristic(txUUID);

        this.hegValueChangeHandler = new HegEventHandler(
            this.characteristic, this.setState
        )

        this.setState({ isConnected: true });
        return true;
    }

    async disconnect() {
        if (this.s.isSimMode) {
            this.setState({ isConnected: false });
            return true;
        }

        await this.stopReadingHEG();
        this.server?.disconnect();
        this.setState({ isConnected: false });
        return true;
    }

    /** In sim mode will run random data */
    async startReadingHEG() {
        if (this.s.isSimMode) {
            this.setState({ isReading: true });
            return true;
        }

        if (!this.characteristic) throw new Error('HEG not connected');
        if (!this.hegValueChangeHandler) throw new Error('"this.hegValueChangeHandler" not set');

        await this.sendCommand('o'); // 20bit
        await this.sendCommand('t');
        this.setState({ isReading: true });

        this.hegValueChangeHandler.start();
        return true
    }

    async stopReadingHEG() {
        if (this.s.isSimMode) {
            this.setState({ isReading: false });
            return true;
        }

        const { sessionStart, sessionData, pastSessions } = this.s;
        this.hegValueChangeHandler?.end();
        await this.sendCommand('f');
        this.setState({ isReading: false });

        if (sessionData.length) this.setState({
            pastSessions: [...pastSessions, {
                start: sessionStart,
                end: Date.now(),
                data: sessionData,
                id: uiid(),
            }],
            sessionStart: 0,
            sessionData: []
        });
        return true;
    }

    /**
     * Copies sessions to clipboard in JSON.
     *
     * Will no copy data from an ongoing session. To do so stop the current
     * session first.
     * @param ids give id(s) of sessions to copy to clipboard
     */
    copySessionsToClipboard(ids?: string | string[]) {
        ids = isType(ids, 'string') ? [ids] : ids;
        const sessions = this.s.pastSessions;
        const data: HegSession[] = ids ? arrGetByIds(sessions, ids) : sessions;

        copyToClipboard(JSON.stringify(data, null, 4));
    }

    // add function to download JSON file, where a [DOWNLOAD] button appears
    // for the user to click.

    /** send a command by string:
     * (in) --DEVICE INSTRUCTIONS--
     * https://github.com/moothyknight/HEG_ESP32/blob/master/Device_README.txt
     */
    async sendCommand(msg: string) {
        if (!this.cmdChar) {
            console.log('HEG not connected');
            throw new Error('error');
        }

        await this.cmdChar.writeValue(encoder.encode(msg));
        return true;
    }

    toggleBtStats = (bool = !this.s.showBtStats) =>
        this.setState({ showBtStats: bool });
}
