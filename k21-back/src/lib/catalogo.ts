/**
 * Ítems de las planillas en papel de la 21ª Compañía "Areguá":
 * "Control Mecánico Móvil AM21" (chofer) y "Control de Material Menor - Móvil AM21" (respondiente).
 * `npm run seed` los carga en la base; se pueden ajustar ahí sin tocar código.
 */
type TipoRespuesta = "SI_NO_ESTADO" | "SI_NO_NIVEL" | "SI_NO_HABILITACION" | "CANTIDAD";

interface ItemCatalogo {
  nombre: string;
  debeHaber?: number;
  unidad?: string;
  invertido?: boolean;
}

interface SeccionCatalogo {
  nombre: string;
  tipoRespuesta: TipoRespuesta;
  nota?: string;
  items: (string | ItemCatalogo)[];
}

export const CATALOGO_MECANICO: SeccionCatalogo[] = [
  {
    nombre: "Operador",
    tipoRespuesta: "SI_NO_ESTADO",
    items: ["Dispone de EPI", "Cuenta con registro adecuado y al día"],
  },
  {
    nombre: "Aspectos legales",
    tipoRespuesta: "SI_NO_ESTADO",
    items: [
      "Habilitación municipal",
      "Revisión técnica DINATRAN",
      "Cédula de identificación (Cédula Verde)",
      "Cobertura del seguro del vehículo",
    ],
  },
  {
    nombre: "Luces",
    tipoRespuesta: "SI_NO_ESTADO",
    items: [
      "Luces delanteras alta",
      "Luces delanteras baja",
      "Señaleros delantero izquierdo",
      "Señaleros delantero derecho",
      "Señaleros trasero derecho",
      "Señaleros trasero izquierdo",
      "Luces de freno",
      "Luces de retroceso",
      "Reflector delantero izquierdo",
      "Reflector delantero derecho",
      "Reflector trasero izquierdo",
      "Reflector trasero derecho",
    ],
  },
  {
    nombre: "Elementos sonoros y balizas",
    tipoRespuesta: "SI_NO_ESTADO",
    items: [
      "Sirena rotativa",
      "Sirena electrónica",
      "Alarma de retroceso",
      "Baliza delantera",
      "Baliza trasera",
      "Baliza lateral",
      "Bocina / Claxon",
    ],
  },
  {
    nombre: "Accesorios del tablero",
    tipoRespuesta: "SI_NO_ESTADO",
    items: [
      "Limpia parabrisas",
      "Espejo retrovisor derecho",
      "Espejo retrovisor izquierdo",
      "Espejo retrovisor interior",
      "Revoluciones",
      "Velocímetro",
      "Cuenta kilometraje",
      "Presión de aceite",
      "Marcador de combustible",
      "Temperatura del motor",
      "Radio base VHF",
    ],
  },
  {
    nombre: "Estado de neumáticos",
    tipoRespuesta: "SI_NO_ESTADO",
    nota: "Calibración de aire: delanteras 90 PSI / traseras 90 PSI",
    items: [
      "Delantero derecho",
      "Delantero izquierdo",
      "Trasero derecho adentro",
      "Trasero derecho afuera",
      "Trasero izquierdo adentro",
      "Trasero izquierdo afuera",
      "Auxilios",
    ],
  },
  {
    nombre: "Tipos de freno",
    tipoRespuesta: "SI_NO_ESTADO",
    items: ["Hidráulico", "Aire", "Freno de mano", { nombre: "Pérdida de fluido o aire", invertido: true }],
  },
  {
    nombre: "Vidrios",
    tipoRespuesta: "SI_NO_ESTADO",
    items: [
      "Parabrisa delantero",
      "Parabrisa trasero",
      "Lateral derecho frente",
      "Lateral derecho atrás",
      "Lateral izquierdo frente",
      "Lateral izquierdo atrás",
    ],
  },
  {
    nombre: "Específicos",
    tipoRespuesta: "SI_NO_ESTADO",
    items: [
      "Gato",
      "Extintor",
      "Baliza triángulo",
      { nombre: "Pérdidas de aceite motor", invertido: true },
      { nombre: "Pérdida de aceite hidráulico", invertido: true },
      "Tacos rueda",
      "Tapa de combustible",
      "Estado de puertas",
      "Estado de pisaderas",
      "Cinturón de seguridad",
      "Posa mano",
      "Baterías",
    ],
  },
  {
    nombre: "Motor",
    tipoRespuesta: "SI_NO_NIVEL",
    nota: "Nivel: R = Reserva, M = Medio, F = Full",
    items: [
      "Nivel de aceite",
      "Nivel de agua radiador",
      "Fluido de freno",
      "Fluido de embrague",
      "Dirección hidráulica",
    ],
  },
];

