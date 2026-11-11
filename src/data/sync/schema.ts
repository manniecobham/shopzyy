/**
 * Firestore layout (the Firebase equivalent of "one CloudKit zone per household"):
 *
 *   households/{householdID}                  household fields + ownerUID + memberUIDs[]
 *   households/{householdID}/members/{key}    key = the person's stable user key
 *   households/{householdID}/options/{id}     custom categories / rooms
 *   households/{householdID}/items/{id}       catalog entries + list entries
 *   households/{householdID}/purchases/{id}   immutable purchase facts
 *   households/{householdID}/tripTotals/{id}  shopping-trip totals
 *   households/{householdID}/assets/banner    { data: <base64 JPEG> } (kept out of the household doc)
 *   invites/{code}                            { householdID, createdBy, expiresAt } (Cloud Function only)
 *   users/{uid}                               { migrationState, ... } (owner read/write)
 *
 * References between records are stored as keys (member key / option id / item id), exactly
 * like the CloudKit records did, so a delete never cascades by accident.
 */
export type SubCollection = 'members' | 'options' | 'items' | 'purchases' | 'tripTotals';

/** Order docs are applied in, so references (item → member, purchase → item) usually resolve on first pass. */
export const APPLY_ORDER: SubCollection[] = ['members', 'options', 'items', 'purchases', 'tripTotals'];

export const HOUSEHOLDS = 'households';
export const BANNER_PATH = 'assets/banner';
