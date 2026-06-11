(function() {
  const stored = localStorage.getItem("luxe_admin_theme");
  if (stored === "light" || stored === "dark") {
    document.documentElement.classList.add(stored);
    return;
  }
  const match = document.cookie.match(/(?:^|; )luxe_theme=([^;]*)/);
  const theme = match && (match[1] === "light" || match[1] === "dark") ? match[1] : "dark";
  document.documentElement.classList.add(theme);
})();
