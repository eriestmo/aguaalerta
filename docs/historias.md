# Historias de usuario de AguaAlerta

## RF-01 Registro de usuarios

### HU1 — Crear cuenta de ciudadano (Alta, 5 PH, sprint 1)

Como un ciudadano. Necesito crear una cuenta con mis datos básicos. Con la finalidad de poder reportar fallas y dar seguimiento a mis reportes.
1. **Registro exitoso:** En caso que los datos estén completos, el aviso de privacidad esté aceptado y el correo no esté registrado; cuando seleccione la opción "Crear cuenta"; el sistema crea la cuenta de ciudadano con nombre, correo, teléfono y contraseña, muestra el mensaje "Revise su correo para continuar" y permite ingresar solo después de confirmar el correo.
2. **Correo con formato inválido:** En caso que el correo no tenga un formato válido; cuando seleccione la opción "Crear cuenta"; el sistema no crea la cuenta y muestra el mensaje "Formato de correo inválido".
3. **Correo ya registrado:** En caso que el correo ya pertenezca a otra cuenta; cuando seleccione la opción "Crear cuenta"; el sistema no crea otra cuenta y muestra el mismo mensaje "Revise su correo para continuar", sin revelar que la cuenta existe.
4. **Contraseña débil o campos vacíos:** En caso que falte un campo obligatorio o la contraseña tenga menos de 8 caracteres; cuando seleccione la opción "Crear cuenta"; el sistema señala cada campo por corregir y conserva los datos ya digitados.

### HU2 — Aceptar el aviso de privacidad (Alta, 2 PH, sprint 1)

Como un ciudadano. Necesito conocer y aceptar cómo se usarán mis datos, fotografías y ubicación. Con la finalidad de decidir de forma informada si comparto mi información con la ASADA.
1. **Aceptación del aviso:** En caso que esté creando una cuenta; cuando marque la casilla de aceptación y continúe; el sistema guarda la fecha de aceptación y permite completar el registro.
2. **Aviso sin aceptar:** En caso que no haya marcado la casilla de aceptación; cuando intente crear la cuenta; el sistema no crea la cuenta y muestra el mensaje "Debe aceptar el aviso de privacidad para continuar".
3. **Consulta del aviso:** En caso que tenga o no una sesión iniciada; cuando seleccione la opción "Aviso de privacidad"; el sistema muestra para qué se usan los datos, quién puede verlos y cómo solicitar su corrección o eliminación.

## RF-02 Inicio de sesión

### HU3 — Iniciar sesión según el perfil (historia pivote) (Alta, 3 PH, sprint 1)

Como un usuario registrado. Necesito ingresar con mi correo y contraseña. Con la finalidad de utilizar las funciones que corresponden a mi perfil.
1. **Ingreso según el perfil:** En caso que las credenciales sean correctas y la cuenta esté activa; cuando seleccione la opción "Ingresar"; el sistema da acceso únicamente a las funciones de mi perfil.
2. **Credenciales incorrectas:** En caso que el correo o la contraseña no coincidan; cuando seleccione la opción "Ingresar"; el sistema no da acceso y muestra el mensaje "Correo o contraseña incorrectos", sin indicar cuál de los dos falló.
3. **Intentos fallidos:** En caso que una cuenta acumule 5 intentos fallidos seguidos; cuando se intente ingresar de nuevo; el sistema bloquea temporalmente el ingreso durante 15 minutos y muestra el mensaje "Demasiados intentos. Inténtelo más tarde".
4. **Acceso restringido:** En caso que un usuario intente usar una función o consultar datos fuera de su perfil, por cualquier medio; cuando se reciba la solicitud; el sistema la rechaza, aunque no provenga de las opciones de su perfil.

### HU4 — Recuperar la contraseña (Media, 3 PH, sprint 1)

Como un usuario registrado. Necesito restablecer mi contraseña si la olvido. Con la finalidad de volver a ingresar sin depender de que la ASADA me ayude.
1. **Solicitud de recuperación:** En caso que haya olvidado la contraseña; cuando digite mi correo y seleccione "Recuperar contraseña"; el sistema muestra el mensaje "Si el correo está registrado, recibirá un enlace" envía el enlace solo si la cuenta existe y está activa, y limita las solicitudes repetidas.
2. **Cambio de contraseña:** En caso que el enlace esté vigente y la nueva contraseña tenga al menos 8 caracteres; cuando guarde la nueva contraseña; el sistema la actualiza y permite ingresar con ella.
3. **Enlace vencido:** En caso que el enlace ya venció o ya se usó; cuando abra el enlace; el sistema muestra el mensaje "El enlace ya no es válido" y ofrece solicitar otro.

