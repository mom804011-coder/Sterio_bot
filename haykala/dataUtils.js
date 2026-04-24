const fs = require('fs');
const { join } = require('path');
const crypto = require('crypto');

const filePath = join(process.cwd(), 'data', '3dd.json');
const secret = crypto.createHash('sha256').update('DJN').digest(); 
const iv = Buffer.alloc(16, 0); 

function encrypt(data) {
  const cipher = crypto.createCipheriv('aes-256-ctr', secret, iv);
  return Buffer.concat([cipher.update(data.toString()), cipher.final()]).toString('hex');
}

function decrypt(encrypted) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-ctr', secret, iv);
    return parseInt(Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'hex')),
      decipher.final()
    ]).toString(), 10);
  } catch (e) {
    return 0;
  }
}

function getUniqueKicked() {
  if (!fs.existsSync(filePath)) return new Set();

  const raw = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(raw);
  const decryptedIds = Object.keys(json).map(decrypt);
  return new Set(decryptedIds);
}

function addKicked(ids) {
  const uniqueIds = getUniqueKicked();
  let changed = false;

  ids.forEach(id => {
    if (!uniqueIds.has(id)) {
      uniqueIds.add(id);
      changed = true;
    }
  });

  if (changed) {
    const obj = {};
    [...uniqueIds].forEach(id => {
      obj[encrypt(id)] = true;
    });

    fs.writeFileSync(filePath, JSON.stringify(obj));
  }

  return [...uniqueIds].length;
}

module.exports = { addKicked, getUniqueKicked };