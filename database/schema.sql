-- ============================================================
-- FARMPRO PIG - COMPLETE DATABASE SCHEMA
-- MYSQL 8+
-- ============================================================

DROP DATABASE IF EXISTS farmpro_pig;

CREATE DATABASE farmpro_pig
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE farmpro_pig;

-- ============================================================
-- 1. EMPLOYEES
-- ============================================================

CREATE TABLE employees (

    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    full_name VARCHAR(100) NOT NULL,

    phone VARCHAR(20) UNIQUE,

    email VARCHAR(100) UNIQUE,

    address TEXT,

    gender ENUM(
        'male',
        'female',
        'other'
    ) DEFAULT 'male',

    dob DATE,

    role ENUM(
        'ADMIN',
        'FARM_WORKER',
        'VET_DOCTOR'
    ) NOT NULL DEFAULT 'FARM_WORKER',

    status ENUM(
        'active',
        'inactive'
    ) NOT NULL DEFAULT 'active',

    deleted_at DATETIME NULL,

    created_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. ACCOUNTS
-- ============================================================

CREATE TABLE accounts (

    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    employee_id INT UNSIGNED NOT NULL,

    username VARCHAR(50) NOT NULL UNIQUE,

    password_hash VARCHAR(255) NOT NULL,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    last_login DATETIME,

    created_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_accounts_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ============================================================
-- 3. BARNS
-- ============================================================

CREATE TABLE barns (

    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    code VARCHAR(50) NOT NULL UNIQUE,

    name VARCHAR(100) NOT NULL,

    capacity INT UNSIGNED NOT NULL DEFAULT 0,

    barn_type ENUM(
        'nai',
        'duc',
        'con',
        'thit',
        'cach_ly'
    ) NOT NULL DEFAULT 'thit',

    status ENUM(
        'active',
        'inactive'
    ) NOT NULL DEFAULT 'active',

    note TEXT,

    deleted_at DATETIME NULL,

    created_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. FEEDS
-- ============================================================

CREATE TABLE feeds (

    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    brand VARCHAR(100),

    unit VARCHAR(50) NOT NULL DEFAULT 'kg',

    stock DECIMAL(10,2) NOT NULL DEFAULT 0,

    description TEXT,

    created_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. PIGS
-- ============================================================

CREATE TABLE pigs (

    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    pig_code VARCHAR(50) NOT NULL UNIQUE,

    name VARCHAR(100),

    barn_id INT UNSIGNED NOT NULL,

    category ENUM(
        'SOW',
        'BOAR',
        'PIGLET',
        'FATTENING'
    ) NOT NULL,

    lifecycle_status ENUM(
        'ACTIVE',
        'SOLD',
        'DEAD'
    ) NOT NULL DEFAULT 'ACTIVE',

    breed VARCHAR(100),

    gender ENUM(
        'male',
        'female'
    ) NOT NULL DEFAULT 'male',

    dob DATE,

    entry_date DATE NOT NULL,

    entry_weight DECIMAL(6,2),

    current_weight DECIMAL(6,2),

    note TEXT,

    deleted_at DATETIME NULL,

    created_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_pigs_barn
        FOREIGN KEY (barn_id)
        REFERENCES barns(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_pigs_barn (barn_id),

    INDEX idx_pigs_code (pig_code),

    INDEX idx_pigs_status (lifecycle_status)
);

-- ============================================================
-- 6. PIG MOVEMENTS
-- ============================================================

CREATE TABLE pig_movements (

    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    pig_id INT UNSIGNED NOT NULL,

    from_barn_id INT UNSIGNED,

    to_barn_id INT UNSIGNED,

    move_date DATE NOT NULL,

    staff_name VARCHAR(255),

    note TEXT,

    created_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pm_pig
        FOREIGN KEY (pig_id)
        REFERENCES pigs(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_pm_from
        FOREIGN KEY (from_barn_id)
        REFERENCES barns(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_pm_to
        FOREIGN KEY (to_barn_id)
        REFERENCES barns(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    INDEX idx_pm_pig (pig_id),

    INDEX idx_pm_date (move_date)
);

-- ============================================================
-- 7. MEDICINES
-- ============================================================

CREATE TABLE medicines (

    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(200) NOT NULL,

    unit VARCHAR(50) NOT NULL,

    stock DECIMAL(10,2) NOT NULL DEFAULT 0,

    import_date DATE,

    expiry_date DATE,

    description TEXT,

    created_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 8. FEED USAGES
-- ============================================================

CREATE TABLE feed_usages (

    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    barn_id INT UNSIGNED NOT NULL,

    feed_id INT UNSIGNED NOT NULL,

    quantity_kg DECIMAL(8,2) NOT NULL,

    usage_date DATE NOT NULL,

    note TEXT,

    recorded_by INT UNSIGNED,

    created_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_feed_barn
        FOREIGN KEY (barn_id)
        REFERENCES barns(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_feed_feed
        FOREIGN KEY (feed_id)
        REFERENCES feeds(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_feed_emp
        FOREIGN KEY (recorded_by)
        REFERENCES employees(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- ============================================================
-- 9. MEDICINE USAGES
-- ============================================================

CREATE TABLE medicine_usages (

    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    pig_id INT UNSIGNED NOT NULL,

    medicine_id INT UNSIGNED NOT NULL,

    dosage DECIMAL(8,2) NOT NULL,

    unit VARCHAR(50) NOT NULL,

    usage_date DATE NOT NULL,

    note TEXT,

    recorded_by INT UNSIGNED,

    created_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_medu_pig
        FOREIGN KEY (pig_id)
        REFERENCES pigs(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_medu_med
        FOREIGN KEY (medicine_id)
        REFERENCES medicines(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_medu_emp
        FOREIGN KEY (recorded_by)
        REFERENCES employees(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- ============================================================
-- 10. VACCINATIONS
-- ============================================================

CREATE TABLE vaccinations (

    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    pig_id INT UNSIGNED NOT NULL,

    medicine_id INT UNSIGNED NOT NULL,

    vaccine_date DATE NOT NULL,

    next_date DATE,

    dosage DECIMAL(8,2),

    unit VARCHAR(50),

    vet_doctor_id INT UNSIGNED,

    note TEXT,

    created_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_vac_pig
        FOREIGN KEY (pig_id)
        REFERENCES pigs(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_vac_med
        FOREIGN KEY (medicine_id)
        REFERENCES medicines(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_vac_vet
        FOREIGN KEY (vet_doctor_id)
        REFERENCES employees(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- ============================================================
-- 11. ACTIVITY LOGS
-- ============================================================

CREATE TABLE activity_logs (

    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    account_id INT UNSIGNED,

    action ENUM(
        'CREATE',
        'UPDATE',
        'DELETE',
        'LOGIN',
        'LOGOUT'
    ) NOT NULL,

    target_table VARCHAR(50),

    target_id INT UNSIGNED,

    description TEXT,

    ip_address VARCHAR(45),

    created_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_al_account
        FOREIGN KEY (account_id)
        REFERENCES accounts(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);