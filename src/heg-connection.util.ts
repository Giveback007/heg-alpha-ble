import { average } from '@giveback007/util-lib';
import type { HegData, HegTuple } from './@types';

export const sma = (arr: number[], n: number) => average(arr.slice(-1 * n))

/** ms seconds to starts from */
export function timeSma(data: HegData[], ms: number) {
    const len = data.length;
    if (!len) return 0;

    const fromTime = data[len - 1].time - ms;
    return ratioFromTime(data, fromTime);
}

/** From unix ms time */
export function ratioFromTime(data: HegData[], fromTime: number) {
    const x: HegData[] = [];

    let i = data.length - 1;
    while (i > 0 && data[i].time >= fromTime) {
        x.push(data[i]);
        i--;
    }

    return average(x.map(y => y.sma3)) || 0;
}

export function genHegData(newVal: HegTuple, time: number, data: HegData[]): HegData {
    const val = {
        time,
        red: newVal[0],
        ir: newVal[1],
        ratio: newVal[2],
    } as HegData;

    const ratios3 = [...(data.slice(-2).map(x => x.ratio)), val.ratio];
    val.sma3 = sma(ratios3, 3);

    return val;
};
