-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: db
-- Generation Time: Mar 07, 2025 at 03:24 AM
-- Server version: 5.7.44
-- PHP Version: 8.2.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `scrape_configs`
--

-- --------------------------------------------------------

--
-- Table structure for table `dashboard`
--

CREATE TABLE `dashboard` (
  `id` int(11) NOT NULL,
  `Company` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Auction_date` date NOT NULL,
  `Auction_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Auction_location` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Auction_lane` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Order_No` int(11) NOT NULL,
  `Remark1` text COLLATE utf8mb4_unicode_ci,
  `Remark2` text COLLATE utf8mb4_unicode_ci,
  `Reserve_price` decimal(15,2) DEFAULT NULL,
  `Start_price` decimal(15,2) DEFAULT NULL,
  `Category` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Reg_No` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Reg_Province` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Brand` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Model` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Engine_displacement` int(11) DEFAULT '0',
  `Gear` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Fuel` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Color` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Car_man_year` int(11) DEFAULT NULL,
  `Car_reg_year` int(11) DEFAULT NULL,
  `Mile` int(11) DEFAULT NULL,
  `Engine_No` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Chassis_No` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Grade_overall` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Grade_frame` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Grade_Internal` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Seller_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Seller_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Sourcing_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Car_tax_expired_date` date DEFAULT NULL,
  `Car_title_group` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `imageUrl` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `csv` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `load_image_status`
--

CREATE TABLE `load_image_status` (
  `id` int(11) NOT NULL,
  `status_id` int(11) NOT NULL,
  `csv_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_img` int(11) DEFAULT '0',
  `finish_img` int(11) DEFAULT '0',
  `log_file` text COLLATE utf8mb4_unicode_ci,
  `errcode` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `paths`
--

CREATE TABLE `paths` (
  `id` int(11) NOT NULL,
  `path` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `paths`
--

INSERT INTO `paths` (`id`, `path`) VALUES
(7, 'admin'),
(3, 'config'),
(4, 'DB'),
(6, 'dbinsert'),
(8, 'dir_mng'),
(1, 'schedule'),
(2, 'status'),
(5, 'status_DB');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `role_name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `role_name`) VALUES
(1, 'admin'),
(2, 'user');

-- --------------------------------------------------------

--
-- Table structure for table `role_map`
--

CREATE TABLE `role_map` (
  `id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `path_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `role_map`
--

INSERT INTO `role_map` (`id`, `role_id`, `path_id`) VALUES
(11, 1, 1),
(12, 1, 2),
(13, 1, 3),
(14, 1, 4),
(15, 2, 1),
(16, 2, 2),
(17, 2, 4),
(18, 2, 5),
(19, 1, 7),
(21, 1, 8);

-- --------------------------------------------------------

--
-- Table structure for table `scrape_configs`
--

CREATE TABLE `scrape_configs` (
  `id` int(11) NOT NULL,
  `action_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_scrape` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_loadimg` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_insertdb` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `scrape_configs`
--

INSERT INTO `scrape_configs` (`id`, `action_name`, `url`, `file_scrape`, `file_loadimg`, `file_insertdb`) VALUES
(1, 'SiamInter_auction', 'https://home.sia.co.th/', 'SiamInterAuction.js', 'SiamInterAuction.py', 'SiamInterAuction.js'),
(2, 'Apple_Auction', 'https://www.appleauction.co.th/catalog', 'AppleAuction.js', 'AppleAuction.py', 'AppleAuction.js'),
(3, 'Sahakrane_Auction', 'https://www.sahaauction.com/', 'SahakraneAuction.js', 'SahakraneAuction.py', 'SahakraneAuction.js'),
(4, 'Motto_Auction', 'https://www.mottoauction.com/home/main', 'MOTTOAUCTION.js', 'MOTTOAUCTION.py', 'MOTTOAUCTION.js'),
(5, 'Premium_Inter_auction', 'https://www.pia.co.th/home/auctions', 'PremiumInterAuction.js', 'PremiumInterAuction.py', 'PremiumInterAuction.js'),
(6, 'Inter_auction', 'http://www.inter-auction.in.th/index.php/th/', 'interauction.js', 'interauction.py', 'interauction.js'),
(7, 'Buy_at_Siam', 'https://www.buyatsiam.com/CarHome.html', 'BuyatSiam.js', 'BuyatSiam.py', 'BuyatSiam.js'),
(8, 'Auction_express', 'https://www.auctionexpress.co.th/th', 'Auctionexpress.js', 'Auctionexpress.py', 'Auctionexpress.js');

-- --------------------------------------------------------

--
-- Table structure for table `status`
--

CREATE TABLE `status` (
  `id` int(11) NOT NULL,
  `name_status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `num_row` int(11) DEFAULT '0',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `timestamp` datetime NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `username`, `password`, `role_id`, `created_at`) VALUES
(1, 'Super Admin', 'admin', 'admin', 1, '2025-02-13 08:56:27');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `dashboard`
--
ALTER TABLE `dashboard`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `load_image_status`
--
ALTER TABLE `load_image_status`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `status_id` (`status_id`);

--
-- Indexes for table `paths`
--
ALTER TABLE `paths`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `path` (`path`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_name` (`role_name`);

--
-- Indexes for table `role_map`
--
ALTER TABLE `role_map`
  ADD PRIMARY KEY (`id`),
  ADD KEY `role_id` (`role_id`),
  ADD KEY `path_id` (`path_id`);

--
-- Indexes for table `scrape_configs`
--
ALTER TABLE `scrape_configs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `action_name` (`action_name`),
  ADD UNIQUE KEY `file_scrape` (`file_scrape`),
  ADD UNIQUE KEY `file_loadimg` (`file_loadimg`),
  ADD UNIQUE KEY `file_insertdb` (`file_insertdb`);

--
-- Indexes for table `status`
--
ALTER TABLE `status`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `role_id` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `dashboard`
--
ALTER TABLE `dashboard`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `load_image_status`
--
ALTER TABLE `load_image_status`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `paths`
--
ALTER TABLE `paths`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `role_map`
--
ALTER TABLE `role_map`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `scrape_configs`
--
ALTER TABLE `scrape_configs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `status`
--
ALTER TABLE `status`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `load_image_status`
--
ALTER TABLE `load_image_status`
  ADD CONSTRAINT `load_image_status_ibfk_1` FOREIGN KEY (`status_id`) REFERENCES `status` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `role_map`
--
ALTER TABLE `role_map`
  ADD CONSTRAINT `role_map_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_map_ibfk_2` FOREIGN KEY (`path_id`) REFERENCES `paths` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
