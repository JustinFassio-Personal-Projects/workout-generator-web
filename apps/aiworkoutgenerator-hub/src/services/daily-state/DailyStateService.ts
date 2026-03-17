import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { getDbInstance } from "@/lib/firestore";
import type { UserDailyState } from "@/types/firestore";
import {
  buildDailyStateDoc,
  dailyStatePatchSchema,
  type DailyStatePatchInput,
} from "@/lib/validation/dailyStateSchemas";

export class DailyStateService {
  static dailyStateDoc(uid: string, dateISO: string) {
    return doc(getDbInstance(), "user_daily_state", `${uid}_${dateISO}`);
  }

  static async getUserDailyState(
    uid: string,
    dateISO: string
  ): Promise<UserDailyState | null> {
    const snap = await getDoc(DailyStateService.dailyStateDoc(uid, dateISO));
    return snap.exists() ? (snap.data() as UserDailyState) : null;
  }

  static async upsertUserDailyState(
    uid: string,
    dateISO: string,
    patchInput: DailyStatePatchInput
  ): Promise<void> {
    const patch = dailyStatePatchSchema.parse(patchInput);
    const ref = DailyStateService.dailyStateDoc(uid, dateISO);
    const existing = await getDoc(ref);

    const createdAt = existing.exists()
      ? ((existing.data() as Partial<UserDailyState>)?.created_at ??
        (serverTimestamp() as unknown as UserDailyState["created_at"]))
      : (serverTimestamp() as unknown as UserDailyState["created_at"]);

    const payload = buildDailyStateDoc({
      uid,
      dateISO,
      patch,
      created_at: createdAt,
      updated_at: serverTimestamp() as unknown as UserDailyState["updated_at"],
      saved_at_datetime: new Date().toISOString(), // Always update to current time on save
    });

    await setDoc(ref, payload as unknown as Record<string, unknown>, {
      merge: true,
    });
  }
}
