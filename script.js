const elVideo = document.getElementById('video')

navigator.getMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia)

const cargarCamera = () => {
    navigator.getMedia(
        {
            video: true,
            audio: false
        },
        stream => elVideo.srcObject = stream,
        console.error
    )
}

var inicializacionOmitidos = false;
var contadorinicializacionOmitidos = 0;

// Cargar Modelos
Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    faceapi.nets.ageGenderNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
]).then(cargarCamera)

elVideo.addEventListener('play', async () => {
    // creamos el canvas con los elementos de la face api
    const canvas = faceapi.createCanvasFromMedia(elVideo)
    // lo añadimos al body
    document.getElementById("contenedor").append(canvas)

    // tamaño del canvas
    const displaySize = { width: elVideo.width, height: elVideo.height }
    faceapi.matchDimensions(canvas, displaySize)

    setInterval(async () => {
        // hacer las detecciones de cara
        //detectAllFaces
        var detections = await faceapi.detectAllFaces(elVideo)
            .withFaceLandmarks()
            .withFaceExpressions()
            // .withAgeAndGender()
            // .withFaceDescriptors()

        // Añadido resetearResultados
        if (detections.length < 0) {
            if(recolectandoEmocion == true) {
                console.log("Noone detected");
                robotStandBy();
            }
            return;
        }
        if (!detections[0]?.expressions) {
            if(recolectandoEmocion == true) {
                console.log("No emotion detected");
                robotStandBy();
            }
            return;
        }

        // Evitar que se bugee
        if(!enStandBy && !recolectandoEmocion && !synth.speaking && reproductor.paused) enStandBy = true;

        // Solo usar a 1
        detections = [detections[0]];

        // Reducir el happy

        // console.log('--- detections[0].expressions =', detections[0].expressions)

        // Test
        // ---
        const predominant = calcularMayoriaPredominante(detections)
        /*
        const predominant =  Object.entries(detections[0].expressions).reduce((acc, [key, value]) => {
            if (value > acc.value) {
              return { key, value };
            }
            return acc;
          }, { key: null, value: -Infinity }).key
        */
        

        console.log(' --- Predominante general: =', predominant)

        // Detecta el cambio de emocion
        document.body.setAttribute('data-emocion', predominant)
        
        // Almacena el resultado cada vez que se presenta una emocion
        if(inicializacionOmitidos == false) 
        {
            robotStandBy();
            contadorinicializacionOmitidos++;
            if(contadorinicializacionOmitidos >= nveces) inicializacionOmitidos = true;
            console.log("Cargando: ", contadorinicializacionOmitidos, "/", nveces);
        }
        else
        {
            almacenarResultado(predominant);
        }

        // ponerlas en su sitio
        const resizedDetections = faceapi.resizeResults(detections, displaySize)
        
        // limpiar el canvas
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)

        // dibujar las líneas
        // faceapi.draw.drawDetections(canvas, resizedDetections)
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections)

        resizedDetections.forEach(detection => {
            const box = detection.detection.box
            new faceapi.draw.DrawBox(box, {
                label: predominant
            }).draw(canvas)
        })
    }, tiempo_refresco)
})


// Variables

const robot = document.getElementById("robot");
const synth = window.speechSynthesis;
const reproductor = document.getElementById("reproductor");
reproductor.volume = 0.4;

const tiempo_recoleccion = 8000;
const tiempo_refresco = 500;
const nveces = Math.ceil(tiempo_recoleccion/tiempo_refresco);

var recoleccion = {
    'neutral': 0,
    'happy' : 0,
    'sad' : 0 ,
    'angry' : 0,
    'fearful' : 0,
    'disgusted' : 0,
    'surprised' : 0 
}

