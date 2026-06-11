(function() {
  var stored = localStorage.getItem("luxe_theme");
  if (stored === "light" || stored === "dark") {
    document.documentElement.classList.add(stored);
    return;
  }
  var match = document.cookie.match(/(?:^|; )luxe_theme=([^;]*)/);
  var theme = match && (match[1] === "light" || match[1] === "dark") ? match[1] : "light";
  document.documentElement.classList.add(theme);
})();
