import fetch from 'node-fetch';

async function run() {
  const activeKey = 'AIzaSyA6Og_smWn-6HKEbqmH4JaSNqCJ9hcPC98';
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${activeKey}`;
  const res = await fetch(url);
  const data = await res.json();
  const models = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent')).map(m => m.name);
  console.log(models);
}
run();
