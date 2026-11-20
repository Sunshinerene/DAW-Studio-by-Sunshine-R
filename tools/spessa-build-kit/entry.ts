import { SoundBankLoader, SpessaSynthProcessor, SpessaLog } from "./spessasynth_core-master/src/index.ts";
(globalThis as any).SpessaCore = { SoundBankLoader, SpessaSynthProcessor, SpessaLog };
