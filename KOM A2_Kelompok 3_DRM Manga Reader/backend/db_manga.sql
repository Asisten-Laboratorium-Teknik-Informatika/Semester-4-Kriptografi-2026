
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(191) NOT NULL,
  photo_url VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE comics (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  author VARCHAR(191) NOT NULL,
  cover_path VARCHAR(500) NOT NULL,
  status ENUM('ongoing', 'completed') NOT NULL DEFAULT 'ongoing',
  rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_comics_title (title),
  INDEX idx_comics_status (status)
) ENGINE=InnoDB;

CREATE TABLE genres (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE comic_genres (
  comic_id INT UNSIGNED NOT NULL,
  genre_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (comic_id, genre_id),
  CONSTRAINT fk_comic_genres_comic
    FOREIGN KEY (comic_id) REFERENCES comics(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_comic_genres_genre
    FOREIGN KEY (genre_id) REFERENCES genres(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE chapters (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comic_id INT UNSIGNED NOT NULL,
  number DECIMAL(8,2) NOT NULL,
  title VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_chapter_number (comic_id, number),
  INDEX idx_chapters_comic_number (comic_id, number),
  CONSTRAINT fk_chapters_comic
    FOREIGN KEY (comic_id) REFERENCES comics(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE chapter_pages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chapter_id INT UNSIGNED NOT NULL,
  page_index INT UNSIGNED NOT NULL,
  encrypted_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  byte_size INT UNSIGNED NOT NULL DEFAULT 0,
  sha256 CHAR(64) NOT NULL,
  key_base64 VARCHAR(100) NOT NULL,
  iv_base64 VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_chapter_page (chapter_id, page_index),
  INDEX idx_pages_chapter (chapter_id, page_index),
  CONSTRAINT fk_pages_chapter
    FOREIGN KEY (chapter_id) REFERENCES chapters(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE favorites (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  comic_id INT UNSIGNED NOT NULL,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_favorite (user_id, comic_id),
  INDEX idx_favorites_user (user_id),
  CONSTRAINT fk_favorites_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_favorites_comic
    FOREIGN KEY (comic_id) REFERENCES comics(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reading_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  comic_id INT UNSIGNED NOT NULL,
  chapter_id INT UNSIGNED NOT NULL,
  last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_history_latest (user_id, comic_id),
  INDEX idx_history_user_time (user_id, last_read_at),
  CONSTRAINT fk_history_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_history_comic
    FOREIGN KEY (comic_id) REFERENCES comics(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_history_chapter
    FOREIGN KEY (chapter_id) REFERENCES chapters(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE download_grants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  chapter_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_grant_lookup (token_hash, expires_at),
  CONSTRAINT fk_grants_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_grants_chapter
    FOREIGN KEY (chapter_id) REFERENCES chapters(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT IGNORE INTO genres (name) VALUES
  ('Action'),
  ('Adventure'),
  ('Comedy'),
  ('Drama'),
  ('Fantasy'),
  ('Horror'),
  ('Mystery'),
  ('Romance'),
  ('Sci-Fi'),
  ('Slice of Life'),
  ('Supernatural'),
  ('Thriller');
