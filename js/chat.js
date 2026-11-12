// Chat del chico ("tablet" de la maqueta)
// Seguridad: todos los textos se muestran con textContent (nunca innerHTML),
// asi nadie puede meter codigo HTML o JavaScript en el chat.

(function () {
  const lista = document.getElementById("lista");
  const form = document.getElementById("form");
  const caja = document.getElementById("texto");
  const pastilla = document.getElementById("conexion");

  const pendientes = {};   // id del mensaje -> burbuja esperando respuesta del ESP32
  const vistos = {};       // ids ya mostrados
  let enlinea = false;

  function agregarBurbuja(texto, clases) {
    const b = document.createElement("div");
    b.className = "burbuja " + (clases || "");
    b.textContent = texto;
    lista.appendChild(b);
    window.scrollTo(0, document.body.scrollHeight);
    return b;
  }

  function nuevoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  const broker = conectarBroker({
    suscribir: [TEMAS.resultado],
    alCambioConexion: function (ok, motivo) {
      enlinea = ok;
      pastilla.textContent = ok ? "Conectado" : (motivo || "Sin conexión con la maqueta");
      pastilla.className = "pastilla " + (ok ? "si" : "no");
    },
    alMensaje: function (tema, obj) {
      if (tema !== TEMAS.resultado || typeof obj.texto !== "string") return;
      const id = String(obj.id || "");
      if (id && vistos[id]) return;
      if (id) vistos[id] = true;

      if (id && pendientes[id]) {
        // Es un mensaje mio y el ESP32 ya lo recibio: se muestra normal.
        // El chico NO ve la alerta (la alerta es solo para los padres).
        pendientes[id].classList.remove("pendiente");
        delete pendientes[id];
      } else {
        // Mensaje de otra persona en el chat
        agregarBurbuja(obj.texto, "otro");
      }
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const texto = caja.value.trim().slice(0, CONFIG.MAX_TEXTO);
    if (!texto) return;

    if (!enlinea) {
      agregarBurbuja("Sin conexión: no se pudo enviar.", "sistema");
      return;
    }

    const id = nuevoId();
    const burbuja = agregarBurbuja(texto, "mio pendiente");
    pendientes[id] = burbuja;
    broker.publicar(TEMAS.chat, { texto: texto, id: id });
    caja.value = "";
    caja.focus();

    // Si el ESP32 no contesta en 6 segundos, se avisa
    setTimeout(function () {
      if (pendientes[id]) {
        const nota = document.createElement("span");
        nota.className = "nota";
        nota.textContent = "La maqueta no respondió.";
        burbuja.appendChild(nota);
      }
    }, 6000);
  });

  caja.maxLength = CONFIG.MAX_TEXTO;
  const saludo = document.createElement("div");
  saludo.className = "sistema";
  saludo.textContent = "Chat de la partida. Escribí un mensaje abajo.";
  lista.appendChild(saludo);
})();
