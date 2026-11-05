PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS allowed_phones (
  phone TEXT PRIMARY KEY,
  added_date TEXT NOT NULL,
  added_by INTEGER,
  note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS users (
  chat_id INTEGER PRIMARY KEY,
  phone TEXT DEFAULT '',
  first_name TEXT DEFAULT '',
  student_name TEXT DEFAULT '',
  student_class TEXT DEFAULT '',
  blocked INTEGER DEFAULT 0,
  joined_date TEXT,
  last_seen TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_code TEXT DEFAULT '',
  full_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_name TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(full_name, class_name)
);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(parent_phone);

CREATE TABLE IF NOT EXISTS user_students (
  chat_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  is_active INTEGER DEFAULT 0,
  linked_at TEXT,
  PRIMARY KEY (chat_id, student_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_states (
  chat_id INTEGER PRIMARY KEY,
  pending TEXT,
  admin_state TEXT,
  form_data TEXT,
  cal_field TEXT,
  grade_register TEXT,
  reg_grade_list TEXT,
  event_form TEXT,
  student_temp TEXT,
  discipline_temp TEXT,
  active_student_id INTEGER,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS absences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER,
  student_id INTEGER,
  student_name TEXT,
  student_class TEXT,
  absence_date TEXT,
  absence_reason TEXT,
  parent_phone TEXT,
  status TEXT DEFAULT 'در انتظار',
  status_date TEXT,
  registered_by INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS leaves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER,
  student_id INTEGER,
  student_name TEXT,
  student_class TEXT,
  from_date TEXT,
  to_date TEXT,
  leave_reason TEXT,
  parent_phone TEXT,
  status TEXT DEFAULT 'در انتظار',
  status_date TEXT,
  registered_by INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  student_id INTEGER,
  student_name TEXT,
  student_class TEXT,
  grade_subject TEXT,
  request_date TEXT,
  request_month TEXT,
  parent_phone TEXT,
  status TEXT DEFAULT 'در انتظار',
  status_date TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS student_grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  student_id INTEGER,
  student_name TEXT,
  student_class TEXT,
  month TEXT NOT NULL,
  subject TEXT NOT NULL,
  g1 TEXT DEFAULT '-',
  g2 TEXT DEFAULT '-',
  g3 TEXT DEFAULT '-',
  g4 TEXT DEFAULT '-',
  g5 TEXT DEFAULT '-',
  register_date TEXT,
  registered_by INTEGER,
  UNIQUE(chat_id, month, subject)
);

CREATE TABLE IF NOT EXISTS discipline_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  student_name TEXT,
  class_name TEXT,
  category TEXT NOT NULL,
  severity TEXT DEFAULT 'عادی',
  description TEXT DEFAULT '',
  record_date TEXT NOT NULL,
  registered_by INTEGER,
  parent_phone TEXT,
  notify_status TEXT DEFAULT 'pending',
  notified_at TEXT,
  created_at TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_date TEXT,
  deadline TEXT,
  capacity INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT,
  created_by INTEGER
);

CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  chat_id INTEGER NOT NULL,
  student_id INTEGER,
  student_name TEXT,
  student_class TEXT,
  notes TEXT DEFAULT 'ندارد',
  parent_phone TEXT,
  reg_date TEXT,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_chat_id INTEGER NOT NULL,
  sender_type TEXT NOT NULL,
  parent_chat_id INTEGER NOT NULL,
  parent_name TEXT DEFAULT '',
  parent_class TEXT DEFAULT '',
  parent_phone TEXT DEFAULT '',
  text TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  read_at TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_name TEXT NOT NULL,
  day TEXT NOT NULL,
  lesson1 TEXT DEFAULT '',
  lesson2 TEXT DEFAULT '',
  lesson3 TEXT DEFAULT '',
  UNIQUE(class_name, day)
);

CREATE TABLE IF NOT EXISTS error_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER DEFAULT 0,
  level TEXT DEFAULT 'ERROR',
  context TEXT DEFAULT '',
  message TEXT DEFAULT '',
  stack TEXT DEFAULT '',
  created_at TEXT
);
