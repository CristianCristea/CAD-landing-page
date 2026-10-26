"use strict";

// The navigation is visible by default so the site also works without JavaScript.
const navigation = document.querySelector("#site-nav");
const menuToggle = document.querySelector(".menu-toggle");
const mobileLayout = window.matchMedia("(max-width: 767px)");

if (navigation && menuToggle) {
  const setMenuOpen = (open, returnFocus = false) => {
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.querySelector("span").textContent = open ? "Close" : "Menu";
    navigation.classList.toggle("is-open", open);
    if (returnFocus) menuToggle.focus();
  };

  menuToggle.hidden = false;
  document.documentElement.classList.add("nav-enhanced");
  menuToggle.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });
  navigation.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link || !mobileLayout.matches) return;
    setMenuOpen(false);
    const href = link.getAttribute("href");
    if (!href || !href.startsWith("#")) return;
    // Move keyboard focus out of the navigation before it is hidden.
    const section = document.getElementById(href.slice(1));
    if (section) {
      section.setAttribute("tabindex", "-1");
      section.focus({ preventScroll: true });
      section.addEventListener("blur", () => section.removeAttribute("tabindex"), { once: true });
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false, true);
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-header")) setMenuOpen(false);
  });
  mobileLayout.addEventListener("change", () => setMenuOpen(false));
}

const copyrightYear = document.querySelector("#copyright-year");
if (copyrightYear) copyrightYear.textContent = String(new Date().getFullYear());
