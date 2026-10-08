-- AlterTable: Lead -- enlaza con el Alumno en el que convierte (PRD mea-logica-negocio R9)
ALTER TABLE `Lead`
    ADD COLUMN `alumnoId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Lead_alumnoId_idx` ON `Lead`(`alumnoId`);

-- AddForeignKey: Lead -> Alumno
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_alumnoId_fkey` FOREIGN KEY (`alumnoId`) REFERENCES `Alumno`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
