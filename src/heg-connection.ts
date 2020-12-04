import { isType, uiid, arrGetByIds } from '@giveback007/util-lib';
import { copyToClipboard, StateManager } from '@giveback007/browser-utils';
import { HegEventHandler } from './heg-event-handler';
import { render } from 'lit-html';
import { btStatsCSS, btStatsModal } from './bt-stats-modal';
import type { HegData, HegSession, HegState } from './@types';

const encoder = new TextEncoder();

const serviceUUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const rxUUID      = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const txUUID      = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

export class HegConnection extends StateManager<HegState> {

    private device: BluetoothDevice | null = null;
    private server: BluetoothRemoteGATTServer | null = null;
    private cmdChar: BluetoothRemoteGATTCharacteristic | null = null;
    private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
    private hegValueChangeHandler: HegEventHandler | null = null;

     private get s() { return this.getState(); }

     // simulated sessions do not get added to pastSessions array.
    constructor() {
        super({
            pastSessions: [],
            sessionData: [], // current session data
            sessionStart: 0, // current session start time
            isReading: false,
            isConnected: false,
            lastVal: { } as HegData,
            showBtStats: false,
            SPS: 0,
            ufSPS: 0,
            spsErrors: 0,
            simMode: false,
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
    }

    /** WARNING: DO NOT USE! */
    setState: StateManager<HegState>['setState'] = this.setState;

    simMode() {
        this.stopReadingHEG();
        this.disconnect();
        this.setState({ simMode: true })
    }

    async connect() {
        if (this.s.simMode) {
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
        if (this.s.simMode) {
            this.setState({ isConnected: false });
            return true;
        }

        await this.stopReadingHEG();
        this.server?.disconnect();
        this.setState({ isConnected: false });
        return true;
    }

    async startReadingHEG() {
        if (this.s.simMode) {
            this.setState({ isConnected: false });
            return true;
        }

        if (!this.characteristic) throw new Error('HEG not connected');
        if (!this.hegValueChangeHandler) throw new Error('this.hegValueChangeHandler not set');

        await this.sendCommand('o'); // 20bit
        await this.sendCommand('t');
        this.setState({ isReading: true });

        this.hegValueChangeHandler.start();
        return true
    }

    async stopReadingHEG() {
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
        })
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

        copyToClipboard(JSON.stringify(data));
    }

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
    }

    toggleBtStats = (bool = !this.s.showBtStats) => this.setState({ showBtStats: bool });
}
