// Zarys sfery do PDF-ów (portfolio, CV) - ta sama siatka co na stronie. Style kreski: klasy .sphere / .ring / .rim w CSS PDF-a.
/* Sfera jak na stronie: 6 południków + 5 równoleżników (równik mocniej), rzut prostokątny z pochyleniem. */
export function sphere(r, style) {
  const tilt = -14 * Math.PI / 180, turn = 18 * Math.PI / 180;
  const proj = ([x, y, z]) => {
    const x1 = x * Math.cos(turn) + z * Math.sin(turn), z1 = -x * Math.sin(turn) + z * Math.cos(turn);
    const y2 = y * Math.cos(tilt) - z1 * Math.sin(tilt);
    return [x1 * r, -y2 * r];
  };
  const path = f => {
    const pts = Array.from({ length: 121 }, (_, k) => proj(f((k / 120) * Math.PI * 2)));
    return `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
  };
  const meridians = [0, 30, 60, 90, 120, 150].map(d => {
    const L = d * Math.PI / 180;
    return `<path class="ring" d="${path(t => [Math.sin(t) * Math.cos(L), Math.cos(t), Math.sin(t) * Math.sin(L)])}"/>`;
  });
  const parallels = [-60, -30, 0, 30, 60].map(d => {
    const P = d * Math.PI / 180;
    return `<path class="ring${d === 0 ? ' ring--eq' : ''}" d="${path(t => [Math.cos(P) * Math.cos(t), Math.sin(P), Math.cos(P) * Math.sin(t)])}"/>`;
  });
  return `<svg class="sphere" viewBox="${-r} ${-r} ${2 * r} ${2 * r}" style="${style};width:${2 * r}px;height:${2 * r}px" aria-hidden="true"><circle class="rim" r="${r}"/>${meridians.join('')}${parallels.join('')}</svg>`;
}
