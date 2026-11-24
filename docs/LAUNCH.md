# Plan de lanzamiento: Signal en renzzogg.com

Guía para Renzzo. Claude no hace push, merge ni cambios en Railway o Cloudflare.

**Probado:** el merge, el build desde un clon limpio, el servidor y los dos reverts se ensayaron en un clon aislado. **No probado:** los pasos en el panel de Railway y Cloudflare, que salen de su documentación actual. Las etiquetas pueden variar un poco.

Sitio anterior: commit `93d9b4d`.

## Fase A: preparar (el sitio actual no cambia)

### 1. Actualiza y revisa el preview

```bash
cd ~/proyectos/renzzo-portafolio
git switch redesign
git status
git push origin redesign
```

En `portfolio-preview`, espera el deploy y confirma en el iPhone y en escritorio que los iconos de Services son `{ }`, ventana y bicho.

### 2. Guarda la configuración actual de producción

En Railway, abre **Portafolio Personal**, entorno **production**, y el servicio del sitio. Haz capturas de:

- **Settings** completo: Source, Build, Deploy y Networking.
- **Variables**.
- **Deployments**: anota cuál está activo. Es tu punto de retorno.

### 3. Revisa el puerto de los dominios

En **Settings > Networking**, mira el puerto de `renzzogg.com` y `www.renzzogg.com`.

- Si muestran un puerto fijo (por ejemplo `8080`), agrega en el paso 4 la variable `PORT` con ese mismo valor.
- **No edites nada en Networking:** esos cambios se aplican al instante.

### 4. Cambia los ajustes, sin desplegar

| Dónde             | Ajuste                  | Valor                        |
| ----------------- | ----------------------- | ---------------------------- |
| Settings > Source | Branch                  | `main`                       |
| Settings > Source | Root Directory          | vacío                        |
| Settings > Build  | Builder                 | Railpack                     |
| Settings > Build  | Build Command           | `npm run build`              |
| Settings > Deploy | Start Command           | `node scripts/serve-dist.ts` |
| Settings > Deploy | Healthcheck Path        | `/`                          |
| Settings > Deploy | Serverless              | Activado                     |
| Variables         | `HOST`                  | `0.0.0.0`                    |
| Variables         | `RAILPACK_NODE_VERSION` | `24`                         |

Si existe `RAILPACK_STATIC_FILE_ROOT`, `RAILPACK_SPA_OUTPUT_DIR` o un `Dockerfile Path`, quítalo. Ya quedó en tu captura.

### 5. Guarda sin redesplegar

Railway muestra los cambios como pendientes. **Mantén presionada la tecla Alt y haz clic en Deploy.** Eso los guarda sin redesplegar.

Comprueba en **Deployments** que no empezó un deploy nuevo y que `renzzogg.com` sigue mostrando el sitio anterior.

Si por error se lanza un deploy, fallará porque `main` aún no tiene `package.json`. No lo reintentes: el sitio anterior debería seguir activo.

## Fase B: lanzar

### 6. Haz el merge y publícalo

```bash
git switch main
git pull --ff-only origin main
git rev-parse --short HEAD          # debe decir 93d9b4d
git merge --no-ff redesign -m "release: launch the Signal redesign"
git diff --stat redesign HEAD       # no debe mostrar nada
npm ci
npm run check
git push origin main
```

### 7. Vigila el deploy

En **Deployments**, espera **Build**, **Healthcheck** y **Active**. Si el build o el healthcheck fallan, Railway no debería cambiar el tráfico: revisa los logs antes de tocar nada.

### 8. Purga Cloudflare

En Cloudflare, dominio `renzzogg.com`: **Caching > Configuration > Purge Everything**.

Es necesario: el sitio anterior dejó el PDF, la imagen OG y `robots.txt` con caché de hasta 4 horas.

## Fase C: comprobar

### 9. Dominios, canonical, sitemap, PDF y OG

