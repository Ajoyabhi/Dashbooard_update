#!/bin/bash
set -e

# ==============================================================
# MongoDB Migration Script
# Old: Atlas cluster (accuzpay)
# New: Self-hosted MongoDB on this VPS
# ==============================================================

# ---- CONFIG: edit if needed ----
OLD_URI="mongodb+srv://ajoyabhi1_db_user:h6vcpmPBzRujnAfy@accuzpay.ma6d4ps.mongodb.net/?retryWrites=true&w=majority&appName=accuzpay"
NEW_URI="mongodb://adminUser:Jmlastro%402025@127.0.0.1:27017/?authSource=admin"
DUMP_DIR="./mongo_migration_dump_$(date +%Y%m%d_%H%M%S)"
# ---------------------------------

echo "==> Checking for mongodump/mongorestore..."
if ! command -v mongodump &> /dev/null; then
    echo "==> mongodb-database-tools not found. Installing..."
    sudo apt update
    sudo apt install -y mongodb-database-tools
fi

echo "==> Step 1: Dumping data from OLD cluster..."
mongodump --uri="$OLD_URI" --out="$DUMP_DIR"

echo "==> Dump complete. Databases found:"
ls "$DUMP_DIR"

echo ""
echo "==> Step 2: Restoring data into NEW MongoDB instance..."
mongorestore --uri="$NEW_URI" --drop "$DUMP_DIR"

echo ""
echo "==> Migration complete!"
echo "==> Dump files kept at: $DUMP_DIR (delete once you've verified the data)"
echo ""
echo "==> Verify with:"
echo "    mongosh \"$NEW_URI\""
echo "    show dbs"