export const CATALOGO_MATERIAL: SeccionCatalogo[] = [
  {
    nombre: "Habilitación pre hospitalaria",
    tipoRespuesta: "SI_NO_HABILITACION",
    nota: "Estado: Bueno - Malo - Inoperativo",
    items: ["Iluminación del área de trabajo", "Aire acondicionado", "Cinturón de seguridad para todos"],
  },
  {
    nombre: "Kit heridas y hemorragias",
    tipoRespuesta: "CANTIDAD",
    items: [
      { nombre: "Apósitos normales", debeHaber: 10 },
      "Apósitos oclusivo",
      "Gasitas",
      "DG-6",
      "IOP solución",
      "Suero fisiológico",
      "Termómetro",
      "Tijeras de corte pesado",
      { nombre: "Torunda de algodón", debeHaber: 10 },
      "Vendas elásticas",
      "Vendas no elástica",
      "Vendas triangulares",
    ],
  },
  {
    nombre: "Kit vías aéreas",
    tipoRespuesta: "CANTIDAD",
    items: [
      "Bolsa de ventilación adulto",
      "Bolsa de ventilación pediátrico",
      "Balón de O2 fijo (mínimo 1 m3)",
      "Balón de O2 portátil (mínimo 1 m3)",
      "Flujómetro para 15 Lpm",
      "Juego de cánulas de mayo",
      "Mascarilla adulto con reservorio",
      "Mascarilla pediátrico con reservorio",
      "Sondas y picos de succión",
      "Succionador eléctrico",
    ],
  },
  {
    nombre: "Kit quemaduras",
    tipoRespuesta: "CANTIDAD",
    items: ["Gasa furasinada", "Suero fisiológico", "Vaselina", "Vendas estériles de 15 cm"],
  },
  {
    nombre: "Kit obstétrico",
    tipoRespuesta: "CANTIDAD",
    items: [
      { nombre: "Apósitos", debeHaber: 10 },
      "Bolsa de plástico transparente",
      "Frazada ligera",
      { nombre: "Guantes estériles", debeHaber: 10 },
      "Mantas estériles",
      "Perita de succión",
      "Bisturí estéril",
      "Clamps estériles",
    ],
  },
  {
    nombre: "Kit evaluación",
    tipoRespuesta: "CANTIDAD",
    items: [
      { nombre: "Baja lengua", debeHaber: 10 },
      "Cintas de colores para triage",
      "Toma presión",
      "Saturómetro",
      { nombre: "Guantes látex (par)", debeHaber: 10 },
      "Linterna pupilar",
      "Antiparra",
      { nombre: "Ficha de atención prehospitalaria", debeHaber: 100, unidad: "hojas" },
    ],
  },
  {
    nombre: "Varios",
    tipoRespuesta: "CANTIDAD",
    items: ["Basura con tapa", "Bolsa con residuos patológicos", "Manta mortuoria", "Set para vía respiratoria"],
  },
  {
    nombre: "Inmovilización y traslado",
    tipoRespuesta: "CANTIDAD",
    items: [
      "Camilla c/ ruedas y cinta de sujeción",
      "Chaleco de Kendrick",
      "Collar cervical mediano",
      "Collar cervical pequeño",
      "Collar cervical grande",
      "Juegos de férulas inflables",
      "Férula semi rígida",
      "Férula rígida",
      "Manta anti shock",
      "Inmovilizador lateral (ladrillos)",
      "Férula espinal larga c/ cinta",
      "Silla para inmovilización",
    ],
  },
];
