let chart;

function resolver() {
  const a = parseFloat(document.getElementById('a').value);
  const b = parseFloat(document.getElementById('b').value);
  const c = parseFloat(document.getElementById('c').value);

  // Discriminante
  const D = b*b - 4*a*c;
  document.getElementById('discriminante').innerHTML = `
    $$D = b^2 - 4ac$$
    $$D = (${b})^2 - 4(${a})(${c})$$
    $$D = ${b*b} - (${4*a*c})$$
    $$D = ${D}$$
  `;

  // Procedimiento paso a paso con LaTeX
  let procedimientoHTML = `
    <p>1. Fórmula general:</p>
    $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

    <p>2. Sustituimos:</p>
    $$x = \\frac{-(${b}) \\pm \\sqrt{(${b})^2 - 4(${a})(${c})}}{2(${a})}$$
  `;

  if (D < 0) {
    procedimientoHTML += `
      <p>❌ El discriminante es negativo, no hay soluciones reales.</p>
    `;
    document.getElementById('procedimiento').innerHTML = procedimientoHTML;
    MathJax.typeset();
    graficar([], a, b, c);
    return;
  }

  const sqrtD = Math.sqrt(D);
  const x1 = (-b + sqrtD) / (2*a);
  const x2 = (-b - sqrtD) / (2*a);

  procedimientoHTML += `
    <p>3. Resolver dentro de la raíz:</p>
    $$x = \\frac{${-b} \\pm \\sqrt{${b*b} - (${4*a*c})}}{${2*a}}$$
    $$x = \\frac{${-b} \\pm \\sqrt{${D}}}{${2*a}}$$

    <p>4. Sacar raíz cuadrada:</p>
    $$x = \\frac{${-b} \\pm ${sqrtD.toFixed(2)}}{${2*a}}$$

    <p>5. Calcular las dos soluciones:</p>
    $$x_1 = \\frac{${-b} + ${sqrtD.toFixed(2)}}{${2*a}} = ${x1.toFixed(2)}$$
    $$x_2 = \\frac{${-b} - ${sqrtD.toFixed(2)}}{${2*a}} = ${x2.toFixed(2)}$$

    ✅ Soluciones: \\(x_1 = ${x1.toFixed(2)}, x_2 = ${x2.toFixed(2)}\\)
  `;

  document.getElementById('procedimiento').innerHTML = procedimientoHTML;
  MathJax.typeset();

  // Graficar parábola
  graficar([x1, x2], a, b, c);
}

function graficar(soluciones, a, b, c) {
  const ctx = document.getElementById('grafica').getContext('2d');

  // Generar puntos de la parábola
  let xs = [], ys = [];
  for (let x = -10; x <= 10; x += 0.2) {
    xs.push(x);
    ys.push(a*x*x + b*x + c);
  }

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: xs,
      datasets: [{
        label: `y = ${a}x² + ${b}x + ${c}`,
        data: ys,
        borderColor: 'blue',
        fill: false,
        pointRadius: 0
      },
      {
        label: 'Soluciones',
        data: soluciones.map(x => ({x: x, y: 0})),
        pointBackgroundColor: 'red',
        pointRadius: 6,
        showLine: false
      }]
    },
    options: {
      responsive: false,
      scales: {
        x: { type: 'linear', position: 'bottom' },
        y: { type: 'linear' }
      }
    }
  });
}
