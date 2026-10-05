-- CreateTable: SesionClase (PRD mea-logica-negocio, R1)
-- Ocurrencia concreta de una clase en vivo, distinta de HorarioClase (la
-- plantilla semanal recurrente). Unidad real para contar el bloque de 8
-- sesiones que vende el negocio.
CREATE TABLE `SesionClase` (
    `id`        INT NOT NULL AUTO_INCREMENT,
    `grupoId`   INT NOT NULL,
    `fechaHora` DATETIME(3) NOT NULL,
    `estado`    ENUM('PROGRAMADA','REALIZADA','CANCELADA','REPROGRAMADA') NOT NULL DEFAULT 'PROGRAMADA',
    `creadoEn`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `SesionClase_grupoId_fechaHora_idx` (`grupoId`, `fechaHora`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: AsistenciaSesion
-- fuente distingue si la marco el profesor/admin a mano o si llego por el
-- webhook de Zoom (backend/src/routes/zoom.webhook.ts).
CREATE TABLE `AsistenciaSesion` (
    `id`        INT NOT NULL AUTO_INCREMENT,
    `alumnoId`  INT NOT NULL,
    `sesionId`  INT NOT NULL,
    `asistio`   BOOLEAN NOT NULL,
    `fuente`    VARCHAR(191) NOT NULL,
    `marcadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `AsistenciaSesion_alumnoId_sesionId_key` (`alumnoId`, `sesionId`),
    INDEX `AsistenciaSesion_sesionId_idx` (`sesionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: SesionClase -> GrupoClaseEnVivo
ALTER TABLE `SesionClase` ADD CONSTRAINT `SesionClase_grupoId_fkey` FOREIGN KEY (`grupoId`) REFERENCES `GrupoClaseEnVivo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: AsistenciaSesion -> Alumno
ALTER TABLE `AsistenciaSesion` ADD CONSTRAINT `AsistenciaSesion_alumnoId_fkey` FOREIGN KEY (`alumnoId`) REFERENCES `Alumno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: AsistenciaSesion -> SesionClase
ALTER TABLE `AsistenciaSesion` ADD CONSTRAINT `AsistenciaSesion_sesionId_fkey` FOREIGN KEY (`sesionId`) REFERENCES `SesionClase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