## RF-03 Registro de reportes

### HU5 — Registrar un reporte (Alta, 5 PH, sprint 2)

Como un ciudadano. Necesito registrar una fuga, avería o falla en el servicio de agua. Con la finalidad de avisar a la ASADA para que pueda atenderla.
1. **Reporte completo:** En caso que tenga sesión de ciudadano y haya indicado el tipo de incidente, la descripción y la ubicación; cuando seleccione la opción "Enviar reporte"; el sistema guarda el reporte en estado "Pendiente" y muestra su número de seguimiento.
2. **Datos obligatorios faltantes:** En caso que falte el tipo de incidente, la descripción o la ubicación; cuando seleccione la opción "Enviar reporte"; el sistema no envía el reporte y señala los campos que faltan.
3. **Tipos de incidente:** En caso que esté registrando un reporte; cuando seleccione el tipo de incidente; el sistema muestra las opciones "Fuga de agua", "Avería" y "Falla en el servicio".
4. **Falla de conexión:** En caso que falle la conexión al enviar los datos o las fotografías; cuando seleccione la opción "Enviar reporte"; el sistema conserva lo ingresado, incluidas las fotografías y la ubicación, muestra el mensaje "No se pudo confirmar el envío. Inténtelo de nuevo" y, al reintentar, no crea un reporte duplicado.

## RF-04 Adjuntar fotografías

### HU6 — Adjuntar fotografías al reporte (Alta, 5 PH, sprint 3)

Como un ciudadano. Necesito adjuntar fotografías del incidente. Con la finalidad de ayudar a la ASADA a identificar el problema.
1. **Fotografía válida:** En caso que la imagen sea JPG o PNG y pese hasta 5 MB; cuando la tome con la cámara o la seleccione de la galería; el sistema muestra una vista previa, permite quitarla antes de enviar y la guarda asociada al reporte.
2. **Formato o tamaño inválido:** En caso que el contenido del archivo no sea una imagen JPG o PNG, o pese más de 5 MB; cuando intente adjuntarlo; el sistema lo rechaza y muestra el mensaje "Adjunte una imagen JPG o PNG de hasta 5 MB".
3. **Límite de fotografías:** En caso que el reporte ya tenga 3 fotografías; cuando intente agregar otra; el sistema no la agrega y muestra el mensaje "Puede adjuntar hasta 3 fotografías".
4. **Reporte sin fotografía:** En caso que no pueda o no quiera adjuntar una fotografía; cuando envíe el reporte; el sistema lo acepta, porque la fotografía no es obligatoria.

## RF-05 Registro de ubicación

### HU7 — Indicar la ubicación en un mapa (Alta, 8 PH, sprint 2)

Como un ciudadano. Necesito indicar en un mapa dónde ocurre el incidente. Con la finalidad de facilitar que el personal de la ASADA lo localice.
1. **Ubicación automática:** En caso que haya dado permiso de ubicación al navegador; cuando seleccione la opción "Usar mi ubicación"; el sistema coloca un marcador en mi posición y guarda sus coordenadas.
2. **Ajuste manual:** En caso que el marcador no esté en el punto exacto; cuando mueva el marcador en el mapa; el sistema guarda las coordenadas del punto seleccionado.
3. **Permiso denegado:** En caso que no haya dado permiso de ubicación o el GPS no responda; cuando seleccione la opción "Usar mi ubicación"; el sistema muestra el mensaje "No se pudo obtener su ubicación" y permite marcar el punto en el mapa o escribir señas.

### HU8 — Describir la ubicación con señas (Alta, 3 PH, sprint 2)

Como un ciudadano. Necesito escribir señas del lugar. Con la finalidad de ubicar el incidente aunque el mapa no sea suficiente o no cargue.
1. **Reporte con señas:** En caso que no se pueda usar el mapa; cuando escriba las señas y envíe el reporte; el sistema acepta las señas como ubicación válida.
2. **Señas como complemento:** En caso que ya haya marcado un punto en el mapa; cuando agregue señas; el sistema guarda ambos datos y los muestra juntos al personal.
3. **Sin ubicación:** En caso que no haya punto en el mapa ni señas; cuando seleccione la opción "Enviar reporte"; el sistema no envía el reporte y muestra el mensaje "Indique la ubicación en el mapa o con señas".

