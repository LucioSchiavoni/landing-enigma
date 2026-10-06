const FLOW_SVG_NS = 'http://www.w3.org/2000/svg';
const FLOW_CYCLE = 2.8;
const FLOW_START_DELAY = 2200;
const FLOW_LINE_GAP = 10;
const FLOW_PACKET = 5;

type Point = { x: number; y: number };

const offsetWithin = (element: HTMLElement, root: HTMLElement): Point => {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = element;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
};

const curve = (from: Point, to: Point) => {
  const mid = (from.x + to.x) / 2;
  return `M${from.x} ${from.y} C${mid} ${from.y} ${mid} ${to.y} ${to.x} ${to.y}`;
};

const createPacket = (className: string, keyPoints: string, keyTimes: string, opacityValues: string, opacityTimes: string) => {
  const rect = document.createElementNS(FLOW_SVG_NS, 'rect');
  rect.setAttribute('class', `flow-packet ${className}`);
  rect.setAttribute('x', String(-FLOW_PACKET / 2));
  rect.setAttribute('y', String(-FLOW_PACKET / 2));
  rect.setAttribute('width', String(FLOW_PACKET));
  rect.setAttribute('height', String(FLOW_PACKET));
  rect.setAttribute('opacity', '0');

  const motion = document.createElementNS(FLOW_SVG_NS, 'animateMotion');
  motion.setAttribute('dur', `${FLOW_CYCLE}s`);
  motion.setAttribute('repeatCount', 'indefinite');
  motion.setAttribute('begin', 'indefinite');
  motion.setAttribute('calcMode', 'linear');
  motion.setAttribute('keyPoints', keyPoints);
  motion.setAttribute('keyTimes', keyTimes);

  const fade = document.createElementNS(FLOW_SVG_NS, 'animate');
  fade.setAttribute('attributeName', 'opacity');
  fade.setAttribute('dur', `${FLOW_CYCLE}s`);
  fade.setAttribute('repeatCount', 'indefinite');
  fade.setAttribute('begin', 'indefinite');
  fade.setAttribute('values', opacityValues);
  fade.setAttribute('keyTimes', opacityTimes);

  rect.append(motion, fade);
  return { rect, motion, fade };
};

const setup = (flow: HTMLElement) => {
  const layer = flow.querySelector<HTMLElement>('.flow-lines');
  const svgIn = flow.querySelector<SVGSVGElement>('.flow-svg-in');
  const svgOut = flow.querySelector<SVGSVGElement>('.flow-svg-out');
  const hub = flow.querySelector<HTMLElement>('.flow-hub');
  const inputs = Array.from(flow.querySelectorAll<HTMLElement>('.flow-in span'));
  const outputs = Array.from(flow.querySelectorAll<HTMLElement>('.flow-out span'));
  if (!layer || !svgIn || !svgOut || !hub) return;

  const linesIn = Array.from(svgIn.querySelectorAll<SVGPathElement>('.flow-line'));
  const linesOut = Array.from(svgOut.querySelectorAll<SVGPathElement>('.flow-line'));
  const packetsIn = inputs.map(() => createPacket('flow-packet-in', '0;1;1', '0;0.35;1', '0;1;1;0;0', '0;0.04;0.31;0.35;1'));
  const packetsOut = outputs.map(() => createPacket('flow-packet-out', '0;0;1;1', '0;0.45;0.8;1', '0;0;1;1;0;0', '0;0.45;0.49;0.76;0.8;1'));
  let started = false;

  const draw = () => {
    if (layer.offsetWidth === 0) return false;
    const origin = offsetWithin(layer, flow);
    const hubPos = offsetWithin(hub, flow);
    const hubY = hubPos.y - origin.y + hub.offsetHeight / 2;
    const hubLeft: Point = { x: hubPos.x - origin.x, y: hubY };
    const hubRight: Point = { x: hubPos.x - origin.x + hub.offsetWidth, y: hubY };

    const inPaths = inputs.map((el) => {
      const pos = offsetWithin(el, flow);
      return curve({ x: pos.x - origin.x + el.offsetWidth + FLOW_LINE_GAP, y: pos.y - origin.y + el.offsetHeight / 2 }, hubLeft);
    });
    const outPaths = outputs.map((el) => {
      const pos = offsetWithin(el, flow);
      return curve(hubRight, { x: pos.x - origin.x - FLOW_LINE_GAP, y: pos.y - origin.y + el.offsetHeight / 2 });
    });

    const viewBox = `0 0 ${layer.offsetWidth} ${layer.offsetHeight}`;
    svgIn.setAttribute('viewBox', viewBox);
    svgOut.setAttribute('viewBox', viewBox);
    linesIn.forEach((line, i) => line.setAttribute('d', inPaths[i] ?? ''));
    linesOut.forEach((line, i) => line.setAttribute('d', outPaths[i] ?? ''));
    packetsIn.forEach(({ motion }, i) => motion.setAttribute('path', inPaths[i] ?? ''));
    packetsOut.forEach(({ motion }, i) => motion.setAttribute('path', outPaths[i] ?? ''));
    return true;
  };

  const start = () => {
    if (started || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!draw()) return;
    started = true;
    svgIn.append(...packetsIn.map(({ rect }) => rect));
    svgOut.append(...packetsOut.map(({ rect }) => rect));
    [...packetsIn, ...packetsOut].forEach(({ motion, fade }) => {
      motion.beginElement();
      fade.beginElement();
    });
  };

  draw();
  new ResizeObserver(() => draw()).observe(flow);

  const arm = () => window.setTimeout(start, FLOW_START_DELAY);
  if (flow.hasAttribute('data-visible')) {
    arm();
  } else {
    const watcher = new MutationObserver(() => {
      if (!flow.hasAttribute('data-visible')) return;
      watcher.disconnect();
      arm();
    });
    watcher.observe(flow, { attributes: true, attributeFilter: ['data-visible'] });
  }
};

document.querySelectorAll<HTMLElement>('[data-reveal-flow]').forEach(setup);
