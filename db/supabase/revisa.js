/* revisa.js - lee las migraciones y busca lo que se rompe al aplicarlas.
 *
 *     node db/supabase/revisa.js
 *
 * No sustituye a pasarlas por un Postgres: no comprueba tipos, ni planes, ni
 * que una consulta devuelva lo que dice. Comprueba lo que se puede leer del
 * texto y que, cuando falla, falla entero:
 *
 *   1. Que nada se nombre antes de existir. Es el fallo numero uno al partir
 *      un esquema en ficheros numerados, y no se ve leyendo un fichero solo.
 *   2. Que toda tabla de `public` tenga RLS activada. Sin esto la tabla queda
 *      legible con la clave anon, que va escrita en el HTML.
 *   3. Que toda funcion `security definer` fije `search_path`. Sin eso, quien
 *      llama puede anteponer un esquema con una tabla llamada `credential`.
 *   4. Que toda vista lleve `security_invoker`. Una vista sin el se salta la
 *      RLS de las tablas de debajo.
 *   5. Que las columnas de cada `insert` existan, y que cuadren con los
 *      valores. Es lo que mas veces se escribe mal a mano.
 *   6. Que los `$$` esten pareados.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var DIR = __dirname;
var MIGR = path.join(DIR, 'migrations');

var fallos = [];
var avisos = [];

function falla(fichero, msg) { fallos.push(fichero + ': ' + msg); }
function avisa(fichero, msg) { avisos.push(fichero + ': ' + msg); }

/* --- lectura -------------------------------------------------------------
   Los comentarios se quitan antes de analizar nada: media migracion es
   comentario y ahi dentro se nombran tablas que aun no existen a proposito,
   explicando por que. Analizarlos daria un fallo por cada explicacion. */

function sinComentarios(sql) {
  return sql.split('\n').map(function (l) {
    var fuera = true, i;
    for (i = 0; i < l.length - 1; i += 1) {
      if (l[i] === "'") fuera = !fuera;
      if (fuera && l[i] === '-' && l[i + 1] === '-') return l.slice(0, i);
    }
    return l;
  }).join('\n');
}

var ficheros = fs.readdirSync(MIGR).filter(function (f) { return f.endsWith('.sql'); }).sort();
ficheros.push('../seed.sql');

var piezas = ficheros.map(function (f) {
  var ruta = f.startsWith('..') ? path.join(DIR, 'seed.sql') : path.join(MIGR, f);
  var crudo = fs.readFileSync(ruta, 'utf8');
  return { nombre: path.basename(ruta), crudo: crudo, sql: sinComentarios(crudo) };
});

/* --- 1. inventario de objetos, en el orden en que nacen ----------------- */

var objetos = Object.create(null);   // nombre -> fichero donde se crea
var columnas = Object.create(null);  // tabla  -> [columnas]

function apunta(nombre, fichero) {
  if (!(nombre in objetos)) objetos[nombre] = fichero;
}

piezas.forEach(function (p) {
  var m;

  var reTabla = /create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/g;
  while ((m = reTabla.exec(p.sql))) {
    apunta(m[1], p.nombre);
    columnas[m[1]] = m[2].split('\n')
      .map(function (l) { return l.trim(); })
      .filter(function (l) { return l && !/^(constraint|unique|check|primary key|foreign key|exclude)\b/i.test(l); })
      .map(function (l) { return (l.split(/\s+/)[0] || '').replace(/[(,]/g, ''); })
      .filter(function (c) { return /^\w+$/.test(c); });
  }

  /* Una columna tambien puede llegar despues, por `alter table`. Sin esto la
     comprobacion 5 daba por inexistente cualquier columna anadida en una
     migracion posterior a la que creo la tabla, y cantaba un fallo que no
     estaba. */
  var reAlta = /alter table public\.(\w+)\s+add column (?:if not exists )?(\w+)/g;
  while ((m = reAlta.exec(p.sql))) {
    if (columnas[m[1]] && columnas[m[1]].indexOf(m[2]) === -1) columnas[m[1]].push(m[2]);
  }

  var reVista = /create (?:or replace )?view public\.(\w+)([\s\S]*?)\bas\b/g;
  while ((m = reVista.exec(p.sql))) {
    apunta(m[1], p.nombre);
    if (m[2].indexOf('security_invoker') === -1) {
      falla(p.nombre, 'la vista public.' + m[1] + ' no declara security_invoker: ' +
        'se saltaria la RLS de las tablas de debajo');
    }
  }

  var reFun = /create or replace function public\.(\w+)\s*\(([\s\S]*?)\)\s*returns([\s\S]*?)\bas\s+\$\$/g;
  while ((m = reFun.exec(p.sql))) {
    apunta(m[1], p.nombre);
    var cabecera = m[3];
    if (/security definer/i.test(cabecera) && !/set\s+search_path/i.test(cabecera)) {
      falla(p.nombre, 'public.' + m[1] + '() es security definer y no fija search_path');
    }
  }
});

/* --- 2. nada se nombra antes de existir --------------------------------- */

var orden = {};
piezas.forEach(function (p, i) { orden[p.nombre] = i; });

piezas.forEach(function (p, i) {
  var vistos = Object.create(null);
  var m, re = /\bpublic\.(\w+)/g;
  while ((m = re.exec(p.sql))) {
    var n = m[1];
    if (vistos[n]) continue;
    vistos[n] = true;
    if (!(n in objetos)) {
      falla(p.nombre, 'nombra public.' + n + ', que no lo crea ninguna migracion');
    } else if (orden[objetos[n]] > i) {
      falla(p.nombre, 'nombra public.' + n + ', que no existe hasta ' + objetos[n]);
    }
  }
});

/* --- 3. RLS en toda tabla de public ------------------------------------- */

var conRls = Object.create(null);
var conPolitica = Object.create(null);
var conForce = Object.create(null);

piezas.forEach(function (p) {
  var m;
  var reRls = /alter table public\.(\w+) enable row level security/g;
  while ((m = reRls.exec(p.sql))) conRls[m[1]] = true;
  var reForce = /alter table public\.(\w+) force row level security/g;
  while ((m = reForce.exec(p.sql))) conForce[m[1]] = true;
  var rePol = /create policy "[^"]+" on public\.(\w+)/g;
  while ((m = rePol.exec(p.sql))) conPolitica[m[1]] = (conPolitica[m[1]] || 0) + 1;
});

