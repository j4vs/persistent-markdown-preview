const { chromium } = require('playwright');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page = await browser.newPage({viewport:{width:1500,height:1080}});
 await page.setContent('<main><h1>Cambio de dominio (Nginx)</h1><h2>1. Editar configuración de Nginx</h2><h3>1.1. API</h3><p>Archivo:</p><pre><code>sudo nano /etc/nginx/sites-available/api.ejemplo</code></pre><p>Cambiar:</p><pre><code>server_name api.dominio.com;</code></pre><p>Por:</p><pre><code>server_name api.nuevodominio.com;</code></pre><p>Si existe redirección HTTP → HTTPS, validar que siga usando:</p><pre><code>return 301 https://$host$request_uri;</code></pre><p>(No depende del dominio hardcodeado, no requiere más cambios)</p><hr><h3>1.2. UpdatesApp</h3><p>Archivo:</p><pre><code>sudo nano /etc/nginx/sites-available/updatesapp.ejemplo</code></pre><h4>Verificación del servicio</h4><p>Consulta la <a href="#">documentación</a> y ejecuta <code>nginx -t</code>.</p></main>');
 await page.addStyleTag({path:'media/preview.css'});
 await page.evaluate(()=>document.fonts.ready);
 fs.mkdirSync('test-results',{recursive:true});
 await page.screenshot({path:'test-results/anuppuccin-preview.png',fullPage:true});
 await browser.close();
})();
