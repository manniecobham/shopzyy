import { requireOptionalNativeModule } from 'expo-modules-core';

export interface Fragment { text: string; x: number; y: number; width: number; height: number }
export interface Recognition { width: number; height: number; fragments: Fragment[] }

interface Native { recognize(path: string): Promise<Recognition> }

const native = requireOptionalNativeModule<Native>('ReceiptOcr');

export const ReceiptOcr = native ? { recognize: (path: string) => native.recognize(path) } : null;
