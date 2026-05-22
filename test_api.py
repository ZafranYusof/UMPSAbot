import sys, json, time
sys.stdout.reconfigure(encoding='utf-8')
import urllib.request

API = 'http://localhost:5005/api/chat'
questions = [
    "Bila exam semester 2 2025/2026?",
    "Bila mid-semester break?",
    "Bila kuliah bermula semester 1 2026/2027?",
    "Bila pendaftaran pelajar baru?",
    "Apa public holidays semester ni?",
    "Apa jadual kelas hari Isnin?",
    "Apa courses yang ada sem ni?",
    "Kelas AI Techniques bila?",
    "Macam mana nak apply hostel?",
    "Apa contact number UMPSA?",
    "UMPSA ada berapa kampus?",
    "Apa email untuk admission?",
    "Apa programme yang ditawarkan UMPSA?",
    "Macam mana nak guna ADAB app?",
    "Macam mana nak bayar yuran?",
    "Apa itu UMPSA?",
    "Siapa chancellor UMPSA?",
    "Hello",
]

results = []
for i, q in enumerate(questions):
    try:
        data = json.dumps({"message": q, "conversationId": f"test-{i}"}).encode()
        req = urllib.request.Request(API, data=data, headers={"Content-Type": "application/json"})
        resp = urllib.request.urlopen(req, timeout=30)
        body = json.loads(resp.read().decode())
        msg = body.get('message', '')[:250]
        conf = body.get('confidence', 'N/A')
        results.append(f"Q{i+1}: {q}\nA: {msg}\nConfidence: {conf}\n")
    except Exception as e:
        results.append(f"Q{i+1}: {q}\nERROR: {e}\n")
    time.sleep(1)

for r in results:
    print(r)
    print("---")