## RF-06 Consulta de reportes

### HU9 — Consultar la lista de mis reportes (Alta, 3 PH, sprint 2)

Como un ciudadano. Necesito ver la lista de los reportes que he realizado. Con la finalidad de saber qué he reportado y cómo va cada caso.
1. **Con reportes:** En caso que tenga al menos un reporte; cuando ingrese a "Mis reportes"; el sistema muestra número, tipo, fecha y estado de cada uno, del más reciente al más antiguo.
2. **Sin reportes:** En caso que no tenga reportes; cuando ingrese a "Mis reportes"; el sistema muestra el mensaje "Aún no tiene reportes" y la opción para crear uno.
3. **Privacidad de la lista:** En caso que existan reportes de otros ciudadanos; cuando ingrese a "Mis reportes"; el sistema muestra únicamente los reportes de mi cuenta.

### HU10 — Ver el detalle de un reporte (Media, 2 PH, sprint 3)

Como un ciudadano. Necesito ver la información completa de uno de mis reportes. Con la finalidad de confirmar los datos que recibió la ASADA.
1. **Detalle del reporte:** En caso que el reporte sea de mi cuenta; cuando lo seleccione; el sistema muestra tipo, descripción, fecha, fotografías, ubicación y estado.
2. **Reporte ajeno:** En caso que el reporte pertenezca a otra cuenta; cuando intente consultarlo; el sistema niega el acceso al reporte y a sus fotografías, y muestra el mensaje "No tiene acceso a este reporte".

## RF-07 Seguimiento de reportes

### HU11 — Ver el estado y su historial (Alta, 3 PH, sprint 4)

Como un ciudadano. Necesito ver el estado actual de mi reporte y sus cambios. Con la finalidad de saber si está pendiente, en proceso de atención o resuelto.
1. **Estado actual:** En caso que tenga un reporte registrado; cuando abra el reporte; el sistema muestra claramente si está "Pendiente", "En proceso" o "Resuelto", con texto además de color.
2. **Historial de cambios:** En caso que el estado haya cambiado; cuando abra el reporte; el sistema muestra cada cambio de estado con su fecha y hora, sin incluir las notas internas.
3. **Reporte recién creado:** En caso que nadie lo haya atendido todavía; cuando abra el reporte; el sistema muestra el estado "Pendiente" y la fecha de registro.

### HU12 — Recibir aviso de cambio de estado (Media, 5 PH, sprint 5)

Como un ciudadano. Necesito recibir un aviso cuando cambie el estado de mi reporte. Con la finalidad de enterarme del avance sin tener que entrar a revisarlo.
1. **Aviso por correo:** En caso que el personal cambie el estado de mi reporte; cuando se guarde el cambio; el sistema envía un correo con el número de reporte y el nuevo estado.
2. **Aviso dentro de la app:** En caso que tenga cambios que no he revisado; cuando ingrese al sistema; el sistema marca los reportes con novedades en "Mis reportes".
3. **Falla del envío:** En caso que el correo no se pueda enviar; cuando se guarde el cambio; el sistema guarda el cambio de estado de todos modos y registra la falla del envío.

## RF-08 Administración de reportes

### HU13 — Ver los reportes en el panel (Alta, 5 PH, sprint 3)

Como un oficinista de la ASADA. Necesito ver en un panel los reportes recibidos. Con la finalidad de tener centralizada la información de los incidentes.
1. **Lista de reportes:** En caso que existan reportes; cuando ingrese al panel; el sistema muestra número, tipo, fecha, ubicación resumida, prioridad y estado de cada uno.
2. **Reportes nuevos:** En caso que existan reportes sin revisar; cuando ingrese al panel; el sistema muestra cuántos hay y los distingue del resto.
3. **Sin reportes:** En caso que no existan reportes; cuando ingrese al panel; el sistema muestra el mensaje "No hay reportes registrados".
4. **Usuario no autorizado:** En caso que quien intente entrar no sea oficinista ni administrador de la ASADA; cuando abra el panel; el sistema niega el acceso.

### HU14 — Filtrar y buscar reportes (Media, 3 PH, sprint 4)

