export type HegData = {
    sma2s: number;
    sma10s: number;
    sma1m: number;
    sma5m: number;
    sma10m: number;
    time: number;
    red: number;
    ir: number;
    ratio: number;
    sma3: number;
}

export type HegSession = {
    start: number,
    end: number,
    data: HegData[],
    id: string
}
;
export type HegState = {
    showBtStats: boolean;
    SPS: number;
    ufSPS: number;
    spsErrors: number;
} & HegStateI;

export type HegSimState = {} & HegStateI;

/** [red, ir, ratio] */
export type HegTuple = [number, number, number];

export interface HegConnectionI {
    connect(): Promise<boolean>;
    disconnect(): Promise<void>;
    startReadingHEG(): Promise<void>;
    stopReadingHEG(): Promise<void>;
}

export interface HegStateI {
    pastSessions: HegSession[];
    sessionData: HegData[];
    isReading: boolean;
    isConnected: boolean;
    lastVal: HegData;
    sessionStart: number;
}

