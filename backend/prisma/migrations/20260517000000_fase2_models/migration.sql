-- Fase 2 models: Abono, Egreso, AuditoriaAlumno, CampanaWhatsApp, CampanaDestinatario
-- Plus: urlPdf/urlQr columns on Certificado

-- ─── Enums (MySQL) ────────────────────────────────────────────────────────────
-- MySQL stores enums inline in column definition, no separate CREATE TYPE needed.

-- ─── Abono ───────────────────────────────────────────────────────────────────
CREATE TABLE `Abono` (
    `id`        INT NOT NULL AUTO_INCREMENT,
    `cuotaId`   INT NOT NULL,
    `monto`     DECIMAL(10,2) NOT NULL,
    `fecha`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nota`      VARCHAR(191) NULL,
    `creadoEn`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `Abono_cuotaId_idx` (`cuotaId`),
    CONSTRAINT `Abono_cuotaId_fkey` FOREIGN KEY (`cuotaId`) REFERENCES `CuotaPago` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── Egreso ──────────────────────────────────────────────────────────────────
CREATE TABLE `Egreso` (
    `id`        INT NOT NULL AUTO_INCREMENT,
    `concepto`  VARCHAR(191) NOT NULL,
    `monto`     DECIMAL(10,2) NOT NULL,
    `moneda`    ENUM('GTQ','USD') NOT NULL DEFAULT 'GTQ',
    `categoria` ENUM('SALARIO','COMISION','OPERATIVO','MARKETING') NOT NULL,
    `fecha`     DATETIME(3) NOT NULL,
    `nota`      TEXT NULL,
    `creadoEn`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `Egreso_fecha_idx` (`fecha`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── AuditoriaAlumno ─────────────────────────────────────────────────────────
CREATE TABLE `AuditoriaAlumno` (
    `id`        INT NOT NULL AUTO_INCREMENT,
    `alumnoId`  INT NOT NULL,
    `accion`    VARCHAR(191) NOT NULL,
    `detalle`   TEXT NULL,
    `adminId`   INT NULL,
    `ip`        VARCHAR(191) NULL,
    `creadoEn`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `AuditoriaAlumno_alumnoId_idx` (`alumnoId`),
    CONSTRAINT `AuditoriaAlumno_alumnoId_fkey` FOREIGN KEY (`alumnoId`) REFERENCES `Alumno` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── CampanaWhatsApp ─────────────────────────────────────────────────────────
CREATE TABLE `CampanaWhatsApp` (
    `id`                 INT NOT NULL AUTO_INCREMENT,
    `nombre`             VARCHAR(191) NOT NULL,
    `template`           TEXT NOT NULL,
    `variables`          JSON NULL,
    `estado`             ENUM('BORRADOR','ENVIANDO','COMPLETADA') NOT NULL DEFAULT 'BORRADOR',
    `totalDestinatarios` INT NOT NULL DEFAULT 0,
    `enviados`           INT NOT NULL DEFAULT 0,
    `errores`            INT NOT NULL DEFAULT 0,
    `creadoEn`           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn`      DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── CampanaDestinatario ─────────────────────────────────────────────────────
CREATE TABLE `CampanaDestinatario` (
    `id`        INT NOT NULL AUTO_INCREMENT,
    `campanaId` INT NOT NULL,
    `leadId`    INT NOT NULL,
    `estado`    ENUM('PENDIENTE','ENVIADO','ERROR') NOT NULL DEFAULT 'PENDIENTE',
    `error`     VARCHAR(191) NULL,
    `enviadoEn` DATETIME(3) NULL,
    PRIMARY KEY (`id`),
    INDEX `CampanaDestinatario_campanaId_idx` (`campanaId`),
    INDEX `CampanaDestinatario_leadId_idx` (`leadId`),
    CONSTRAINT `CampanaDestinatario_campanaId_fkey` FOREIGN KEY (`campanaId`) REFERENCES `CampanaWhatsApp` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `CampanaDestinatario_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── PagoEstado — agregar VENCIDO ────────────────────────────────────────────
ALTER TABLE `CuotaPago`
    MODIFY COLUMN `estado` ENUM('PENDIENTE','COMPLETADO','RECHAZADO','REEMBOLSADO','VENCIDO') NOT NULL DEFAULT 'PENDIENTE';

ALTER TABLE `Pago`
    MODIFY COLUMN `estado` ENUM('PENDIENTE','COMPLETADO','RECHAZADO','REEMBOLSADO','VENCIDO') NOT NULL DEFAULT 'PENDIENTE';

-- ─── Certificado — agregar urlPdf y urlQr ────────────────────────────────────
ALTER TABLE `Certificado`
    ADD COLUMN `urlPdf` VARCHAR(191) NULL,
    ADD COLUMN `urlQr`  VARCHAR(191) NULL;
