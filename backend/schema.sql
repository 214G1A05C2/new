-- ========== USERS ==========
DROP TABLE IF EXISTS status_updates CASCADE;
DROP TABLE IF EXISTS subtasks CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('admin','manager','member')),
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT NOW()
);

-- ========== MAIN TASKS ==========
CREATE TABLE tasks (
    task_id            SERIAL PRIMARY KEY,
    title               VARCHAR(255) NOT NULL,
    resource_id         INT NOT NULL REFERENCES users(user_id),   -- assigned team member
    expected_end_date   DATE NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'Not Started'
                         CHECK (status IN ('Not Started','In-Progress','Done')),
    created_by          INT NOT NULL REFERENCES users(user_id),   -- manager
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_tasks_resource ON tasks(resource_id);
CREATE INDEX idx_tasks_date ON tasks(expected_end_date);

-- ========== SUB TASKS ==========
CREATE TABLE subtasks (
    subtask_id          SERIAL PRIMARY KEY,
    task_id             INT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL,
    expected_end_date   DATE NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'Not Started'
                         CHECK (status IN ('Not Started','In-Progress','Done')),
    environment         VARCHAR(10) CHECK (environment IN ('Dev','Prod')),
    area                VARCHAR(20) CHECK (area IN ('Backend','UI')),
    created_by          INT NOT NULL REFERENCES users(user_id),   -- team member
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_subtasks_task ON subtasks(task_id);

-- ========== DATE-WISE STATUS LOG ==========
CREATE TABLE status_updates (
    update_id     SERIAL PRIMARY KEY,
    subtask_id    INT NOT NULL REFERENCES subtasks(subtask_id) ON DELETE CASCADE,
    update_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    description   VARCHAR(2000) NOT NULL,
    created_by    INT NOT NULL REFERENCES users(user_id),
    created_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE (subtask_id, update_date)   -- one entry per subtask per day
);
CREATE INDEX idx_status_updates_subtask_date ON status_updates(subtask_id, update_date DESC);

-- ========== updated_at trigger (reuse for both tables) ==========
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_updated ON tasks;
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  
DROP TRIGGER IF EXISTS trg_subtasks_updated ON subtasks;
CREATE TRIGGER trg_subtasks_updated BEFORE UPDATE ON subtasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Reporting Views
DROP VIEW IF EXISTS v_task_board CASCADE;
CREATE VIEW v_task_board AS
SELECT t.task_id, t.title, u.name AS resource_name, t.expected_end_date,
       t.status, t.created_at
FROM tasks t JOIN users u ON u.user_id = t.resource_id
ORDER BY t.expected_end_date DESC, u.name ASC;

DROP VIEW IF EXISTS v_member_grid CASCADE;
CREATE VIEW v_member_grid AS
SELECT s.subtask_id, t.title AS main_task, t.expected_end_date AS main_due,
       s.title AS sub_task, s.expected_end_date AS sub_due,
       s.status, s.environment, s.area,
       (SELECT su.description FROM status_updates su
        WHERE su.subtask_id = s.subtask_id
        ORDER BY su.update_date DESC LIMIT 1) AS latest_status_desc,
       t.resource_id
FROM subtasks s JOIN tasks t ON t.task_id = s.task_id;

DROP VIEW IF EXISTS v_status_history CASCADE;
CREATE VIEW v_status_history AS
SELECT subtask_id, update_date, description
FROM status_updates
ORDER BY subtask_id, update_date DESC;

-- Seed Data (Users)
-- We will insert manager with user_id 1
INSERT INTO users (user_id, name, email, password_hash, role) VALUES
(1, 'Manager Admin', 'admin@ezmedtech.ai', '$2b$12$KkQ1/H2Hw804Q/20W2Yc5OkTq2w6V7D1FwL.Cj6/4J/9pS.jH5s42', 'manager')
ON CONFLICT DO NOTHING;

INSERT INTO users (user_id, name, email, password_hash, role) VALUES
(2, 'Hari Krishna',   'hari.krishna@ezmedtech.ai',   '$2b$12$KkQ1/H2Hw804Q/20W2Yc5OkTq2w6V7D1FwL.Cj6/4J/9pS.jH5s42', 'member'),
(3, 'Manjunath K',    'manjunath.k@ezmedtech.ai',    '$2b$12$KkQ1/H2Hw804Q/20W2Yc5OkTq2w6V7D1FwL.Cj6/4J/9pS.jH5s42', 'member'),
(4, 'Gowri Shankar',  'gowri.shankar@ezmedtech.ai',  '$2b$12$KkQ1/H2Hw804Q/20W2Yc5OkTq2w6V7D1FwL.Cj6/4J/9pS.jH5s42', 'member'),
(5, 'Jeeru V',        'jeeru.v@ezmedtech.ai',        '$2b$12$KkQ1/H2Hw804Q/20W2Yc5OkTq2w6V7D1FwL.Cj6/4J/9pS.jH5s42', 'member'),
(6, 'Yasaswini P',    'yasaswini.p@ezmedtech.ai',    '$2b$12$KkQ1/H2Hw804Q/20W2Yc5OkTq2w6V7D1FwL.Cj6/4J/9pS.jH5s42', 'member'),
(7, 'Keval S',        'keval.s@ezmedtech.ai',        '$2b$12$KkQ1/H2Hw804Q/20W2Yc5OkTq2w6V7D1FwL.Cj6/4J/9pS.jH5s42', 'member')
ON CONFLICT DO NOTHING;

-- Reset sequence for users
SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

-- Seed Tasks
INSERT INTO tasks (title, resource_id, expected_end_date, status, created_by) VALUES
('Core schema & migrations',            2, '2026-07-10', 'Not Started', 1),
('Auth + Manager Task APIs',            3, '2026-07-15', 'Not Started', 1),
('Manager screens (Assign + Board)',    4, '2026-07-18', 'Not Started', 1),
('Member APIs + Grid screen',           5, '2026-07-22', 'Not Started', 1),
('Status-history UX + validation',      6, '2026-07-20', 'Not Started', 1),
('Reports + deployment',                7, '2026-07-28', 'Not Started', 1);
