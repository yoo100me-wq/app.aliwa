import { useEffect } from 'react'
import { useToast } from '../components/shared/toastContexto'

/**
 * Puente entre el estado `error` que ya tenía cada componente y los toasts.
 *
 * En cuanto `error` deja de estar vacío se muestra la notificación y se limpia
 * el estado, así que el mensaje no queda "pegado" y el mismo fallo vuelve a
 * avisar si se repite. Evita tener que tocar las decenas de `setError(...)`
 * repartidas por el dashboard: cada componente solo agrega esta línea y borra
 * su bloque `{error && <p>...}`.
 */
export default function useErrorToast(error, limpiar, tipo = 'error') {
  const toast = useToast()

  useEffect(() => {
    if (!error) return
    toast?.mostrar(error, tipo)
    limpiar?.('')
    // `limpiar` suele ser un setState (identidad estable); no se incluye para
    // no re-disparar el efecto si el padre la recrea en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, tipo])
}
