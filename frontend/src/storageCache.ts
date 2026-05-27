import AsyncStorage from "@react-native-async-storage/async-storage";

type CacheEnvelope<T> = {
  savedAt: string;
  value: T;
};

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    return parsed.value ?? null;
  } catch (e) {
    console.warn(`Cache read failed for ${key}`, e);
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ savedAt: new Date().toISOString(), value }),
    );
  } catch (e) {
    console.warn(`Cache write failed for ${key}`, e);
  }
}
