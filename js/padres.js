// Panel de los padres
// Seguridad: todos los textos se muestran con textContent (nunca innerHTML).

(function () {
  const $ = function (id) { return document.getElementById(id); };
  const cartel = $("estado");
  const maqueta = $("maqueta");
  const botonVisto = $("visto");
  const lista = $("lista");
  const vacio = $("vacio");
  const chkAviso = $("aviso");

  let brokerOk = false;
  let estado = null;            // ultimo estado publicado por el ESP32
  const vistos = {};            // ids de alertas ya mostradas
  let audio = null;

  // ---------- Estado grande ----------
  function dibujar() {
    let texto, clase;
    if (!brokerOk) {
      texto = "Sin conexión a internet"; clase = "gris";
    } else if (!estado) {
      texto = "Esperando a la maqueta…"; clase = "gris";
    } else if (!estado.online) {
      texto = "Maqueta desconectada"; clase = "gris";
    } else if (estado.alarma) {
      texto = "⚠ ALERTA DE GROOMING"; clase = "mal";
    } else {
      texto = "Todo en orden"; clase = "ok";
    }
    cartel.textContent = texto;
    cartel.className = "estado " + clase;

    const enLinea = brokerOk && estado && estado.online;
    maqueta.textContent = enLinea ? "Maqueta en línea" : "Maqueta desconectada";
    maqueta.className = "pastilla " + (enLinea ? "si" : "no");

    botonVisto.disabled = !(enLinea && estado.alarma);
  }

  // ---------- Aviso con sonido / vibracion (opcional) ----------
  function avisar() {
    if (!chkAviso.checked) return;
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      for (let i = 0; i < 3; i++) {
        const osc = audio.createOscillator();
        const vol = audio.createGain();
        osc.frequency.value = 880;
        vol.gain.value = 0.2;
        osc.connect(vol);
        vol.connect(audio.destination);
        osc.start(audio.currentTime + i * 0.35);
        osc.stop(audio.currentTime + i * 0.35 + 0.2);
      }
    } catch (e) { /* si el navegador no deja, no pasa nada */ }
  }

  // ---------- Lista de mensajes sospechosos ----------
  function agregarAlerta(obj) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "msj alerta";

    const cats = document.createElement("b");
    const categorias = Array.isArray(obj.categorias) ? obj.categorias.map(String) : [];
    cats.textContent = categorias.length ? categorias.join(" · ") : "Mensaje sospechoso";

    const cita = document.createElement("div");
    cita.textContent = "“" + obj.texto + "”";

    const hora = document.createElement("div");
    hora.className = "chico";
    hora.textContent = "Hora: " + new Date().toLocaleTimeString("es-AR");

    tarjeta.appendChild(cats);
    tarjeta.appendChild(cita);
    tarjeta.appendChild(hora);
    lista.insertBefore(tarjeta, lista.firstChild);   // el mas nuevo arriba
    vacio.style.display = "none";
  }

  // ---------- Conexion ----------
  const broker = conectarBroker({
    suscribir: [TEMAS.estado, TEMAS.resultado],
    alCambioConexion: function (ok) {
      brokerOk = ok;
      dibujar();
    },
    alMensaje: function (tema, obj) {
      if (tema === TEMAS.estado) {
        estado = { alarma: obj.alarma === true, online: obj.online === true };
        dibujar();
      } else if (tema === TEMAS.resultado) {
        if (obj.riesgo !== true || typeof obj.texto !== "string") return;
        const id = String(obj.id || "");
        if (id && vistos[id]) return;
        if (id) vistos[id] = true;
        agregarAlerta(obj);
        avisar();
      }
    }
  });

  botonVisto.addEventListener("click", function () {
    broker.publicar(TEMAS.visto, { accion: "visto" });
  });

  $("borrar").addEventListener("click", function () {
    lista.querySelectorAll(".msj").forEach(function (n) { n.remove(); });
    vacio.style.display = "";
  });

  // Al tildar el aviso, el navegador permite usar el sonido
  chkAviso.addEventListener("change", function () {
    if (chkAviso.checked) avisar();
  });

  dibujar();
})();