Como un oficinista de la ASADA. Necesito filtrar los reportes por estado, prioridad, tipo y fecha, y buscarlos por número. Con la finalidad de encontrar rápidamente los casos que debo atender.
1. **Aplicar filtros:** En caso que seleccione uno o varios filtros; cuando se apliquen; el sistema muestra solo los reportes que cumplen todos los filtros.
2. **Búsqueda por número:** En caso que el número digitado exista; cuando seleccione la opción "Buscar"; el sistema muestra ese reporte.
3. **Sin resultados:** En caso que ningún reporte coincida; cuando se aplique el filtro o la búsqueda; el sistema muestra el mensaje "No se encontraron reportes" y la opción "Limpiar filtros".

### HU15 — Ver el detalle de un reporte en el panel (Alta, 3 PH, sprint 3)

Como un oficinista de la ASADA. Necesito ver el detalle completo de un reporte. Con la finalidad de contar con la información necesaria para atenderlo.
1. **Detalle completo:** En caso que el reporte exista; cuando lo seleccione en el panel; el sistema muestra descripción, fotografías, mapa, señas, datos de contacto, medio de recepción, quién lo registró e historial.
2. **Reporte sin fotografía:** En caso que el reporte no tenga fotografías; cuando lo abra; el sistema muestra el mensaje "Sin fotografías adjuntas".
3. **Abrir ubicación:** En caso que el reporte tenga coordenadas; cuando seleccione la opción "Abrir en mapas"; el sistema abre la ubicación en la aplicación de mapas del dispositivo.

### HU16 — Administrar las cuentas del personal (Alta, 5 PH, sprint 1)

Como un administrador de la ASADA. Necesito crear, modificar y desactivar cuentas del personal y definir su perfil. Con la finalidad de que solo el personal autorizado acceda a los reportes.
1. **Crear cuenta de personal:** En caso que el correo no esté registrado; cuando digite nombre, correo y perfil y seleccione "Guardar"; el sistema crea la cuenta y envía al correo un enlace para definir la contraseña.
2. **Cambiar perfil:** En caso que una persona cambie de funciones; cuando seleccione otro perfil y guarde; el sistema aplica de inmediato los permisos del nuevo perfil.
3. **Desactivar cuenta:** En caso que una persona deje de colaborar con la ASADA; cuando seleccione "Desactivar" y confirme; el sistema cierra sus sesiones, le impide ingresar y conserva el historial de sus acciones.
4. **Último administrador:** En caso que solo quede un administrador activo; cuando intente desactivar esa cuenta o cambiar su perfil; el sistema no lo permite y muestra el mensaje "Debe existir al menos un administrador activo".

## RF-09 Clasificación de prioridades

### HU17 — Clasificar la prioridad de un reporte (Alta, 2 PH, sprint 3)

Como un oficinista de la ASADA. Necesito asignar a un reporte una prioridad alta, media o baja. Con la finalidad de organizar la atención de las incidencias.
1. **Asignar prioridad:** En caso que el reporte esté abierto en el panel; cuando seleccione una prioridad y guarde; el sistema guarda la prioridad, quién la asignó y la fecha.
2. **Reporte nuevo:** En caso que un reporte recién llegue; cuando se muestre en el panel; el sistema indica "Sin clasificar" hasta que el personal le asigne prioridad.
3. **Sin permiso:** En caso que el perfil no tenga permiso para clasificar; cuando abra el reporte; el sistema no muestra la opción de cambiar la prioridad.

### HU18 — Ordenar los reportes por prioridad (Media, 1 PH, sprint 3)

Como un oficinista de la ASADA. Necesito ordenar la lista por prioridad. Con la finalidad de ver primero los casos más urgentes.
1. **Orden por prioridad:** En caso que existan reportes con distintas prioridades; cuando seleccione ordenar por prioridad; el sistema muestra primero alta, luego media, baja y sin clasificar; dentro de cada nivel, primero los más antiguos.

## RF-10 Actualización del estado de reportes

### HU19 — Actualizar el estado de un reporte (Alta, 3 PH, sprint 4)