const res =
{
    none : {
        gif : "gifs/none.gif",
        color : "rgba(0, 0, 0, 1)",
        texto : new SpeechSynthesisUtterance(""),
        canciones : [""],
        indice_cancion: 0
        },
    neutral : {
        gif : "gifs/neutral.gif",
        color : "rgba(45, 50, 57, 1)",//"rgba(63, 72, 80, 1)", 
        texto : new SpeechSynthesisUtterance("Hola, quédate quieto por favor, estoy detectando tu emoción"),
        canciones : [""],
        indice_cancion: 0
        },
    happy : {
        gif : "gifs/happy.gif",
        color : "rgba(29, 94, 54, 1)",
        texto : new SpeechSynthesisUtterance("Veo que estas feliz. Te recomiendo escuchar esta cancion."),
        canciones : ["songs/livinlavidaloca.mp3", "songs/rasputin.mp3", "songs/happy.mp3", "songs/summer.mp3", "songs/uptownfunk.mp3", "songs/iknewyouweretrouble.mp3", "songs/asereje.mp3", "songs/bones.mp3", "songs/bzrpshakira.mp3", "songs/countingstars.mp3"],
        indice_cancion: 0
        },
    sad : {
        gif : "gifs/sad.gif",
        color : "rgba(11, 79, 108, 1)", 
        texto : new SpeechSynthesisUtterance("Veo que estas triste. Te recomiendo escuchar esta cancion."),
        canciones : ["songs/happy.mp3", "songs/summer.mp3", "songs/uptownfunk.mp3"],
        indice_cancion: 0
        },
    angry : {
        gif : "gifs/angry.gif",
        color : "rgba(97, 7, 5, 1)",
        texto : new SpeechSynthesisUtterance("Veo que estas molesto. Te recomiendo escuchar esta cancion."),
        canciones : ["songs/smellsliketeenspirit.mp3"],
        indice_cancion: 0
        },
    fearful : {
        gif : "gifs/fearful.gif",
        color : "rgba(86, 49, 16, 1)",
        texto : new SpeechSynthesisUtterance("Veo que estas asustado. Te recomiendo escuchar esta cancion."),
        canciones : ["songs/cirice.mp3", "songs/pueblolavanda.mp3"],
        indice_cancion: 0
        },
    disgusted : {
        gif : "gifs/disgusted.gif",
        color : "rgba(102, 61, 95, 1)",
        texto : new SpeechSynthesisUtterance("Veo que estas disgustado. Te recomiendo escuchar esta cancion."),
        canciones : ["songs/freakonaleash.mp3", "songs/duhast.mp3"],
        indice_cancion: 0
        },
    surprised : {
        gif : "gifs/surprised.gif",
        color : "rgba(204, 150, 0, 1)",
        texto : new SpeechSynthesisUtterance("Veo que estas sorprendido. Te recomiendo escuchar esta cancion."),
        canciones : ["songs/uptownfunk.mp3", "songs/iknewyouweretrouble.mp3"],
        indice_cancion: 0
        } 
}
// Recursos extra:
// Colores: https://coolors.co/cc9600-0b4f6c-1d5e36-2d3239-040f16
// Musica: https://es.onlymp3.to/240/
// Gifs: https://tenor.com/es/users/livingai/stickers





// Fase 0

var tiempo_standby = nveces; //segundos
var enStandBy = false;
function robotStandBy()
{
    // Si acaba de empezar a estar en standby, establece ciertas cosas
    if(enStandBy == false)
    {
        enStandBy = true;
        synth.cancel();
        reproductor.pause();
        if(robot.getAttribute("src") != res["none"].gif) robot.src = res["none"].gif; // Pone el gif de Hola
        cambiarColores(res.none.color); // Cambia todos los colores a negro
        document.getElementById("contenedor").style.opacity = "0"; // Esconde la camara
        document.getElementById("border-path-background").setAttribute("stroke", res.none.color); // Esconde la barra de progreso
        document.getElementById("robot-background").style.backgroundColor = res.none.color; // Esconde el fondo blanco del robot
        document.getElementById("robot").style.backgroundColor = res.none.color; // Esconde el fondo del robot
        resetearResultados();
        //synth.speak(res["none"].texto);
    }     
}


