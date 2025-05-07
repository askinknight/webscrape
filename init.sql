CREATE DATABASE IF NOT EXISTS scrape_configs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE scrape_configs;

DROP TABLE IF EXISTS scrape_configs;

CREATE TABLE IF NOT EXISTS scrape_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action_name VARCHAR(255) NOT NULL UNIQUE,
  url VARCHAR(255) NOT NULL,
  file_scrape VARCHAR(255) NOT NULL UNIQUE,
  file_loadimg VARCHAR(255) NOT NULL UNIQUE,
  file_insertdb VARCHAR(255) NOT NULL UNIQUE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO
  scrape_configs (
    action_name,
    url,
    file_scrape,
    file_loadimg,
    file_insertdb
  )
VALUES
  (
    'SiamInter_auction',
    'https://home.sia.co.th/',
    'SiamInterAuction.js',
    'SiamInterAuction.py',
    'SiamInterAuction.js'
  ),
  (
    'Apple_Auction',
    'https://www.appleauction.co.th/catalog',
    'AppleAuction.js',
    'AppleAuction.py',
    'AppleAuction.js'
  ),
  (
    'Sahakrane_Auction',
    'https://www.sahaauction.com/',
    'SahakraneAuction.js',
    'SahakraneAuction.py',
    'SahakraneAuction.js'
  ),
  (
    'Motto_Auction',
    'https://www.mottoauction.com/home/main',
    'MOTTOAUCTION.js',
    'MOTTOAUCTION.py',
    'MOTTOAUCTION.js'
  ),
  (
    'Premium_Inter_auction',
    'https://www.pia.co.th/home/auctions',
    'PremiumInterAuction.js',
    'PremiumInterAuction.py',
    'PremiumInterAuction.js'
  ),
  (
    'Inter_auction',
    'http://www.inter-auction.in.th/index.php/th/',
    'interauction.js',
    'interauction.py',
    'interauction.js'
  ),
  (
    'Buy_at_Siam',
    'https://www.buyatsiam.com/CarHome.html',
    'BuyatSiam.js',
    'BuyatSiam.js',
    'BuyatSiam.py'
  ),
  (
    'IAA',
    'https://www.auctionexpress.co.th/th',
    'Auctionexpress.js',
    'Auctionexpress.py',
    'Auctionexpress.js'
  );

DROP TABLE IF EXISTS status;

CREATE TABLE IF NOT EXISTS status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name_status VARCHAR(255) NOT NULL,
  num_row INT DEFAULT 0,
  status VARCHAR(255) NOT NULL,
  message TEXT,
  timestamp DATETIME NOT NULL,
  file_name VARCHAR(255) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

DROP TABLE IF EXISTS load_image_status;

CREATE TABLE IF NOT EXISTS load_image_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  status_id INT NOT NULL UNIQUE,
  csv_name VARCHAR(255) NOT NULL,
  total_img INT DEFAULT 0,
  finish_img INT DEFAULT 0,
  log_file TEXT,
  errcode TEXT,
  FOREIGN KEY (status_id) REFERENCES status(id) ON UPDATE CASCADE ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

DROP TABLE IF EXISTS dashboard;

