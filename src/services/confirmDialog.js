// Puente entre los servicios/componentes y el diálogo de confirmación de la app.
// Evita sobrescribir window.confirm globalmente (lo que rompía llamadas síncronas
// y dejaba el diálogo fuera del árbol de React).

let confirmHandler = null;

export function registerConfirmHandler(handler) {
  confirmHandler = handler;
  return () => {
    if (confirmHandler === handler) confirmHandler = null;
  };
}

export default async function confirmAction(message, options = {}) {
  if (typeof confirmHandler === 'function') {
    return Boolean(await confirmHandler(message, options));
  }
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return Boolean(window.confirm(message));
  }
  return false;
}
