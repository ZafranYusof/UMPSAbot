const http = require('http');
const fs = require('fs');

const questions = [
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
    const data = JSON.stringify({ message, conversationId: "test-batch2-" + Date.now() });
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

async function runTests() {
  const results = [];
  
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    process.stdout.write(`[${i+1}/${questions.length}] ${q.substring(0,50)}... `);
    try {
      const res = await sendQuestion(q);
      const responseText = res.response || res.reply || res.answer || res.message || JSON.stringify(res);
      const confidence = res.confidence !== undefined ? res.confidence : (res.score !== undefined ? res.score : 'N/A');
      results.push({ num: i + 15, question: q, response: responseText.substring(0, 500), confidence });
      process.stdout.write(`OK (conf: ${confidence})\n`);
    } catch (e) {
      results.push({ num: i + 15, question: q, response: `ERROR: ${e.message}`, confidence: 'N/A' });
      process.stdout.write(`FAIL: ${e.message}\n`);
    }
    // Save progress after each question
    fs.writeFileSync('C:\\Users\\zafra\\umpsa-chatbot\\test-progress-batch2.json', JSON.stringify(results, null, 2));
    // Wait 5s between requests to avoid rate limiting
    if (i < questions.length - 1) {
      process.stdout.write('  (waiting 5s...)\n');
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  console.log(`\nBatch 2 done! ${results.length} results saved.`);
}

runTests().catch(e => { console.error(e); process.exit(1); });
