import http from 'http';

http.get('http://localhost:4000/api/integrity/fabric-status', (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
