# 🎨 Guía para Exportar Diagramas a PNG Profesionales

## 🚀 MÉTODO RECOMENDADO: Mermaid Live Editor (Más Fácil)

### Pasos:

1. **Abre [Mermaid Live Editor](https://mermaid.live/)**

2. **Para cada diagrama:**
   - Abre el archivo .mmd correspondiente
   - Copia TODO el contenido
   - Pégalo en Mermaid Live Editor
   - Haz clic en el botón **"PNG"** o **"SVG"** (SVG es mejor para presentaciones)
   - Descarga la imagen

3. **Archivos a exportar:**
   - `01-arquitectura-tractus-x.mmd` → Arquitectura completa
   - `02-flujo-intercambio-datos.mmd` → Flujo de intercambio
   - `03-implementacion-iflex.mmd` → Implementación IFLEX
   - `04-concepto-valor.mmd` → Concepto y valor

### ✨ Ventajas:
- ✅ No requiere instalación
- ✅ Calidad profesional
- ✅ Exporta PNG, SVG o PDF
- ✅ Vista previa en tiempo real
- ✅ Funciona en cualquier navegador

---

## 📸 MÉTODO ALTERNATIVO: Captura desde el HTML

1. **Abre el archivo:** `exportador-imagenes.html` en Google Chrome o Edge

2. **Instala una extensión de captura:**
   - **Chrome/Edge:** [GoFullPage](https://chrome.google.com/webstore/detail/gofullpage-full-page-scre/fdpohaocaechififmbbbbbknoalclacl)
   - **Firefox:** Usa la herramienta integrada (clic derecho → "Take Screenshot")

3. **Captura cada diagrama:**
   - Haz scroll hasta el diagrama que quieres
   - Usa la extensión para capturar solo esa sección
   - Guarda como PNG

---

## 💻 MÉTODO AVANZADO: Línea de Comandos (Requiere Node.js)

Si tienes Node.js instalado, puedes generar las imágenes automáticamente:

```bash
# Instalar mermaid-cli localmente (sin sudo)
cd diagramas-espacio-datos
npx @mermaid-js/mermaid-cli@latest -i 01-arquitectura-tractus-x.mmd -o 01-arquitectura-tractus-x.png -w 2400

# O para todos a la vez:
npx @mermaid-js/mermaid-cli@latest -i 01-arquitectura-tractus-x.mmd -o 01-arquitectura-tractus-x.png -w 2400 -b transparent
npx @mermaid-js/mermaid-cli@latest -i 02-flujo-intercambio-datos.mmd -o 02-flujo-intercambio-datos.png -w 2400 -b white
npx @mermaid-js/mermaid-cli@latest -i 03-implementacion-iflex.mmd -o 03-implementacion-iflex.png -w 2800 -b transparent
npx @mermaid-js/mermaid-cli@latest -i 04-concepto-valor.mmd -o 04-concepto-valor.png -w 2400 -b transparent
```

---

## 🎯 RECOMENDACIÓN PARA TU PRESENTACIÓN

**Para PowerPoint/Google Slides:**
1. Usa **SVG** en lugar de PNG (calidad infinita al escalar)
2. Exporta desde [mermaid.live](https://mermaid.live/)
3. Inserta en tus diapositivas

**Configuración recomendada en Mermaid Live:**
- Formato: **SVG** (primero) o PNG (si SVG da problemas)
- Tema: Default
- Ancho: 2400px para PNG
- Fondo: Transparente (para superponerlos)

---

## 📋 Resumen de Archivos

| Archivo | Descripción | Uso Recomendado |
|---------|-------------|-----------------|
| `01-arquitectura-tractus-x.mmd` | Arquitectura general | Slide de introducción técnica |
| `02-flujo-intercambio-datos.mmd` | Secuencia de pasos | Explicar el proceso completo |
| `03-implementacion-iflex.mmd` | Tu implementación real | Demostrar lo que has construido |
| `04-concepto-valor.mmd` | Conceptos y beneficios | Slide de introducción/conclusión |
| `exportador-imagenes.html` | Visualizador web | Previsualizar antes de exportar |

---

## 🆘 Si tienes problemas

**El diagrama no se ve bien en mermaid.live:**
- Asegúrate de copiar TODO el contenido del archivo .mmd
- Verifica que no haya caracteres extraños

**La imagen PNG es muy pequeña:**
- En Mermaid Live, usa el zoom del navegador (Ctrl + +)
- O captura en resolución alta con la extensión de captura

**Necesitas editar el diagrama:**
- Modifica el archivo .mmd con cualquier editor de texto
- Actualiza en Mermaid Live para ver cambios

---

## ✅ Checklist Final

- [ ] Abrir mermaid.live
- [ ] Copiar contenido de 01-arquitectura-tractus-x.mmd
- [ ] Exportar como SVG o PNG
- [ ] Repetir para los 4 diagramas
- [ ] Insertar en tu presentación
- [ ] ¡Listos para impresionar al cliente! 🎉
