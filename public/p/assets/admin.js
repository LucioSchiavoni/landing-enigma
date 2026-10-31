const lock = document.querySelector('[data-lock]');
const form = document.querySelector('[data-unlock]');
const input = document.querySelector('[data-secret]');
const submitButton = document.querySelector('[data-unlock-submit]');
const status = document.querySelector('[data-unlock-status]');
const root = document.querySelector('[data-admin]');

const channels = { whatsapp: 'WhatsApp', email: 'Email', otro: 'Otro' };

let proposals = [];
const shown = new Set();
let toast;
let dialog;

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

const request = async (method, url, body) => {
  const response = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error ?? 'No se pudo completar la acción');
    error.status = response.status;
    throw error;
  }
  return result;
};

const api = async (method, body) => {
  const result = await request(method, '/api/admin/proposals', body);
  proposals = result.proposals;
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

const linkOf = (proposal) => `${location.origin}/p/${proposal.slug}/`;
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

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsText(file);
  });

const fileField = (required) =>
  field(
    'Archivo HTML',
    el('input', { class: 'field-input', name: 'file', type: 'file', accept: '.html,text/html', required }),
    required ? 'El HTML de la propuesta, por ejemplo propuestas/ecommerce.html' : 'Opcional: sustituye el contenido de la propuesta',
  );

const openDialog = (mode, proposal) => {
  const titles = { create: 'Nueva propuesta', edit: 'Editar propuesta', reset: 'Nuevo PIN', remove: 'Eliminar propuesta' };
  const labels = { create: 'Crear', edit: 'Guardar', reset: 'Cambiar PIN', remove: 'Eliminar' };
  const errorLine = el('p', { class: 'dialog-error', role: 'alert' });
  let body;
  if (mode === 'create') {
    body = [
      field('Nombre interno', el('input', { class: 'field-input', name: 'name', type: 'text', maxlength: '120', required: true })),
      fileField(true),
      ...contactFields(),
      pinField(),
      field('Enlace', el('input', { class: 'field-input field-mono', name: 'slug', type: 'text', pattern: '[a-z0-9\\-]{8,}', maxlength: '60', autocomplete: 'off' }), 'Déjalo vacío para generar uno aleatorio'),
    ];
  } else if (mode === 'edit') {
    body = [...contactFields(proposal), fileField(false)];
  } else if (mode === 'reset') {
    body = [el('p', { class: 'dialog-text', text: `El PIN actual de ${proposal.client || proposal.name} dejará de funcionar al instante.` }), pinField()];
  } else {
    body = [el('p', { class: 'dialog-text', text: `Se eliminará ${proposal.client || proposal.name} y su enlace dejará de funcionar. No se puede deshacer.` })];
  }
  const formNode = el('form', { class: 'dialog-form', method: 'dialog' }, [
    el('div', { class: 'dialog-head' }, [el('span', { class: 'tag', text: '[ Panel ]' }), el('h2', { class: 'dialog-title', text: titles[mode] })]),
    ...body,
    errorLine,
    el('div', { class: 'dialog-actions' }, [
      el('button', { class: 'btn btn-secondary', type: 'button', value: 'cancel', 'on:click': () => dialog.close() }, 'Cancelar'),
      el('button', { class: 'btn btn-primary', type: 'submit' }, labels[mode]),
    ]),
  ]);
  formNode.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(formNode));
    const submit = formNode.querySelector('[type="submit"]');
    submit.disabled = true;
    errorLine.textContent = '';
    try {
      const html = data.file instanceof File && data.file.size ? await readFile(data.file) : undefined;
      delete data.file;
      if (mode === 'create') await api('POST', { ...data, html });
      if (mode === 'edit') await api('PATCH', { ...data, slug: proposal.slug, html });
      if (mode === 'reset') await api('PATCH', { ...data, slug: proposal.slug, resetPin: true });
      if (mode === 'remove') await api('DELETE', { slug: proposal.slug });
      dialog.close();
      render();
      const saved = proposals.find((item) => item.slug === (proposal?.slug ?? proposals[0]?.slug));
      if (mode === 'remove') notify('Propuesta eliminada');
      else if (mode === 'edit') notify('Cambios guardados');
      else notify(`PIN de ${saved.client || saved.name}: ${saved.pin}`);
    } catch (error) {
      if (error.status === 401) return location.reload();
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
      el('span', { class: 'tag card-date', text: `PIN del ${formatDate(proposal.pinUpdatedAt)} · ${proposal.views} ${proposal.views === 1 ? 'visita' : 'visitas'}` }),
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
      el('button', { class: 'btn btn-secondary btn-small', type: 'button', 'on:click': () => openDialog('edit', proposal) }, 'Editar'),
      el('button', { class: 'btn btn-primary btn-small', type: 'button', 'on:click': () => openDialog('reset', proposal) }, 'Nuevo PIN'),
      el('button', { class: 'btn btn-secondary btn-small', type: 'button', 'on:click': () => openDialog('remove', proposal) }, 'Eliminar'),
    ]),
  ]);
};

const logout = async () => {
  await request('DELETE', '/api/admin/login').catch(() => undefined);
  location.reload();
};

const render = () => {
  const count = proposals.length;
  const note = 'Los cambios se publican al instante. El enlace de una propuesta no cambia al renovar su PIN.';
  const main = el('main', { class: 'wrap admin-main', id: 'contenido' }, [
    el('div', { class: 'admin-head' }, [
      el('div', { class: 'admin-heading' }, [
        el('span', { class: 'tag', text: `[ ${count} ${count === 1 ? 'propuesta' : 'propuestas'} ]` }),
        el('h1', { class: 'admin-title', tabindex: '-1', text: 'Propuestas' }),
        el('p', { class: 'admin-note', text: note }),
      ]),
      el('button', { class: 'btn btn-primary', type: 'button', 'on:click': () => openDialog('create') }, 'Nueva propuesta'),
    ]),
    count
      ? el('ul', { class: 'admin-list' }, proposals.map(card))
      : el('p', { class: 'admin-empty', text: 'Todavía no hay propuestas en el panel. Crea la primera con «Nueva propuesta».' }),
  ]);
  const topbar = el('header', { class: 'topbar' }, [
    el('span', { class: 'logo' }, [
      el('span', { class: 'logo-text' }, [el('span', { text: 'enigma' }), el('span', { text: 'Builders' })]),
    ]),
    el('div', { class: 'topbar-meta' }, [
      el('span', { class: 'tag', text: '[ Panel ]' }),
      el('button', { class: 'btn btn-secondary', type: 'button', 'on:click': logout }, 'Bloquear'),
    ]),
  ]);
  toast ??= el('p', { class: 'admin-toast', role: 'status' });
  dialog ??= el('dialog', { class: 'admin-dialog', 'aria-label': 'Formulario del panel' });
  root.replaceChildren(topbar, main, toast, dialog);
};

const enter = () => {
  lock.remove();
  document.documentElement.classList.remove('is-locked');
  root.hidden = false;
  render();
  root.querySelector('h1')?.focus({ preventScroll: true });
};

const unlock = async (code) => {
  submitButton.disabled = true;
  status.classList.remove('is-error');
  status.textContent = 'Verificando…';
  try {
    await request('POST', '/api/admin/login', { secret: code });
    await api('GET');
  } catch (error) {
    submitButton.disabled = false;
    input.value = '';
    status.textContent = error.message;
    status.classList.add('is-error');
    input.focus();
    return;
  }
  enter();
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (input.value) unlock(input.value);
});

api('GET')
  .then(enter)
  .catch(() => input.focus());
