/* SW Framework — accessible form validation built on native constraints */
(function () {
  'use strict';

  const instances = new WeakMap();
  let fieldCounter = 0;

  class SWValid {
    constructor(form) {
      this.form = form;
      this.form.noValidate = true;
      this.live = form.getAttribute('sw-valid-live') || 'true';
      this.fields().forEach((field) => this.bind(field));
      this.form.addEventListener('submit', (event) => {
        if (!this.check({ focus: true })) {
          event.preventDefault();
          SW.emit(this.form, 'sw:valid-error', { form: this.form });
          return;
        }
        if (!SW.emit(this.form, 'sw:valid-submit', { form: this.form })) event.preventDefault();
      });
      this.form.addEventListener('reset', () => {
        this.fields().forEach((field) => {
          field.classList.remove('is-invalid', 'is-valid');
          field.removeAttribute('aria-invalid');
          delete field.dataset.swValidTouched;
          const error = field.id ? this.form.querySelector(`#${CSS.escape(field.id)}-error`) : null;
          if (error) { error.hidden = true; error.textContent = ''; }
        });
        delete this.form.dataset.swValidState;
      });
    }

    fields() {
      return Array.from(this.form.elements).filter((field) =>
        field instanceof HTMLElement &&
        typeof field.checkValidity === 'function' &&
        !field.disabled &&
        !['button', 'submit', 'reset', 'hidden'].includes(field.type)
      );
    }

    bind(field) {
      if (field._swValidInit) return;
      field._swValidInit = true;
      if (this.live === 'false') return; // sw-valid-live="false" — só valida no submit

      field.addEventListener('blur', () => {
        field.dataset.swValidTouched = 'true';
        this.validateField(field);
        this.updateState();
      });
      if (this.live !== 'blur') {
        field.addEventListener('input', () => {
          if (field.dataset.swValidTouched === 'true' || field.getAttribute('aria-invalid') === 'true') {
            this.validateField(field);
            this.updateState();
          }
        });
      }
      field.addEventListener('change', () => {
        field.dataset.swValidTouched = 'true';
        this.validateField(field);
        this.updateState();
      });
    }

    errorElement(field) {
      if (!field.id) {
        fieldCounter += 1;
        field.id = `sw-field-${fieldCounter}`;
      }
      const errorId = `${field.id}-error`;
      let error = this.form.querySelector(`#${CSS.escape(errorId)}`);
      if (!error) {
        error = document.createElement('p');
        error.id = errorId;
        error.className = 'sw-form-error';
        error.setAttribute('role', 'alert');
        error.hidden = true;
        (field.closest('.sw-form-group') || field.parentElement || this.form).appendChild(error);
      }
      return error;
    }

    validateField(field) {
      const valid = field.checkValidity();
      const error = this.errorElement(field);
      field.classList.toggle('is-invalid', !valid);
      field.classList.toggle('is-valid', valid && field.dataset.swValidTouched === 'true' && String(field.value || '') !== '');

      if (!valid) {
        field.setAttribute('aria-invalid', 'true');
        const describedBy = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
        describedBy.add(error.id);
        field.setAttribute('aria-describedby', Array.from(describedBy).join(' '));
        error.textContent = field.dataset.swError || field.validationMessage || 'Revise este campo.';
        error.hidden = false;
      } else {
        field.removeAttribute('aria-invalid');
        const describedBy = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter((id) => id && id !== error.id);
        if (describedBy.length) field.setAttribute('aria-describedby', describedBy.join(' '));
        else field.removeAttribute('aria-describedby');
        error.textContent = '';
        error.hidden = true;
      }
      return valid;
    }

    updateState() {
      const valid = this.fields().every((field) => field.checkValidity());
      this.form.dataset.swValidState = valid ? 'valid' : 'invalid';
      return valid;
    }

    check({ focus = true } = {}) {
      const fields = this.fields();
      let firstInvalid = null;
      fields.forEach((field) => {
        field.dataset.swValidTouched = 'true';
        if (!this.validateField(field) && !firstInvalid) firstInvalid = field;
      });
      this.form.dataset.swValidState = firstInvalid ? 'invalid' : 'valid';
      if (firstInvalid && focus) firstInvalid.focus({ preventScroll: false });
      return !firstInvalid;
    }

    static initAll(root = document) {
      SW.$('form[sw-valid]', root).forEach((form) => this.init(form));
    }

    static init(form) {
      if (!(form instanceof HTMLFormElement)) return null;
      if (!instances.has(form)) instances.set(form, new SWValid(form));
      const instance = instances.get(form);
      instance.fields().forEach((field) => instance.bind(field));
      return instance;
    }

    static check(target, options = {}) {
      const form = typeof target === 'string' ? document.querySelector(target) : target;
      return this.init(form)?.check(options) ?? false;
    }
  }

  window.SW?.register('SWValid', SWValid);
  if (window.SW) window.SW.Valid = SWValid;
})();
