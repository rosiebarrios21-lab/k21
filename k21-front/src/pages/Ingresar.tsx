import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import logoCbvp from '@/assets/logo-cbvp.webp'
import logoK21 from '@/assets/logo-k21.webp'
import { ErrorIngreso, useSesion } from '@/lib/sesion'

export function Ingresar() {
  const usuario = useSesion((s) => s.usuario)
  const ingresar = useSesion((s) => s.ingresar)
  const desde = (useLocation().state as { desde?: string } | null)?.desde

  const [email, setEmail] = useState('')
  const [contrasenha, setContrasenha] = useState('')
  const [verContrasenha, setVerContrasenha] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (usuario) return <Navigate to={desde ?? '/inicio'} replace />

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await ingresar(email, contrasenha)
    } catch (err) {
      setError(err instanceof ErrorIngreso ? err.message : 'No se pudo ingresar. Intentá de nuevo.')
      setContrasenha('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Franja de marca: amarillo con cinta reflectiva, como el uniforme */}
      <header className="relative bg-primary px-4 pt-8 pb-28 text-center text-primary-foreground">
        {/* Placa blanca: los logos tienen mucho amarillo y se pierden sobre la franja */}
        <div className="mx-auto mb-4 flex w-fit items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg">
          <img src={logoCbvp} alt="Cuerpo de Bomberos Voluntarios del Paraguay" className="h-16 w-auto" />
          <div aria-hidden className="h-12 w-px bg-border" />
          <img src={logoK21} alt='21ª Compañía "Areguá"' className="h-[4.5rem] w-auto" />
        </div>
        <p className="text-[11px] font-semibold tracking-wider uppercase opacity-75">
          Cuerpo de Bomberos Voluntarios del Paraguay
        </p>
        <h1 className="mt-1 text-xl font-bold text-balance">21ª Compañía "Areguá"</h1>
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2.5 bg-[repeating-linear-gradient(-45deg,var(--foreground)_0_14px,transparent_14px_28px)] opacity-90"
        />
      </header>

      {/* relative z-10: sin esto el header (relative) se pinta encima de la tarjeta */}
      <main className="relative z-10 -mt-20 flex flex-1 justify-center px-4 pb-10">
        <Card className="h-fit w-full max-w-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">Ingresar</CardTitle>
            <CardDescription>Control de móviles. Usá el email y la contraseña que te dio el administrador.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={enviar}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="nombre@ejemplo.com"
                  className="h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contrasenha">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="contrasenha"
                    type={verContrasenha ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="h-11 pr-11"
                    value={contrasenha}
                    onChange={(e) => setContrasenha(e.target.value)}
                    aria-invalid={!!error}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-1.5 size-8 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setVerContrasenha((v) => !v)}
                    aria-label={verContrasenha ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={verContrasenha}
                  >
                    {verContrasenha ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertCircle />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={enviando}>
                {enviando && <Loader2 className="animate-spin" />}
                {enviando ? 'Ingresando…' : 'Ingresar'}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                ¿Olvidaste tu contraseña? Pedile al administrador que la restablezca.
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
