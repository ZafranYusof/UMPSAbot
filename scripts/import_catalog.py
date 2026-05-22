"""
Import parsed course catalog data into MongoDB.
Reads catalog_data.json and inserts into the CourseSlot collection.
"""

import json
import sys

try:
    from pymongo import MongoClient
except ImportError:
    print("Installing pymongo...")
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pymongo[srv]'])
    from pymongo import MongoClient

MONGO_URI = "mongodb://hmremix123_db_user:jKT0FI8uuurZSQPh@ac-n5qymcj-shard-00-00.0j47hpz.mongodb.net:27017,ac-n5qymcj-shard-00-01.0j47hpz.mongodb.net:27017,ac-n5qymcj-shard-00-02.0j47hpz.mongodb.net:27017/umpsa-chatbot?replicaSet=atlas-bsn8ht-shard-0&ssl=true&authSource=admin"
DB_NAME = "umpsa-chatbot"
COLLECTION = "courseslots"
JSON_PATH = r"C:\Users\zafra\umpsa-chatbot\scripts\catalog_data.json"

BATCH_SIZE = 500  # Insert in batches to avoid timeouts


def main():
    # Load data
    print(f"Loading data from {JSON_PATH}...")
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        slots = json.load(f)
    
    print(f"Loaded {len(slots)} slots")
    
    # Connect to MongoDB
    print(f"Connecting to MongoDB...")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    
    # Test connection
    client.admin.command('ping')
    print("Connected successfully!")
    
    db = client[DB_NAME]
    collection = db[COLLECTION]
    
    # Clear existing data for both semesters
    semesters = ['SEM1-2025/2026', 'SEM2-2025/2026']
    for sem in semesters:
        result = collection.delete_many({"semester": sem})
        print(f"Cleared {result.deleted_count} existing slots for {sem}")
    
    # Prepare documents (match the Mongoose schema field names)
    docs = []
    for s in slots:
        doc = {
            "courseCode": s["courseCode"].upper().strip(),
            "courseName": s["courseName"].strip() if s["courseName"] else "",
            "section": s["section"].strip(),
            "type": s["type"].lower(),
            "day": s["day"].upper(),
            "startTime": s["startTime"],
            "endTime": s["endTime"],
            "venue": s.get("venue", ""),
            "semester": s["semester"],
            "capacity": s.get("capacity"),
        }
        docs.append(doc)
    
    # Insert in batches
    print(f"\nInserting {len(docs)} documents in batches of {BATCH_SIZE}...")
    total_inserted = 0
    
    for i in range(0, len(docs), BATCH_SIZE):
        batch = docs[i:i + BATCH_SIZE]
        try:
            result = collection.insert_many(batch, ordered=False)
            total_inserted += len(result.inserted_ids)
            if (i // BATCH_SIZE) % 5 == 0:
                print(f"  Batch {i // BATCH_SIZE + 1}: inserted {len(result.inserted_ids)} (total: {total_inserted})")
        except Exception as e:
            # Handle partial failures (duplicates etc)
            if hasattr(e, 'details') and 'nInserted' in e.details:
                total_inserted += e.details['nInserted']
                print(f"  Batch {i // BATCH_SIZE + 1}: partial insert ({e.details['nInserted']} of {len(batch)})")
            else:
                print(f"  Batch {i // BATCH_SIZE + 1} error: {e}")
    
    print(f"\nImport complete!")
    print(f"Total inserted: {total_inserted}")
    
    # Verify
    total_count = collection.count_documents({})
    sem1_count = collection.count_documents({"semester": "SEM1-2025/2026"})
    sem2_count = collection.count_documents({"semester": "SEM2-2025/2026"})
    unique_courses = len(collection.distinct("courseCode"))
    
    print(f"\nVerification:")
    print(f"  Total documents in collection: {total_count}")
    print(f"  SEM1-2025/2026: {sem1_count}")
    print(f"  SEM2-2025/2026: {sem2_count}")
    print(f"  Unique course codes: {unique_courses}")
    
    # Sample query
    sample = collection.find_one({"courseCode": "BCS2313", "semester": "SEM2-2025/2026"})
    if sample:
        print(f"\n  Sample (BCS2313 SEM2): {sample['section']} | {sample['type']} | {sample['day']} {sample['startTime']}-{sample['endTime']} | {sample['venue']}")
    
    client.close()
    print("\nDone!")


if __name__ == '__main__':
    main()
