// Conexion al broker MQTT (la usan chat.js y padres.js)
//
// conectarBroker({
//   suscribir: [temas],
//   alMensaje(tema, objeto),       // objeto = JSON ya convertido
//   alCambioConexion(true/false)   // true = conectado al broker
// })
// Devuelve { publicar(tema, objeto) }

function conectarBroker(opciones) {
  // Si la libreria no se pudo cargar (sin internet), avisamos
  if (typeof mqtt === "undefined") {
    opciones.alCambioConexion(false, "No se pudo cargar la librería MQTT. ¿Hay internet?");
    return { publicar: function () {} };
  }

  const cliente = mqtt.connect(CONFIG.BROKER_URL, {
    clientId: "rg-web-" + Math.random().toString(16).slice(2, 10),
    clean: true,
    keepalive: 30,
    reconnectPeriod: 3000,   // reintenta solo cada 3 segundos
    connectTimeout: 10000
  });

  cliente.on("connect", function () {
    cliente.subscribe(opciones.suscribir, function (err) {
      if (err) console.error("Error al suscribirse:", err);
    });
    opciones.alCambioConexion(true);
  });

  ["close", "offline", "error"].forEach(function (evento) {
    cliente.on(evento, function () { opciones.alCambioConexion(false); });
  });

  cliente.on("message", function (tema, datos) {
    let objeto = null;
    try {
      objeto = JSON.parse(datos.toString());
    } catch (e) {
      return;   // mensaje que no es JSON: se ignora
    }
    if (objeto && typeof objeto === "object") opciones.alMensaje(tema, objeto);
  });

  return {
    publicar: function (tema, objeto) {
      if (cliente.connected) cliente.publish(tema, JSON.stringify(objeto));
    }
  };
}
