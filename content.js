(() => {
  const originalOpen = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function (method, url) {
    if (/\/start\/(show|download)/.test(url)) {
      this.addEventListener('load', () => {
        try {
          const data = JSON.parse(this.responseText);
          if (data.success && data.response && data.response.url) {
            const root = document.documentElement;
            root.setAttribute('data-extractor-url', data.response.url);
            if (data.response.extension) {
              root.setAttribute('data-extractor-ext', data.response.extension);
            }
          }
        } catch (e) {}
      });
    }
    return originalOpen.apply(this, arguments);
  };
})();
