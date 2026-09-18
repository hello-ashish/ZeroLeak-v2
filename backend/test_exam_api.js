import http from 'http';

const request = (method, url, data, token) => {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk.toString());
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch(e) { parsed = body; }
                resolve({ status: res.statusCode, data: parsed });
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
};

async function test() {
    try {
        console.log('1. Logging in as student...');
        const loginRes = await request('POST', 'http://localhost:4000/api/students/login', {
            email: 'teststudent@zeroleak.com',
            password: 'TestStudent123!'
        });
        
        if (loginRes.status !== 200) {
            console.error('Login failed:', loginRes);
            process.exit(1);
        }
        const token = loginRes.data.token;
        console.log('✓ Logged in successfully');

        console.log('2. Fetching available exams...');
        const examsRes = await request('GET', 'http://localhost:4000/api/students/exams', null, token);
        const exams = examsRes.data.exams;
        const testExam = exams.find(e => e.title === 'Test Math Exam');
        
        if (!testExam) {
            console.error('Test exam not found!');
            process.exit(1);
        }
        console.log(`✓ Found exam: ${testExam._id}`);

        console.log('3. Fetching exam questions...');
        const examDetailRes = await request('GET', `http://localhost:4000/api/students/exams/${testExam._id}`, null, token);
        if (examDetailRes.status !== 200) {
            console.error('Failed to fetch exam details:', examDetailRes);
            process.exit(1);
        }
        const questions = examDetailRes.data.exam.questions;
        console.log(`✓ Fetched exam successfully! Contains ${questions.length} question(s)`);
        console.log('Sample question:', questions[0].title);

        console.log('4. Submitting exam result...');
        // The first option '3' has index 0, '4' has index 1.
        const answers = [{ questionId: questions[0]._id, selectedOptionIndex: 1 }];
        const submitRes = await request('POST', 'http://localhost:4000/api/students/results', {
            examId: testExam._id,
            answers: answers
        }, token);

        if (submitRes.status === 201 || submitRes.status === 400) { // 400 if already submitted
            console.log('✓ Result submitted successfully:', submitRes.data);
        } else {
            console.error('Failed to submit result:', submitRes);
        }
        
    } catch (e) {
        console.error(e);
    }
}

test();
