/* =========================================================================
   script.js - Panel de Gestión de Usuarios
   Temas aplicados: let/const, funciones flecha, template strings,
   destructuring, condicionales, switch, bucles, arrays de objetos, DOM,
   eventos, JSON, fetch, async/await, map() y filter().
   ========================================================================= */

/* -------------------------------------------------------------------------
   1. CONSTANTES Y ESTADO DE LA APLICACIÓN
   ------------------------------------------------------------------------- */

// URL de la API real que entrega los usuarios
const URL_API = "https://jsonplaceholder.typicode.com/users";

// Array de objetos con el formato propio de la tabla: { id, nombre, correo, ciudad }
// Es la única "fuente de verdad": la tabla siempre se dibuja a partir de aquí.
let usuarios = [];

// Guarda el id del usuario que se está editando. null = se está agregando.
let idEnEdicion = null;

/* -------------------------------------------------------------------------
   2. REFERENCIAS AL DOM (se obtienen una sola vez)
   ------------------------------------------------------------------------- */

const formulario = document.getElementById("formularioUsuario");
const inputId = document.getElementById("id");
const inputNombre = document.getElementById("nombre");
const inputCorreo = document.getElementById("correo");
const inputCiudad = document.getElementById("ciudad");
const buscador = document.getElementById("buscador");
const cuerpoTabla = document.getElementById("cuerpoTabla");
const mensaje = document.getElementById("mensaje");
const botonEnviar = document.getElementById("botonEnviar");
const botonCancelar = document.getElementById("botonCancelar");
const contador = document.getElementById("contador");
const resumenCiudades = document.getElementById("resumenCiudades");

/* -------------------------------------------------------------------------
   3. FUNCIONES AUXILIARES (todas como funciones flecha)
   ------------------------------------------------------------------------- */

/**
 * Muestra un mensaje de estado en pantalla.
 * @param {string} texto - texto a mostrar
 * @param {string} tipo  - "exito" | "error" | "cargando" | "aviso"
 */
const mostrarMensaje = (texto, tipo) => {
  // Template string para armar el contenido del mensaje
  mensaje.textContent = `${texto}`;
  // Se reinician las clases y se aplica solo la del tipo recibido
  mensaje.className = `mensaje visible ${tipo}`;
};

// Oculta el área de mensajes
const limpiarMensaje = () => {
  mensaje.textContent = "";
  mensaje.className = "mensaje";
};

/**
 * Cuenta cuántos usuarios hay por ciudad usando un BUCLE for...of
 * y devuelve un texto resumido.
 */
const contarPorCiudad = (lista) => {
  const conteo = {}; // objeto que acumula ciudad -> cantidad

  // BUCLE: recorre la lista y acumula el conteo por ciudad
  for (const usuario of lista) {
    const { ciudad } = usuario; // destructuring
    if (conteo[ciudad]) {
      conteo[ciudad] = conteo[ciudad] + 1;
    } else {
      conteo[ciudad] = 1;
    }
  }

  // Se arma el texto final con template strings
  const partes = Object.keys(conteo).map((ciudad) => `${ciudad}: ${conteo[ciudad]}`);
  return partes.length === 0 ? "" : `Usuarios por ciudad → ${partes.join(" · ")}`;
};

/**
 * Imprime en consola el array completo cada vez que la lista cambia.
 */
const registrarEnConsola = () => {
  console.log("Lista actual de usuarios:");
  console.log(JSON.stringify(usuarios, null, 2));
};

/* -------------------------------------------------------------------------
   4. DIBUJAR LA TABLA EN EL DOM
   ------------------------------------------------------------------------- */

/**
 * Redibuja el <tbody> a partir de la lista recibida (sin recargar la página).
 * Si no se le pasa una lista, usa el array completo de usuarios.
 */
const dibujarTabla = (lista = usuarios) => {
  // Caso 1: no hay nada que mostrar
  if (lista.length === 0) {
    cuerpoTabla.innerHTML = `
      <tr class="fila-vacia">
        <td colspan="5">No hay usuarios para mostrar.</td>
      </tr>`;
  } else {
    // Caso 2: se construye una fila por usuario usando map() y template strings.
    // El atributo data-etiqueta permite que la tabla se vea como tarjetas en celular.
    cuerpoTabla.innerHTML = lista
      .map((usuario) => {
        const { id, nombre, correo, ciudad } = usuario; // destructuring
        return `
          <tr>
            <td data-etiqueta="ID">${id}</td>
            <td data-etiqueta="Nombre">${nombre}</td>
            <td data-etiqueta="Correo">${correo}</td>
            <td data-etiqueta="Ciudad">${ciudad}</td>
            <td data-etiqueta="Acciones">
              <div class="celda-acciones">
                <button class="btn btn-fila btn-editar" data-accion="editar" data-id="${id}">Editar</button>
                <button class="btn btn-fila btn-eliminar" data-accion="eliminar" data-id="${id}">Eliminar</button>
              </div>
            </td>
          </tr>`;
      })
      .join("");
  }

  // Contador y resumen por ciudad (siempre sobre el array completo)
  contador.textContent = `${usuarios.length} ${usuarios.length === 1 ? "usuario" : "usuarios"}`;
  resumenCiudades.textContent = contarPorCiudad(usuarios);
};

