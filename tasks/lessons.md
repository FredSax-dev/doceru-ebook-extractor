# Lessons

- Antes de escrever lógica de extração para um site, baixar e ler o JS estático dele (ex.: `/static/template2/js/docer_scripts.js`). O CAPTCHA protege a exibição do documento, não os scripts. No Doceru a URL do arquivo vem da resposta de `POST /start/show`; só o PDF é gravado no DOM (`data-pdf-url`).
