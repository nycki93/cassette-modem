import http from 'node:http';
import fs from 'node:fs';
import { extname } from 'node:path';

const contentType = {
    '.html': 'text/html',
    '.js': 'text/javascript',
};

const server = http.createServer((req, res) => {
    const filename = req.url.trim().slice(1) || 'index.html';
    console.log(filename);
    if (!fs.existsSync(filename)) {
        res.writeHead(404);
        res.end();
        return;
    }
    const file = fs.readFileSync(filename);
    const type = contentType[extname(filename)] || 'text/plain';
    const headers = type ? { 'content-type': type } : {};
    res.writeHead(200, headers);
    res.write(file);
    res.end();
})

server.listen(8080);
console.log('Listening on http://localhost:8080');