// Fase 1

var recolectandoEmocion = true;
const cantidadAOmitir = (1000/tiempo_refresco);
var omitirPrimeros = cantidadAOmitir; // Omite las 2 primeras recolecciones mientras se hace la transition de colores. La tercera ya es almacenada.
function almacenarResultado(emocion_actual)
{
    if(recolectandoEmocion == false) return; // Si termina fase 1, ya no recolecte
    // Cuando vuelve del standby
    if(enStandBy) 
    {
        enStandBy = false;
        document.getElementById("contenedor").style.opacity = "1"; // Hace aparecer la camara
        document.getElementById("border-path-background").setAttribute("stroke", "white"); // Hace aparecer el fondo blanco de la barra de progreso
        document.getElementById("robot-background").style.backgroundColor = "white"; // Hace aparecer el fondo blanco del robot
        cambiarRobot("neutral", false);
        resetearBarra(); 
        omitirPrimeros = cantidadAOmitir; // Para que espere a que termine la transition
    }
    // Cuando vuelve de terminar el ciclo y se muestra una emocion, poner en Detectando
    if(acabaDeTerminarCiclo)
    {
        acabaDeTerminarCiclo = false;
        cambiarRobot("neutral", false);
        document.getElementById("border-path").setAttribute("stroke", "white"); // Para que funcione la transicion de barra de color a barra blanca
        omitirPrimeros = cantidadAOmitir;// Para que espere a que termine la transition
    }
    
    if(omitirPrimeros > 1) // Si esta en fase omitiendo
    {   
        omitirPrimeros--;
        console.log("omitido: ", omitirPrimeros)
        return;
    }
    if(omitirPrimeros == 1) // Si ha terminado la animacion (para que funcione con refreshrate = 500, debe ponerse || omitirPrimeros == 0)
    {
        omitirPrimeros--;
        console.log("omitido: ", omitirPrimeros)
        synth.speak(res.neutral.texto);
        resetearBarra();
        document.getElementById("border-path").setAttribute("stroke", res.neutral.color); // En caso termina ciclo, volver a barra gris
        pasoLargo();
        resetearResultados();
        return;
    }



    recoleccion[emocion_actual]++;
    document.getElementById("border-path").setAttribute("stroke", colorSecundario(res[emocion_actual].color));

    // avanzarBarra();
    console.log(sumarResultados(), recoleccion);

    if(sumarResultados() >= nveces){

        var mayores = mayoresResultados();
        var primera_emocion = mayores[0];
        var segunda_emocion = mayores[1];

        if(primera_emocion == "neutral"){
            if(segunda_emocion == "neutral"){
                console.log("nada encontrado, puro neutral");
                recolectandoEmocion = true;
                synth.speak(res.neutral.texto); // VUelva a decir Detectando
                resetearBarra();
                pasoLargo();    
            }
            else{
                console.log("nueva emocion encontrada: ", segunda_emocion);
                recolectandoEmocion = false;
                cambiarRobot(segunda_emocion, true);
            }
        }
        else{
            console.log("nueva emocion encontrada: ", primera_emocion);
            recolectandoEmocion = false;
            cambiarRobot(primera_emocion, true);
        }
        resetearResultados();
    }
}

function sumarResultados()
{
    var suma = 0;
    for(var key in recoleccion) {
        suma += recoleccion[key];
    }
    return suma;
}

function mayoresResultados()
{
    var primera_emocion = "neutral";
    var primera_mayor = 0;
    var segunda_emocion = "neutral";
    var segunda_mayor = 0;
    for(var key in recoleccion) {
        if(recoleccion[key] > primera_mayor){
            segunda_emocion = primera_emocion;
            segunda_mayor = primera_mayor;
            primera_emocion = key;
            primera_mayor = recoleccion[key];
        }
        else if(recoleccion[key] > segunda_mayor){
            segunda_emocion = key;
            segunda_mayor = recoleccion[key];
        }
    }
    resultados = new Array();
    resultados[0] = primera_emocion;
    resultados[1] = segunda_emocion;
    return resultados;
}

