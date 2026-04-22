/**
 * Script para automatizar la extraccion de enlaces de listas en Google Maps.
 * VERSION 4.1 (TURBO): Tiempos optimizados y cierre fisico con boton "X".
 * Instrucciones: Abre la seccion de "Lugares guardados" en Google Maps web,
 * pega este codigo en la consola del navegador (F12) y presiona Enter.
 * IMPORTANTE: Haz un clic en la pagina de Maps despues de ejecutar para dar permisos de portapapeles.
 *
 * Generado con Gemini AI - Adaptado por Claude AI
 */

async function automatizarListasDefinitivo() {
    // CREACION DE INTERFAZ VISUAL FLOTANTE
    let uiContenedor = document.getElementById('bot-maps-ui');
    if (!uiContenedor) {
        uiContenedor = document.createElement('div');
        uiContenedor.id = 'bot-maps-ui';
        uiContenedor.style.cssText = 'position:fixed; bottom:30px; right:30px; background:#1e1e1e; color:#4af626; padding:15px 20px; z-index:9999999; border-radius:8px; font-family:monospace; font-size:14px; width: 380px; box-shadow: 0 10px 25px rgba(0,0,0,0.8); border: 1px solid #444; pointer-events:none; line-height:1.5; max-height: 300px; overflow-y: auto;';
        document.body.appendChild(uiContenedor);
    }
    const mostrarMensaje = (msg, color = '#4af626') => {
        console.log(msg);
        if (uiContenedor) {
            uiContenedor.style.color = color;
            uiContenedor.innerHTML = '<b style="color:#fff;">Bot Extractor de Enlaces Maps v4.1</b><hr style="border-color:#444; margin:8px 0;"><span>' + msg + '</span>';
        }
    };
    mostrarMensaje('Iniciando... Analizando la pagina. IMPORTANTE: Haz un clic en cualquier parte de la pagina de Maps ahora mismo para permitir el acceso al portapapeles.', '#ffeb3b');

    // FUNCIONES DE AYUDA
    const esperarElemento = async (busquedaFn, timeout = 5000) => {
        const inicio = Date.now();
        while (Date.now() - inicio < timeout) {
            try {
                const elemento = busquedaFn();
                if (elemento) return elemento;
            } catch (e) {}
            await new Promise((r) => setTimeout(r, 100));
        }
        return null;
    };
    const buscarPorTexto = (selector, texto) => {
        return Array.from(document.querySelectorAll(selector)).find(
            (el) => el.innerText && el.innerText.toLowerCase().includes(texto.toLowerCase())
        );
    };
    const hacerClicSeguro = async (elemento) => {
        if (!elemento) return;
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise((r) => setTimeout(r, 150));
        elemento.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        elemento.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        elemento.click();
        await new Promise((r) => setTimeout(r, 150));
    };
    const rescatarEnlace = async () => {
        let link = '';
        for (let i = 0; i < 15; i++) {
            try {
                link = await navigator.clipboard.readText();
                if (link && link.startsWith('https://') && link.length < 200 && (link.includes('maps.app.goo.gl') || link.includes('goo.gl') || link.includes('google.com/maps'))) {
                    return link;
                }
            } catch (e) { console.warn('Esperando portapapeles...', e); }
            await new Promise((r) => setTimeout(r, 150));
        }
        const inputs = document.querySelectorAll('input');
        for (let input of inputs) {
            if (input.value && (input.value.includes('maps.app.goo.gl') || input.value.includes('goo.gl'))) {
                return input.value;
            }
        }
        return '';
    };
    const cerrarModal = async () => {
        const botonX = await esperarElemento(() => {
            return document.querySelector('button[aria-label*="Cerrar" i]') ||
                   document.querySelector('button[aria-label*="Close" i]') ||
                   buscarPorTexto('button', 'cerrar') ||
                   buscarPorTexto('button', 'done') ||
                   Array.from(document.querySelectorAll('button')).find(btn => {
                       const icon = btn.querySelector('svg, i');
                       return icon && (btn.getAttribute('aria-label') || '').toLowerCase().includes('close');
                   });
        }, 2000);
        if (botonX) {
            await hacerClicSeguro(botonX);
        }
    };
    const descargarCSV = (datosBase) => {
        let csv = 'Nombre de Lista,Enlace para Compartir\n';
        datosBase.forEach((row) => {
            let nombreLimpio = row.nombre.replace(/,/g, '').replace(/"/g, '""');
            csv += '"' + nombreLimpio + '","' + row.enlace + '"\n';
        });
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'Mis_Listas_Maps.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // DETECCION DE NOMBRE - 4 estrategias de respaldo
    const detectarNombreLista = (botonOpciones) => {
        // Estrategia 1: aria-label del boton
        const ariaLabel = botonOpciones.getAttribute('aria-label') || '';
        const matchAria = ariaLabel.match(/(?:opciones?\s+(?:para|de)|options?\s+for)\s+(.+)/i);
        if (matchAria && matchAria[1]) return matchAria[1].trim();

        // Estrategia 2: Hermano anterior del boton
        let nodo = botonOpciones;
        for (let nivel = 0; nivel < 6; nivel++) {
            nodo = nodo.parentElement;
            if (!nodo) break;
            let hermano = nodo.previousElementSibling;
            while (hermano) {
                const textoHermano = hermano.innerText?.trim();
                if (textoHermano && textoHermano.length > 1) {
                    const lineas = textoHermano.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    if (lineas.length > 0) return lineas[0];
                }
                hermano = hermano.previousElementSibling;
            }
        }

        // Estrategia 3: Contenedor padre con texto de la fila
        const subtextoRegex = /^(compartida|privada|publica|shared|private|public)[\s·\-\.\|]/i;
        const soloNumeros = /^\d+\s*(sitios?|places?|saved|guardados?)/i;
        nodo = botonOpciones;
        for (let nivel = 0; nivel < 8; nivel++) {
            nodo = nodo.parentElement;
            if (!nodo) break;
            const textoCompleto = nodo.innerText?.trim();
            if (!textoCompleto || textoCompleto.length < 3) continue;
            const lineas = textoCompleto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lineas.length >= 2) {
                for (const linea of lineas) {
                    if (subtextoRegex.test(linea)) continue;
                    if (soloNumeros.test(linea)) continue;
                    if (/^(mas\s+)?opciones/i.test(linea)) continue;
                    if (/^options/i.test(linea)) continue;
                    return linea;
                }
            }
        }

        // Estrategia 4: Selectores CSS conocidos de Google Maps
        const fila = botonOpciones.closest('div[role="listitem"]') || botonOpciones.closest('.yt0HSb');
        if (fila) {
            const selectoresTitulo = ['.fontTitleSmall', '.fontHeadlineSmall', '.fontBodyLarge', 'h2', 'h3', '[role="heading"]'];
            for (const sel of selectoresTitulo) {
                const tituloEl = fila.querySelector(sel);
                if (tituloEl && tituloEl.innerText?.trim().length > 0) return tituloEl.innerText.trim();
            }
        }
        return 'Lista Desconocida';
    };

    await new Promise((r) => setTimeout(r, 1500));
    mostrarMensaje("Buscando el panel de 'Lugares guardados'...", '#ffeb3b');

    const contenedorScroll = await esperarElemento(() => {
        let cont = document.querySelector('.m6B6fc') || document.querySelector('div[role="main"]');
        if (cont) return cont;
        const divsConAria = Array.from(document.querySelectorAll('div[aria-label]'));
        return divsConAria.find(el => el.getAttribute('aria-label')?.includes('Guardado') || el.getAttribute('aria-label')?.includes('Saved'));
    }, 4000);

    if (!contenedorScroll) {
        mostrarMensaje('ERROR: No se encontro el panel de listas. Asegurate de estar en "Lugares guardados".', '#f44336');
        return;
    }

    let seguirBuscando = true;
    let intentosAtascado = 0;
    const listasYaProcesadas = new Set();
    const datosExportacion = [];

    mostrarMensaje('Panel encontrado. Extrayendo enlaces...', '#2196f3');
    await new Promise((r) => setTimeout(r, 1000));

    while (seguirBuscando) {
        const todosLosBotonesOpciones = Array.from(
            document.querySelectorAll('button[aria-label*="opciones" i], button[aria-label*="Options" i], button[data-tooltip*="opciones" i]')
        );
        const botonesPendientes = todosLosBotonesOpciones.filter(
            (btn) => contenedorScroll.contains(btn) && !listasYaProcesadas.has(btn)
        );

        if (botonesPendientes.length === 0) {
            mostrarMensaje('No hay listas nuevas visibles. Bajando...', '#9e9e9e');
        } else {
            for (const botonOpciones of botonesPendientes) {
                let nombre = 'Lista Desconocida';
                try {
                    nombre = detectarNombreLista(botonOpciones);
                    mostrarMensaje('Procesando: "' + nombre + '"', '#ff9800');
                    await hacerClicSeguro(botonOpciones);

                    const opcionEnviar = await esperarElemento(
                        () => buscarPorTexto('[role="menuitem"], .fxNQSd', 'enviar enlace para ver') ||
                              buscarPorTexto('[role="menuitem"]', 'share link') ||
                              buscarPorTexto('[role="menuitem"], .fxNQSd', 'compartir'),
                        3500
                    );

                    if (opcionEnviar) {
                        await hacerClicSeguro(opcionEnviar);
                        const botonCopiar = await esperarElemento(() => {
                            return buscarPorTexto('button, div', 'copiar enlace') ||
                                   buscarPorTexto('button, div', 'copy link') ||
                                   document.querySelector('button[aria-label*="copiar" i], button[aria-label*="copy" i]');
                        }, 4000);

                        if (botonCopiar) {
                            await hacerClicSeguro(botonCopiar);
                            let enlaceObtenido = await rescatarEnlace();
                            if (enlaceObtenido && (enlaceObtenido.includes('goo.gl') || enlaceObtenido.includes('maps'))) {
                                datosExportacion.push({ nombre, enlace: enlaceObtenido });
                                mostrarMensaje('EXITO: "' + nombre + '" - Link guardado (' + datosExportacion.length + ' total)', '#4af626');
                            } else {
                                mostrarMensaje('Fallo captura de link para: ' + nombre, '#ffeb3b');
                                datosExportacion.push({ nombre, enlace: 'Error en portapapeles' });
                            }
                            listasYaProcesadas.add(botonOpciones);
                            await cerrarModal();
                            intentosAtascado = 0;
                        } else {
                            mostrarMensaje("No aparecio 'Copiar enlace' en: " + nombre, '#ff9800');
                            await cerrarModal();
                            listasYaProcesadas.add(botonOpciones);
                        }
                    } else {
                        mostrarMensaje("No esta la opcion 'Enviar' en: " + nombre, '#ff9800');
                        await cerrarModal();
                        listasYaProcesadas.add(botonOpciones);
                    }
                } catch (err) {
                    console.error('Error procesando lista:', err);
                    mostrarMensaje('Error en: ' + nombre, '#f44336');
                    listasYaProcesadas.add(botonOpciones);
                }
            }
        }

        // SCROLL
        try {
            const posicionAnterior = contenedorScroll.scrollTop;
            contenedorScroll.scrollBy({ top: 900, behavior: 'smooth' });
            await new Promise((r) => setTimeout(r, 2000));
            if (Math.abs(contenedorScroll.scrollTop - posicionAnterior) < 5) {
                const quedanBotones = Array.from(document.querySelectorAll('button[aria-label*="opciones" i]'))
                    .filter((btn) => contenedorScroll.contains(btn))
                    .some((btn) => !listasYaProcesadas.has(btn));
                if (!quedanBotones || intentosAtascado >= 3) {
                    seguirBuscando = false;
                    mostrarMensaje('FINALIZADO: ' + datosExportacion.length + ' enlaces capturados. Descargando CSV...', '#00bcd4');
                    if (datosExportacion.length > 0) descargarCSV(datosExportacion);
                    setTimeout(() => { if (uiContenedor) uiContenedor.remove(); }, 20000);
                } else {
                    intentosAtascado++;
                    contenedorScroll.scrollBy({ top: 150, behavior: 'instant' });
                    await new Promise((r) => setTimeout(r, 1000));
                }
            } else {
                intentosAtascado = 0;
            }
        } catch (e) {
            await new Promise((r) => setTimeout(r, 1500));
        }
    }
}

automatizarListasDefinitivo().catch((err) => { console.error(err); });