/* -------------------------------------------------------------------------
   5. CARGA DE DATOS DESDE LA API (JSON, fetch, async/await, try/catch, map)
   ------------------------------------------------------------------------- */

const cargarUsuarios = async () => {
  // Mensaje mientras llegan los datos
  mostrarMensaje("Cargando usuarios desde la API...", "cargando");

  try {
    const respuesta = await fetch(URL_API);

    // Si el servidor responde con un error (404, 500...) se lanza manualmente
    if (!respuesta.ok) {
      throw new Error(`La API respondió con el estado ${respuesta.status}`);
    }

    // Se convierte la respuesta JSON en un array de objetos de JavaScript
    const datos = await respuesta.json();

    // map(): transforma los datos de la API al formato propio de la tabla.
    // La API entrega { id, name, email, address: { city }, ... } y aquí
    // nos quedamos solo con los cuatro campos que necesitamos.
    usuarios = datos.map((usuarioApi) => {
      const { id, name, email, address } = usuarioApi; // destructuring
      const { city } = address;                        // destructuring anidado
      return { id, nombre: name, correo: email, ciudad: city };
    });

    dibujarTabla();
    registrarEnConsola();
    mostrarMensaje(`Se cargaron ${usuarios.length} usuarios correctamente.`, "exito");
  } catch (error) {
    // Mensaje amigable si falla la conexión o la URL es incorrecta
    console.error("Error al consumir la API:", error);
    usuarios = [];
    dibujarTabla();
    mostrarMensaje(
      `No fue posible cargar los usuarios. Revisa tu conexión a internet e intenta de nuevo. (Detalle: ${error.message})`,
      "error"
    );
  }
};

/* -------------------------------------------------------------------------
   6. VALIDACIÓN DEL FORMULARIO (condicionales + switch)
   ------------------------------------------------------------------------- */

/**
 * Revisa los datos del formulario y devuelve un código de resultado.
 * Códigos: "ok" | "vacio" | "idNoNumerico" | "idRepetido" | "correoInvalido"
 */
const validarDatos = ({ id, nombre, correo, ciudad }) => {
  // BUCLE: recorre los campos del formulario para comprobar que ninguno esté vacío
  const camposTexto = [id, nombre, correo, ciudad];
  for (let i = 0; i < camposTexto.length; i++) {
    if (camposTexto[i] === "") {
      return "vacio";
    }
  }

  // El id debe ser un número
  if (isNaN(Number(id))) {
    return "idNoNumerico";
  }

  // El correo debe contener "@"
  if (!correo.includes("@")) {
    return "correoInvalido";
  }

  // Al AGREGAR (no al editar) el id no puede existir ya en el array,
  // incluidos los usuarios que llegaron de la API.
  if (idEnEdicion === null) {
    const yaExiste = usuarios.some((usuario) => usuario.id === Number(id));
    if (yaExiste) {
      return "idRepetido";
    }
  }

  return "ok";
};

/**
 * Elige el mensaje adecuado según el resultado de la validación (switch).
 */
const mensajeDeValidacion = (resultado, id) => {
  switch (resultado) {
    case "vacio":
      return "Todos los campos son obligatorios: completa ID, nombre, correo y ciudad.";
    case "idNoNumerico":
      return "El ID debe ser un número válido.";
    case "correoInvalido":
      return 'El correo no es válido: debe contener el símbolo "@".';
    case "idRepetido":
      return `Ya existe un usuario con el id ${id}. Usa un ID diferente.`;
    default:
      return "";
  }
};

/* -------------------------------------------------------------------------
   7. LIMPIAR Y RESTABLECER EL FORMULARIO
   ------------------------------------------------------------------------- */

const reiniciarFormulario = () => {
  formulario.reset();          // limpia todos los campos
  inputId.disabled = false;    // el ID vuelve a ser editable
  idEnEdicion = null;          // se sale del modo edición
  botonEnviar.textContent = "Agregar usuario"; // el botón vuelve a "Agregar"
  botonCancelar.classList.add("oculto");
};

/* -------------------------------------------------------------------------
   8. EVENTO SUBMIT: AGREGAR O MODIFICAR
   ------------------------------------------------------------------------- */

