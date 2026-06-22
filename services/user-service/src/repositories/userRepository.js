const fs = require('node:fs');
const path = require('node:path');

class UserRepository {
  constructor(filePath) {
    this.filePath = filePath;
    this.#initialize();
  }

  #initialize() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '[]', 'utf8');
    }
  }

  #read() {
    return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
  }

  #write(users) {
    fs.writeFileSync(this.filePath, JSON.stringify(users, null, 2), 'utf8');
  }

  findAll() {
    return this.#read();
  }

  findById(id) {
    return this.#read().find((user) => user.id === id) || null;
  }

  findByEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();
    return this.#read().find((user) => user.email === normalizedEmail) || null;
  }

  create(user) {
    const users = this.#read();
    users.push(user);
    this.#write(users);
    return user;
  }
}

module.exports = { UserRepository };

