#!/bin/sh
# Usage: scripts/check-functions.sh [production|development]
# Every callable must answer 401 "Sign in first". A 403 means Cloud Run is blocking it and sign-in fails in the app.
PROJECT="${1:-production}"
case "$PROJECT" in
  production) ID=shopzyy-19bc2 ;;
  development) ID=shopzyy-8e62c ;;
  *) echo "Use production or development"; exit 2 ;;
esac
FAILED=0
for f in createInvite joinHousehold leaveHousehold deleteHousehold deleteAccountData claimLegacyHousehold importLegacyRecords submitFeedback; do
  CODE=$(curl -s -m 20 -o /dev/null -w "%{http_code}" -X POST "https://us-central1-$ID.cloudfunctions.net/$f" -H 'Content-Type: application/json' -d '{"data":{}}')
  if [ "$CODE" = "401" ]; then echo "ok    $f"; else echo "FAIL  $f answered $CODE"; FAILED=1; fi
done
exit $FAILED
