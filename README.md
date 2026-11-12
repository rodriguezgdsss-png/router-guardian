# Router Guardián

Proyecto de Informática: una maqueta de casa con un **router inteligente (ESP32)** que revisa los mensajes del chat de un chico. Si detecta una frase típica de **grooming**, prende una alarma (LED rojo + buzzer) en el cuarto de los padres y les avisa en un panel web. Si todo está bien, queda el LED verde.

## Cómo se conectan las partes

```
Celular del chico (chat.html)  --wss (MQTT seguro)-->  broker.hivemq.com
Celular de los padres (padres.html) <--wss-->          broker.hivemq.com
ESP32 (la maqueta, con Wi-Fi)  <--MQTT (puerto 1883)-->  broker.hivemq.com
```

¿Por qué hace falta el broker? Una página de GitHub Pages (HTTPS) no puede hablar directo con el ESP32 (HTTP en una IP local): el navegador lo bloquea. Entonces los dos se conectan a internet y se mandan mensajes por un intermediario, con el modelo **publicar/suscribir** de MQTT.

| Tema (con tu PREFIJO adelante) | Quién publica | Contenido |
|---|---|---|
| `PREFIJO/chat` | Página del chico | `{"texto":"...","id":"..."}` |
| `PREFIJO/resultado` | ESP32 | `{"id":"...","texto":"...","riesgo":true,"categorias":["Pide secreto"]}` |
| `PREFIJO/estado` (retenido) | ESP32 | `{"alarma":true,"online":true}` |
| `PREFIJO/visto` | Panel de padres | `{"accion":"visto"}` |

El **ESP32 es quien analiza** los mensajes (es el "router" que vigila). La página solo envía y muestra.

## Archivos

```
index.html            portada
chat.html             "tablet" del chico
padres.html           panel de los padres
css/estilo.css
js/config.js          PREFIJO y broker (único lugar para cambiarlos)
js/mqtt-conexion.js, js/chat.js, js/padres.js
esp32/RouterGuardianMQTT/RouterGuardianMQTT.ino   sketch del ESP32
```

## Plan B: versión sin internet (red local)

Si en la presentación no hay internet o el colegio bloquea MQTT, subí `esp32/RouterGuardianLocal/RouterGuardianLocal.ino`. No necesita librerías ni Wi-Fi externo: el ESP32 crea la red **CasaSegura** (clave `guardian123`). Conectá el celular a esa red (aunque diga "sin internet") y entrá a `http://192.168.4.1/chat` y `http://192.168.4.1/padres`. Usa los mismos pines y las mismas palabras clave. La web de GitHub Pages **no** funciona con esta versión.

## Paso 1 - Cambiar el PREFIJO (en dos lugares, igual en los dos)

1. Elegí un código raro, por ejemplo `routerguardian/rg-k7w2p` (ya viene uno puesto; podés dejarlo o inventar otro).
2. En `js/config.js`: línea `PREFIJO: "..."`.
3. En `RouterGuardianMQTT.ino`: línea `const char* PREFIJO = "...";`.

**Tienen que ser exactamente iguales**, si no la web y el ESP32 no se ven.

## Paso 2 - Subir el sketch al ESP32

