-- PGame Messenger schema
CREATE TABLE IF NOT EXISTS conversations (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS conversation_members (conversation_id INTEGER NOT NULL,user_id INTEGER NOT NULL,last_read_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (conversation_id,user_id),FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT,conversation_id INTEGER NOT NULL,sender_id INTEGER NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,deleted_at TEXT,FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id,id);
