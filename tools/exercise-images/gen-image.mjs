// node gen-image.mjs <ref.png> <prompt.txt> <out.png> <WxH>
import fs from 'node:fs';
const [ref, promptFile, out, size] = process.argv.slice(2);
const form = new FormData();
form.append('model', 'gpt-image-2');
form.append('prompt', fs.readFileSync(promptFile, 'utf8'));
form.append('size', size);
form.append('quality', 'medium');
form.append('image', new Blob([fs.readFileSync(ref)], { type: 'image/png' }), 'ref.png');
const res = await fetch('https://api.openai.com/v1/images/edits', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  body: form,
});
const json = await res.json();
if (!res.ok) { console.error(out, res.status, JSON.stringify(json.error ?? json).slice(0, 400)); process.exit(1); }
fs.writeFileSync(out, Buffer.from(json.data[0].b64_json, 'base64'));
console.log('wrote', out);
