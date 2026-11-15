export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    message: string,
    public readonly detalles?: unknown,
  ) {
    super(message);
  }
}

export const noAutorizado = (msg = "Sesión inválida o vencida") => new AppError(401, "NO_AUTORIZADO", msg);
export const prohibido = (msg = "No tenés permiso para esta acción") => new AppError(403, "PROHIBIDO", msg);
export const noEncontrado = (msg = "No encontrado") => new AppError(404, "NO_ENCONTRADO", msg);
export const conflicto = (msg: string) => new AppError(409, "CONFLICTO", msg);
export const invalido = (msg: string, detalles?: unknown) => new AppError(422, "INVALIDO", msg, detalles);
