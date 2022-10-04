const { exec } = require("child_process");
const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')
var CronJob = require('cron').CronJob;
const Database = require("better-sqlite3");
const mqtt = require("mqtt")
var cron = require("node-cron");
const crc8 = require("crc/crc8")

let msg = Buffer.from([0x00,0x55,0x08,0x00,0x00,0x00,0x00,0x7c])

/** Cron job to restart values */
var job = new CronJob(
	'00 45 06 * * *',
	function() {
		console.log('Good morning! Restarting both sensors');
        salidastotal = 0
        entradastotal = 0

        salidasder = 0
        salidasder2 = 0
        salidasizq = 0
        entradasder = 0
        entradasder2 = 0
        entradasizq = 0

        serialport1.write(msg)
        serialport2.write(msg)
        serialport3.write(msg)
});

console.log("Starting CRON job");
job.start()

/*MQTT*/
const options = {
    clean: true, // retain session
connectTimeout: 4000, // Timeout period
// Authentication information
clientId: 'Raspberry6_PC',
username: 'Raspberry6_PC',
password: 'Raspberry6_PC',
}


const connectUrl = 'ws://10.147.18.134:8083/mqtt'
const client = mqtt.connect(connectUrl, options)

client.on('connect', function () {
        console.log("Connected to MQTT URL")
  })

/*SQLITE3 - Local storagement*/
const db = new Database("PersonCount.db")
const createTable = 
    "CREATE TABLE IF NOT EXISTS PersonCounter ('Timestamp','IdSensor','EventoIO','entradasDer','entradasIzq','entradasDer2','entradasTotal','salidasDer','salidasIzq','salidasDer2','salidasTotal')";
db.exec(createTable);

const insertInto = db.prepare(
    "INSERT INTO PersonCounter (Timestamp,IdSensor,EventoIO,entradasDer,entradasIzq,entradasDer2,entradasTotal,salidasDer,salidasIzq,salidasDer2,salidasTotal) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
)


/* Serial port instances for 3 terabee sensors */
const serialport1 = new SerialPort({ //Derecho
    path : '/dev/ttyACM0',
    baudRate: 115200,
    parity:'none',
    stopBits:1,
    dataBits:8,
    flowControl:false 
})

const serialport2 = new SerialPort({//Izquierdo
    path : '/dev/ttyUSB0',
    baudRate: 115200,
    parity:'none',
    stopBits:1,
    dataBits:8,
    flowControl:false 
})

const serialport3 = new SerialPort({//Derecho2
    path : "/dev/ttyACM1",
    baudRate: 115200,
    parity: 'none',
    stopBits:1,
    dataBits:8,
    flowControl:false
})

/* Timestamp functions*/
function pad(n, z){
    z = z || 2;
  return ('00' + n).slice(-z);
  }
  
  const getFechaCompleta = () => {
    let d = new Date,
    dformat =   [d.getFullYear(),
                pad(d.getMonth()+1),
                pad(d.getDate())].join('-')+' '+
                [pad(d.getHours()),
                pad(d.getMinutes()),
                pad(d.getSeconds())].join(':');
  
    return dformat;
} 

/** Execution */

let entradasTotal = 0
let salidasTotal = 0

let salidasder = 0
let entradasder = 0

let salidasder2 = 0
let entradasder2 = 0

let salidasizq = 0
let entradasizq = 0

let frame = ''
let auxin = 0
let auxout = 0
let auxst = "Entrada"
let auxsen = "Right"
let param = {}

