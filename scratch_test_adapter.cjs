const { firebaseAdapter } = require('./src/firebaseAdapter');

async function testAdapter() {
  const newUser = {
    username: '39940',
    storeCode: '1841',
    password: 'password',
    status: 'active',
    paymentConfirmed: true,
    packageDays: 7,
    expiredAt: new Date().toISOString(),
    isDemo: false,
    declarationCompleted: false
  };

  console.log('1. Inserting user via adapter...');
  const res = await firebaseAdapter.from('ql_nguoi_dung').insert([newUser]);
  console.log('Insert result:', JSON.stringify(res, null, 2));

  console.log('2. Querying user via adapter...');
  const getRes = await firebaseAdapter.from('ql_nguoi_dung').select('*').eq('username', '39940').single();
  console.log('Query result:', JSON.stringify(getRes, null, 2));
}

testAdapter().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
