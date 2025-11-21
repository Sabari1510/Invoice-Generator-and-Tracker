(async ()=>{
  try {
    const base = 'http://localhost:5000/api';
    const registerBody = {
      name: 'Test Business',
      email: `test+api${Date.now()}@local.dev`,
      password: 'Testpass123',
      userType: 'business',
      businessInfo: {
        businessName: 'TestCo API',
        businessEmail: 'billing@testco.local',
        businessPhone: '9876543210',
        website: 'https://testco.local',
        businessAddress: { street: '1 Test St', city: 'Testville', state: 'TS', zipCode: '123456', country: 'India' }
      }
    };

    const fetchJson = async (url, opts)=>{
      const res = await fetch(url, opts);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { data = text; }
      return { status: res.status, data };
    };

    console.log('Registering user...');
    let r = await fetchJson(base + '/auth/register', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(registerBody) });
    console.log('Register:', r.status, r.data);

    console.log('Logging in...');
    const loginBody = { email: registerBody.email, password: registerBody.password };
    r = await fetchJson(base + '/auth/login', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(loginBody) });
    console.log('Login:', r.status, r.data);
    if (r.status !== 200) return;
    const token = r.data.token;

    console.log('Creating client...');
    const clientBody = { name: 'Client One', email: `client+${Date.now()}@local.test` };
    r = await fetchJson(base + '/clients', { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(clientBody) });
    console.log('Create client:', r.status, r.data);
    if (r.status !== 201 && r.status !== 200) return;
    const clientId = r.data.client._id;

    console.log('Creating invoice...');
    const today = new Date();
    const due = new Date(); due.setDate(today.getDate() + 7);
    const invoiceBody = {
      clientId,
      issueDate: today.toISOString(),
      dueDate: due.toISOString(),
      items: [{ description: 'Test item', quantity: 1, rate: 100 }]
    };
    r = await fetchJson(base + '/invoices', { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(invoiceBody) });
    console.log('Create invoice:', r.status, r.data);
  } catch (err) {
    console.error('Script error', err);
  }
})();
