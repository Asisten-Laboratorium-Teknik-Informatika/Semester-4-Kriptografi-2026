-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 08, 2026 at 06:44 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `kupon_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `kupon`
--

CREATE TABLE `kupon` (
  `id` int(11) NOT NULL,
  `kode_kupon` varchar(50) NOT NULL,
  `nama_produk` varchar(255) NOT NULL,
  `diskon` varchar(100) NOT NULL,
  `berlaku_hingga` date NOT NULL,
  `ciphertext` text NOT NULL,
  `qr_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `kupon`
--

INSERT INTO `kupon` (`id`, `kode_kupon`, `nama_produk`, `diskon`, `berlaku_hingga`, `ciphertext`, `qr_path`, `created_at`) VALUES
(1, 'DISKON10-AGUSTUS', 'semua produk', '10%', '2026-05-30', 'RtAyrkrJm/r8si/maaA/xWgHMBT1gz4mdx1X/gvWPsCKKx9C4Hzqs/+35kV0PtxG2wPJJZ8dSZkArvGTkGhwvmhCQCyn1S8zufJmLPw0iUdT6r7gXfMhlyth69jkGsHNFvgIhdo/R2uwMEQaU8RFd/SRcGYFxDsJCu3LafwIn46acI4NS0iVIEQ23zCvZfLKX3ypEYMdydXoVI0lupybvDPAdVs4/mkyupc9CpJumOBxZBKE714DXMYBWiHPXHXggstHoSSFo6EtIL7v6vT4+yAmb5Q6+hxx4JADvRJIUSPMl7EKjkpQ7hbCx2fy9Gk8', 'qr_DISKON10-AGUSTUS_1777559683.png', '2026-04-30 14:34:43'),
(2, 'DISKON10-AGUSTUS11', 'semua produk', '10%', '2026-05-30', 'zBt40WKA1oTxtYEL0TLHENQIOBmJ+v0CuQQl6cFvfXgqX7xg85gVIxJ8jXLFfATU91piqmCAywRBH07cF720GnaxqWGIOzPC+b8EcAi38Tm3hTEqjCxygYVrjnkfglmiduf3BJ6zoG7KTrx9wkoj9jLPawSR9XrBih2e4fJHx9h54GmVXnqWrmDvLS0WBhZO9xsEFg+PJqbHpPKZbW1FcHx8Siz5W/ojwPyVwMfudH3B1ThtL3dycBV0jvZry8mBzGXO3FH34rB/XG1fyDArqiMreh9Pd0KmjyMLEQcekEV+ulxnLZ8vWHW2RON/xepq', 'qr_DISKON10-AGUSTUS11_1777559738.png', '2026-04-30 14:35:39'),
(3, 'DISKON10-AGUSTUS111', 'semua produk', '10%', '2026-05-30', 'HG3Gtyh1h6YEg0ebWI8mw/wwcFP2lUGy0u0melskAwf3G+miH7L7q85ihg6H78n8Z+sKCtD3kcAoM/w/peUwItYGRqJcwPIYEnlZJbDQF6EdhaJo3YsJfZ9L37Yy7gWQC8PMfXvE66jXaHjcieNBMSOu06fj4IDsT8OQnc7OMoAg9tp/nc38rjVG68teXopavs5X9cqkhup9ZmFKO8zSqhKjf4xl3VvBzvRwV9VugCydwLoYIln7X55a9qlNbLbePHYzkrKA4OB7UMH+WLncs6jBTn/DGM/0bt9hfa0hVDWXu1LEdaQolmwB32hlVrMk', 'qr_DISKON10-AGUSTUS111_1777559780.png', '2026-04-30 14:36:20'),
(4, 'DISKON MAY 50', 'pembelian minimal 100 ribu', '50%', '2026-05-01', 'BCoo8V5UDtN2XBvvee2OpqDMyEz9Tpj1UmI+T/CbUMHvR72vUDYJ+HvRWkF6iWvrVi7ZTTtPIDK6lQNk/hJzTKYXZBKhdYnCbQp/++DtYjPu3N2p7bfvzCn+aI5c6KM/rNriSEEbC3rhY3Ny8aCeheE9jYT1pJmwcGprBv7RDyTyQXJXx4JO+dFpRQRJIsqxm+Q1RJOI9zDffN03/abeK8HYDL9qdt2R9L8hlkoeGQgR7pUq+tbMgLfJlkK9q4HD1NJArj5HpEJWk8ByXekDBR6iOww9vYLFF0AicMLLA8L12mERyCb8zVPNbY5sit8KsJ96726mLlFVFEnfXpXCjg==', 'qr_DISKONMAY50_1778215050.png', '2026-05-08 04:37:30');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `kupon`
--
ALTER TABLE `kupon`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `kode_kupon` (`kode_kupon`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `kupon`
--
ALTER TABLE `kupon`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
