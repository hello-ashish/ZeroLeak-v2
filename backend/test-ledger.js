import axios from "axios";
async function test() {
    try {
        const loginRes = await axios.post("http://localhost:4000/api/admin/login", { email: "admin@zeroleak.com", password: "password123" });
        const token = loginRes.data.token;
        const ledgerRes = await axios.get("http://localhost:4000/api/blockchain/ledger", { headers: { Authorization: `Bearer ${token}` } });
        console.log(JSON.stringify(ledgerRes.data, null, 2));
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
test();