1. Arduino IDE → Herramientas → Placa → Gestor de tarjetas → instalar **esp32 by Espressif Systems** (no "Arduino ESP32 Boards").
2. Herramientas → Placa → ESP32 Arduino → **ESP32 Dev Module**.
3. Herramientas → Administrar bibliotecas → buscar **PubSubClient** (Nick O'Leary) → Instalar.
4. Abrí `esp32/RouterGuardianMQTT/RouterGuardianMQTT.ino` (la carpeta y el .ino se llaman igual).
5. Arriba del código cambiá `WIFI_NOMBRE` y `WIFI_CLAVE` por los de tu **hotspot del celular** (2.4 GHz; en iPhone activá "Maximizar compatibilidad").
6. Conectá el ESP32 por USB, elegí el puerto (COMx) y apretá Subir (la flecha). Si queda en "Connecting....", mantené apretado el botón **BOOT** hasta que empiece.
7. Abrí el Monitor Serie a **115200**. Tenés que ver "Wi-Fi conectado" y "Conectado al broker MQTT".

Luces: **verde** = todo bien · **rojo + buzzer** = alerta · **amarillo** parpadea medio segundo al llegar un mensaje, y parpadea lento mientras no hay conexión.

## Paso 3 - Publicar la página en GitHub Pages

1. Creá una cuenta en github.com (si no tenés) y un repositorio nuevo, público, por ejemplo `router-guardian`.
2. Subí todos los archivos de esta carpeta (botón "Add file" → "Upload files"; arrastrá `index.html`, `chat.html`, `padres.html`, `css`, `js`, `README.md`).
3. En el repositorio: **Settings → Pages → Deploy from a branch → main → / (root) → Save**.
4. Esperá 1-2 minutos. La dirección queda `https://TU-USUARIO.github.io/router-guardian/`.

## Paso 4 - Probar

1. Prendé el hotspot del celular y enchufá el ESP32. Esperá el verde.
2. Abrí `padres.html` en un celular (con internet): debe decir **Maqueta en línea** y **Todo en orden**.
3. En `chat.html` (otro celular, o el mismo en otra pestaña) mandá `hola, jugamos una partida?` → sigue el verde y el panel no avisa nada.
4. Mandá `no le cuentes a tus papás` → LED rojo + buzzer, y en el panel aparece la alerta con la categoría **Pide secreto**.
5. Tocá **Visto** (en el panel o el botón físico) → vuelve el verde en la maqueta y en el panel.
6. Desenchufá el ESP32: en menos de un minuto el panel muestra **Maqueta desconectada**.

## Probar la web SIN el ESP32

Sirve para chequear que la página funciona antes de armar todo.

1. Entrá al cliente web de HiveMQ: https://www.hivemq.com/demos/websocket-client/ y apretá **Connect** (host `broker.hivemq.com`, puerto `8884`, con TLS).
2. Publicá en `PREFIJO/estado` (tildá **Retain** si aparece) el mensaje:
   `{"alarma":false,"online":true}` → el panel pasa a "Maqueta en línea / Todo en orden".
3. Publicá en `PREFIJO/resultado`:
   `{"id":"x1","texto":"no le cuentes a tus papás","riesgo":true,"categorias":["Pide secreto"]}` → aparece la alerta.
4. Publicá en `PREFIJO/estado` `{"alarma":true,"online":true}` → el panel se pone rojo. Tocá "Visto" y mirá que en `PREFIJO/visto` llegue `{"accion":"visto"}` (suscribite a `PREFIJO/#` para ver todo).
5. Para simular que se apagó: publicá `{"alarma":false,"online":false}` en `PREFIJO/estado`.

## Ciberseguridad aplicada

- Los mensajes se muestran con `textContent` (nunca `innerHTML`): evita que alguien meta código HTML/JavaScript en el chat.
- Se limita el largo de los mensajes a 200 caracteres (en la web y en el ESP32).
- La web usa **WebSocket con TLS** (`wss://`), o sea cifrado entre el celular y el broker.
- **Last Will (LWT)** de MQTT: si el ESP32 se desconecta de golpe, el broker avisa solo.

## Limitaciones

- El broker público es **abierto**: cualquiera que conozca el PREFIJO podría leer los mensajes. Es aceptable para una demo escolar porque **no se usan datos reales**. En un producto real se usaría un broker privado con usuario y contraseña.
- La conexión ESP32 → broker (puerto 1883) no va cifrada.
- Si la red del colegio bloquea los puertos 1883 u 8884, usá el hotspot del celular.
- La detección es por palabras clave: puede dar falsos positivos (por ejemplo "videojuegos" contiene "video") y no entiende el contexto. Una mejora sería usar inteligencia artificial.
