import bcrypt from 'bcryptjs';

const password = 'N1ner0ps';
const hash = bcrypt.hashSync(password, 10);

console.log('Password hash for N1ner0ps:');
console.log(hash);
