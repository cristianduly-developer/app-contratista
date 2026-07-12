import { supabase } from '../lib/supabase'

export default function Login() {
  const loginGoogle = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    }).catch(() => {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Error al iniciar sesión. Intentá de nuevo.', type: 'error' } }))
    })
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6" style={{ background: '#0D0D14' }}>
      <div className="w-28 h-28 rounded-3xl flex items-center justify-center"
        style={{ background: 'rgba(249,115,22,.15)', border: '2px solid rgba(249,115,22,.4)' }}>
        <span className="text-6xl">🏗</span>
      </div>

      <div className="text-center">
        <h1 className="text-white font-bold text-[28px] mb-2">App Contratista</h1>
        <p className="text-gray-400 text-[14px] max-w-[280px]">
          Gestión de obras, gremios y pagos. Todo desde el celular.
        </p>
      </div>

      <button onClick={loginGoogle}
        className="w-full max-w-xs py-4 rounded-2xl font-bold text-[15px] text-white flex items-center justify-center gap-3 transition-all active:opacity-80"
        style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', boxShadow: '0 4px 20px rgba(249,115,22,0.4)' }}>
        <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
        Ingresar con Google
      </button>

      <p className="text-gray-500 text-[11px] text-center max-w-xs">
        Al ingresar aceptás los términos de uso del servicio.
      </p>
    </div>
  )
}