formulario.addEventListener("submit", (event) => {
  event.preventDefault(); // evita que la página se recargue

  // Se leen los valores del formulario (sin espacios sobrantes)
  const datosFormulario = {
    id: inputId.value.trim(),
    nombre: inputNombre.value.trim(),
    correo: inputCorreo.value.trim(),
    ciudad: inputCiudad.value.trim(),
  };

  // Validación
  const resultado = validarDatos(datosFormulario);
  if (resultado !== "ok") {
    mostrarMensaje(mensajeDeValidacion(resultado, datosFormulario.id), "error");
    return; // no se agrega ni se modifica nada
  }

  // Destructuring de los datos ya validados
  const { id, nombre, correo, ciudad } = datosFormulario;
  const usuarioFinal = { id: Number(id), nombre, correo, ciudad };

  if (idEnEdicion === null) {
    // ----- MODO AGREGAR -----
    usuarios = [...usuarios, usuarioFinal]; // se crea un nuevo array con el usuario añadido
    mostrarMensaje(`Usuario "${nombre}" agregado correctamente (id ${id}).`, "exito");
  } else {
    // ----- MODO MODIFICAR -----
    // Se busca el usuario por su id y se actualiza el objeto correspondiente
    usuarios = usuarios.map((usuario) =>
      usuario.id === idEnEdicion ? { ...usuario, nombre, correo, ciudad } : usuario
    );
    mostrarMensaje(`Los datos del usuario con id ${idEnEdicion} se guardaron correctamente.`, "exito");
  }

  reiniciarFormulario();
  // Se respeta lo que esté escrito en el buscador al redibujar
  aplicarBusqueda();
  registrarEnConsola();
});

/* -------------------------------------------------------------------------
   9. EVENTO INPUT: BÚSQUEDA EN VIVO CON filter()
   ------------------------------------------------------------------------- */

/**
 * Filtra por nombre SIN modificar el array original: filter() devuelve
 * un array nuevo que es el que se dibuja en la tabla.
 */
const aplicarBusqueda = () => {
  const texto = buscador.value.trim().toLowerCase();

  const filtrados = usuarios.filter((usuario) => {
    const { nombre } = usuario; // destructuring
    return nombre.toLowerCase().includes(texto);
  });

  dibujarTabla(filtrados);

  // Aviso cuando la búsqueda no encuentra coincidencias
  if (texto !== "" && filtrados.length === 0) {
    mostrarMensaje(`No se encontraron usuarios con el nombre "${buscador.value.trim()}".`, "aviso");
  }
};

buscador.addEventListener("input", aplicarBusqueda);

/* -------------------------------------------------------------------------
   10. EVENTO CLICK CON DELEGACIÓN: EDITAR Y ELIMINAR
   ------------------------------------------------------------------------- */

cuerpoTabla.addEventListener("click", (event) => {
  // Solo interesan los clics sobre botones que tengan data-accion
  const boton = event.target.closest("button[data-accion]");
  if (!boton) return;

  const { accion, id } = boton.dataset; // destructuring del dataset
  const idNumero = Number(id);

  // Se busca el usuario en el array
  const usuario = usuarios.find((item) => item.id === idNumero);
  if (!usuario) {
    mostrarMensaje(`No se encontró el usuario con id ${id}.`, "error");
    return;
  }

  // switch para decidir qué hacer según el botón presionado
  switch (accion) {
    case "editar": {
      // Se cargan los datos del usuario en el formulario
      const { id: idUsuario, nombre, correo, ciudad } = usuario; // destructuring
      inputId.value = idUsuario;
      inputNombre.value = nombre;
      inputCorreo.value = correo;
      inputCiudad.value = ciudad;

      inputId.disabled = true;   // el ID queda bloqueado: no se puede cambiar
      idEnEdicion = idUsuario;   // se entra en modo edición
      botonEnviar.textContent = "Guardar cambios";
      botonCancelar.classList.remove("oculto");

      mostrarMensaje(`Editando al usuario "${nombre}" (id ${idUsuario}). Modifica los datos y guarda los cambios.`, "aviso");
      inputNombre.focus();
      break;
    }

    case "eliminar": {
      const { nombre } = usuario; // destructuring
      // Se pide confirmación antes de borrar
      const confirmado = confirm(`¿Seguro que deseas eliminar a "${nombre}" (id ${idNumero})?`);

      if (confirmado) {
        // filter() por id: devuelve un array nuevo sin ese usuario
        usuarios = usuarios.filter((item) => item.id !== idNumero);

        // Si se estaba editando justo ese usuario, se sale del modo edición
        if (idEnEdicion === idNumero) {
          reiniciarFormulario();
        }

        aplicarBusqueda();
        registrarEnConsola();
        mostrarMensaje(`Usuario "${nombre}" eliminado correctamente.`, "exito");
      } else {
        mostrarMensaje("Eliminación cancelada.", "aviso");
      }
      break;
    }

    default:
      break;
  }
});

/* -------------------------------------------------------------------------
   11. BOTÓN CANCELAR EDICIÓN
   ------------------------------------------------------------------------- */

botonCancelar.addEventListener("click", () => {
  reiniciarFormulario();
  mostrarMensaje("Edición cancelada.", "aviso");
});

/* -------------------------------------------------------------------------
   12. ARRANQUE: se cargan los usuarios al abrir la página
   ------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  limpiarMensaje();
  dibujarTabla();   // tabla vacía mientras llega la respuesta
  cargarUsuarios(); // función async que consume la API
});