Como un funcionario autorizado de la ASADA. Necesito cambiar el estado de un reporte conforme avanza la atención. Con la finalidad de mantener informado al ciudadano.
1. **Cambio de estado:** En caso que el reporte esté abierto; cuando seleccione "Pendiente" o "En proceso" y guarde; el sistema guarda el estado, quién lo cambió y la fecha, y lo muestra al ciudadano.
2. **Confirmar resolución:** En caso que seleccione "Resuelto"; cuando guarde; el sistema solicita confirmación y aplica el cambio, con el mismo registro de autor y fecha, solo si se confirma.
3. **Falla al guardar:** En caso que ocurra un error de conexión; cuando guarde; el sistema muestra el mensaje "No se pudo confirmar el cambio" y el estado vigente del reporte.
4. **Cambio simultáneo:** En caso que otra persona haya cambiado el reporte mientras lo tenía abierto; cuando guarde; el sistema no sobrescribe ese cambio, lo informa y muestra el estado vigente.

### HU20 — Registrar notas de la atención (Media, 2 PH, sprint 4)

Como un oficinista de la ASADA. Necesito agregar notas internas al reporte. Con la finalidad de dejar constancia de lo que se hizo y mantener el historial del caso.
1. **Agregar nota:** En caso que la nota tenga texto; cuando seleccione "Guardar nota"; el sistema la agrega al historial con autor, fecha y hora.
2. **Nota vacía:** En caso que la nota no tenga texto; cuando seleccione "Guardar nota"; el sistema no la guarda y muestra el mensaje "Escriba el contenido de la nota".
3. **Privacidad de la nota:** En caso que el reporte tenga notas internas; cuando el ciudadano abra el reporte; el sistema no le muestra esas notas.

## RF-11 (propuesto) Asignación de reportes

### HU21 — Asignar un reporte al fontanero (Media, 3 PH, sprint 4)

Como un oficinista de la ASADA. Necesito asignar un reporte a la persona que lo atenderá. Con la finalidad de que quede claro quién es responsable de cada caso.
1. **Asignar responsable:** En caso que exista personal activo con perfil de fontanero; cuando lo seleccione en el reporte y guarde; el sistema guarda la asignación y la muestra en el panel.
2. **Reasignar:** En caso que el reporte ya tenga responsable; cuando seleccione a otra persona y guarde; el sistema actualiza el responsable y registra el cambio en el historial.
3. **Sin personal disponible:** En caso que no exista personal activo con perfil de fontanero; cuando intente asignar; el sistema muestra el mensaje "No hay personal disponible para asignar".

### HU22 — Atender los reportes asignados desde el celular (Media, 5 PH, sprint 4)

Como un fontanero de la ASADA. Necesito ver desde el celular los reportes que tengo asignados. Con la finalidad de saber a dónde ir y actualizar el avance desde el sitio.
1. **Reportes asignados:** En caso que tenga reportes asignados; cuando ingrese al sistema; el sistema muestra solo esos reportes, con prioridad, ubicación y fotografías.
2. **Sin asignaciones:** En caso que no tenga reportes asignados; cuando ingrese al sistema; el sistema muestra el mensaje "No tiene reportes asignados".
3. **Actualizar desde el sitio:** En caso que esté atendiendo un reporte asignado; cuando cambie el estado o agregue una nota; el sistema guarda el cambio con autor y fecha, y lo muestra de inmediato en el panel; si el nuevo estado es "Resuelto", solicita confirmación antes de aplicarlo.
4. **Reporte no asignado:** En caso que intente consultar un reporte asignado a otra persona; cuando se reciba la solicitud; el sistema niega el acceso.

## RF-12 (propuesto) Reporte asistido por la ASADA

### HU23 — Registrar un reporte a nombre de un vecino (Media, 5 PH, sprint 5)

Como un oficinista de la ASADA. Necesito registrar un reporte recibido por teléfono o en la oficina. Con la finalidad de incluir a las personas sin teléfono inteligente o sin internet.
1. **Registro asistido:** En caso que un vecino comunique una falla por otro medio; cuando complete tipo, descripción, ubicación y medio de recepción y guarde; el sistema crea el reporte en estado "Pendiente", indica quién lo registró y muestra el número de seguimiento.
2. **Vecino sin cuenta:** En caso que la persona no tenga cuenta; cuando se registre el reporte; el sistema permite guardar solo su nombre y un teléfono de contacto, sin crearle una cuenta.
3. **Datos faltantes:** En caso que falte un dato obligatorio; cuando seleccione "Guardar"; el sistema no guarda el reporte y señala los campos que faltan.
