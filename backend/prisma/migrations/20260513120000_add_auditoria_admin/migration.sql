-- CreateTable
CREATE TABLE `AuditoriaAdmin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adminId` INTEGER NOT NULL,
    `accion` VARCHAR(191) NOT NULL,
    `recurso` VARCHAR(191) NOT NULL,
    `detalle` TEXT NULL,
    `ip` VARCHAR(191) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuditoriaAdmin` ADD CONSTRAINT `AuditoriaAdmin_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `Admin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
