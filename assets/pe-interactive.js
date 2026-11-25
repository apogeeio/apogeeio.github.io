const compact = matchMedia('(max-width: 600px)');
const number = new Intl.NumberFormat('en-US');
const accent = 'var(--accent)';
const teal = 'var(--chart-teal)';
const orange = 'var(--chart-orange)';
const headColors = [
  'var(--chart-blue)', teal, 'var(--chart-green)', 'var(--chart-magenta)',
  orange, 'var(--chart-purple)', 'var(--chart-red)', 'var(--chart-brown)',
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const fixed = (value, digits) => value.toFixed(digits).replace('-', '−');
const signed = value => value > 0 ? `+${value}` : String(value).replace('-', '−');
const token = (key, content) => `<button type="button" data-token="${key}" aria-pressed="false">${content}</button>`;
const line = (x1, y1, x2, y2, attributes = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attributes}/>`;
const label = (x, y, content, attributes = '') =>
  `<text x="${x}" y="${y}" ${attributes}>${content}</text>`;
const circle = (x, y, r, attributes = '') =>
  `<circle cx="${x}" cy="${y}" r="${r}" ${attributes}/>`;

function prepare(figure, formula, terms, labels, chartLabel) {
  figure.querySelector('figcaption').insertAdjacentHTML('beforebegin', `
    <div class="pe-formula">${formula}</div>
    <p class="pe-say" aria-live="polite"></p>
    <div class="pe-controls"></div>
    <dl class="pe-metrics">${labels.map(text => `<div><dt>${text}</dt><dd></dd></div>`).join('')}</dl>
    <div class="pe-chart">
      <svg class="pe-svg-interactive" viewBox="0 0 760 240" role="img" tabindex="0"></svg>
      <div class="pe-tooltip" hidden></div>
    </div>
    <div class="pe-legend"></div>`);

  const buttons = Array.from(figure.querySelectorAll('[data-token]'));
  const explanation = figure.querySelector('.pe-say');
  function explain(key) {
    for (const button of buttons) button.setAttribute('aria-pressed', button.dataset.token === key);
    const [term, description] = terms[key];
    explanation.innerHTML = `<strong>${term}</strong> · ${description}`;
  }
  for (const button of buttons) button.addEventListener('click', () => explain(button.dataset.token));
  explain(Object.keys(terms)[0]);

  const svg = figure.querySelector('svg');
  svg.setAttribute('aria-label', chartLabel);
  const readouts = figure.querySelectorAll('.pe-metrics dd');
  return {
    svg,
    legend: figure.querySelector('.pe-legend'),
    controls: figure.querySelector('.pe-controls'),
    metrics: (...values) => values.forEach((value, i) => { readouts[i].textContent = value; }),
    inspector: makeInspector(svg, figure.querySelector('.pe-tooltip')),
  };
}

function range(parent, name, { min, max, step = 1, value }, update) {
  const field = document.createElement('label');
  field.className = 'pe-range';
  field.innerHTML = `<span>${name}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output aria-hidden="true">${number.format(value)}</output>`;
  parent.append(field);
  const input = field.querySelector('input');
  input.addEventListener('input', () => {
    field.querySelector('output').value = number.format(input.valueAsNumber);
    update(input.valueAsNumber);
  });
}

function pills(parent, name, options, selected, update, { preview = false, className = '' } = {}) {
  const group = document.createElement('div');
  group.className = `pe-pills ${className}`.trim();
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', name);
  const buttons = options.map((text, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-pressed', i === selected);
    group.append(button);
    return button;
  });
  function select(i) {
    if (options.length === 1 && selected === i) i = -1;
    if (i === selected) return;
    selected = i;
    buttons.forEach((button, j) => button.setAttribute('aria-pressed', i === j));
    update(i);
  }
  buttons.forEach((button, i) => {
    button.addEventListener('click', () => select(i));
    if (preview) {
      button.addEventListener('pointerenter', event => {
        if (event.pointerType === 'mouse') select(i);
      });
    }
  });
  parent.append(group);
}

function swatch(color, text, dashed = false) {
  return `<span><i style="--swatch:${color}"${dashed ? ' class="is-dashed"' : ''}></i>${text}</span>`;
}

function makeInspector(svg, tooltip) {
  let config;
  let index;
  let active = false;

  function hide() {
    active = false;
    tooltip.hidden = true;
    svg.querySelector('.pe-inspection')?.replaceChildren();
  }

  function show(next) {
    index = clamp(next, 0, config.max);
    const { marks, html, x, y } = config.point(index);
    svg.querySelector('.pe-inspection').innerHTML = marks;
    tooltip.innerHTML = html;
    tooltip.hidden = false;
    const point = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM());
    const bounds = svg.getBoundingClientRect();
    const localX = point.x - bounds.left;
    const right = localX + 12;
    const left = right + tooltip.offsetWidth <= bounds.width ? right : localX - 12 - tooltip.offsetWidth;
    tooltip.style.left = `${clamp(left, 0, Math.max(0, bounds.width - tooltip.offsetWidth))}px`;
    tooltip.style.top = `${clamp(point.y - bounds.top - tooltip.offsetHeight - 10, 0, Math.max(0, bounds.height - tooltip.offsetHeight))}px`;
    active = true;
  }

  function inspectPointer(event) {
    if (!config) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const next = config.pick(point);
    if (next === null) hide();
    else show(next);
  }

  svg.addEventListener('pointermove', inspectPointer);
  svg.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') event.preventDefault();
    inspectPointer(event);
  });
  svg.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'touch') hide();
  });
  svg.addEventListener('pointercancel', hide);
  svg.addEventListener('blur', hide);
  svg.addEventListener('keydown', event => {
    if (!config) return;
    const current = index ?? config.initial;
    const keys = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: config.max };
    if (event.key === 'Escape') hide();
    if (!Object.hasOwn(keys, event.key)) return;
    event.preventDefault();
    show(keys[event.key]);
  });

  return next => {
    config = next;
    if (active) show(index);
  };
}

function drawAxes(bounds, xTicks, yTicks, x, y, xTitle, yTitle, formatY = String) {
  const { left, right, top, bottom, height } = bounds;
  const tickOffset = compact.matches ? 27 : 17;
  return [
    ...yTicks.map(tick => line(left, y(tick), right, y(tick), 'class="pe-grid"') +
      label(left - 9, y(tick), formatY(tick), 'text-anchor="end" dominant-baseline="central"')),
    ...xTicks.map(tick => line(x(tick), top, x(tick), bottom, 'class="pe-grid"') +
      label(x(tick), bottom + tickOffset, number.format(tick), 'text-anchor="middle"')),
    line(left, bottom, right, bottom, 'class="pe-axis"'),
    line(left, top, left, bottom, 'class="pe-axis"'),
    label(left, top - 10, yTitle, 'class="pe-axis-title"'),
    label((left + right) / 2, height - 3, xTitle, 'text-anchor="middle" class="pe-axis-title"'),
  ].join('');
}

function positionInspector(bounds, max, initial, point) {
  const { left, right, top, bottom } = bounds;
  return {
    max,
    initial,
    point,
    pick: position => {
      if (position.y < top || position.y > bottom || position.x < left - 5 || position.x > right + 5) return null;
      return Math.round((position.x - left) / (right - left) * max);
    },
  };
}

function sinusoidal(figure, t) {
  const formula = `<span><i>PE</i>(${token('pos', '<i>pos</i>')}, ${token('pair', '2<i>i</i>')})</span>
    <span>=</span><span>sin<span aria-hidden="true">(</span><span class="pe-fraction">
    <span>${token('pos', '<i>pos</i>')}</span><span>${token('base', '10000')}<sup>${token('pair', '2<i>i</i>')}/${token('dim', '<i>d</i>')}</sup></span>
    </span><span aria-hidden="true">)</span></span>`;
  const terms = {
    pos: ['pos', t('The token position whose sine component is being computed.', '要计算正弦分量的 token 位置。')],
    pair: ['2i', t('The even channel index. Channel 2i + 1 uses cosine at the same frequency.', '偶数通道索引；相邻的 2i + 1 通道使用同频率的余弦。')],
    dim: ['d', t('The embedding dimension sets how many frequency pairs are available.', '嵌入维度决定可用的频率对数。')],
    base: ['10000', t('The frequency base sets the range from fast to slow oscillations.', '频率底数决定从快速振荡到慢速振荡的范围。')],
  };
  const ui = prepare(figure, formula, terms, [
    'pos_ref', t('Hovered pos', '悬停位置 pos'), t('Relative Δ', '相对距离 Δ'),
    t('Cosine Sim S(Δ)', '余弦相似度 S(Δ)'),
  ], t('Cosine similarity by position. Use the arrow keys to inspect positions.', '按位置绘制的余弦相似度。可用方向键查看各位置。'));

  let reference = 48;
  let dimensions = 64;
  let overlay = false;
  let hovered = reference;
  let hasInspected = false;
  const max = 192;
  const shift = 32;

  range(ui.controls, 'pos_ref', { min: 0, max: 127, value: reference }, value => {
    reference = value;
    if (!hasInspected) hovered = value;
    render();
  });
  range(ui.controls, 'd_model', { min: 16, max: 256, step: 16, value: dimensions }, value => {
    dimensions = value;
    render();
  });
  const overlayText = t('Shift Overlay', '平移对比');
  pills(ui.controls, overlayText, [overlayText], -1, value => {
    overlay = value === 0;
    render();
  });

  function render() {
    const small = compact.matches;
    const bounds = { left: small ? 68 : 47, right: small ? 728 : 742, top: small ? 40 : 24, bottom: small ? 248 : 194, height: small ? 316 : 240 };
    const { left, right, top, bottom, height } = bounds;
    const frequencies = Array.from({ length: dimensions / 2 }, (_, i) => 10000 ** (-2 * i / dimensions));
    const similarity = delta => frequencies.reduce((sum, f) => sum + Math.cos(delta * f), 0) / frequencies.length;
    const x = pos => left + pos / max * (right - left);
    const y = value => bottom - (value + 0.5) / 1.5 * (bottom - top);
    const path = ref => Array.from({ length: max * 2 + 1 }, (_, i) => {
      const pos = i / 2;
      return `${i ? 'L' : 'M'}${x(pos).toFixed(2)},${y(similarity(pos - ref)).toFixed(2)}`;
    }).join('');
    const primary = path(reference);
    ui.svg.setAttribute('viewBox', `0 0 760 ${height}`);
    ui.svg.innerHTML = `
      ${drawAxes(bounds, small ? [0, 48, 96, 144, 192] : [0, 32, 64, 96, 128, 160, 192],
        [-0.5, 0, 0.5, 1], x, y, t('Position pos', '位置 pos'), 'S(Δ)', value => fixed(value, 1))}
      <path d="${primary} L${right},${y(0)} L${left},${y(0)} Z" fill="var(--accent-soft)"/>
      <path d="${primary}" fill="none" stroke="${accent}" stroke-width="2" stroke-linejoin="round"/>
      ${overlay ? `<path d="${path(reference + shift)}" fill="none" stroke="${teal}" stroke-width="1.8" stroke-dasharray="5 3"/>` : ''}
      <g class="pe-inspection" aria-hidden="true"></g>`;
    ui.legend.innerHTML = overlay
      ? swatch(accent, `pos_ref = ${reference}`) + swatch(teal, `pos_ref + 32 = ${reference + shift}`, true)
      : '';
    function read(pos) {
      const delta = pos - reference;
      const value = fixed(similarity(delta), 4);
      ui.metrics(reference, pos, signed(delta), value);
      return { delta, value };
    }
    read(hovered);
    ui.inspector(positionInspector(bounds, max, hovered, pos => {
      hasInspected = true;
      hovered = pos;
      const { delta, value } = read(pos);
      const px = x(pos);
      const py = y(similarity(delta));
      const mark = (at, color) => line(at, top, at, bottom, 'class="pe-crosshair"') +
        circle(at, py, 4, `fill="${color}" stroke="var(--paper)" stroke-width="1.5"`);
      const compare = overlay && pos + shift <= max;
      return {
        x: px,
        y: py,
        marks: mark(px, accent) + (compare ? mark(x(pos + shift), teal) : ''),
        html: `<strong>pos ${pos} · Δ ${signed(delta)}</strong><br>S(Δ) = ${value}` +
          (compare ? `<br>${t('Shifted pos', '平移后位置')} ${pos + shift} · S(Δ) = ${value}` : ''),
      };
    }));
  }
  render();
  compact.addEventListener('change', render);
}

function alibi(figure, t) {
  const formula = `<span><i>Score</i>(<i>i</i>, <i>j</i>)</span><span>=</span>
    <span><span class="pe-fraction"><span>${token('content', '<i>q</i><sub>i</sub><sup>T</sup><i>k</i><sub>j</sub>')}</span><span>√<i>d</i></span></span></span>
    <span>− ${token('slope', '<i>m</i><sub>h</sub>')} · ${token('distance', '|<i>i</i> − <i>j</i>|')}</span>`;
  const terms = {
    slope: ['m<sub>h</sub>', t('The head-specific slope controls how quickly distance lowers the score.', '每个注意力头的斜率决定距离让分数降低的速度。')],
    distance: ['|i − j|', t('The number of token positions between the query and key.', '查询与键之间相隔的 token 位置数。')],
    content: ['q<sub>i</sub><sup>T</sup>k<sub>j</sub>', t('The dot product measures content similarity between the query and key.', '点积衡量查询与键的内容相似度。')],
  };
  const ui = prepare(figure, formula, terms, [
    t('Active Head', '当前 Head'), t('Slope m = 2⁻ʰ', '斜率 m = 2⁻ʰ'),
    t('Receptive Field', '感受野类型'), t('Penalty @ Δ=32', '距离 32 处扣分'),
  ], t('ALiBi bias by relative distance. Use the arrow keys to inspect distances.', '按相对距离绘制的 ALiBi 偏置。可用方向键查看各距离。'));

  const slopes = headColors.map((_, i) => 2 ** -(i + 1));
  const heads = slopes.map((_, i) => `Head ${i + 1}`);
  const fields = [
    t('Local', '局部'), t('Local', '局部'), t('Mid-range', '中程'), t('Mid-range', '中程'),
    t('Mid-range', '中程'), t('Broad', '广域'), t('Broad', '广域'), t('Broad', '广域'),
  ];
  let head = 2;
  pills(ui.controls, t('Attention head', '注意力头'), heads, head, value => {
    head = value;
    render();
  }, { preview: true, className: 'pe-head-pills' });

  function render() {
    const small = compact.matches;
    const max = 64;
    const bounds = { left: small ? 68 : 47, right: small ? 644 : 686, top: small ? 40 : 24, bottom: small ? 248 : 194, height: small ? 316 : 240 };
    const { left, right, top, bottom, height } = bounds;
    const labelGap = small ? 27 : 15;
    const slope = slopes[head];
    const color = headColors[head];
    const x = distance => left + distance / max * (right - left);
    const y = bias => top + bias / -32 * (bottom - top);
    const labelPositions = [];
    for (let i = slopes.length - 1; i >= 0; i--) {
      labelPositions[i] = Math.max(y(-max * slopes[i]), (labelPositions[i + 1] ?? top - labelGap) + labelGap);
    }
    function series(i) {
      const end = y(-max * slopes[i]);
      const stroke = i === head ? headColors[i] : 'var(--ink-3)';
      return line(left, y(0), right, end, `stroke="${stroke}" stroke-width="${i === head ? 2.4 : 1.2}" opacity="${i === head ? 1 : 0.43}"`);
    }
    ui.svg.setAttribute('viewBox', `0 0 760 ${height}`);
    ui.svg.innerHTML = `
      ${drawAxes(bounds, small ? [0, 16, 32, 48, 64] : [0, 8, 16, 24, 32, 40, 48, 56, 64],
        [0, -8, -16, -24, -32], x, y, t('Relative distance |i − j|', '相对距离 |i − j|'), t('Positional bias', '位置偏置'), value => fixed(value, 0))}
      ${slopes.map((_, i) => i === head ? '' : series(i)).join('')}
      ${series(head)}
      ${slopes.map((m, i) => {
        const stroke = head === i ? color : 'var(--ink-3)';
        return line(right + 2, y(-max * m), right + 18, labelPositions[i], `stroke="${stroke}" opacity="${i === head ? 0.9 : 0.44}"`) +
          label(right + 23, labelPositions[i], `h${i + 1}`, `dominant-baseline="central" style="fill:${stroke}"${i === head ? ' class="pe-series-label"' : ''}`);
      }).join('')}
      <g class="pe-inspection" aria-hidden="true"></g>`;
    ui.metrics(heads[head], String(slope), fields[head], signed(-32 * slope));
    ui.inspector(positionInspector(bounds, max, 32, distance => {
      const value = -distance * slope;
      const px = x(distance);
      const py = y(value);
      return {
        x: px,
        y: py,
        marks: line(px, top, px, bottom, 'class="pe-crosshair"') +
          circle(px, py, 4, `fill="${color}" stroke="var(--paper)" stroke-width="1.5"`),
        html: `<strong>${heads[head]} · Δ ${distance}</strong><br>${t('Penalty', '扣分')} = ${signed(value)}`,
      };
    }));
  }
  render();
  compact.addEventListener('change', render);
}

const tau = Math.PI * 2;
const trainingWindow = 4096;
const pairCount = 16;
const ropeBase = 10000;

function ropeFrequencies(method, scale) {
  const base = method === 2 ? ropeBase * scale ** (pairCount / (pairCount - 1)) : ropeBase;
  // YaRN's channel ramp is bounded by 32 and 1 full turns over the training window.
  const channelAt = turns => pairCount * Math.log(trainingWindow / (tau * turns)) / Math.log(ropeBase);
  const fast = Math.floor(channelAt(32));
  const slow = Math.ceil(channelAt(1));
  return Array.from({ length: pairCount }, (_, p) => {
    const frequency = base ** (-p / pairCount);
    if (method === 1) return { frequency: frequency / scale, regime: 0 };
    if (method !== 3) return { frequency, regime: 0 };
    const blend = clamp((p - fast) / (slow - fast), 0, 1);
    return {
      frequency: frequency * (1 - blend + blend / scale),
      regime: blend === 0 ? 0 : blend === 1 ? 2 : 1,
    };
  });
}

function rotationDial(cx, cy, r, heading, angle, color) {
  const phase = angle % tau;
  const tipX = cx + r * Math.cos(phase);
  const tipY = cy - r * Math.sin(phase);
  const arcR = r * 0.67;
  const arcX = cx + arcR * Math.cos(phase);
  const arcY = cy - arcR * Math.sin(phase);
  const rotation = -phase * 180 / Math.PI;
  return `
    ${label(cx, cy - r - 21, heading, 'class="pe-svg-title" text-anchor="middle"')}
    ${circle(cx, cy, r, 'fill="none" class="pe-axis"')}
    ${line(cx - r, cy, cx + r, cy, 'class="pe-grid"')}
    ${line(cx, cy - r, cx, cy + r, 'class="pe-grid"')}
    <path d="M${cx},${cy} h${arcR} A${arcR},${arcR} 0 ${phase > Math.PI ? 1 : 0} 0 ${arcX},${arcY} Z"
      fill="${color}" fill-opacity="0.16"/>
    ${line(cx, cy, cx + r, cy, 'class="pe-reference"')}
    ${line(cx, cy, tipX, tipY, `stroke="${color}" stroke-width="2"`)}
    <path d="M0 0 L-11 -4 L-11 4 Z" fill="${color}" transform="translate(${tipX} ${tipY}) rotate(${rotation})"/>
    ${circle(cx, cy, 2.5, 'fill="var(--ink-3)"')}`;
}

function rope(figure, t) {
  const rotation = token('rotation', '<i>R</i>');
  const theta = token('theta', 'θ<sub>p</sub>');
  const formula = `<span>[${rotation}(${token('positions', '<i>i</i>')}·${theta}) <i>q</i>]<sup>T</sup>
    [${rotation}(${token('positions', '<i>j</i>')}·${theta}) <i>k</i>]</span>
    <span>=</span><span><i>q</i><sup>T</sup> ${rotation}((${token('delta', '<i>j</i> − <i>i</i>')})·${theta}) <i>k</i></span>`;
  const terms = {
    delta: ['Δ = j − i', t('Only the relative displacement remains after combining the two rotations.', '合并两次旋转后，转角只取决于相对位移。')],
    positions: ['i, j', t('The query and key token positions set their original rotation angles.', '查询和键的 token 位置决定各自的原始转角。')],
    theta: ['θ<sub>p</sub>', t('The angular frequency sets how much channel pair p rotates per token.', '角频率决定第 p 个通道对每个 token 位置旋转多少。')],
    rotation: ['R(·)', t('A two-dimensional rotation acts on each coordinate pair.', '对每一对坐标施加二维旋转。')],
  };
  const ui = prepare(figure, formula, terms, [
    t('Method', '当前方案'), t('Relative Δ', '相对距离 Δ'),
    t('High-Freq Angle (p=0)', '高频通道转角 (p=0)'), t('Low-Freq Angle (p=15)', '低频通道转角 (p=15)'),
  ], t('RoPE rotation dials and channel wavelengths. Use arrow keys to inspect the wavelengths.', 'RoPE 旋转转盘与通道波长。可用方向键查看各通道的波长。'));

  const methods = [t('Standard', '原始 RoPE'), t('PI', 'PI 插值'), 'NTK-Aware', t('YaRN', 'YaRN 三段式')];
  const scales = [2, 4, 8];
  let distance = 4096;
  let method = 0;
  let scale = 8;

  pills(ui.controls, t('Scaling method', '缩放方案'), methods, method, value => {
    method = value;
    render();
  });
  range(ui.controls, t('Relative distance Δ', '相对距离 Δ'), { min: 0, max: 32768, value: distance }, value => {
    distance = value;
    render();
  });
  const scaleRow = document.createElement('div');
  scaleRow.className = 'pe-control-row';
  const scaleLabel = document.createElement('span');
  scaleLabel.textContent = t('Extension factor s', '扩展倍数 s');
  scaleRow.append(scaleLabel);
  pills(scaleRow, scaleLabel.textContent, scales.map(s => `${s}×`), 2, value => {
    scale = scales[value];
    render();
  });
  const scaleValue = document.createElement('span');
  scaleRow.append(scaleValue);
  ui.controls.append(scaleRow);

  function render() {
    const channels = ropeFrequencies(method, scale);
    const angles = channels.map(({ frequency }) => frequency * distance);
    const wavelengths = channels.map(({ frequency }) => tau / frequency);
    const regimeColors = [headColors[0], teal, orange];
    const regimeLabels = [t('High frequencies kept', '高频保留'), t('Mid-frequency blend', '中频过渡'), t('Low frequencies interpolated', '低频插值')];
    const color = p => regimeColors[channels[p].regime];
    const lowColor = method === 3 ? color(15) : teal;

    const small = compact.matches;
    const height = small ? 574 : 260;
    const left = small ? 95 : 404;
    const right = 742;
    const top = small ? 333 : 47;
    const bottom = small ? 503 : 216;
    const gridHeight = bottom - top;
    const step = (right - left) / pairCount;
    const x = p => left + (p + 0.5) * step;
    const y = wavelength => bottom - Math.log10(wavelength) / 6 * gridHeight;
    const tickY = bottom + (small ? 29 : 17);
    const referenceY = y(trainingWindow);
    const dialY = small ? 132 : 112;
    const dialR = small ? 76 : 51;
    const highX = small ? 201 : 83;
    const lowX = small ? 559 : 253;
    ui.svg.setAttribute('viewBox', `0 0 760 ${height}`);
    ui.svg.innerHTML = `
      ${rotationDial(highX, dialY, dialR, t('High frequency · p=0', '高频通道 p=0'), angles[0], accent)}
      ${rotationDial(lowX, dialY, dialR, t('Low frequency · p=15', '低频通道 p=15'), angles[15], lowColor)}
      ${label((highX + lowX) / 2, dialY + dialR + (small ? 42 : 29), 'k → R(Δ·θₚ)k', 'class="pe-axis-title" text-anchor="middle"')}
      ${small ? '' : line(341, 18, 341, 236, 'class="pe-grid"')}
      ${label(left, top - (small ? 30 : 19), t('Wavelength (tokens) · log scale', '波长（token）· 对数刻度'), 'class="pe-svg-title"')}
      ${[1, 100, 10000, 1000000].map(tick => line(left, y(tick), right, y(tick), 'class="pe-grid"') +
        label(left - 9, y(tick), tick >= 1e6 ? '1M' : tick >= 1e3 ? `${tick / 1e3}k` : tick, 'text-anchor="end" dominant-baseline="central"')).join('')}
      ${wavelengths.map((wavelength, p) => {
        const barWidth = step * 0.61;
        return `<rect x="${x(p) - barWidth / 2}" y="${y(wavelength)}" width="${barWidth}" height="${bottom - y(wavelength)}" rx="2" fill="${color(p)}" opacity="0.82"/>`;
      }).join('')}
      ${line(left, referenceY, right, referenceY, 'class="pe-reference"')}
      ${label(left + 4, referenceY - 8, t('4K Train Window', '4K 训练窗口'), 'style="paint-order:stroke;stroke:var(--paper);stroke-width:5px;stroke-linejoin:round"')}
      ${line(left, bottom, right, bottom, 'class="pe-axis"')}
      ${[0, 3, 6, 9, 12, 15].map(p => label(x(p), tickY, p, 'text-anchor="middle"')).join('')}
      ${label((left + right) / 2, height - 5, t('Channel pair p', '通道对 p'), 'class="pe-axis-title" text-anchor="middle"')}
      <g class="pe-inspection" aria-hidden="true"></g>`;
    scaleValue.textContent = `4K → ${scale * 4}K`;
    ui.metrics(methods[method], number.format(distance), `${fixed(angles[0], 2)} rad`, `${fixed(angles[15], 3)} rad`);
    ui.legend.innerHTML = method === 3 ? regimeLabels.map((text, i) => swatch(regimeColors[i], text)).join('') : '';
    ui.inspector({
      max: pairCount - 1,
      initial: 0,
      pick: point => point.x >= left && point.x <= right && point.y >= top && point.y <= bottom
        ? Math.floor((point.x - left) / step)
        : null,
      point: p => ({
        x: x(p),
        y: y(wavelengths[p]),
        marks: line(x(p), top, x(p), bottom, 'class="pe-crosshair"') +
          circle(x(p), y(wavelengths[p]), 4, `fill="${color(p)}" stroke="var(--paper)" stroke-width="1.5"`),
        html: `<strong>p = ${p}${method === 3 ? ` · ${regimeLabels[channels[p].regime]}` : ''}</strong><br>` +
          `${t('Wavelength', '波长')} · ${number.format(Math.round(wavelengths[p]))} tokens<br>` +
          `${t('Rotation', '转角')} · ${fixed(angles[p], 3)} rad`,
      }),
    });
  }
  render();
  compact.addEventListener('change', render);
}

const demos = { sinusoidal, alibi, rope };

export function mountDemos(article) {
  for (const figure of article.querySelectorAll('figure[data-pe-demo]')) {
    const lang = figure.dataset.lang || document.documentElement.lang || location.pathname.split('/')[1];
    const translate = (en, zh) => lang.toLowerCase().startsWith('zh') ? zh : en;
    demos[figure.dataset.peDemo]?.(figure, translate);
  }
}