CREATE TABLE IF NOT EXISTS dashboard (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Company VARCHAR(255) NOT NULL,
    Auction_date DATE NOT NULL,
    Auction_name VARCHAR(255) NOT NULL,
    Auction_location VARCHAR(255) NOT NULL,
    Auction_lane VARCHAR(255) NOT NULL,
    Order_No INT NOT NULL,
    Remark1 TEXT,
    Remark2 TEXT,
    Reserve_price DECIMAL(15,2),
    Start_price DECIMAL(15,2),
    Category VARCHAR(255) NOT NULL,
    Reg_No VARCHAR(255) NOT NULL,
    Reg_Province VARCHAR(255) NOT NULL,
    Brand VARCHAR(255) NOT NULL,
    Model VARCHAR(255) NOT NULL,
    Engine_displacement INT DEFAULT 0,
    Gear VARCHAR(255),
    Fuel VARCHAR(255),
    Color VARCHAR(255),
    Car_man_year INT,
    Car_reg_year INT,
    Mile INT,
    Engine_No VARCHAR(255),
    Chassis_No VARCHAR(255),
    Grade_overall VARCHAR(255),
    Grade_frame VARCHAR(255),
    Grade_Internal VARCHAR(255),
    Seller_name VARCHAR(255),
    Seller_code VARCHAR(255),
    Sourcing_type VARCHAR(255),
    Car_tax_expired_date DATE,
    Car_title_group VARCHAR(255),
    imageUrl VARCHAR(255),
    csv VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE dashboard ADD INDEX idx_auction_name (Auction_name);
ALTER TABLE dashboard ADD INDEX idx_csv (csv);
ALTER TABLE dashboard ADD INDEX idx_company (Company);
ALTER TABLE dashboard ADD INDEX idx_brand (Brand);
ALTER TABLE dashboard ADD INDEX idx_gear (Gear);
ALTER TABLE dashboard ADD INDEX idx_category (Category);
ALTER TABLE dashboard ADD INDEX idx_seller (Seller_name);
ALTER TABLE dashboard ADD INDEX idx_province (Reg_Province);
ALTER TABLE dashboard ADD INDEX idx_auction_date (Auction_date);


DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS paths;
DROP TABLE IF EXISTS role_map;

-- ตารางสำหรับบทบาท (role)
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(255) NOT NULL UNIQUE
);

-- เพิ่ม role พื้นฐาน
INSERT INTO roles (role_name) VALUES ('admin'), ('user');

-- ตารางสำหรับเส้นทาง (path)
CREATE TABLE IF NOT EXISTS paths (
    id INT AUTO_INCREMENT PRIMARY KEY,
    path VARCHAR(255) NOT NULL UNIQUE
);

-- เพิ่มเส้นทางที่ใช้ในระบบ
INSERT INTO paths (path) VALUES 
('schedule'),('status') , ('config'), ('DB') , ('admin') , ('dir_mng');

-- ตารางเชื่อมความสัมพันธ์ระหว่าง role กับ path
CREATE TABLE IF NOT EXISTS role_map (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    path_id INT NOT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (path_id) REFERENCES paths(id) ON DELETE CASCADE
);

-- เพิ่มสิทธิ์ของแต่ละ role
INSERT INTO role_map (role_id, path_id) VALUES 
-- Admin (เข้าได้ทุกหน้า)
((SELECT id FROM roles WHERE role_name = 'admin'), (SELECT id FROM paths WHERE path = 'schedule')),
((SELECT id FROM roles WHERE role_name = 'admin'), (SELECT id FROM paths WHERE path = 'status')),
((SELECT id FROM roles WHERE role_name = 'admin'), (SELECT id FROM paths WHERE path = 'config')),
((SELECT id FROM roles WHERE role_name = 'admin'), (SELECT id FROM paths WHERE path = 'DB')),
((SELECT id FROM roles WHERE role_name = 'admin'), (SELECT id FROM paths WHERE path = 'admin')),
((SELECT id FROM roles WHERE role_name = 'admin'), (SELECT id FROM paths WHERE path = 'dir_mng')),
((SELECT id FROM roles WHERE role_name = 'user'), (SELECT id FROM paths WHERE path = 'schedule')),
((SELECT id FROM roles WHERE role_name = 'user'), (SELECT id FROM paths WHERE path = 'status')),
((SELECT id FROM roles WHERE role_name = 'user'), (SELECT id FROM paths WHERE path = 'DB'));

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL, -- ใช้ role_id แทน ENUM
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- เพิ่มผู้ใช้ตัวอย่าง
INSERT INTO users (name,username, password, role_id) 
VALUES 
('Super Admin','admin', 'admin', (SELECT id FROM roles WHERE role_name = 'admin'));
