import { readCache, writeCache } from "./storageCache";

const SELECTED_PROGRAMME_KEY = "pmub.selectedProgramme.v1";

let selectedProgrammeId: string | null = null;
let loaded = false;
const listeners = new Set<(raceId: string | null) => void>();

export async function getSelectedProgrammeId(): Promise<string | null> {
  if (loaded) return selectedProgrammeId;
  selectedProgrammeId = await readCache<string>(SELECTED_PROGRAMME_KEY);
  loaded = true;
  return selectedProgrammeId;
}

export function setSelectedProgrammeId(raceId: string | null) {
  if (selectedProgrammeId === raceId) return;
  selectedProgrammeId = raceId;
  loaded = true;
  writeCache(SELECTED_PROGRAMME_KEY, raceId);
  listeners.forEach((listener) => listener(raceId));
}

export function subscribeSelectedProgramme(listener: (raceId: string | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