```bash
for u in https://renzzogg.com/ https://www.renzzogg.com/ https://renzzogg.com/cv/ https://renzzogg.com/work/stocktill/ "https://renzzogg.com/renzzo-gracia-gomez-cv.pdf" "https://renzzogg.com/renzzo-gracia-gomez-cv.pdf?v=14" "https://renzzogg.com/og-image.png?v=3" https://renzzogg.com/sitemap.xml https://renzzogg.com/robots.txt; do
  curl -s -o /dev/null -w "%{http_code} %{content_type} $u\n" "$u"
done
curl -sI http://renzzogg.com/ | head -3
curl -s https://www.renzzogg.com/ | grep -o '<link rel="canonical"[^>]*>'
curl -s https://renzzogg.com/ | grep -o '<link rel="canonical"[^>]*>'
curl -s https://renzzogg.com/sitemap.xml | grep -o '<loc>[^<]*</loc>'
```

- [ ] Todas las URLs devuelven `200`, con el tipo correcto.
- [ ] `http://` redirige a `https://`.
- [ ] Ambos dominios muestran el diseño nuevo, con candado HTTPS.
- [ ] El canonical de ambos dominios es `https://renzzogg.com/`.
- [ ] Las 6 URLs del sitemap usan `https://renzzogg.com`.
- [ ] El PDF abre, es de una página y tiene los cambios de la Fase 7.
- [ ] LinkedIn Post Inspector (`https://www.linkedin.com/post-inspector/`) muestra la imagen OG nueva tras inspeccionar `https://renzzogg.com/`.

### 10. Lighthouse contra producción

```bash
git switch redesign
npm run build
LIGHTHOUSE_URL=https://renzzogg.com/ npm run lighthouse
```

- [ ] Móvil: 100/100/100/100 (mediana de 5).
- [ ] Escritorio: Performance ≥ 90, y el resto en 100.

El resultado queda en `docs/reports/phase-8/lighthouse-production.json`.

### 11. Prueba Serverless

Deja el sitio sin visitas 15 minutos y abre `https://renzzogg.com/` en una ventana privada.

- [ ] Carga sin error.
- [ ] Repite una vez más.

Railway avisa que la primera visita tras dormir **puede dar 502**. Si lo ves aunque sea una vez, desactiva **Settings > Deploy > Serverless** y redespliega. Para un portafolio, que un cliente vea un error cuesta más que el ahorro.

### 12. Pruebas reales

- [ ] iPhone y Android: hero, tilt, carrusel, Services y Contact.
- [ ] Escritorio con GPU real: recorrido completo a 60 fps.

## Rollback al sitio anterior

### Nivel 1: inmediato, sin Git

Úsalo si el sitio nuevo falla justo después del lanzamiento.

1. Railway > **Deployments**.
2. En el deployment anterior (el que anotaste), abre los **tres puntos** y elige **Rollback**.
3. Purga Cloudflare y confirma que `renzzogg.com` muestra el sitio anterior.

Railway restaura la imagen y las variables. Su documentación no aclara si también restaura los comandos, así que si no arranca, vuelve a poner los valores de tu captura y usa el nivel 2.

### Nivel 2: devolver `main` al sitio anterior

**Primero** restaura en Railway los ajustes de tu captura y guarda con **Alt + Deploy**. El sitio anterior no tiene `package.json`, así que con los comandos nuevos su build fallaría.

```bash
git switch main
git pull --ff-only origin main
git revert --no-edit -m 1 HEAD
git diff --stat 93d9b4d HEAD        # no debe mostrar nada
git push origin main
```

Después purga Cloudflare. No hace falta `--force`.

### Volver a lanzar después de un rollback

Pon otra vez los ajustes del paso 4, guarda con **Alt + Deploy**, y ejecuta:

```bash
git switch main
git pull --ff-only origin main
git revert --no-edit HEAD
git diff --stat redesign HEAD       # no debe mostrar nada
git push origin main
```

## Upwork

Los archivos están en `upwork-assets/`, fuera de Git. Publica la entrada **después** de que el paso 10 confirme los números en producción.

## Cuándo borrar `portfolio-preview`

Bórralo cuando se cumplan las tres condiciones:

1. Toda la Fase C está marcada.
2. Producción lleva **48 horas** estable.
3. Ya no necesitas compararlo con producción.

En su **Settings > Danger**, confirma que el nombre sea exactamente `portfolio-preview`. **Nunca borres "Portafolio Personal".**
