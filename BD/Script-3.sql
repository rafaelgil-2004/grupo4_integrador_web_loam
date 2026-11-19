-- ============================================================
--  Sistema de Gestión de Convenios UNLPam: esquema (7 tablas)
--  ATENCIÓN: borra las tablas si ya existen (útil mientras se desarrolla)
-- ============================================================

CREATE DATABASE IF NOT EXISTS convenios_unlpam
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE convenios_unlpam;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS historial;
DROP TABLE IF EXISTS observacion;
DROP TABLE IF EXISTS documento;
DROP TABLE IF EXISTS convenio_implicado;
DROP TABLE IF EXISTS convenio;
DROP TABLE IF EXISTS usuario;
DROP TABLE IF EXISTS unidad;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- unidad: facultades o dependencias de la UNLPam
-- ------------------------------------------------------------
CREATE TABLE unidad (
    id      BIGINT       NOT NULL AUTO_INCREMENT,
    nombre  VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_unidad_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- usuario: unidad_id es NULL para Administración
-- (la API exige unidad si el rol es GESTION)
-- ------------------------------------------------------------
CREATE TABLE usuario (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    nombre         VARCHAR(60)  NOT NULL,
    apellido       VARCHAR(60)  NOT NULL,
    mail           VARCHAR(120) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    rol            VARCHAR(20)  NOT NULL,
    unidad_id      BIGINT       NULL,
    activo         BOOLEAN      NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuario_mail (mail),
    CONSTRAINT ck_usuario_rol CHECK (rol IN
        ('ADMINISTRACION','GESTION','ESTUDIANTE','PROFESOR','DECANO')),
    CONSTRAINT fk_usuario_unidad FOREIGN KEY (unidad_id)
        REFERENCES unidad (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- convenio: marco, específico o adenda.
-- convenio_padre_id: específicos y adendas apuntan a su marco
-- (o al convenio que modifican). Los marcos lo tienen en NULL.
-- En BORRADOR pueden faltar varios campos; la API los exige al aceptar.
-- revision: control de concurrencia (@Version de JPA)
-- ------------------------------------------------------------
CREATE TABLE convenio (
    id                   BIGINT        NOT NULL AUTO_INCREMENT,
    codigo               VARCHAR(20)   NOT NULL,
    titulo               VARCHAR(200)  NOT NULL,
    tipo                 VARCHAR(15)   NOT NULL,
    subtipo              VARCHAR(20)   NOT NULL,
    estado               VARCHAR(15)   NOT NULL DEFAULT 'BORRADOR',
    unidad_id            BIGINT        NOT NULL,
    organizacion         VARCHAR(150)  NULL,
    objeto               VARCHAR(1000) NULL,
    resolucion           VARCHAR(100)  NULL,
    expediente           VARCHAR(100)  NULL,
    fecha_inicio         DATE          NULL,
    fecha_vencimiento    DATE          NULL,
    fecha_firma          DATETIME      NULL,
    convenio_padre_id    BIGINT        NULL,
    revision             INT           NOT NULL DEFAULT 0,
    creado_por_id        BIGINT        NOT NULL,
    fecha_creacion       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_convenio_codigo (codigo),
    KEY idx_convenio_estado (estado),
    CONSTRAINT ck_convenio_tipo    CHECK (tipo IN ('MARCO','ESPECIFICO','ADENDA')),
    CONSTRAINT ck_convenio_subtipo CHECK (subtipo IN
        ('COLABORACION','PASANTIA','PRACTICA','INTERCAMBIO')),
    CONSTRAINT ck_convenio_estado  CHECK (estado IN
        ('BORRADOR','ACEPTADO','FIRMADO','RESCINDIDO','ARCHIVADO')),
    CONSTRAINT ck_convenio_fechas  CHECK (fecha_inicio IS NULL
        OR fecha_vencimiento IS NULL OR fecha_vencimiento >= fecha_inicio),
    CONSTRAINT fk_convenio_unidad  FOREIGN KEY (unidad_id)
        REFERENCES unidad (id) ON DELETE RESTRICT,
    CONSTRAINT fk_convenio_padre   FOREIGN KEY (convenio_padre_id)
        REFERENCES convenio (id) ON DELETE RESTRICT,
    CONSTRAINT fk_convenio_creador FOREIGN KEY (creado_por_id)
        REFERENCES usuario (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- convenio_implicado: usuarios que deben firmar + datos de su firma
-- (latitud/longitud/firma_ruta solo se completan si firmó desde la app)
-- ------------------------------------------------------------
CREATE TABLE convenio_implicado (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    convenio_id  BIGINT       NOT NULL,
    usuario_id   BIGINT       NOT NULL,
    firmado      BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_firma  DATETIME     NULL,
    latitud      DOUBLE       NULL,
    longitud     DOUBLE       NULL,
    firma_ruta   VARCHAR(255) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_implicado (convenio_id, usuario_id),
    CONSTRAINT fk_implicado_convenio FOREIGN KEY (convenio_id)
        REFERENCES convenio (id) ON DELETE CASCADE,
    CONSTRAINT fk_implicado_usuario  FOREIGN KEY (usuario_id)
        REFERENCES usuario (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- documento: PDF anexado a un convenio. sha256 y la marca de
-- metadatos los genera la API al subir el archivo.
-- ------------------------------------------------------------
CREATE TABLE documento (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    convenio_id    BIGINT       NOT NULL,
    nombre         VARCHAR(150) NOT NULL,
    ruta_archivo   VARCHAR(255) NOT NULL,
    sha256         VARCHAR(64)  NOT NULL,
    subido_por_id  BIGINT       NOT NULL,
    fecha_carga    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_documento_convenio FOREIGN KEY (convenio_id)
        REFERENCES convenio (id) ON DELETE CASCADE,
    CONSTRAINT fk_documento_usuario  FOREIGN KEY (subido_por_id)
        REFERENCES usuario (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- observacion: comentarios entre los usuarios de un convenio.
-- Si el texto es ofensivo, la API guarda "comentario ofensivo".
-- ------------------------------------------------------------
CREATE TABLE observacion (
    id           BIGINT        NOT NULL AUTO_INCREMENT,
    convenio_id  BIGINT        NOT NULL,
    usuario_id   BIGINT        NOT NULL,
    texto        VARCHAR(1000) NOT NULL,
    ofensivo     BOOLEAN       NOT NULL DEFAULT FALSE,
    fecha_hora   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_observacion_convenio FOREIGN KEY (convenio_id)
        REFERENCES convenio (id) ON DELETE CASCADE,
    CONSTRAINT fk_observacion_usuario  FOREIGN KEY (usuario_id)
        REFERENCES usuario (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- historial: cada acción sobre un convenio (con motivo cuando aplica;
-- en una rescisión, el motivo guarda el fundamento)
-- ------------------------------------------------------------
CREATE TABLE historial (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    convenio_id      BIGINT       NOT NULL,
    usuario_id       BIGINT       NOT NULL,
    accion           VARCHAR(25)  NOT NULL,
    estado_anterior  VARCHAR(15)  NULL,
    estado_nuevo     VARCHAR(15)  NULL,
    motivo           VARCHAR(255) NULL,
    fecha_hora       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_historial_fecha (fecha_hora),
    CONSTRAINT fk_historial_convenio FOREIGN KEY (convenio_id)
        REFERENCES convenio (id) ON DELETE CASCADE,
    CONSTRAINT fk_historial_usuario  FOREIGN KEY (usuario_id)
        REFERENCES usuario (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



DELETE FROM historial; 
DELETE FROM observacion; 
DELETE FROM documento;
DELETE FROM convenio_implicado; DELETE FROM convenio; DELETE FROM usuario; DELETE FROM unidad;
ALTER TABLE historial AUTO_INCREMENT=1; ALTER TABLE observacion AUTO_INCREMENT=1; ALTER TABLE documento AUTO_INCREMENT=1;
ALTER TABLE convenio_implicado AUTO_INCREMENT=1; ALTER TABLE convenio AUTO_INCREMENT=1; ALTER TABLE usuario AUTO_INCREMENT=1; ALTER TABLE unidad AUTO_INCREMENT=1;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO unidad (id, nombre) VALUES
(1,'Facultad de Ingeniería'),
(2,'Facultad de Ciencias Económicas y Jurídicas'),
(3,'Facultad de Ciencias Exactas y Naturales'),
(4,'Facultad de Ciencias Humanas');

-- Contraseñas (BCrypt): ADMINISTRACION=Admin2026  GESTION=Gestion2026  ESTUDIANTE=Estudiante2026  PROFESOR=Profesor2026  DECANO=Decano2026
INSERT INTO usuario (id, nombre, apellido, mail, password_hash, rol, unidad_id, activo) VALUES
(1,'Laura','Benítez','admin@unlpam.edu.ar','$2a$10$34ihrr7HEn/z1JHfZRJ3F..Ejwp.xcKfFnlsdoLWvjQwNaKGVb79S','ADMINISTRACION',NULL,1),
(2,'Martín','Gómez','gestion.ing@unlpam.edu.ar','$2a$10$uApZ2/eLPMFEjNvaY6fOw.ozdVfEePBloCsmUi0fOIQgZ4Wa9SWve','GESTION',1,1),
(3,'Carolina','Ruiz','gestion.eco@unlpam.edu.ar','$2a$10$Bs.Mu2ifaDWDmbt9r01.D.iZdzm/AJOqzUaMPcObgduSOvz5B4ZD6','GESTION',2,1),
(4,'Julián','Pérez','julian.perez@unlpam.edu.ar','$2a$10$PGi0G5v9NdQAiBGCeRGRj.VAuqUYkEUbMfnqfHEmkt7xw81wzFi4W','ESTUDIANTE',1,1),
(5,'Sofía','Molina','sofia.molina@unlpam.edu.ar','$2a$10$ETT/8LuR8C1La4/9jMzTF.sx0yWbWtUbbjHnEsku.PZ4El2BiSYqm','ESTUDIANTE',1,1),
(6,'Tomás','Álvarez','tomas.alvarez@unlpam.edu.ar','$2a$10$HF9Z8vmIzSCqgMuQ0XU59.fNCNTa6BdOQ1luFyrMKHL5JdEzKZyW6','ESTUDIANTE',2,1),
(7,'Ricardo','Fernández','ricardo.fernandez@unlpam.edu.ar','$2a$10$isRqnEs28XD5Z5l6Dly2P.x2fxtkJ1myLhvq31hqM/V.jnspYb1pS','PROFESOR',1,1),
(8,'Mariana','López','mariana.lopez@unlpam.edu.ar','$2a$10$c2ePfNbmHnvQ2MHPDVXy4.9cUZm/P4I124SjgsHdH5.ebCnZb5Wtm','PROFESOR',2,1),
(9,'Alberto','Suárez','decano.ing@unlpam.edu.ar','$2a$10$mlDrf4cahoG/qi9GRzrsH.Y4E5RU8HCgMiYadi2nC2lXuFjpywmWy','DECANO',1,1),
(10,'Graciela','Torres','decano.eco@unlpam.edu.ar','$2a$10$DTvX46VIvcsoqX6gV2h9j.RZFrDik7dRluEJScfc7M0byp44AzoWa','DECANO',2,1),
(11,'Pablo','Díaz','pablo.diaz@unlpam.edu.ar','$2a$10$mlJ5M3s88DYfDvwvYsB8E.oHnIVjOYroKBAbisBA0xECtRlqhR4yW','ESTUDIANTE',3,0);

SET FOREIGN_KEY_CHECKS = 0;
INSERT INTO convenio (id, codigo, titulo, tipo, subtipo, estado, unidad_id, organizacion, objeto, resolucion, expediente, fecha_inicio, fecha_vencimiento, fecha_firma, convenio_padre_id, creado_por_id, fecha_creacion, fecha_actualizacion) VALUES
(1,'CONV-2026-001','Convenio marco de colaboración con Cooperativa Eléctrica','MARCO','COLABORACION','FIRMADO',1,'Cooperativa Eléctrica de Santa Rosa','Colaboración técnica y académica en energías renovables.','Res. CD 045/2026','EXP-2026-0113',DATE_ADD(CURDATE(), INTERVAL -200 DAY),DATE_ADD(CURDATE(), INTERVAL 400 DAY),DATE_SUB(NOW(), INTERVAL 200 DAY),NULL,2,DATE_SUB(NOW(), INTERVAL 230 DAY),DATE_SUB(NOW(), INTERVAL 190 DAY)),
(2,'CONV-2026-002','Pasantías en planta de generación','ESPECIFICO','PASANTIA','FIRMADO',1,'Cooperativa Eléctrica de Santa Rosa','Pasantías rentadas para estudiantes de Ingeniería.','Res. CD 052/2026','EXP-2026-0140',DATE_ADD(CURDATE(), INTERVAL -120 DAY),DATE_ADD(CURDATE(), INTERVAL 25 DAY),DATE_SUB(NOW(), INTERVAL 120 DAY),1,2,DATE_SUB(NOW(), INTERVAL 150 DAY),DATE_SUB(NOW(), INTERVAL 115 DAY)),
(3,'CONV-2026-003','Prácticas profesionales supervisadas en mantenimiento','ESPECIFICO','PRACTICA','ACEPTADO',1,'Cooperativa Eléctrica de Santa Rosa','Prácticas profesionales supervisadas de 200 horas.','Res. CD 071/2026','EXP-2026-0199',NULL,NULL,NULL,1,2,DATE_SUB(NOW(), INTERVAL 20 DAY),DATE_SUB(NOW(), INTERVAL 5 DAY)),
(4,'CONV-2025-010','Intercambio con Universidad de Talca','MARCO','INTERCAMBIO','FIRMADO',2,'Universidad de Talca (Chile)','Movilidad de estudiantes y docentes.','Res. CD 012/2025','EXP-2025-0060',DATE_ADD(CURDATE(), INTERVAL -700 DAY),DATE_ADD(CURDATE(), INTERVAL -30 DAY),DATE_SUB(NOW(), INTERVAL 600 DAY),NULL,3,DATE_SUB(NOW(), INTERVAL 640 DAY),DATE_SUB(NOW(), INTERVAL 600 DAY)),
(5,'CONV-2026-004','Colaboración con Cámara de Comercio','MARCO','COLABORACION','BORRADOR',2,'Cámara de Comercio de La Pampa',NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,DATE_SUB(NOW(), INTERVAL 3 DAY),DATE_SUB(NOW(), INTERVAL 3 DAY)),
(6,'CONV-2026-005','Pasantías en estudios contables','ESPECIFICO','PASANTIA','ACEPTADO',2,'Estudio Contable Ferreyra','Pasantías para estudiantes de Contador Público.','Res. CD 080/2026','EXP-2026-0215',NULL,NULL,NULL,7,3,DATE_SUB(NOW(), INTERVAL 15 DAY),DATE_SUB(NOW(), INTERVAL 8 DAY)),
(7,'CONV-2026-006','Convenio marco con Colegio de Abogados','MARCO','COLABORACION','FIRMADO',2,'Colegio de Abogados de La Pampa','Capacitación conjunta y prácticas jurídicas.','Res. CD 030/2026','EXP-2026-0088',DATE_ADD(CURDATE(), INTERVAL -300 DAY),NULL,DATE_SUB(NOW(), INTERVAL 300 DAY),NULL,3,DATE_SUB(NOW(), INTERVAL 320 DAY),DATE_SUB(NOW(), INTERVAL 300 DAY)),
(8,'CONV-2024-007','Colaboración con Municipalidad de General Pico','MARCO','COLABORACION','RESCINDIDO',1,'Municipalidad de General Pico','Proyectos de infraestructura urbana.','Res. CD 101/2024','EXP-2024-0301',DATE_ADD(CURDATE(), INTERVAL -900 DAY),DATE_ADD(CURDATE(), INTERVAL 200 DAY),DATE_SUB(NOW(), INTERVAL 850 DAY),NULL,2,DATE_SUB(NOW(), INTERVAL 880 DAY),DATE_SUB(NOW(), INTERVAL 40 DAY)),
(9,'CONV-2025-011','Prácticas en laboratorio de suelos','ESPECIFICO','PRACTICA','ARCHIVADO',1,'INTA Anguil','Prácticas de laboratorio.','Res. CD 090/2025','EXP-2025-0250',DATE_ADD(CURDATE(), INTERVAL -500 DAY),DATE_ADD(CURDATE(), INTERVAL -100 DAY),DATE_SUB(NOW(), INTERVAL 450 DAY),NULL,2,DATE_SUB(NOW(), INTERVAL 480 DAY),DATE_SUB(NOW(), INTERVAL 90 DAY)),
(10,'CONV-2026-007','Adenda de prórroga del convenio marco','ADENDA','COLABORACION','ACEPTADO',1,'Cooperativa Eléctrica de Santa Rosa','Prórroga de un año del convenio marco.','Res. CD 110/2026','EXP-2026-0230',NULL,NULL,NULL,1,2,DATE_SUB(NOW(), INTERVAL 10 DAY),DATE_SUB(NOW(), INTERVAL 3 DAY));
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO convenio_implicado (convenio_id, usuario_id, firmado, fecha_firma, latitud, longitud) VALUES
(1,9,1,DATE_SUB(NOW(), INTERVAL 190 DAY),-36.6167,-64.2833),
(1,7,1,DATE_SUB(NOW(), INTERVAL 200 DAY),-36.6167,-64.2833),
(2,4,1,DATE_SUB(NOW(), INTERVAL 115 DAY),-36.6167,-64.2833),
(2,7,1,DATE_SUB(NOW(), INTERVAL 118 DAY),NULL,NULL),
(2,9,1,DATE_SUB(NOW(), INTERVAL 120 DAY),-36.6167,-64.2833),
(3,5,0,NULL,NULL,NULL),
(3,7,1,DATE_SUB(NOW(), INTERVAL 5 DAY),-36.6167,-64.2833),
(3,9,0,NULL,NULL,NULL),
(4,10,1,DATE_SUB(NOW(), INTERVAL 610 DAY),NULL,NULL),
(4,8,1,DATE_SUB(NOW(), INTERVAL 600 DAY),NULL,NULL),
(6,6,0,NULL,NULL,NULL),
(6,8,0,NULL,NULL,NULL),
(6,10,0,NULL,NULL,NULL),
(7,10,1,DATE_SUB(NOW(), INTERVAL 300 DAY),NULL,NULL),
(7,8,1,DATE_SUB(NOW(), INTERVAL 305 DAY),NULL,NULL),
(8,9,1,DATE_SUB(NOW(), INTERVAL 860 DAY),NULL,NULL),
(8,7,1,DATE_SUB(NOW(), INTERVAL 850 DAY),NULL,NULL),
(9,9,1,DATE_SUB(NOW(), INTERVAL 470 DAY),NULL,NULL),
(10,9,0,NULL,NULL,NULL),
(10,7,1,DATE_SUB(NOW(), INTERVAL 3 DAY),-36.6167,-64.2833);

-- sha256 real de los PDF de datos-prueba/
INSERT INTO documento (convenio_id, nombre, ruta_archivo, sha256, subido_por_id, fecha_carga) VALUES
(1,'CONV-2026-001 - texto.pdf','datos-prueba/convenio-conv-2026-001.pdf','8fcb6485088c68db65a8721fbd969cc3456434c753331c5b3f4d843325dc22db',2,DATE_SUB(NOW(), INTERVAL 60 DAY)),
(2,'CONV-2026-002 - texto.pdf','datos-prueba/convenio-conv-2026-002.pdf','f84c4b3ed6dec3cc3a13cea4d236773f0c31dc5a2446ce2d10544476bf69586b',2,DATE_SUB(NOW(), INTERVAL 60 DAY)),
(3,'CONV-2026-003 - texto.pdf','datos-prueba/convenio-conv-2026-003.pdf','5a8a87d160feb2c5e384d07e3f3e4ef0cda5c3d5377a802b229eebf172eda79e',2,DATE_SUB(NOW(), INTERVAL 60 DAY)),
(4,'CONV-2025-010 - texto.pdf','datos-prueba/convenio-conv-2025-010.pdf','0f9e4ec3e8cc085ed0bad64d141ba370d75dc6c2940a9924e88fdefd07c5c495',3,DATE_SUB(NOW(), INTERVAL 60 DAY)),
(6,'CONV-2026-005 - texto.pdf','datos-prueba/convenio-conv-2026-005.pdf','66d7199add06585df0d73e00c057e531f9a1e2a55e7c354789a780c541eb4d73',3,DATE_SUB(NOW(), INTERVAL 60 DAY)),
(7,'CONV-2026-006 - texto.pdf','datos-prueba/convenio-conv-2026-006.pdf','fb55bd83f9c6cbb61a30d0343ec5fd1407e2f0c1c7e0b870eaad665d051a6d03',3,DATE_SUB(NOW(), INTERVAL 60 DAY)),
(8,'CONV-2024-007 - texto.pdf','datos-prueba/convenio-conv-2024-007.pdf','3adb5ad1b0130e8a11c5e7215669d49f772b82310d3608849cfa347322d87951',2,DATE_SUB(NOW(), INTERVAL 60 DAY)),
(9,'CONV-2025-011 - texto.pdf','datos-prueba/convenio-conv-2025-011.pdf','211d0bf21b151d3ed3636eb7df0488e02a37e36bd252716ebf2c3c9e02ed1614',2,DATE_SUB(NOW(), INTERVAL 60 DAY)),
(10,'CONV-2026-007 - texto.pdf','datos-prueba/convenio-conv-2026-007.pdf','14f2340dc3465f3f333d2829ad18e93801b98242356bbae7c60c8db116a204b8',2,DATE_SUB(NOW(), INTERVAL 60 DAY)),
(1,'Anexo técnico.pdf','datos-prueba/anexo-conv-001.pdf','a1d719aeafe1aca15fcbd90fcea400c9866a35ed55fc136d2e2bfe98f1ce383f',2,DATE_SUB(NOW(), INTERVAL 60 DAY));

INSERT INTO observacion (convenio_id, usuario_id, texto, ofensivo, fecha_hora) VALUES
(3,7,'Revisé el plan de prácticas y está correcto.',0,DATE_SUB(NOW(), INTERVAL 4 DAY)),
(3,5,'¿Se puede ajustar la carga horaria semanal?',0,DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3,2,'Sí, se ajusta en la próxima revisión del anexo.',0,DATE_SUB(NOW(), INTERVAL 2 DAY)),
(6,8,'Falta confirmar el horario de las pasantías.',0,DATE_SUB(NOW(), INTERVAL 6 DAY)),
(6,3,'Comentario ofensivo',1,DATE_SUB(NOW(), INTERVAL 5 DAY)),
(10,9,'Estoy de acuerdo con la prórroga, firmo esta semana.',0,DATE_SUB(NOW(), INTERVAL 2 DAY));

INSERT INTO historial (convenio_id, usuario_id, accion, estado_anterior, estado_nuevo, motivo, fecha_hora) VALUES
(1,2,'CREAR',NULL,'BORRADOR',NULL,DATE_SUB(NOW(), INTERVAL 230 DAY)),
(1,2,'ACEPTAR','BORRADOR','ACEPTADO',NULL,DATE_SUB(NOW(), INTERVAL 215 DAY)),
(1,9,'FIRMAR','ACEPTADO','ACEPTADO',NULL,DATE_SUB(NOW(), INTERVAL 190 DAY)),
(1,7,'FIRMAR','ACEPTADO','ACEPTADO',NULL,DATE_SUB(NOW(), INTERVAL 200 DAY)),
(1,2,'FIRMADO','ACEPTADO','FIRMADO','Firmaron todos los implicados',DATE_SUB(NOW(), INTERVAL 190 DAY)),
(2,2,'CREAR',NULL,'BORRADOR',NULL,DATE_SUB(NOW(), INTERVAL 150 DAY)),
(2,2,'ACEPTAR','BORRADOR','ACEPTADO',NULL,DATE_SUB(NOW(), INTERVAL 130 DAY)),
(2,9,'FIRMAR','ACEPTADO','ACEPTADO',NULL,DATE_SUB(NOW(), INTERVAL 120 DAY)),
(2,2,'FIRMADO','ACEPTADO','FIRMADO','Firmaron todos los implicados',DATE_SUB(NOW(), INTERVAL 115 DAY)),
(3,2,'CREAR',NULL,'BORRADOR',NULL,DATE_SUB(NOW(), INTERVAL 20 DAY)),
(3,2,'ACEPTAR','BORRADOR','ACEPTADO',NULL,DATE_SUB(NOW(), INTERVAL 10 DAY)),
(3,7,'FIRMAR','ACEPTADO','ACEPTADO',NULL,DATE_SUB(NOW(), INTERVAL 5 DAY)),
(4,3,'CREAR',NULL,'BORRADOR',NULL,DATE_SUB(NOW(), INTERVAL 640 DAY)),
(4,3,'ACEPTAR','BORRADOR','ACEPTADO',NULL,DATE_SUB(NOW(), INTERVAL 620 DAY)),
(4,3,'FIRMADO','ACEPTADO','FIRMADO','Firmaron todos los implicados',DATE_SUB(NOW(), INTERVAL 600 DAY)),
(5,3,'CREAR',NULL,'BORRADOR',NULL,DATE_SUB(NOW(), INTERVAL 3 DAY)),
(6,3,'CREAR',NULL,'BORRADOR',NULL,DATE_SUB(NOW(), INTERVAL 15 DAY)),
(6,3,'ACEPTAR','BORRADOR','ACEPTADO',NULL,DATE_SUB(NOW(), INTERVAL 8 DAY)),
(7,3,'CREAR',NULL,'BORRADOR',NULL,DATE_SUB(NOW(), INTERVAL 320 DAY)),
(7,3,'ACEPTAR','BORRADOR','ACEPTADO',NULL,DATE_SUB(NOW(), INTERVAL 310 DAY)),
(7,3,'FIRMADO','ACEPTADO','FIRMADO','Firmaron todos los implicados',DATE_SUB(NOW(), INTERVAL 300 DAY)),
(8,2,'CREAR',NULL,'BORRADOR',NULL,DATE_SUB(NOW(), INTERVAL 880 DAY)),
(8,2,'ACEPTAR','BORRADOR','ACEPTADO',NULL,DATE_SUB(NOW(), INTERVAL 870 DAY)),
(8,2,'FIRMADO','ACEPTADO','FIRMADO','Firmaron todos los implicados',DATE_SUB(NOW(), INTERVAL 850 DAY)),
(8,1,'RESCINDIR','FIRMADO','RESCINDIDO','Incumplimiento de las obligaciones asumidas por la Municipalidad',DATE_SUB(NOW(), INTERVAL 40 DAY)),
(9,2,'CREAR',NULL,'BORRADOR',NULL,DATE_SUB(NOW(), INTERVAL 480 DAY)),
(9,2,'ACEPTAR','BORRADOR','ACEPTADO',NULL,DATE_SUB(NOW(), INTERVAL 470 DAY)),
(9,2,'FIRMADO','ACEPTADO','FIRMADO','Firmaron todos los implicados',DATE_SUB(NOW(), INTERVAL 470 DAY)),
(9,1,'ARCHIVAR','FIRMADO','ARCHIVADO','Finalizó el período de prácticas',DATE_SUB(NOW(), INTERVAL 90 DAY)),
(10,2,'CREAR',NULL,'BORRADOR',NULL,DATE_SUB(NOW(), INTERVAL 10 DAY)),
(10,2,'ACEPTAR','BORRADOR','ACEPTADO',NULL,DATE_SUB(NOW(), INTERVAL 6 DAY)),
(10,7,'FIRMAR','ACEPTADO','ACEPTADO',NULL,DATE_SUB(NOW(), INTERVAL 3 DAY));