-- ==========================================
--  FITNESS TRACKER – PUNA SHEMA (aktualna)
--  Node/Express + MySQL + Vue
--  Sadrži lock mehanizam i zaštitu 1RM duplikata
-- ==========================================

-- (1) Kreiraj bazu i pređi na nju
CREATE DATABASE IF NOT EXISTS fitness_tracker
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE fitness_tracker;

-- (2) Sigurno dropanje tablica po redu ovisnosti
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS workout_sets;
DROP TABLE IF EXISTS workout_exercises;
DROP TABLE IF EXISTS one_rep_maxes;
DROP TABLE IF EXISTS workouts;
DROP TABLE IF EXISTS exercises;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- (3) USERS
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(80) NOT NULL,
  role ENUM('KORISNIK','ADMIN') NOT NULL DEFAULT 'KORISNIK',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- (4) EXERCISES
CREATE TABLE exercises (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  body_part ENUM('PRSA','LEDJA','NOGE','BICEPS','TRICEPS','RAMENA') NOT NULL,
  short_desc VARCHAR(300),
  how_to TEXT,
  youtube_url VARCHAR(255),
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ex_body_part (body_part)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- (5) WORKOUTS (dodano is_locked)
CREATE TABLE workouts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(160) NOT NULL,
  workout_date DATE NOT NULL,
  notes TEXT,
  is_locked TINYINT(1) NOT NULL DEFAULT 0,  -- 0=može se uređivati, 1=zaključan
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_workouts_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_workouts_user_date (user_id, workout_date),
  INDEX idx_workouts_locked (is_locked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- (6) WORKOUT_EXERCISES (dodano locked + completed_at)
CREATE TABLE workout_exercises (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workout_id BIGINT UNSIGNED NOT NULL,
  exercise_id BIGINT UNSIGNED NOT NULL,
  order_index INT DEFAULT 0,
  planned_sets INT DEFAULT 0,
  planned_reps INT DEFAULT 0,
  locked TINYINT(1) NOT NULL DEFAULT 0,     -- 0=otključano, 1=zaključano (spremi vježbu)
  completed_at DATETIME NULL,               -- kada je vježba zaključana
  CONSTRAINT fk_wx_workout
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  CONSTRAINT fk_wx_exercise
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT,
  INDEX idx_wx_workout (workout_id),
  INDEX idx_wx_exercise (exercise_id),
  INDEX idx_wx_locked (locked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- (7) WORKOUT_SETS
CREATE TABLE workout_sets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workout_exercise_id BIGINT UNSIGNED NOT NULL,
  set_number INT NOT NULL,
  reps INT NOT NULL,
  weight DECIMAL(6,2) NULL,
  rest_seconds INT NULL,
  CONSTRAINT fk_ws_wx
    FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE,
  UNIQUE KEY uq_wx_set (workout_exercise_id, set_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- (8) ONE_REP_MAXES (1RM) + zaštita od duplikata
CREATE TABLE one_rep_maxes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  exercise_id BIGINT UNSIGNED NOT NULL,
  record_date DATE NOT NULL,
  weight DECIMAL(6,2) NOT NULL,
  note VARCHAR(200) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orm_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_orm_exercise
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT,
  INDEX idx_orm_user_ex_date (user_id, exercise_id, record_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Jedinstveno: isti user + vježba + datum + težina NE smije postojati 2x
CREATE UNIQUE INDEX uniq_orm_user_exercise_date_weight
  ON one_rep_maxes (user_id, exercise_id, record_date, weight);

-- (9) POČETNI PODACI ZA VJEŽBE
INSERT INTO exercises (name, body_part, short_desc, how_to, youtube_url) VALUES
('Bench press', 'PRSA',
 'Klasična višezglobna vježba za prsa.',
 'Ležeći na klupi spuštajte šipku do prsa te potisnite natrag.',
 'https://www.youtube.com/watch?v=rT7DgCr-3pg'),

('Incline Bench Press', 'PRSA',
 'Potisak na kosoj klupi aktivira gornji dio prsa.',
 'Namjestite kosinu 25–35°, spuštajte kontrolirano i potisnite bez odskoka.',
 'https://www.youtube.com/watch?v=DbFgADa2PL8'),

('Zgibovi', 'LEDJA',
 'Tijelo dižete iz visećeg položaja.',
 'Aktivirajte lopatice, držite jezgru čvrstom, bez zamaha.',
 'https://www.youtube.com/watch?v=eGo4IYlbE5g'),

('Čučanj', 'NOGE',
 'Osnovna vježba za noge i core.',
 'Stopala u širini kukova, kontrolirano spuštanje i podizanje.',
 'https://www.youtube.com/watch?v=aclHkVaku9U'),

('Biceps pregib bučicama', 'BICEPS',
 'Izolacijska vježba za biceps.',
 'Laktovi uz tijelo, bez ljuljanja, kontrolirano kretanje.',
 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo'),

('Triceps potisak na lat mašini', 'TRICEPS',
 'Potisak ručicom prema dolje.',
 'Laktovi fiksni, potisnuti do potpune kontrakcije.',
 'https://www.youtube.com/watch?v=2-LAMcpzODU'),

('Potisak iznad glave', 'RAMENA',
 'Vježba za prednje i srednje deltoide.',
 'Neutralna kralježnica, ne izvijati donja leđa.',
 'https://www.youtube.com/watch?v=B-aVuyhvLHU');

-- (10) (OPCIONALNO) DODAJ ADMIN KORISNIKA – ubaci SVOJ bcrypt hash
--    Hash mora odgovarati lozinki koju želiš.
--    Primjer (zamijeni :HASH: stvarnim bcrypt hashom):
-- INSERT INTO users (email, password_hash, username, role)
-- VALUES ('admin@example.com', ':HASH:', 'Admin', 'ADMIN');

-- (11) (OPCIONALNO) DODAJ DEMO KORISNIKA JOSIP (ako želiš ručno bez registracije)
--    123456 – ubaci svoj hash:
-- INSERT INTO users (email, password_hash, username, role)
-- VALUES ('josip@example.com', ':HASH:', 'Josip', 'KORISNIK');

-- GOTOVO
