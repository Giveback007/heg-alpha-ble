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
    pastSessions: HegSession[];
    sessionData: HegData[];
    isReading: boolean;
    isConnected: boolean;
    lastVal: HegData;
    showBtStats: boolean;
    sessionStart: number;
    SPS: number;
    ufSPS: number;
    spsErrors: number;
}

/** [red, ir, ratio] */
export type HegTuple = [number, number, number];
