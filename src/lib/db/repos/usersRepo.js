import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { getAdapter } from "../driver.js";

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    isActive: row.isActive === 1 || row.isActive === true,
    createdAt: row.createdAt,
  };
}

export async function getUsers() {
  const db = await getAdapter();
  const rows = db.all(`SELECT id, username, role, isActive, createdAt FROM users ORDER BY createdAt ASC`);
  return rows.map(rowToUser);
}

export async function getUserById(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT id, username, role, isActive, createdAt FROM users WHERE id = ?`, [id]);
  return rowToUser(row);
}

export async function getUserByUsername(username) {
  const db = await getAdapter();
  const row = db.get(`SELECT id, username, role, isActive, createdAt FROM users WHERE username = ?`, [username]);
  return rowToUser(row);
}

// Login-only: includes passwordHash.
export async function getUserAuthByUsername(username) {
  const db = await getAdapter();
  return db.get(`SELECT * FROM users WHERE username = ?`, [username]) || null;
}

export async function createUser({ username, password, role = "member" }) {
  if (!username || !password) throw new Error("username and password are required");
  const db = await getAdapter();
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    username,
    role: role === "admin" ? "admin" : "member",
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  try {
    db.run(
      `INSERT INTO users(id, username, passwordHash, role, isActive, createdAt) VALUES(?, ?, ?, ?, ?, ?)`,
      [user.id, user.username, passwordHash, user.role, 1, user.createdAt]
    );
  } catch (e) {
    if (/UNIQUE/i.test(e.message)) {
      const err = new Error("Username already exists");
      err.status = 409;
      throw err;
    }
    throw e;
  }
  return user;
}

export async function updateUser(id, data = {}) {
  const db = await getAdapter();
  let result = null;
  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!row) return;
    const merged = {
      role: data.role != null ? (data.role === "admin" ? "admin" : "member") : row.role,
      isActive: data.isActive != null ? (data.isActive ? 1 : 0) : row.isActive,
      passwordHash: passwordHash || row.passwordHash,
    };
    db.run(
      `UPDATE users SET role = ?, isActive = ?, passwordHash = ? WHERE id = ?`,
      [merged.role, merged.isActive, merged.passwordHash, id]
    );
    result = rowToUser({ ...row, ...merged });
  });
  return result;
}

export async function deleteUser(id) {
  const db = await getAdapter();
  let changed = false;
  db.transaction(() => {
    db.run(`UPDATE apiKeys SET ownerUserId = NULL WHERE ownerUserId = ?`, [id]);
    const res = db.run(`DELETE FROM users WHERE id = ?`, [id]);
    changed = (res?.changes ?? 0) > 0;
  });
  return changed;
}

export async function validateUserCredentials(username, password) {
  if (!username || !password) return null;
  const row = await getUserAuthByUsername(username);
  if (!row) return null;
  if (!(row.isActive === 1 || row.isActive === true)) return null;
  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) return null;
  return { id: row.id, username: row.username, role: row.role };
}
