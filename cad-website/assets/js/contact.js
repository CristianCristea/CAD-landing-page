"use strict";

(() => {
  const form = document.querySelector(".contact-form");
  if (!form) return;
  const button = form.querySelector('button[type="submit"]');
  const status = document.querySelector("#form-status");
  const confirmation = document.querySelector("#contact-success");
  const confirmationMessage = document.querySelector("#contact-success-message");
  const widget = document.querySelector("#contact-verification");
  const controls = [...form.querySelectorAll("input, textarea")];
  const sitekey = widget.dataset.sitekey.trim();
  let token = "";
  let widgetId;
  let pending = false;

  const announce = (message, error = false) => {
    status.textContent = message;
    status.classList.toggle("is-error", error);
  };
  const updateButton = () => { button.disabled = pending || !token; };
  const resetVerification = () => {
    token = "";
    updateButton();
    if (widgetId !== undefined) window.turnstile.reset(widgetId);
  };
  const clearErrors = () => controls.forEach(control => {
    control.removeAttribute("aria-invalid");
    control.removeAttribute("aria-describedby");
  });
  const hideConfirmation = () => {
    confirmation.hidden = true;
    confirmationMessage.textContent = "";
  };
  document.querySelector("#contact-success-close").addEventListener("click", () => {
    hideConfirmation();
    form.elements.namedItem("name").focus();
  });
  form.addEventListener("input", event => {
    event.target.removeAttribute("aria-invalid");
    event.target.removeAttribute("aria-describedby");
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (pending) return;
    if (!form.reportValidity()) return;
    if (!token) {
      announce("Complete the verification before sending. You can also email contact@cad-dev.com.", true);
      return;
    }
    clearErrors();
    hideConfirmation();
    const payload = Object.fromEntries(new FormData(form));
    payload.token = token;
    pending = true;
    controls.forEach(control => { control.readOnly = true; });
    // Keep the live status outside a busy subtree so "Sending" is announced immediately.
    button.setAttribute("aria-busy", "true");
    button.textContent = "Sending…";
    updateButton();
    announce("Sending your message…");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "omit",
        redirect: "error",
      });
      const result = await response.json();
      if (response.ok && result.ok === true && result.code === "sent") {
        form.reset();
        announce("");
        confirmation.hidden = false;
        confirmationMessage.textContent = "Thank you! Your message has been sent.";
        confirmation.focus();
      } else {
        const messages = {
          invalid_fields: "Please check your details and try again.",
          body_too_large: "Your message is too long. Please shorten it and try again.",
          verification_failed: "Verification failed or expired. Complete it again before sending.",
          verification_unavailable: "Verification is unavailable. Please try again or email contact@cad-dev.com.",
          forbidden: "Please use the form at https://cad-dev.com or email contact@cad-dev.com.",
        };
        const fields = result.fields && typeof result.fields === "object" ? result.fields : {};
        let firstInvalid;
        for (const name of ["name", "email", "company", "message"]) {
          if (typeof fields[name] !== "string") continue;
          const control = form.elements.namedItem(name);
          control.setAttribute("aria-invalid", "true");
          control.setAttribute("aria-describedby", "form-status");
          firstInvalid ??= control;
        }
        announce(Object.values(fields).filter(value => typeof value === "string").join(" ")
          || messages[result.code] || "Your message could not be sent. Please try again or email contact@cad-dev.com.", true);
        firstInvalid?.focus();
      }
    } catch {
      // A lost response can occur after acceptance. Never automatically retry.
      announce("We could not confirm whether your message was sent. Your details are still here. You can email contact@cad-dev.com before trying again.", true);
    } finally {
      pending = false;
      controls.forEach(control => { control.readOnly = false; });
      button.removeAttribute("aria-busy");
      button.textContent = "Send message ↗";
      resetVerification();
    }
  });

  // The public sitekey is in index.html. Missing setup fails closed.
  if (!sitekey) {
    announce("Online verification is unavailable. Please email contact@cad-dev.com.", true);
    return;
  }
  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  const unavailable = () => {
    token = "";
    updateButton();
    if (!pending) announce("Verification could not load. Please try again or email contact@cad-dev.com.", true);
  };
  script.onerror = unavailable;
  script.onload = () => {
    try {
      widgetId = window.turnstile.render(widget, {
        sitekey,
        action: "contact",
        theme: "light",
        // The flexible widget has a 300px minimum; compact also fits a 320px phone.
        size: "compact",
        language: document.documentElement.lang || "en",
        "response-field": false,
        callback: value => { token = value; updateButton(); },
        "expired-callback": () => {
          token = "";
          updateButton();
          if (!pending) announce("Verification expired. Complete it again before sending.", true);
        },
        "error-callback": () => { unavailable(); return true; },
        "timeout-callback": unavailable,
      });
    } catch { unavailable(); }
  };
  document.head.append(script);
})();
