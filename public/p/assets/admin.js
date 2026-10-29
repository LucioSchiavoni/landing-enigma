const lock = document.querySelector('[data-lock]');
const form = document.querySelector('[data-unlock]');
const input = document.querySelector('[data-secret]');
const submitButton = document.querySelector('[data-unlock-submit]');
const status = document.querySelector('[data-unlock-status]');
const root = document.querySelector('[data-admin]');

const storageKey = `admin:${location.pathname}`;
const base = location.href.split(/[?#]/)[0].replace(/\/?$/, '/');
const vaultUrl = new URL('vault.json', base);
const channels = { whatsapp: 'WhatsApp', email: 'Email', otro: 'Otro' };

let secret = '';
let vault = { site: '', proposals: [] };
let sources = [];
let local = false;
const shown = new Set();
let toast;
let dialog;

const fromBase64 = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const decrypt = async (code, payload) => {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(payload.salt), iterations: payload.iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(payload.iv) }, key, fromBase64(payload.data));
  return new TextDecoder().decode(plain);
};

const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'text') node.textContent = value;
    else if (key === 'class') node.className = value;
    else if (key.startsWith('on:')) node.addEventListener(key.slice(3), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  node.append(...[children].flat().filter((child) => child !== null && child !== undefined && child !== false));
  return node;
};

