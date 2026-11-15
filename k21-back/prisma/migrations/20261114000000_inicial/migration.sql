-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'CHOFER', 'RESPONDIENTE');

-- CreateEnum
CREATE TYPE "TipoControl" AS ENUM ('MECANICO', 'MATERIAL');

-- CreateEnum
CREATE TYPE "TipoRespuesta" AS ENUM ('SI_NO_ESTADO', 'SI_NO_NIVEL', 'SI_NO_HABILITACION', 'CANTIDAD');

-- CreateEnum
CREATE TYPE "EstadoControl" AS ENUM ('PENDIENTE', 'APROBADO', 'OBSERVADO');

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "usuario" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "rol" "Rol" NOT NULL,
    "contrasenha_hash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_el" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificado_el" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movil" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_el" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seccion" (
    "id" UUID NOT NULL,
    "tipo_control" "TipoControl" NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo_respuesta" "TipoRespuesta" NOT NULL,
    "nota" TEXT,

    CONSTRAINT "seccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item" (
    "id" UUID NOT NULL,
    "seccion_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "debe_haber" INTEGER,
    "unidad" TEXT,
    "invertido" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control" (
    "id" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "tipo" "TipoControl" NOT NULL,
    "movil_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "servicio" TEXT,
    "encabezado" JSONB NOT NULL DEFAULT '{}',
    "observacion" TEXT,
    "estado" "EstadoControl" NOT NULL DEFAULT 'PENDIENTE',
    "cantidad_fallas" INTEGER NOT NULL DEFAULT 0,
    "revisor_id" UUID,
    "revisado_el" TIMESTAMP(3),
    "comentario_revision" TEXT,
    "creado_el" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificado_el" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_item" (
    "id" UUID NOT NULL,
    "control_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "respuesta" TEXT,
    "estado" TEXT,
    "nivel" TEXT,
    "existente" INTEGER,
    "falla" BOOLEAN NOT NULL DEFAULT false,
    "nota" TEXT,

    CONSTRAINT "control_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_usuario_key" ON "usuario"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "movil_codigo_key" ON "movil"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "seccion_tipo_control_nombre_key" ON "seccion"("tipo_control", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "item_seccion_id_nombre_key" ON "item"("seccion_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "control_numero_key" ON "control"("numero");

-- CreateIndex
CREATE INDEX "control_estado_tipo_idx" ON "control"("estado", "tipo");

-- CreateIndex
CREATE INDEX "control_movil_id_fecha_idx" ON "control"("movil_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "control_item_control_id_item_id_key" ON "control_item"("control_id", "item_id");

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_seccion_id_fkey" FOREIGN KEY ("seccion_id") REFERENCES "seccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control" ADD CONSTRAINT "control_movil_id_fkey" FOREIGN KEY ("movil_id") REFERENCES "movil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control" ADD CONSTRAINT "control_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control" ADD CONSTRAINT "control_revisor_id_fkey" FOREIGN KEY ("revisor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_item" ADD CONSTRAINT "control_item_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_item" ADD CONSTRAINT "control_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Supabase expone el esquema public por su Data API (PostgREST) con las claves anon/authenticated.
-- Toda la app accede por el backend (rol postgres, que no está sujeto a RLS), así que se activa
-- RLS sin políticas: la Data API no puede leer ni escribir nada de estas tablas.
ALTER TABLE "usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "movil" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "seccion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "control" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "control_item" ENABLE ROW LEVEL SECURITY;
