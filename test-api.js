const http = require('http');
const fs = require('fs');

const questions = [
  "Bila exam semester 2 2025/2026?",
  "Bila mid-semester break?",
  "Bila kuliah bermula semester 1 2026/2027?",
  "Bila pendaftaran pelajar baru?",
  "Apa public holidays semester ni?",
  "Apa jadual kelas hari Isnin?",
  "Apa courses yang ada sem ni?",
  "Kelas AI Techniques bila?",
  "Apa bilik untuk Software Engineering Practices?",
  "Macam mana nak apply hostel?",
  "Apa steps untuk permohonan hostel pelajar baru?",
  "Macam mana nak check availability hostel?",
  "Apa contact number UMPSA?",
  "UMPSA ada berapa kampus?",
  "Apa email untuk admission?",
  "Macam mana nak hubungi JHEPA?",
  "Apa programme yang ditawarkan UMPSA?",
  "Macam mana nak apply masuk UMPSA?",
  "Ada dual degree programme?",
  "Macam mana nak guna ADAB app?",
  "Apa features dalam E-Comm portal?",
  "Macam mana nak buat aduan?",
  "Macam mana nak bayar yuran?",
  "Apa contact untuk student finance?",
  "Apa itu UMPSA?",
  "Siapa chancellor UMPSA?",
  "Hello",
  "Terima kasih"
];

function sendQuestion(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message, conversationId: "test-session-" + Date.now() });
    const options = {
      hostname: 'localhost',
      port: 5005,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const timer = setTimeout(() => { req.destroy(); reject(new Error('timeout-60s')); }, 60000);

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve({ rawBody: body }); }
      });
    });

    req.on('error', (e) => { clearTimeout(timer); reject(e); });
    req.write(data);
    req.end();
  });
}

// Read existing progress
let results = [];
const progressFile = 'C:\\Users\\zafra\\umpsa-chatbot\\test-progress.json';
try { results = JSON.parse(fs.readFileSync(progressFile, 'utf8')); } catch(e) {}

const startIdx = results.length;
console.log(`Starting from question ${startIdx + 1}/${questions.length}`);

async function runTests() {
  for (let i = startIdx; i < questions.length; i++) {
    const q = questions[i];
    process.stdout.write(`[${i+1}/${questions.length}] ${q.substring(0,50)}... `);
    try {
      const res = await sendQuestion(q);
      const responseText = res.response || res.reply || res.answer || res.message || JSON.stringify(res);
      const confidence = res.confidence !== undefined ? res.confidence : (res.score !== undefined ? res.score : 'N/A');
      results.push({ num: i+1, question: q, response: responseText.substring(0, 500), confidence });
      process.stdout.write(`OK (conf: ${confidence})\n`);
    } catch (e) {
      results.push({ num: i+1, question: q, response: `ERROR: ${e.message}`, confidence: 'N/A' });
      process.stdout.write(`FAIL: ${e.message}\n`);
    }
    // Save progress after each question
    fs.writeFileSync(progressFile, JSON.stringify(results, null, 2));
    // Wait 1s between requests
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log(`\nAll done! ${results.length} results saved.`);
}

runTests().catch(e => { console.error(e); process.exit(1); });