const checkSInfo = (buff,src) => {

    if(buff.includes("5043")){

        frame = buff.split("5043")[1]
        //console.log(frame)
        auxin = parseInt(frame[16]+frame[17]+frame[18]+frame[19],16)
        auxout = parseInt(frame[20]+frame[21]+frame[22]+frame[23],16)

        switch(src){

            case 1:

                if(auxin > entradasder){
                    auxst = "Entrada"
                }

                if(auxout > salidasder){
                    auxst = "Salida"
                }

                salidasder = auxout;
                entradasder = auxin;
                auxsen = "Right";
                break;
            
            case 2:

                if(auxin > entradasizq){
                    auxst = "Entrada"
                }

                if(auxout > salidasizq){
                    auxst = "Salida"
                }

                salidasizq = auxout;
                entradasizq = auxin;
                auxsen = "Left"
                break;
            
            case 3:

                if(auxin > entradasder2){
                    auxst = "Entrada"
                }

                if(auxout > salidasder2){
                    auxst = "Salida"
                }

                salidasder2 = auxout;
                entradasder2 = auxin;
                auxsen = "Right2"
                break;

        }

        param.timestamp = getFechaCompleta();
        param.sensor = auxsen;

        if(auxst == "Entrada")
            param.eventoIO = true;
        else
            param.eventoIO = false;

        param.entradasSensorDer = entradasder;
        param.salidasSensorDer = salidasder;

        param.entradasSensorDer2 = entradasder2;
        param.salidasSensorDer2 = salidasder2;

        param.entradasSensorIzq = entradasizq;
        param.salidasSensorIzq = salidasizq;

        salidasTotal = salidasder + salidasizq
        entradasTotal = entradasder + entradasizq

        param.entradasTotal = entradasTotal;
        param.salidasTotal = salidasTotal;
        
        client.publish("CRAIUPCTPersonCount",JSON.stringify(param))

        insertInto.run(getFechaCompleta(),
                        auxsen,
                        auxst,
                        entradasder,
                        entradasizq,
                        entradasder2,
                        entradasTotal,
                        salidasder,
                        salidasizq,
                        salidasder2,
                        salidasTotal)
        
        console.log("Alguien ha pasado")
        console.log(param)

    }else if(buff.includes("4250")){

        frame = buff.split("4250")[1]
        console.log("Detalle del maximo y minimo:")
        console.log(frame)
        console.log("Maximo: " + parseInt(frame[0]+frame[1]),16)
        console.log("Minimo: " + parseInt(frame[2]+frame[3]),16)

    }

} 

let mn = Buffer.from([0x00,0x55,0x03,0x06,0xa4,0x00,0x64,0xac])

const setMaxMin = (max,min) => {

    if(max < min)
        return

    if(max > 1700){

        max = 1700

    }

    if(min < 50){

        min = 50

    }

    if((min + 200) <= max ){

        mn[3] = (max >> 8)
        mn[4] = max
        mn[5] = (min >> 8)
        mn[6] = min
        
        let a = Buffer.from([mn[3],mn[4],mn[5],mn[6]])
        mn[7] = crc8(a)
        console.log(a)

        serialport1.write(mn)
        console.log(mn)
        
        getMaxMin()

    }
        

    
    
}

let cfg = Buffer.from([0x00,0x61,0x01,0xe7])

const getMaxMin = () => {

    serialport1.write(cfg)

}



/** Derecho 1  Ref salida, izquierdo si ref entrada*/

const parser1 = serialport1.pipe(new ReadlineParser({ delimiter: '4444',
                                                    encoding: "hex" }))
                                                    

parser1.on('data', function(buff){

    //console.log(buff)
    
    if(buff.length > 10){

        checkSInfo(buff,1)

    }
      

})

/** Izquierda 1 */

const parser2 = serialport2.pipe(new ReadlineParser({ delimiter: '4444',
                                                    encoding: "hex" }))
                                                    

parser2.on('data', function(buff){

    //console.log(buff)
    
    if(buff.length > 10){

        checkSInfo(buff,2)

    }
      

})

/** Derecha 2 */

const parser3 = serialport3.pipe(new ReadlineParser({ delimiter: '4444',
                                                    encoding: "hex" }))
                                                    

parser3.on('data', function(buff){

    //console.log(buff)
    
    if(buff.length > 10){

        checkSInfo(buff,3)

    }
      

})


serialport1.write(msg)
serialport2.write(msg)
serialport3.write(msg)

cron.schedule("*/30 * * * * *", () => {//Keep-alive

    exec(
      "cat /sys/class/thermal/thermal_zone0/temp",
      function (error, stdout, stderr) {
        if (error !== null) {
          console.log("exec error: " + error);
        } else {
          param.entradasSensorDer2 = parseFloat(stdout / 1000);
          param.sensor="KeepAlive";
          param.timestamp = getFechaCompleta();
  
          
          client.publish("CRAIUPCT_BLEdata", JSON.stringify(param));
          
  
        }
      }
    );
  
  
  
  });