Object.keys(columnas).forEach(function (t) {
  if (!conRls[t]) {
    falla('0006_rls.sql', 'public.' + t + ' no tiene RLS activada: queda abierta a la clave anon');
  }
});

/* --- 4. columnas de los insert ------------------------------------------
   Corta por comas de primer nivel: dentro de un `array[...]` o de una llamada
   a funcion tambien hay comas, y partir por todas cuenta valores de mas. */

function porComas(s) {
  var fuera = [], nivel = 0, act = '', comilla = false, i, c;
  for (i = 0; i < s.length; i += 1) {
    c = s[i];
    if (c === "'" ) comilla = !comilla;
    if (!comilla) {
      if (c === '(' || c === '[') nivel += 1;
      if (c === ')' || c === ']') nivel -= 1;
      if (c === ',' && nivel === 0) { fuera.push(act); act = ''; continue; }
    }
    act += c;
  }
  if (act.trim()) fuera.push(act);
  return fuera.map(function (x) { return x.trim(); });
}

piezas.forEach(function (p) {
  var m, re = /insert into public\.(\w+)\s*\(([^)]*)\)\s*(values|select)/gi;
  while ((m = re.exec(p.sql))) {
    var tabla = m[1];
    var cols = m[2].split(',').map(function (c) { return c.trim(); }).filter(Boolean);
    if (!columnas[tabla]) continue;
    cols.forEach(function (c) {
      if (columnas[tabla].indexOf(c) === -1) {
        falla(p.nombre, 'insert en public.' + tabla + ': la columna «' + c + '» no existe');
      }
    });

    if (m[3].toLowerCase() !== 'values') continue;
    // Primera tupla de valores, para contar.
    var resto = p.sql.slice(m.index + m[0].length);
    var abre = resto.indexOf('(');
    if (abre === -1) continue;
    var nivel = 0, j, fin = -1, comilla = false;
    for (j = abre; j < resto.length; j += 1) {
      if (resto[j] === "'") comilla = !comilla;
      if (comilla) continue;
      if (resto[j] === '(') nivel += 1;
      if (resto[j] === ')') { nivel -= 1; if (nivel === 0) { fin = j; break; } }
    }
    if (fin === -1) continue;
    var n = porComas(resto.slice(abre + 1, fin)).length;
    if (n !== cols.length) {
      falla(p.nombre, 'insert en public.' + tabla + ': ' + cols.length +
        ' columnas y ' + n + ' valores en la primera tupla');
    }
  }
});

/* --- 5. dolares pareados ------------------------------------------------- */

piezas.forEach(function (p) {
  var n = (p.sql.match(/\$\$/g) || []).length;
  if (n % 2 !== 0) falla(p.nombre, 'quedan ' + n + ' delimitadores $$: son impares');
});

/* --- 6. avisos, que no son fallos ---------------------------------------- */

Object.keys(columnas).forEach(function (t) {
  if (conRls[t] && !conPolitica[t] && !conForce[t]) {
    avisa('0006_rls.sql', 'public.' + t + ' tiene RLS y ninguna politica, y no esta en FORCE. ' +
      'Si es a proposito -- tabla interna -- deberia llevar FORCE tambien.');
  }
});

/* --- salida --------------------------------------------------------------- */

var nTablas = Object.keys(columnas).length;
var nPoliticas = Object.keys(conPolitica).reduce(function (a, k) { return a + conPolitica[k]; }, 0);
var nInternas = Object.keys(conForce).length;

avisos.forEach(function (a) { console.log('aviso · ' + a); });

if (fallos.length) {
  fallos.forEach(function (f) { console.error('FALLO · ' + f); });
  console.error('\nrevisa: ' + fallos.length + ' fallo(s)');
  process.exit(1);
}

console.log('revisa ok · ' + piezas.length + ' ficheros · ' + nTablas + ' tablas · ' +
  nPoliticas + ' politicas · ' + nInternas + ' tablas internas en FORCE');
console.log('NOTA: esto lee el SQL, no lo ejecuta. Sigue haciendo falta aplicarlo ' +
  'contra un proyecto de Supabase antes de fiarse.');
