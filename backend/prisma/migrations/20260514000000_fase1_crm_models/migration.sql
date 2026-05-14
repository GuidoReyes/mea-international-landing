-- CreateTable: CRMEtapa
CREATE TABLE `CRMEtapa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#00b4d8',
    PRIMARY KEY (`id`),
    UNIQUE INDEX `CRMEtapa_orden_key`(`orden`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Alumno
CREATE TABLE `Alumno` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `carnet` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `whatsapp` VARCHAR(191) NULL,
    `fechaNacimiento` DATETIME(3) NULL,
    `pais` VARCHAR(191) NOT NULL DEFAULT 'GT',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `password` VARCHAR(191) NULL,
    `primerLogin` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `Alumno_carnet_key`(`carnet`),
    UNIQUE INDEX `Alumno_email_key`(`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Edicion
CREATE TABLE `Edicion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cursoId` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `fechaInicio` DATETIME(3) NOT NULL,
    `fechaFin` DATETIME(3) NOT NULL,
    `precio` DECIMAL(10, 2) NOT NULL,
    `precioUSD` DECIMAL(10, 2) NULL,
    `cupo` INTEGER NOT NULL DEFAULT 20,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `instructor` VARCHAR(191) NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Inscripcion
CREATE TABLE `Inscripcion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `alumnoId` INTEGER NOT NULL,
    `edicionId` INTEGER NOT NULL,
    `estado` ENUM('ACTIVA','COMPLETADA','CANCELADA','SUSPENDIDA') NOT NULL DEFAULT 'ACTIVA',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Pago
CREATE TABLE `Pago` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inscripcionId` INTEGER NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `montoUSD` DECIMAL(10, 2) NULL,
    `moneda` ENUM('GTQ','USD') NOT NULL DEFAULT 'GTQ',
    `metodo` ENUM('EFECTIVO','TRANSFERENCIA','TARJETA','DEPOSITO','OTRO') NOT NULL,
    `estado` ENUM('PENDIENTE','COMPLETADO','RECHAZADO','REEMBOLSADO') NOT NULL DEFAULT 'PENDIENTE',
    `referencia` VARCHAR(191) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: CuotaPago
CREATE TABLE `CuotaPago` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pagoId` INTEGER NOT NULL,
    `numeroCuota` INTEGER NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `fechaVence` DATETIME(3) NOT NULL,
    `estado` ENUM('PENDIENTE','COMPLETADO','RECHAZADO','REEMBOLSADO') NOT NULL DEFAULT 'PENDIENTE',
    `pagadoEn` DATETIME(3) NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Certificado
CREATE TABLE `Certificado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inscripcionId` INTEGER NOT NULL,
    `alumnoId` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `fechaEmision` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revocado` BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `Certificado_inscripcionId_key`(`inscripcionId`),
    UNIQUE INDEX `Certificado_codigo_key`(`codigo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: Lead — add CRM fields
ALTER TABLE `Lead`
    ADD COLUMN `etapaId` INTEGER NULL,
    ADD COLUMN `valorEstimado` DECIMAL(10, 2) NULL,
    ADD COLUMN `fechaCierreEstimada` DATETIME(3) NULL,
    ADD COLUMN `notasCRM` TEXT NULL,
    ADD COLUMN `asignadoAdminId` INTEGER NULL;

-- AddForeignKey: Lead -> CRMEtapa
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_etapaId_fkey` FOREIGN KEY (`etapaId`) REFERENCES `CRMEtapa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Lead -> Admin (asignado)
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_asignadoAdminId_fkey` FOREIGN KEY (`asignadoAdminId`) REFERENCES `Admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Edicion -> Curso
ALTER TABLE `Edicion` ADD CONSTRAINT `Edicion_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `Curso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Inscripcion -> Alumno
ALTER TABLE `Inscripcion` ADD CONSTRAINT `Inscripcion_alumnoId_fkey` FOREIGN KEY (`alumnoId`) REFERENCES `Alumno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Inscripcion -> Edicion
ALTER TABLE `Inscripcion` ADD CONSTRAINT `Inscripcion_edicionId_fkey` FOREIGN KEY (`edicionId`) REFERENCES `Edicion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Pago -> Inscripcion
ALTER TABLE `Pago` ADD CONSTRAINT `Pago_inscripcionId_fkey` FOREIGN KEY (`inscripcionId`) REFERENCES `Inscripcion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: CuotaPago -> Pago
ALTER TABLE `CuotaPago` ADD CONSTRAINT `CuotaPago_pagoId_fkey` FOREIGN KEY (`pagoId`) REFERENCES `Pago`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Certificado -> Inscripcion
ALTER TABLE `Certificado` ADD CONSTRAINT `Certificado_inscripcionId_fkey` FOREIGN KEY (`inscripcionId`) REFERENCES `Inscripcion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Certificado -> Alumno
ALTER TABLE `Certificado` ADD CONSTRAINT `Certificado_alumnoId_fkey` FOREIGN KEY (`alumnoId`) REFERENCES `Alumno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
