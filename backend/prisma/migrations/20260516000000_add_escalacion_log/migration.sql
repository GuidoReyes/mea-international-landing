CREATE TABLE `EscalacionLog` (
    `id`           INT NOT NULL AUTO_INCREMENT,
    `telefono`     VARCHAR(191) NOT NULL,
    `motivo`       TEXT NOT NULL,
    `resueltaEn`   DATETIME(3) NULL,
    `resolvidaPor` VARCHAR(191) NULL,
    `creadoEn`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `EscalacionLog_telefono_idx` (`telefono`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
