const state = { link: null, format: null, title: null };

const $ = (id) => document.getElementById(id);

function setStatus(message, tone) {
  $('result').textContent = message;
  $('panel').dataset.state = tone;
}

function buildFilename() {
  const base = state.title.replace(/[<>:"/\\|?*]+/g, '');
  const extension = `.${state.format}`;
  return base.toLowerCase().endsWith(extension) ? base : base + extension;
}

function showFile() {
  $('file-format').textContent = state.format.toUpperCase();
  $('file-title').textContent = state.title;
  $('file-link').textContent = state.link;
  $('file').hidden = false;
  $('actions').hidden = false;
  $('extract').hidden = true;
}

async function handleExtract() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    setStatus('Nenhuma aba ativa encontrada.', 'error');
    return;
  }

  let injection;
  try {
    [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: readFileFromPage
    });
  } catch (error) {
    setStatus(`Erro: ${error.message}`, 'error');
    return;
  }

  const data = injection && injection.result;
  if (!data) {
    setStatus('Nenhum resultado retornado.', 'error');
    return;
  }
  if (!data.link) {
    setStatus('Link não encontrado. Resolva o CAPTCHA e aguarde o documento carregar.', 'error');
    return;
  }

  state.link = data.link;
  state.format = data.format;
  state.title = data.title || 'documento';
  setStatus('Arquivo encontrado.', 'ok');
  showFile();
}

async function handleCopy() {
  if (!state.link) return;
  try {
    await navigator.clipboard.writeText(state.link);
    setStatus('Link copiado para a área de transferência.', 'ok');
  } catch (error) {
    setStatus(`Erro ao copiar: ${error}`, 'error');
  }
}

async function handleDownload() {
  if (!state.link) {
    setStatus('Nenhum link válido para baixar.', 'error');
    return;
  }

  const filename = buildFilename();
  let downloadId;
  try {
    downloadId = await chrome.downloads.download({ url: state.link, filename });
  } catch (error) {
    setStatus(`Erro ao baixar: ${error.message}`, 'error');
    return;
  }

  setStatus(`Iniciando download como "${filename}"...`, 'ok');
  const onChanged = (delta) => {
    if (delta.id !== downloadId || !delta.state || delta.state.current !== 'complete') return;
    setStatus(`Download concluído: "${filename}".`, 'ok');
    chrome.downloads.onChanged.removeListener(onChanged);
  };
  chrome.downloads.onChanged.addListener(onChanged);
}

// Executada dentro da página do Doceru: precisa ser autocontida
function readFileFromPage() {
  const root = document.documentElement;
  const read = (selector, name) => {
    const element = document.querySelector(selector);
    return (element && element.getAttribute(name)) || null;
  };

  // content.js grava aqui a URL recebida de /start/show
  let link = root.getAttribute('data-extractor-url')
    || read('[data-pdf-url]', 'data-pdf-url')
    || read('#iframe1', 'data-src');

  if (link) {
    const url = new URL(link, location.href);
    // No Google Viewer o arquivo real vem no parâmetro "url"
    const inner = /viewer|gview/.test(url.pathname) ? url.searchParams.get('url') : null;
    link = new URL(inner || url.href, location.href).href;
  }

  const format = (root.getAttribute('data-extractor-ext') || read('#iframe2', 'data-ext') || 'pdf').toLowerCase();

  const heading = document.querySelector('h1');
  const title = (heading && heading.textContent.trim())
    || document.title
      .replace(/ \((PDF|EPUB|MOBI)\) para download \| Doceru\.com$/i, '')
      .replace(' - Baixar pdf de Doceru.com', '')
      .trim()
    || null;

  return { link, format, title };
}

$('extract').addEventListener('click', handleExtract);
$('copy').addEventListener('click', handleCopy);
$('download').addEventListener('click', handleDownload);
