// This script will run in the web page's context and extract the token
(function() {
  const token = _docs_flag_initialData.info_params.token;
  const email = _docs_flag_initialData['docs-hue'];
  // Send the token back to the content script via custom event
  window.dispatchEvent(new CustomEvent('tokenExtracted', { detail: { token: token, email: email } }));
})();