function resetearResultados()
{
    for(var key in recoleccion) {
        recoleccion[key] = 0;
    }
    console.log(recoleccion)
}


// Fase 2

function cambiarRobot(predominant, debeHablar) {

    // PRecauciones
    synth.cancel();
    reproductor.pause();

    res_emocion = res[predominant];

    // Si la emocion es diferente que la anterior. Para caso neutral -> neutral
    if(robot.getAttribute("src") != res_emocion.gif) 
    {
        robot.src = res_emocion.gif;
        cambiarColores(res_emocion.color);+
        reproductor.setAttribute('src',escogerCancion(predominant));
    }
    if(debeHablar) synth.speak(res_emocion.texto);
}

function escogerCancion(emocion)
{
    if(res[emocion].indice_cancion == 0)
    {
        res[emocion].canciones = shuffle(res[emocion].canciones);
    }
    var cancion = res[emocion].canciones[res[emocion].indice_cancion];
    res[emocion].indice_cancion++;
    if(res[emocion].indice_cancion >= res[emocion].canciones.length) res[emocion].indice_cancion = 0;
    return cancion
}

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

for(var emocion in res) {
    if(emocion == "neutral" || emocion == "none") continue; // Los neutral y none no pasan a fase 3
    res[emocion].texto.addEventListener('end', () => {reproductor.play()});
}


// Fase 3
var acabaDeTerminarCiclo = false;
reproductor.addEventListener("ended", () => 
{
    acabaDeTerminarCiclo = true;
    recolectandoEmocion = true;
});




// Barra de progresos

var bar = new ProgressBar.Path('#border-path', {
    easing: 'easeInOut',
    duration: tiempo_recoleccion
});
bar.set(0);
function pasoLargo()
{
    bar.animate(1.0);
}
function resetearBarra()
{
    bar.stop();
    bar.set(0);
    progresoBarra = 0;
}



//Colores
const nuevaOpacidad = 0.8 ;
function colorSecundario(oldCss)
{
    newCss = oldCss.replace(/[^,]+(?=\))/, nuevaOpacidad);
    return newCss;
}
function cambiarColores(color)
{
    document.body.style.backgroundColor = color; // Cambia fondo de la pagina
    document.getElementById("border-path").setAttribute("stroke", colorSecundario(color)); // Cambia barra de progreso
    robot.style.backgroundColor = colorSecundario(color); // Cambia fondo del robot
    //document.getElementById("frase").style.color = colorSecundario(color);
}


// Trabajar con detectiones de varias personas
var allDetections = {
    'neutral': 0,
    'happy' : 0,
    'sad' : 0 ,
    'angry' : 0,
    'fearful' : 0,
    'disgusted' : 0,
    'surprised' : 0 
}
var porcReduccion = 0.5;
function calcularMayoriaPredominante(detections)
{
    // Resetea
    for(var key in allDetections) {
        allDetections[key] = 0;
    }

    // Suma
    for(var i = 0; i < detections.length; i++)
    {
        // Halla el predominantIndividual
        var predominantIndividual = Object.entries(detections[i].expressions).reduce((acc, [key, value]) => {
            if(key == "happy") value = value*porcReduccion; // Reducir la probabilidad de happy
            if (value > acc.value) {
              return { key, value };
            }
            console.log(key, " ", value)
            return acc;
        }, { key: null, value: -Infinity }).key;
        if(predominantIndividual != "neutral") allDetections[predominantIndividual]++;
        console.log(" -- Persona ", i, ": ", predominantIndividual);
    }

    // Halla el mayor
    var predominant = "neutral"; // Neutral por defecto
    var mayordetections = 0;
    for(key in allDetections)
    {
        if(allDetections[key] > mayordetections)
        {
            predominant = key;
            mayordetections = allDetections[key];
        }
    }
    return predominant;
}

