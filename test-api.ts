const res = await fetch('http://localhost:8080/api/sessions');
console.log('Status:', res.status);
const data = await res.json();
console.log('Body:', JSON.stringify(data, null, 2));
