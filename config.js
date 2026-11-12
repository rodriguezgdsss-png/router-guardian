// =====================================================
//  CONFIGURACION - es el UNICO lugar que hay que cambiar
// =====================================================

const CONFIG = {
  // Tiene que ser EXACTAMENTE IGUAL al PREFIJO del sketch del ESP32.
  // Como el broker es publico, usa un codigo raro (no lo compartas).
  PREFIJO: "routerguardian/rg-k7w2p",

  // Broker publico de HiveMQ por WebSocket seguro (wss = con TLS).
  // Es obligatorio "wss" porque la pagina se publica en HTTPS.
  BROKER_URL: "wss://broker.hivemq.com:8884/mqtt",

  // Largo maximo de un mensaje
  MAX_TEXTO: 200
};

// Temas MQTT (no hace falta tocar)
const TEMAS = {
  chat:      CONFIG.PREFIJO + "/chat",       // pagina del chico  -> ESP32
  resultado: CONFIG.PREFIJO + "/resultado",  // ESP32             -> paginas
  estado:    CONFIG.PREFIJO + "/estado",     // ESP32 (retenido)  -> panel
  visto:     CONFIG.PREFIJO + "/visto"       // panel de padres   -> ESP32
};