const api = async (action, body = {}) => {
  const response = await fetch(`/__admin/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, secret }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.vault) throw new Error(result.error ?? 'No se pudo guardar');
  vault = result.vault;
  sources = result.sources ?? [];
};

const notify = (message) => {
  toast.textContent = message;
};

const copy = async (value, message) => {
  try {
    await navigator.clipboard.writeText(value);
    notify(message);
  } catch {
    notify('No se pudo copiar al portapapeles');
  }
};

const siteUrl = () => (vault.site || location.origin).replace(/\/+$/, '');
const linkOf = (proposal) => `${siteUrl()}/p/${proposal.slug}/`;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

const linkMessage = (proposal) =>
  `${proposal.client ? `Hola, ${proposal.client}.` : 'Hola.'} Le compartimos la propuesta de Enigma Builders: ${linkOf(proposal)}\nEl PIN de acceso se lo enviamos en un mensaje aparte.`;
const pinMessage = (proposal) => `Su PIN de acceso a la propuesta de Enigma Builders es ${proposal.pin}.`;

const sendHref = (proposal, message, subject) => {
  const { channel, value } = proposal.contact ?? {};
  if (!value) return null;
  if (channel === 'whatsapp') {
    const digits = value.replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;
  }
  if (channel === 'email') {
    const address = value.replace(/\s/g, '');
    if (!/^[^@?&#]+@[^@?&#]+$/.test(address)) return null;
    return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  }
  return null;
};

const sendButton = (proposal, label, message, subject) => {
  const href = sendHref(proposal, message, subject);
  if (href) {
    const via = channels[proposal.contact.channel];
    return el('a', { class: 'btn btn-secondary btn-small', href, target: '_blank', rel: 'noopener noreferrer' }, `${label} por ${via}`);
  }
  return el('button', { class: 'btn btn-secondary btn-small', type: 'button', 'on:click': () => copy(message, 'Mensaje copiado') }, `Copiar mensaje: ${label.toLowerCase()}`);
};

const contactLabel = (proposal) => {
  const { channel, value } = proposal.contact ?? {};
  if (!value) return 'Sin contacto';
  return `${channels[channel] ?? 'Otro'} · ${value}`;
};

const field = (label, control, hint) =>
  el('label', { class: 'field' }, [el('span', { class: 'field-label', text: label }), control, hint ? el('span', { class: 'field-hint', text: hint }) : null]);

const contactFields = (proposal) => {
  const channel = el(
    'select',
    { class: 'field-input', name: 'channel' },
    Object.entries(channels).map(([value, label]) => el('option', { value, selected: (proposal?.contact?.channel ?? 'whatsapp') === value }, label)),
  );
  return [
    field('Cliente', el('input', { class: 'field-input', name: 'client', type: 'text', maxlength: '120', value: proposal?.client ?? '' })),
    el('div', { class: 'field-row' }, [
      field('Canal', channel),
      field('Contacto', el('input', { class: 'field-input', name: 'contact', type: 'text', maxlength: '200', value: proposal?.contact?.value ?? '' }), 'Teléfono con prefijo de país o email'),
    ]),
  ];
};

const pinField = () =>
  field(
    'PIN',
    el('input', { class: 'field-input field-mono', name: 'pin', type: 'text', inputmode: 'numeric', pattern: '[0-9]{6}', maxlength: '6', placeholder: 'Aleatorio', autocomplete: 'off' }),
    'Déjalo vacío para generar uno aleatorio',
  );

const openDialog = (mode, proposal) => {
  const available = sources.filter((name) => !vault.proposals.some((item) => item.name === name));
  const titles = { create: 'Nueva propuesta', edit: 'Editar contacto', reset: 'Nuevo PIN' };
  const errorLine = el('p', { class: 'dialog-error', role: 'alert' });
  let body;
  if (mode === 'create') {
    body = available.length
      ? [
          field('Propuesta', el('select', { class: 'field-input', name: 'name', required: true }, available.map((name) => el('option', { value: name }, `propuestas/${name}.html`)))),
          ...contactFields(),
          pinField(),
        ]
      : [el('p', { class: 'dialog-text', text: 'No hay archivos nuevos. Añade el HTML de la propuesta en propuestas/<nombre>.html y vuelve a abrir este formulario.' })];
  } else if (mode === 'edit') {
    body = contactFields(proposal);
  } else {
    body = [el('p', { class: 'dialog-text', text: `El PIN actual de ${proposal.client || proposal.name} dejará de funcionar en cuanto publiques el cambio.` }), pinField()];
  }
  const canSubmit = mode !== 'create' || available.length > 0;
  const formNode = el('form', { class: 'dialog-form', method: 'dialog' }, [
    el('div', { class: 'dialog-head' }, [el('span', { class: 'tag', text: '[ Panel ]' }), el('h2', { class: 'dialog-title', text: titles[mode] })]),
    ...body,
    errorLine,
    el('div', { class: 'dialog-actions' }, [
      el('button', { class: 'btn btn-secondary', type: 'button', value: 'cancel', 'on:click': () => dialog.close() }, 'Cancelar'),
      canSubmit ? el('button', { class: 'btn btn-primary', type: 'submit' }, mode === 'reset' ? 'Cambiar PIN' : 'Guardar') : null,
    ]),
  ]);
  formNode.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(formNode));
    const submit = formNode.querySelector('[type="submit"]');
    submit.disabled = true;
    errorLine.textContent = '';
    try {
      if (mode === 'create') await api('create', data);
      if (mode === 'edit') await api('update', { ...data, slug: proposal.slug });
      if (mode === 'reset') await api('reset', { ...data, slug: proposal.slug });
      dialog.close();
      render();
      const saved = vault.proposals.find((item) => item.slug === (proposal?.slug ?? vault.proposals[0]?.slug));
      if (mode === 'edit') notify('Contacto guardado. Haz commit y push para publicarlo.');
      else notify(`PIN de ${saved.client || saved.name}: ${saved.pin}. Haz commit y push para publicarlo.`);
    } catch (error) {
      errorLine.textContent = error.message;
      submit.disabled = false;
    }
  });
  dialog.replaceChildren(formNode);
  dialog.showModal();
  formNode.querySelector('input, select')?.focus();
};

const card = (proposal) => {
  const visible = shown.has(proposal.slug);
  const link = linkOf(proposal);
  return el('li', { class: 'card' }, [
    el('div', { class: 'card-head' }, [
      el('div', { class: 'card-heading' }, [
        el('span', { class: 'tag', text: `[ ${proposal.name} ]` }),
        el('h2', { class: 'card-title', text: proposal.client || proposal.name }),
      ]),
      el('span', { class: 'tag card-date', text: `PIN del ${formatDate(proposal.pinUpdatedAt)}` }),
    ]),
    el('dl', { class: 'card-grid' }, [
      el('div', { class: 'card-item card-link' }, [
        el('dt', { class: 'card-label', text: 'Enlace' }),
        el('dd', { class: 'card-value' }, [
          el('a', { class: 'card-url', href: link, target: '_blank', rel: 'noopener noreferrer', text: link }),
          el('button', { class: 'icon-btn', type: 'button', 'on:click': () => copy(link, 'Enlace copiado') }, 'Copiar'),
        ]),
      ]),
      el('div', { class: 'card-item' }, [
        el('dt', { class: 'card-label', text: 'PIN' }),
        el('dd', { class: 'card-value' }, [
          el('span', { class: 'card-pin', text: visible ? proposal.pin : '••••••', 'aria-label': visible ? `PIN ${proposal.pin.split('').join(' ')}` : 'PIN oculto' }),
          el(
            'button',
            {
              class: 'icon-btn',
              type: 'button',
              'aria-pressed': String(visible),
              'on:click': () => {
                if (visible) shown.delete(proposal.slug);
                else shown.add(proposal.slug);
                render();
              },
            },
            visible ? 'Ocultar' : 'Mostrar',
          ),
          el('button', { class: 'icon-btn', type: 'button', 'on:click': () => copy(proposal.pin, 'PIN copiado') }, 'Copiar'),
        ]),
      ]),
      el('div', { class: 'card-item' }, [el('dt', { class: 'card-label', text: 'Contacto' }), el('dd', { class: 'card-value', text: contactLabel(proposal) })]),
    ]),
    el('div', { class: 'card-actions' }, [
      sendButton(proposal, 'Enviar enlace', linkMessage(proposal), 'Propuesta de Enigma Builders'),
      sendButton(proposal, 'Enviar PIN', pinMessage(proposal), 'PIN de acceso a su propuesta'),
      local ? el('button', { class: 'btn btn-secondary btn-small', type: 'button', 'on:click': () => openDialog('edit', proposal) }, 'Editar contacto') : null,
      local ? el('button', { class: 'btn btn-primary btn-small', type: 'button', 'on:click': () => openDialog('reset', proposal) }, 'Nuevo PIN') : null,
    ]),
  ]);
};

const siteForm = () => {
  const control = el('input', { class: 'field-input', name: 'site', type: 'url', placeholder: location.origin, value: vault.site ?? '' });
  const formNode = el('form', { class: 'admin-site' }, [
    field('Dominio publicado', control, 'Se usa para componer los enlaces que envías'),
    el('button', { class: 'btn btn-secondary', type: 'submit' }, 'Guardar'),
  ]);
  formNode.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api('site', { site: control.value });
      render();
      notify('Dominio guardado');
    } catch (error) {
      notify(error.message);
    }
  });
  return formNode;
};

const logout = () => {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {}
  location.reload();
};

const render = () => {
  const count = vault.proposals.length;
  const note = local
    ? 'Modo local: los cambios se guardan en los archivos del repo. Haz commit y push para publicarlos.'
    : 'Solo lectura. Para crear propuestas, editar contactos o cambiar PINs, abre este panel con npm run dev.';
  const main = el('main', { class: 'wrap admin-main', id: 'contenido' }, [
    el('div', { class: 'admin-head' }, [
      el('div', { class: 'admin-heading' }, [
        el('span', { class: 'tag', text: `[ ${count} ${count === 1 ? 'propuesta' : 'propuestas'} ]` }),
        el('h1', { class: 'admin-title', tabindex: '-1', text: 'Propuestas' }),
        el('p', { class: 'admin-note', text: note }),
      ]),
      local ? el('button', { class: 'btn btn-primary', type: 'button', 'on:click': () => openDialog('create') }, 'Nueva propuesta') : null,
    ]),
    count
      ? el('ul', { class: 'admin-list' }, vault.proposals.map(card))
      : el('p', { class: 'admin-empty', text: local ? 'Todavía no hay propuestas en el panel. Crea la primera con «Nueva propuesta».' : 'Todavía no hay propuestas en el panel.' }),
    local ? siteForm() : null,
  ]);
  const topbar = el('header', { class: 'topbar' }, [
    el('span', { class: 'logo' }, [
      el('span', { class: 'logo-text' }, [el('span', { text: 'enigma' }), el('span', { text: 'Builders' })]),
    ]),
    el('div', { class: 'topbar-meta' }, [
      el('span', { class: 'tag', text: local ? '[ Panel · Local ]' : '[ Panel ]' }),
      el('button', { class: 'btn btn-secondary', type: 'button', 'on:click': logout }, 'Bloquear'),
    ]),
  ]);
  toast ??= el('p', { class: 'admin-toast', role: 'status' });
  dialog ??= el('dialog', { class: 'admin-dialog', 'aria-label': 'Formulario del panel' });
  root.replaceChildren(topbar, main, toast, dialog);
};

const unlock = async (code, remember) => {
  submitButton.disabled = true;
  status.classList.remove('is-error');
  status.textContent = 'Verificando…';
  try {
    const response = await fetch(vaultUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('missing');
    vault = JSON.parse(await decrypt(code, await response.json()));
  } catch {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    submitButton.disabled = false;
    input.value = '';
    status.textContent = remember ? 'Secret incorrecto' : '';
    status.classList.toggle('is-error', remember);
    input.focus();
    return;
  }
  secret = code;
  try {
    sessionStorage.setItem(storageKey, code);
  } catch {}
  try {
    await api('session');
    local = true;
  } catch {
    local = false;
  }
  lock.remove();
  document.documentElement.classList.remove('is-locked');
  root.hidden = false;
  render();
  root.querySelector('h1')?.focus({ preventScroll: true });
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (input.value) unlock(input.value, true);
});

let saved = null;
try {
  saved = sessionStorage.getItem(storageKey);
} catch {}

if (saved) unlock(saved, false);
else input.focus();
